"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";

// Firebase ñemboheko (Oñepyrũ ndaipórirõ añoite)
const firebaseConfig = {
  apiKey: "AIzaSyAuJtE7VKOm1wG5BEd_pde8_9aDaq33j8E",
  authDomain: "dc-telematica-auditoria.firebaseapp.com",
  projectId: "dc-telematica-auditoria",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Mba'eichagua TypeScript-pe guarã
interface Inspeccion {
  id: string;
  registro_num?: string;
  fecha_hora?: string;
  punto_id?: string;
  ubicacion?: string;
  switch_port?: string;
  foto_1_base64?: string;
  foto_2_base64?: string;
  foto_3_base64?: string;
  [key: string]: any; 
}

export default function PanelPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modales reko
  const [viewDoc, setViewDoc] = useState<Inspeccion | null>(null);
  const [editDoc, setEditDoc] = useState<Inspeccion | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // 1. Tape ñangareko
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      }
    });

    // 2. Kueru mba'e ko'ág̃a rupi oñemohendáva arange rupi
    const q = query(collection(db, "inspecciones"), orderBy("timestamp", "desc"));
    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const docs: Inspeccion[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setInspecciones(docs);
      setLoading(false);
    }, (error) => {
      console.error("Apañuãi kuerúpe:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
    };
  }, [router]);

  // Mba'eapo mboty hag̃ua sesión
  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  // Mba'eapo mboyke hag̃ua peteĩ jehai
  const handleDelete = async (id: string) => {
    if (window.confirm("⚠️ ¿Eikuaa porã piko remoĩsẽseha ko jehai?")) {
      try {
        await deleteDoc(doc(db, "inspecciones", id));
      } catch (error) {
        console.error("Apañuãi ñembohekópe:", error);
        alert("Oĩ apañuãi ñembohekópe.");
      }
    }
  };

  // Mba'eapo ñongatu hag̃ua moambue
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editDoc) return;
    
    try {
      const formData = new FormData(e.currentTarget);
      const dataToUpdate = Object.fromEntries(formData.entries());
      
      await updateDoc(doc(db, "inspecciones", editDoc.id), dataToUpdate);
      setEditDoc(null); 
      alert("✅ Jehai oñemoambue porã");
    } catch (error) {
      console.error("Apañuãi ñemoambuépe:", error);
      alert("Oĩ apañuãi ñemoambuépe.");
    }
  };

  if (!isClient) return null;

  return (
    <main className="relative z-10 min-h-screen p-4 md:p-8 text-gray-200">
      
      {/* Renda akã */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-wider">
            Ingeniería Renda
          </h1>
          <p className="text-gray-400 text-sm mt-1">Ñangareko ha Jesareko Tasyo San Vicente de Arauca</p>
        </div>
        <button 
          onClick={handleLogout}
          className="mt-4 md:mt-0 px-6 py-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg transition-all font-bold"
        >
          Mboty Sesión
        </button>
      </div>

      {/* Tabla renda */}
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl w-full p-4 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin"></div>
          </div>
        ) : inspecciones.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-xl">Ne'ĩra oĩ mba'eve techaukarã.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-cyan-400">
                <th className="py-4 px-4 font-semibold">Papapy</th>
                <th className="py-4 px-4 font-semibold">Arange</th>
                <th className="py-4 px-4 font-semibold">Punto ID</th>
                <th className="py-4 px-4 font-semibold">Tenda</th>
                <th className="py-4 px-4 font-semibold text-center">Ta'ãnga</th>
                <th className="py-4 px-4 font-semibold text-center">Tembiapo</th>
              </tr>
            </thead>
            <tbody>
              {inspecciones.map((inspeccion) => (
                <tr key={inspeccion.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-bold">{inspeccion.registro_num || "-"}</td>
                  <td className="py-4 px-4 text-sm text-gray-400">{inspeccion.fecha_hora || "-"}</td>
                  <td className="py-4 px-4 font-medium text-cyan-100">{inspeccion.punto_id || "-"}</td>
                  <td className="py-4 px-4 text-sm">{inspeccion.ubicacion || "-"}</td>
                  <td className="py-4 px-4 text-center">
                    {inspeccion.foto_1_base64 || inspeccion.foto_2_base64 ? "📷 Heẽ" : "❌ Nahániri"}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center gap-3">
                      {/* Botón Hecha */}
                      <button onClick={() => setViewDoc(inspeccion)} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-colors" title="Hecha">
                        👁️
                      </button>
                      {/* Botón Moambue */}
                      <button onClick={() => setEditDoc(inspeccion)} className="p-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors" title="Moambue">
                        ✏️
                      </button>
                      {/* Botón Mboyke */}
                      <button onClick={() => handleDelete(inspeccion.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors" title="Mboyke">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* =========================================================
          MODAL DE VISUALIZACIÓN DE DETALLES Y FOTOS (Jesareko Mba'e)
         ========================================================= */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-cyan-500/30 p-6 md:p-8 rounded-2xl w-full max-w-4xl shadow-[0_0_50px_rgba(6,182,212,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-cyan-400">Jesareko Mba'e</h2>
              <button onClick={() => setViewDoc(null)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Jehai renda */}
              <div className="space-y-4 text-sm">
                <div className="bg-white/5 p-4 rounded-lg">
                  <h3 className="text-cyan-500 font-bold mb-2">📍 Mba'e Tenonde</h3>
                  <p><span className="text-gray-400">Papapy:</span> {viewDoc.registro_num}</p>
                  <p><span className="text-gray-400">Arange:</span> {viewDoc.fecha_hora}</p>
                  <p><span className="text-gray-400">Punto ID:</span> {viewDoc.punto_id}</p>
                  <p><span className="text-gray-400">Tenda:</span> {viewDoc.ubicacion}</p>
                </div>
                
                <div className="bg-white/5 p-4 rounded-lg">
                  <h3 className="text-cyan-500 font-bold mb-2">🔌 Ñanduti ha Joaju</h3>
                  <p><span className="text-gray-400">Puerto Switch:</span> {viewDoc.switch_port || "N/A"}</p>
                  <p><span className="text-gray-400">Switch Reko:</span> {viewDoc.switch_estado || "N/A"}</p>
                  <p><span className="text-gray-400">Joaju:</span> {viewDoc.enlace || "N/A"}</p>
                  <p><span className="text-gray-400">DHCP Ñeha'ã:</span> {viewDoc.dhcp || "N/A"}</p>
                </div>

                <div className="bg-white/5 p-4 rounded-lg">
                  <h3 className="text-cyan-500 font-bold mb-2">🏗️ Mba'e'apo</h3>
                  <p><span className="text-gray-400">Canalización:</span> {viewDoc.tipo_canalizacion || "N/A"}</p>
                  <p><span className="text-gray-400">Canalización Reko:</span> {viewDoc.est_canalizacion || "N/A"}</p>
                  <p><span className="text-gray-400">Patch Cord:</span> {viewDoc.patch_estado || "N/A"} - {viewDoc.patch_cat}</p>
                </div>
              </div>

              {/* Ta'ãnga renda */}
              <div className="space-y-4">
                <h3 className="text-cyan-500 font-bold bg-white/5 p-3 rounded-lg text-center">📸 Ta'ãnga Renda</h3>
                
                {/* Ta'ãnga 1 */}
                <div className="border border-white/10 rounded-lg p-2 bg-black/50">
                  <p className="text-xs text-gray-400 mb-2">1. Tenda Ta'ãnga</p>
                  {viewDoc.foto_1_base64 ? (
                    <img src={viewDoc.foto_1_base64} alt="Ta'ãnga 1" className="w-full h-auto max-h-48 object-contain rounded" />
                  ) : (
                    <div className="h-32 flex items-center justify-center text-gray-600 bg-white/5 rounded">Ndaipóri ta'ãnga</div>
                  )}
                </div>

                {/* Ta'ãnga 2 */}
                <div className="border border-white/10 rounded-lg p-2 bg-black/50">
                  <p className="text-xs text-gray-400 mb-2">2. Faceplate Ta'ãnga</p>
                  {viewDoc.foto_2_base64 ? (
                    <img src={viewDoc.foto_2_base64} alt="Ta'ãnga 2" className="w-full h-auto max-h-48 object-contain rounded" />
                  ) : (
                    <div className="h-32 flex items-center justify-center text-gray-600 bg-white/5 rounded">Ndaipóri ta'ãnga</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <button onClick={() => setViewDoc(null)} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors">
                Mboty
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE EDICIÓN DE REGISTRO (Moambue Mba'e Tenonde)
         ========================================================= */}
      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-yellow-500/30 p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(234,179,8,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-yellow-400">Moambue Mba'e Tenonde</h2>
              <button onClick={() => setEditDoc(null)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Punto ID:</label>
                <input type="text" name="punto_id" defaultValue={editDoc.punto_id} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Tenda:</label>
                <input type="text" name="ubicacion" defaultValue={editDoc.ubicacion} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Puerto Switch:</label>
                <input type="text" name="switch_port" defaultValue={editDoc.switch_port} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
              </div>

              <div className="pt-6 border-t border-white/10 flex gap-4">
                <button type="button" onClick={() => setEditDoc(null)} className="w-1/2 py-3 bg-transparent border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg transition-colors font-bold">
                  Heja
                </button>
                <button type="submit" className="w-1/2 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors">
                  Ñongatu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}