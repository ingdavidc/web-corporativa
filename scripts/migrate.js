require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteField } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  console.log("Starting migration...");
  const snapshot = await getDocs(collection(db, "inspecciones"));
  let migrated = 0;
  console.log(`Found ${snapshot.size} documents.`);
  
  // Función para dormir
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.foto_1_base64 || data.foto_2_base64 || data.foto_3_base64) {
      console.log(`Migrating document ${docSnap.id}...`);
      
      const fotosData = {
        foto_1_base64: data.foto_1_base64 || "",
        foto_2_base64: data.foto_2_base64 || "",
        foto_3_base64: data.foto_3_base64 || ""
      };

      // Guardar subcolección
      await setDoc(doc(db, "inspecciones", docSnap.id, "fotos", "data"), fotosData, { merge: true });
      
      // Remover del documento principal y añadir bandera
      await updateDoc(doc(db, "inspecciones", docSnap.id), {
        foto_1_base64: deleteField(),
        foto_2_base64: deleteField(),
        foto_3_base64: deleteField(),
        tiene_fotos: true
      });

      migrated++;
      // Esperar 1 segundo para no agotar el websocket buffer
      await sleep(1000);
    }
  }
  
  console.log(`Migration complete. Migrated ${migrated} documents.`);
  process.exit(0);
}

migrate().catch(console.error);
