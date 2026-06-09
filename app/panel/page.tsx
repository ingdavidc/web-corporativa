"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { initializeApp, getApps } from "firebase/app";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { collection, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy, setDoc, addDoc } from "firebase/firestore";
import { auth, db, firebaseConfig } from "@/lib/firebase";

interface Inspeccion {
  id: string;
  registro_num?: string;
  fecha_hora?: string;
  tecnico_email?: string; 
  tecnico_nombre?: string; // Nuevo campo para guardar el nombre del técnico
  punto_id?: string;
  ubicacion?: string;
  switch_port?: string;
  foto_1_base64?: string;
  foto_2_base64?: string;
  foto_3_base64?: string;
  [key: string]: any; 
}

// Función de sanitización para prevenir inyección XSS básica
const sanitizeInput = (str: string) => {
  if (typeof str !== 'string') return str;
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

export default function PanelPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  
  // Tabs Navigation
  const [activeTab, setActiveTab] = useState<"auditorias" | "usuarios" | "cms">("auditorias");

  // State Auditorias
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [viewDoc, setViewDoc] = useState<Inspeccion | null>(null);
  const [editDoc, setEditDoc] = useState<Inspeccion | null>(null);

  // State Usuarios
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState(""); // Nuevo estado para el Nombre
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("tecnico");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // State CMS Web
  const [webServices, setWebServices] = useState<any[]>([]);
  const [webProjects, setWebProjects] = useState<any[]>([]);
  const [cmsContent, setCmsContent] = useState<any>({});
  type CmsTabType = "servicios" | "proyectos" | "hero" | "about" | "contact" | "global";
  const [cmsSubTab, setCmsSubTab] = useState<CmsTabType>("servicios");
  const [showCmsModal, setShowCmsModal] = useState(false);
  const [cmsEditDoc, setCmsEditDoc] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/");
    });

    // Cargar Auditorías
    const qAuditorias = query(collection(db, "inspecciones"), orderBy("timestamp", "desc"));
    const unsubscribeDb = onSnapshot(qAuditorias, (snapshot) => {
      const docs: Inspeccion[] = [];
      snapshot.forEach((doc) => { docs.push({ id: doc.id, ...doc.data() }); });
      setInspecciones(docs);
      setLoading(false);
    });

    // Cargar Usuarios
    const qUsers = query(collection(db, "usuarios"), orderBy("createdAt", "desc"));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const usersList: any[] = [];
      snapshot.forEach((doc) => { usersList.push({ id: doc.id, ...doc.data() }); });
      setUsuarios(usersList);
      setLoadingUsers(false);
    });

    // Cargar Servicios Web
    const qServices = query(collection(db, "web_services"));
    const unsubscribeServices = onSnapshot(qServices, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => { docs.push({ id: doc.id, ...doc.data() }); });
      setWebServices(docs);
    });

    // Cargar Proyectos Web
    const qProjects = query(collection(db, "web_projects"));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => { docs.push({ id: doc.id, ...doc.data() }); });
      setWebProjects(docs);
    });

    // Cargar Web Content Modular
    const qContent = query(collection(db, "web_content"));
    const unsubscribeContent = onSnapshot(qContent, (snapshot) => {
      const contentData: any = {};
      snapshot.forEach((doc) => { contentData[doc.id] = doc.data(); });
      setCmsContent(contentData);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
      unsubscribeUsers();
      unsubscribeServices();
      unsubscribeProjects();
      unsubscribeContent();
    };
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  // ========================================================
  // CONTROL DE USUARIOS
  // ========================================================
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      // Usamos una "SecondaryApp" para que al crear un usuario en Firebase Auth 
      // no cierre tu propia sesión actual de administrador.
      let secondaryApp = getApps().find(a => a.name === "SecondaryApp");
      if (!secondaryApp) {
        secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      }
      const secondaryAuth = getAuth(secondaryApp);
      
      // Creamos en Auth
      await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
      await signOut(secondaryAuth); // Deslogueamos la instancia secundaria por seguridad

      // Guardamos su rol y NOMBRE en Firestore para darle el acceso en el login
      await setDoc(doc(db, "usuarios", newUserEmail), {
        nombre: newUserName, // Guardamos el nombre y apellido
        email: newUserEmail,
        role: newUserRole,
        createdAt: new Date().toISOString()
      });

      setShowUserModal(false);
      setNewUserName(""); // Limpiamos el campo
      setNewUserEmail("");
      setNewUserPassword("");
      alert("✅ Usuario de acceso corporativo creado exitosamente");
    } catch (error: any) {
      console.error("Error creando usuario:", error);
      alert("Error al crear usuario. Posiblemente el correo ya está registrado o la contraseña es muy débil (mínimo 6 caracteres).");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (emailToDelete: string) => {
    if (window.confirm("⚠️ ¿Estás seguro de revocar el acceso a este usuario? Ya no podrá ingresar al sistema.")) {
      try {
        await deleteDoc(doc(db, "usuarios", emailToDelete));
        alert("✅ Acceso revocado correctamente.");
      } catch (error) {
        console.error("Error eliminando usuario:", error);
        alert("Hubo un error al eliminar el usuario.");
      }
    }
  };

  // ========================================================
  // CONTROL DE AUDITORÍAS Y EDICIÓN
  // ========================================================
  const handleDeleteAuditoria = async (id: string) => {
    if (window.confirm("⚠️ ¿Estás seguro de eliminar este registro permanentemente del panel?")) {
      try {
        await deleteDoc(doc(db, "inspecciones", id));
      } catch (error) {
        console.error("Error eliminando:", error);
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editDoc) return;
    try {
      const formData = new FormData(e.currentTarget);
      const dataToUpdate = Object.fromEntries(formData.entries());
      await updateDoc(doc(db, "inspecciones", editDoc.id), dataToUpdate);
      setEditDoc(null); 
      alert("✅ Registro actualizado correctamente");
    } catch (error) {
      console.error("Error actualizando:", error);
    }
  };

  // ========================================================
  // CONTROL DE CMS WEB
  // ========================================================
  const handleSaveCmsDoc = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    if (cmsSubTab === "servicios" && typeof data.features === "string") {
      data.features = data.features.split(",").map((s: string) => sanitizeInput(s.trim())).filter((s: string) => s);
    }
    if (cmsSubTab === "proyectos" && typeof data.tech === "string") {
      data.tech = data.tech.split(",").map((s: string) => sanitizeInput(s.trim())).filter((s: string) => s);
    }

    // Sanitizar todos los campos de texto
    Object.keys(data).forEach(key => {
      if (typeof data[key] === "string") {
        data[key] = sanitizeInput(data[key]);
      }
    });

    try {
      const collectionName = cmsSubTab === "servicios" ? "web_services" : "web_projects";
      if (cmsEditDoc) {
        await updateDoc(doc(db, collectionName, cmsEditDoc.id), data);
        alert("✅ Registro actualizado");
      } else {
        await addDoc(collection(db, collectionName), { ...data, createdAt: new Date().toISOString() });
        alert("✅ Registro creado");
      }
      setShowCmsModal(false);
      setCmsEditDoc(null);
    } catch (error) {
      console.error("Error guardando documento CMS:", error);
      alert("Error al guardar en el CMS");
    }
  };

  const handleDeleteCmsDoc = async (id: string) => {
    if (window.confirm("⚠️ ¿Eliminar este registro de la web pública?")) {
      const collectionName = cmsSubTab === "servicios" ? "web_services" : "web_projects";
      await deleteDoc(doc(db, collectionName, id));
    }
  };

  const openCmsModal = (doc: any = null) => {
    setCmsEditDoc(doc);
    setShowCmsModal(true);
  };

  const handleSaveWebContent = async (docId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    // Parse arrays
    Object.keys(data).forEach(key => {
      if (key.startsWith("array_")) {
         const newKey = key.replace("array_", "");
         data[newKey] = data[key].split(",").map((s: string) => sanitizeInput(s.trim())).filter((s: string) => s);
         delete data[key];
      } else if (typeof data[key] === "string") {
         data[key] = sanitizeInput(data[key]);
      }
    });

    try {
      await setDoc(doc(db, "web_content", docId), data, { merge: true });
      alert("✅ Sección actualizada exitosamente.");
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Hubo un error al guardar los cambios.");
    }
  };

  // ========================================================
  // MOTOR DE GENERACIÓN DE PDF PROFESIONAL
  // ========================================================
  const exportToPDF = async (inspeccionesToExport: Inspeccion[], filename: string) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ format: "letter" }); 

      const azulCorp = { r: 34, g: 42, b: 104 };
      const rojoCorp = { r: 237, g: 28, b: 36 };
      const grisPizarra = { r: 80, g: 90, b: 100 };
      const grisPlatino = { r: 240, g: 242, b: 245 };

      let logoBase64: string | null = null;
      try {
        const response = await fetch('/logo.png');
        const blob = await response.blob();
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn("No se pudo cargar el logo para el PDF.");
      }

      for (let i = 0; i < inspeccionesToExport.length; i++) {
        const item = inspeccionesToExport[i];
        if (i > 0) doc.addPage();

        let y = 15;

        if (logoBase64) doc.addImage(logoBase64, 'PNG', 15, y, 20, 15); 

        doc.setFont("helvetica", "bold");
        doc.setTextColor(azulCorp.r, azulCorp.g, azulCorp.b);
        doc.setFontSize(15);
        doc.text("INFORME DE AUDITORÍA TÉCNICA", 200, y + 6, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setTextColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
        doc.setFontSize(8.5);
        doc.text("Hospital San Vicente de Arauca — DC Telemática", 200, y + 12, { align: "right" });

        y += 18;
        doc.setDrawColor(rojoCorp.r, rojoCorp.g, rojoCorp.b);
        doc.setLineWidth(0.6);
        doc.line(15, y, 200, y);

        y += 12;

        const drawSectionHeader = (title: string, yPos: number) => {
          doc.setFillColor(azulCorp.r, azulCorp.g, azulCorp.b);
          doc.rect(15, yPos, 185, 7, 'F');
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9.5);
          doc.text(title, 18, yPos + 5);
        };

        const drawInfoRow = (label1: string, val1: string, label2: string, val2: string, yPos: number) => {
          doc.setFillColor(grisPlatino.r, grisPlatino.g, grisPlatino.b);
          doc.rect(15, yPos, 185, 8, 'F');
          doc.setFont("helvetica", "bold");
          doc.setTextColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
          doc.setFontSize(8.5);
          doc.text(`${label1}:`, 18, yPos + 5.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          doc.text(`${val1 || "N/A"}`, 50, yPos + 5.5);
          if (label2) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
            doc.text(`${label2}:`, 110, yPos + 5.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(15, 23, 42);
            doc.text(`${val2 || "N/A"}`, 145, yPos + 5.5);
          }
        };

        drawSectionHeader("1. IDENTIFICACIÓN GENERAL", y); y += 7;
        drawInfoRow("Registro Número", item.registro_num || "N/A", "Fecha / Hora", item.fecha_hora || "N/A", y); y += 9;
        
        // Fila actualizada para mostrar solo el Nombre del Auditor Técnico
        drawInfoRow("Auditor Técnico", item.tecnico_nombre || "No registrado", "", "", y); y += 9; 
        
        drawInfoRow("ID Punto de Red", item.punto_id || "N/A", "Ubicación Física", item.ubicacion || "N/A", y); y += 15;

        drawSectionHeader("2. CONECTIVIDAD Y EQUIPO ACTIVO", y); y += 7;
        drawInfoRow("Puerto en Switch", item.switch_port || "N/A", "Estado del Puerto", item.switch_estado || "N/A", y); y += 9;
        drawInfoRow("Estado del Enlace", item.enlace || "N/A", "Prueba DHCP / IP", item.dhcp || "N/A", y); y += 15;

        drawSectionHeader("3. INFRAESTRUCTURA FÍSICA Y ESTRUCTURAL", y); y += 7;
        drawInfoRow("Tipo Canalización", item.tipo_canalizacion || "N/A", "Estado Canal.", item.est_canalizacion || "N/A", y); y += 9;
        drawInfoRow("Estado Faceplate", item.fisico || "N/A", "Patch Cord (Toma)", item.patch_estado || "N/A", y); y += 9;
        drawInfoRow("Categoría Cable", item.patch_cat || "N/A", "Fabricación Cable", item.patch_tipo || "N/A", y); y += 18;

        drawSectionHeader("4. REGISTRO FOTOGRÁFICO", y); y += 12;

        const imgWidth = 56;
        const imgHeight = 42;
        const imgY = y + 5;

        const drawPhotoWithLabel = (base64: string | undefined, title: string, xPos: number) => {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
          doc.setFontSize(8.5);
          doc.text(title, xPos + (imgWidth / 2), y, { align: "center" });

          doc.setDrawColor(azulCorp.r, azulCorp.g, azulCorp.b);
          doc.setFillColor(grisPlatino.r, grisPlatino.g, grisPlatino.b);
          doc.setLineWidth(0.4);
          doc.rect(xPos, imgY, imgWidth, imgHeight, 'F');
          doc.rect(xPos, imgY, imgWidth, imgHeight, 'S');

          if (base64) {
            try { doc.addImage(base64, 'JPEG', xPos + 0.5, imgY + 0.5, imgWidth - 1, imgHeight - 1); } 
            catch (e) { doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text("(Error de imagen)", xPos + (imgWidth / 2), imgY + (imgHeight / 2), { align: "center" }); }
          } else {
            doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text("(Sin registro)", xPos + (imgWidth / 2), imgY + (imgHeight / 2), { align: "center" });
          }
        };

        drawPhotoWithLabel(item.foto_1_base64, "1. Panorámica", 15);
        drawPhotoWithLabel(item.foto_2_base64, "2. Detalle Faceplate", 79.5);
        drawPhotoWithLabel(item.foto_3_base64, "3. Evidencia Adicional", 144);

        y = imgY + imgHeight + 25;

        doc.setDrawColor(rojoCorp.r, rojoCorp.g, rojoCorp.b);
        doc.setLineWidth(0.5);
        doc.line(15, y, 200, y);
        y += 10;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(azulCorp.r, azulCorp.g, azulCorp.b);
        doc.setFontSize(9);
        doc.text("Auditor Técnico:", 15, y);
        doc.setDrawColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
        
        // Colocamos el nombre del técnico encima de la línea de firma si está disponible
        if(item.tecnico_nombre) {
           doc.setFont("helvetica", "italic");
           doc.setFontSize(8);
           doc.text(item.tecnico_nombre, 20, y - 4);
        }
        
        doc.line(15, y + 10, 80, y + 10); 

        doc.setFont("helvetica", "bold");
        doc.text("Firma de Recibido (Hospital):", 115, y);
        doc.line(115, y + 10, 180, y + 10);

        y += 20;
        doc.setFont("helvetica", "italic");
        doc.setTextColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
        doc.setFontSize(7);
        doc.text(`Documento generado por el Panel de Ingeniería de DC Telemática. Id Registro: ${item.id}`, 107.5, y, { align: "center" });
      }

      doc.save(filename);
    } catch (error) {
      alert("Error al procesar PDF. Verifica la instalación de jspdf.");
    }
  };

  const handleGeneratePDF = (docs: Inspeccion[], filename: string) => {
    setIsGeneratingPDF(true);
    setTimeout(async () => {
      await exportToPDF(docs, filename);
      setIsGeneratingPDF(false);
    }, 150); 
  };

  if (!isClient) return null;

  return (
    <main className="relative z-10 min-h-screen p-4 md:p-8 text-gray-200 pb-24">
      
      {/* Estilos Animación 3D */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        @keyframes subtleOrbit {
          0% { transform: rotateY(-6deg) rotateX(4deg) translateY(0px); }
          50% { transform: rotateY(6deg) rotateX(-4deg) translateY(-5px); }
          100% { transform: rotateY(-6deg) rotateX(4deg) translateY(0px); }
        }
        .animate-3d-tilt { animation: subtleOrbit 6s ease-in-out infinite; transform-style: preserve-3d; }
      `}</style>

      {/* Modal de Carga de PDF */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
           <div className="w-16 h-16 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
           <h2 className="text-2xl font-bold text-cyan-400 animate-pulse text-center px-4">Diseñando Documento Carta...</h2>
        </div>
      )}

      {/* ENCABEZADO DEL PANEL */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-6">
           <div className="relative w-20 h-20 md:w-28 md:h-28 perspective-1000">
              <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative w-full h-full animate-3d-tilt">
                <Image src="/logo.png" alt="Logo DC Telemática" fill className="object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.7)]" />
              </div>
            </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-wider">
              Panel de Ingeniería
            </h1>
            <p className="text-gray-400 text-sm mt-1 font-medium">Gestión y Auditoría Hospital San Vicente de Arauca</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-0 w-full md:w-auto">
          {activeTab === "auditorias" && (
            <button onClick={() => handleGeneratePDF(inspecciones, "Reporte_General_Auditoria.pdf")} disabled={inspecciones.length === 0} className="flex-1 md:flex-none px-6 py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-black rounded-lg transition-all font-bold shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              📄 Exportar Todo a PDF
            </button>
          )}
          <button onClick={handleLogout} className="flex-1 md:flex-none px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg transition-all font-bold">
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab("auditorias")} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'auditorias' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
          📋 Registros de Auditoría
        </button>
        <button onClick={() => setActiveTab("usuarios")} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'usuarios' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
          👥 Gestión de Usuarios
        </button>
        <button onClick={() => setActiveTab("cms")} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'cms' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
          🌐 CMS Web Corporativa
        </button>
      </div>

      {/* ==============================================
          VISTA 1: TABLA DE AUDITORÍAS
          ============================================== */}
      {activeTab === "auditorias" && (
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl w-full p-4 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-x-auto animate-in fade-in duration-300">
          {loading ? (
            <div className="flex justify-center items-center py-20"><div className="w-12 h-12 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin"></div></div>
          ) : inspecciones.length === 0 ? (
            <div className="text-center py-20 text-gray-500"><p className="text-xl">No hay registros de inspección todavía.</p></div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 text-cyan-400">
                  <th className="py-4 px-4 font-semibold">Reg N°</th>
                  <th className="py-4 px-4 font-semibold">Fecha</th>
                  <th className="py-4 px-4 font-semibold">Auditor Técnico</th>
                  <th className="py-4 px-4 font-semibold">Punto ID</th>
                  <th className="py-4 px-4 font-semibold">Ubicación</th>
                  <th className="py-4 px-4 font-semibold text-center">Fotos</th>
                  <th className="py-4 px-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inspecciones.map((inspeccion) => (
                  <tr key={inspeccion.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-bold">{inspeccion.registro_num || "-"}</td>
                    <td className="py-4 px-4 text-sm text-gray-400 whitespace-nowrap">{inspeccion.fecha_hora || "-"}</td>
                    <td className="py-4 px-4 text-sm text-cyan-200">{inspeccion.tecnico_nombre || "No registrado"}</td>
                    <td className="py-4 px-4 font-medium text-cyan-100">{inspeccion.punto_id || "-"}</td>
                    <td className="py-4 px-4 text-sm">{inspeccion.ubicacion || "-"}</td>
                    <td className="py-4 px-4 text-center">{inspeccion.foto_1_base64 || inspeccion.foto_2_base64 ? "📷 Sí" : "❌ No"}</td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setViewDoc(inspeccion)} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-colors" title="Ver Detalles">👁️</button>
                        <button onClick={() => setEditDoc(inspeccion)} className="p-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors" title="Editar">✏️</button>
                        <button onClick={() => handleGeneratePDF([inspeccion], `Reporte_${inspeccion.punto_id || 'Inspeccion'}.pdf`)} className="p-2 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black rounded transition-colors" title="Exportar a PDF">📄</button>
                        <button onClick={() => handleDeleteAuditoria(inspeccion.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors" title="Eliminar">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ==============================================
          VISTA 2: TABLA DE USUARIOS
          ============================================== */}
      {activeTab === "usuarios" && (
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl w-full p-4 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-x-auto animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-white/10 pb-4 gap-4">
            <h2 className="text-2xl font-bold text-purple-400">Control de Accesos Corporativos</h2>
            <button onClick={() => setShowUserModal(true)} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
              <span className="text-xl leading-none">+</span> Nuevo Usuario
            </button>
          </div>
          
          {loadingUsers ? (
            <div className="flex justify-center items-center py-20"><div className="w-12 h-12 border-4 border-purple-900 border-t-purple-400 rounded-full animate-spin"></div></div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-20 text-gray-500"><p className="text-xl">No hay usuarios registrados.</p></div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 text-purple-400">
                  <th className="py-4 px-4 font-semibold">Nombre y Apellido</th>
                  <th className="py-4 px-4 font-semibold">Correo Electrónico</th>
                  <th className="py-4 px-4 font-semibold">Rol de Acceso</th>
                  <th className="py-4 px-4 font-semibold">Fecha de Creación</th>
                  <th className="py-4 px-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-medium text-white">{u.nombre || "Sin nombre"}</td>
                    <td className="py-4 px-4 text-gray-400">{u.email}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${u.role === 'ingeniero' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                        {u.role === 'ingeniero' ? 'Ingeniero / Admin' : 'Técnico Operativo'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="py-4 px-4 text-center">
                       <button onClick={() => handleDeleteUser(u.email)} className="px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded border border-red-500/30 transition-colors font-semibold" title="Revocar Acceso">
                          Revocar Acceso
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ==============================================
          VISTA 3: CMS WEB
          ============================================== */}
      {activeTab === "cms" && (
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl w-full p-4 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-x-auto animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-white/10 pb-4 gap-4">
            <h2 className="text-2xl font-bold text-green-400">Gestor de Contenidos (CMS)</h2>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setCmsSubTab("servicios")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'servicios' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Servicios</button>
              <button onClick={() => setCmsSubTab("proyectos")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'proyectos' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Proyectos</button>
              <button onClick={() => setCmsSubTab("hero")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'hero' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Sección: Inicio</button>
              <button onClick={() => setCmsSubTab("about")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'about' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Sección: Nosotros</button>
              <button onClick={() => setCmsSubTab("contact")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'contact' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Sección: Contacto</button>
              <button onClick={() => setCmsSubTab("global")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'global' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Enlaces Globales</button>
              
              {(cmsSubTab === "servicios" || cmsSubTab === "proyectos") && (
                <button onClick={() => openCmsModal()} className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 ml-4">
                  <span className="text-xl leading-none">+</span> Nuevo
                </button>
              )}
            </div>
          </div>
          
          {(cmsSubTab === "servicios" || cmsSubTab === "proyectos") && (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 text-green-400">
                  <th className="py-4 px-4 font-semibold">Título</th>
                  <th className="py-4 px-4 font-semibold">{cmsSubTab === "servicios" ? "Ícono" : "Categoría"}</th>
                  <th className="py-4 px-4 font-semibold">Descripción</th>
                  <th className="py-4 px-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(cmsSubTab === "servicios" ? webServices : webProjects).map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-medium text-white">{item.title}</td>
                    <td className="py-4 px-4 text-gray-400">{cmsSubTab === "servicios" ? item.icon : item.category}</td>
                    <td className="py-4 px-4 text-sm text-gray-400 max-w-xs truncate">{item.description}</td>
                    <td className="py-4 px-4 text-center">
                      <button onClick={() => openCmsModal(item)} className="p-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors mx-1" title="Editar">✏️</button>
                      <button onClick={() => handleDeleteCmsDoc(item.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors mx-1" title="Eliminar">🗑️</button>
                    </td>
                  </tr>
                ))}
                {(cmsSubTab === "servicios" ? webServices : webProjects).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">No hay registros guardados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Formulario CMS - HERO */}
          {cmsSubTab === "hero" && (
            <form onSubmit={(e) => handleSaveWebContent("hero", e)} className="max-w-2xl space-y-6">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Textos Principales</h3>
                <div className="space-y-4">
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Título Superior:</label><input type="text" name="title1" defaultValue={cmsContent?.hero?.title1 || "Conectamos tu"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Palabra Resaltada:</label><input type="text" name="title2" defaultValue={cmsContent?.hero?.title2 || "Futuro Digital"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Descripción:</label><textarea name="description" defaultValue={cmsContent?.hero?.description || "Soluciones integrales en telecomunicaciones, redes e infraestructura tecnológica..."} rows={3} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none resize-none"></textarea></div>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">Guardar Sección Inicio</button>
            </form>
          )}

          {/* Formulario CMS - ABOUT */}
          {cmsSubTab === "about" && (
            <form onSubmit={(e) => handleSaveWebContent("about", e)} className="max-w-2xl space-y-6">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Textos de Sobre Nosotros</h3>
                <div className="space-y-4">
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Título:</label><input type="text" name="title" defaultValue={cmsContent?.about?.title || "Expertos en"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Palabra Resaltada:</label><input type="text" name="highlight" defaultValue={cmsContent?.about?.highlight || "Telecomunicaciones"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Párrafo 1:</label><textarea name="p1" defaultValue={cmsContent?.about?.p1 || "DC Telemática es una empresa especializada en soluciones de telecomunicaciones..."} rows={3} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none resize-none"></textarea></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Tecnologías (separadas por coma):</label><input type="text" name="array_tech" defaultValue={cmsContent?.about?.tech?.join(", ") || "Cisco, Juniper, Aruba, Fortinet"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Certificaciones (separadas por coma):</label><input type="text" name="array_certs" defaultValue={cmsContent?.about?.certs?.join(", ") || "CCNA/CCNP, JNCIA/JNCIS, ISO 27001"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">Guardar Sección Nosotros</button>
            </form>
          )}

          {/* Formulario CMS - CONTACT */}
          {cmsSubTab === "contact" && (
            <form onSubmit={(e) => handleSaveWebContent("contact", e)} className="max-w-2xl space-y-6">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Información de Contacto</h3>
                <div className="space-y-4">
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Correo Electrónico:</label><input type="email" name="email" defaultValue={cmsContent?.contact?.email || "contacto@dctelematica.com"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Número WhatsApp:</label><input type="text" name="whatsapp" defaultValue={cmsContent?.contact?.whatsapp || "+57 317 425 1419"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Ubicación Física:</label><input type="text" name="location" defaultValue={cmsContent?.contact?.location || "Bogotá, Colombia"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">Guardar Sección Contacto</button>
            </form>
          )}

          {/* Formulario CMS - GLOBAL */}
          {cmsSubTab === "global" && (
            <form onSubmit={(e) => handleSaveWebContent("global", e)} className="max-w-2xl space-y-6">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Redes Sociales (Footer)</h3>
                <div className="space-y-4">
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">URL de LinkedIn:</label><input type="text" name="linkedin" defaultValue={cmsContent?.global?.linkedin || "#"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">URL de Instagram:</label><input type="text" name="instagram" defaultValue={cmsContent?.global?.instagram || "#"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">URL de Facebook:</label><input type="text" name="facebook" defaultValue={cmsContent?.global?.facebook || "#"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">Guardar Enlaces Globales</button>
            </form>
          )}

        </div>
      )}

      {/* =========================================================
          MODAL: CREAR NUEVO USUARIO
         ========================================================= */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-purple-500/30 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(147,51,234,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-purple-400">Nuevo Usuario</h2>
              <button onClick={() => setShowUserModal(false)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Nombre y Apellido:</label>
                <input type="text" value={newUserName} onChange={e=>setNewUserName(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition-colors" placeholder="Ej. Juan Pérez"/>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Correo Electrónico:</label>
                <input type="email" value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition-colors" placeholder="tecnico@dctelematica.com"/>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Contraseña Provisoria:</label>
                <input type="password" value={newUserPassword} onChange={e=>setNewUserPassword(e.target.value)} required minLength={6} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition-colors" placeholder="Mínimo 6 caracteres"/>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Asignar Rol:</label>
                <select value={newUserRole} onChange={e=>setNewUserRole(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none cursor-pointer">
                  <option value="tecnico">Técnico Operativo (Solo Formulario)</option>
                  <option value="ingeniero">Ingeniero Administrador (Panel Completo)</option>
                </select>
              </div>

              <div className="pt-6 border-t border-white/10 flex gap-4">
                <button type="button" onClick={() => setShowUserModal(false)} className="w-1/2 py-3 bg-transparent border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg transition-colors font-bold">
                  Cancelar
                </button>
                <button type="submit" disabled={isCreatingUser} className="w-1/2 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
                  {isCreatingUser ? "Creando..." : "Crear Acceso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: CMS WEB
         ========================================================= */}
      {showCmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-green-500/30 p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(22,163,74,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-green-400">{cmsEditDoc ? "Editar Registro" : "Nuevo Registro"}</h2>
              <button onClick={() => setShowCmsModal(false)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleSaveCmsDoc} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Título:</label>
                <input type="text" name="title" defaultValue={cmsEditDoc?.title} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
              </div>
              
              {cmsSubTab === "servicios" ? (
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Nombre Ícono (ej. Network, Wifi, Server):</label>
                  <input type="text" name="icon" defaultValue={cmsEditDoc?.icon} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Categoría:</label>
                  <input type="text" name="category" defaultValue={cmsEditDoc?.category} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Descripción breve:</label>
                <textarea name="description" defaultValue={cmsEditDoc?.description} required rows={3} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none resize-none"></textarea>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">
                  {cmsSubTab === "servicios" ? "Características (separadas por coma):" : "Tecnologías (separadas por coma):"}
                </label>
                <input type="text" name={cmsSubTab === "servicios" ? "features" : "tech"} defaultValue={cmsSubTab === "servicios" ? cmsEditDoc?.features?.join(", ") : cmsEditDoc?.tech?.join(", ")} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="Ej. Elemento 1, Elemento 2, Elemento 3" />
              </div>

              <div className="pt-6 border-t border-white/10 flex gap-4">
                <button type="button" onClick={() => setShowCmsModal(false)} className="w-1/2 py-3 bg-transparent border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg transition-colors font-bold">Cancelar</button>
                <button type="submit" className="w-1/2 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALES DE AUDITORÍA (VER Y EDITAR)
         ========================================================= */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-cyan-500/30 p-6 md:p-8 rounded-2xl w-full max-w-4xl shadow-[0_0_50px_rgba(6,182,212,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-cyan-400">Detalles de Inspección</h2>
              <button onClick={() => setViewDoc(null)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4 text-sm">
                <div className="bg-white/5 p-4 rounded-lg"><h3 className="text-cyan-500 font-bold mb-2">📍 Datos Principales</h3><p><span className="text-gray-400">Registro N°:</span> {viewDoc.registro_num}</p><p><span className="text-gray-400">Fecha:</span> {viewDoc.fecha_hora}</p><p><span className="text-gray-400">Auditor Técnico:</span> {viewDoc.tecnico_nombre || "No registrado"}</p><p><span className="text-gray-400">Punto ID:</span> {viewDoc.punto_id}</p><p><span className="text-gray-400">Ubicación:</span> {viewDoc.ubicacion}</p></div>
                <div className="bg-white/5 p-4 rounded-lg"><h3 className="text-cyan-500 font-bold mb-2">🔌 Red y Conectividad</h3><p><span className="text-gray-400">Puerto Switch:</span> {viewDoc.switch_port || "N/A"}</p><p><span className="text-gray-400">Estado Switch:</span> {viewDoc.switch_estado || "N/A"}</p><p><span className="text-gray-400">Enlace:</span> {viewDoc.enlace || "N/A"}</p><p><span className="text-gray-400">Prueba DHCP:</span> {viewDoc.dhcp || "N/A"}</p></div>
                <div className="bg-white/5 p-4 rounded-lg"><h3 className="text-cyan-500 font-bold mb-2">🏗️ Infraestructura Física</h3><p><span className="text-gray-400">Canalización:</span> {viewDoc.tipo_canalizacion || "N/A"}</p><p><span className="text-gray-400">Estado Canalización:</span> {viewDoc.est_canalizacion || "N/A"}</p><p><span className="text-gray-400">Patch Cord:</span> {viewDoc.patch_estado || "N/A"} - {viewDoc.patch_cat}</p></div>
              </div>

              <div className="space-y-4">
                <h3 className="text-cyan-500 font-bold bg-white/5 p-3 rounded-lg text-center">📸 Registro Fotográfico</h3>
                <div className="border border-white/10 rounded-lg p-2 bg-black/50"><p className="text-xs text-gray-400 mb-2">1. Panorámica / Ubicación</p>{viewDoc.foto_1_base64 ? <img src={viewDoc.foto_1_base64} alt="Foto 1" className="w-full h-auto max-h-48 object-contain rounded" /> : <div className="h-32 flex items-center justify-center text-gray-600 bg-white/5 rounded">Sin foto</div>}</div>
                <div className="border border-white/10 rounded-lg p-2 bg-black/50"><p className="text-xs text-gray-400 mb-2">2. Detalle Faceplate</p>{viewDoc.foto_2_base64 ? <img src={viewDoc.foto_2_base64} alt="Foto 2" className="w-full h-auto max-h-48 object-contain rounded" /> : <div className="h-32 flex items-center justify-center text-gray-600 bg-white/5 rounded">Sin foto</div>}</div>
              </div>
            </div>
            <div className="mt-8 text-center"><button onClick={() => setViewDoc(null)} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors">Cerrar Detalles</button></div>
          </div>
        </div>
      )}

      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-yellow-500/30 p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(234,179,8,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-yellow-400">Editar Registro Principal</h2>
              <button onClick={() => setEditDoc(null)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div><label className="text-sm font-semibold text-gray-300 block mb-1">Punto ID:</label><input type="text" name="punto_id" defaultValue={editDoc.punto_id} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" /></div>
              <div><label className="text-sm font-semibold text-gray-300 block mb-1">Ubicación:</label><input type="text" name="ubicacion" defaultValue={editDoc.ubicacion} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" /></div>
              <div><label className="text-sm font-semibold text-gray-300 block mb-1">Puerto Switch:</label><input type="text" name="switch_port" defaultValue={editDoc.switch_port} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" /></div>
              <div className="pt-6 border-t border-white/10 flex gap-4">
                <button type="button" onClick={() => setEditDoc(null)} className="w-1/2 py-3 bg-transparent border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg transition-colors font-bold">Cancelar</button>
                <button type="submit" className="w-1/2 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}