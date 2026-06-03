"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";

// Configuración de Firebase (Se inicializa solo si no existe)
const firebaseConfig = {
  apiKey: "AIzaSyAuJtE7VKOm1wG5BEd_pde8_9aDaq33j8E",
  authDomain: "dc-telematica-auditoria.firebaseapp.com",
  projectId: "dc-telematica-auditoria",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Tipo de dato para TypeScript
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Estados para los modales
  const [viewDoc, setViewDoc] = useState<Inspeccion | null>(null);
  const [editDoc, setEditDoc] = useState<Inspeccion | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      }
    });

    const q = query(collection(db, "inspecciones"), orderBy("timestamp", "desc"));
    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const docs: Inspeccion[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setInspecciones(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error al cargar datos:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
    };
  }, [router]);

  // Función para cerrar sesión
  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  // Función para eliminar un registro
  const handleDelete = async (id: string) => {
    if (window.confirm("⚠️ ¿Estás seguro de que deseas eliminar este registro permanentemente del panel?")) {
      try {
        await deleteDoc(doc(db, "inspecciones", id));
      } catch (error) {
        console.error("Error eliminando:", error);
        alert("Hubo un error al eliminar el registro.");
      }
    }
  };

  // Función para guardar cambios en la edición
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
      alert("Error al actualizar el registro.");
    }
  };

  // ==========================================
  // MOTOR DE GENERACIÓN DE PDF (jsPDF)
  // ==========================================
  const exportToPDF = async (inspeccionesToExport: Inspeccion[], filename: string) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      for (let i = 0; i < inspeccionesToExport.length; i++) {
        const item = inspeccionesToExport[i];
        if (i > 0) doc.addPage();

        let y = 20;

        // Encabezado del PDF
        doc.setFillColor(6, 182, 212); // Color Cyan
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("REPORTE DE INSPECCION TECNICA", 105, 15, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Hospital San Vicente de Arauca - DC Telematica", 105, 22, { align: "center" });

        y = 40;
        doc.setTextColor(0, 0, 0);

        // Función ayudante para imprimir campos
        const addField = (label: string, value: string, isTitle = false) => {
          if (y > 270) { doc.addPage(); y = 20; }
          if (isTitle) {
            y += 5;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(6, 182, 212);
            doc.text(label, 20, y);
            doc.setTextColor(0, 0, 0);
            y += 7;
          } else {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`${label}:`, 20, y);
            doc.setFont("helvetica", "normal");
            const textWidth = doc.getTextWidth(`${label}: `);
            doc.text(`${value || "N/A"}`, 20 + textWidth, y);
            y += 7;
          }
        };

        // Sección: Datos Principales
        addField("DATOS PRINCIPALES", "", true);
        addField("Registro N.", item.registro_num || "");
        addField("Fecha y Hora", item.fecha_hora || "");
        addField("ID Punto de Red", item.punto_id || "");
        addField("Ubicacion Fisica", item.ubicacion || "");

        // Sección: Conectividad
        addField("RED Y CONECTIVIDAD", "", true);
        addField("Puerto en Switch", item.switch_port || "");
        addField("Estado en Switch", item.switch_estado || "");
        addField("Estado del Enlace", item.enlace || "");
        addField("Prueba DHCP / IP", item.dhcp || "");

        // Sección: Infraestructura
        addField("INFRAESTRUCTURA FISICA", "", true);
        addField("Tipo Canalizacion", item.tipo_canalizacion || "");
        addField("Estado Canalizacion", item.est_canalizacion || "");
        addField("Estado Patch Cord", `${item.patch_estado || "N/A"} (Cat: ${item.patch_cat || "N/A"})`);

        // Sección: Fotos
        addField("REGISTRO FOTOGRAFICO", "", true);
        y += 2;

        const addImageToDoc = (base64: string | undefined, label: string) => {
          if (!base64) return;
          if (y > 180) { doc.addPage(); y = 20; } // Salto de página si no cabe la foto
          doc.setFontSize(10);
          doc.setFont("helvetica", "italic");
          doc.text(label, 20, y);
          y += 5;
          try {
            // Dibuja la imagen guardada en Firebase (100x75 mm)
            doc.addImage(base64, 'JPEG', 20, y, 100, 75); 
            y += 85;
          } catch (e) {
            doc.text("(Error al procesar la imagen)", 20, y);
            y += 10;
          }
        };

        addImageToDoc(item.foto_1_base64, "1. Panoramica (Ubicacion)");
        addImageToDoc(item.foto_2_base64, "2. Detalle Faceplate/Jack");
        addImageToDoc(item.foto_3_base64, "3. Evidencia Adicional");
      }

      doc.save(filename);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error al generar PDF. Asegúrate de instalar jspdf (pnpm add jspdf).");
    }
  };

  // Manejador para envolver la carga del PDF y mostrar el loader
  const handleGeneratePDF = (docs: Inspeccion[], filename: string) => {
    setIsGeneratingPDF(true);
    setTimeout(async () => {
      await exportToPDF(docs, filename);
      setIsGeneratingPDF(false);
    }, 150); // Pequeño retraso para permitir que React dibuje el modal de carga
  };

  if (!isClient) return null;

  return (
    <main className="relative z-10 min-h-screen p-4 md:p-8 text-gray-200">
      
      {/* =======================
          MODAL DE CARGA DE PDF 
          ======================= */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
           <div className="w-16 h-16 border-4 border-green-900 border-t-green-400 rounded-full animate-spin mb-4"></div>
           <h2 className="text-2xl font-bold text-green-400 animate-pulse text-center px-4">Procesando Reporte PDF...</h2>
           <p className="text-gray-400 mt-2 text-center px-4">Compilando datos y registros fotográficos, por favor espera.</p>
        </div>
      )}

      {/* Encabezado del Panel */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-6">
           {/* Logo con animación 3D sutil */}
           <div className="relative w-20 h-20 md:w-28 md:h-28 transition-transform duration-700 hover:scale-110 hover:rotate-y-12 hover:rotate-x-12 perspective-1000">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl animate-pulse"></div>
              <Image
                src="/logo.png" 
                alt="Logo DC Telemática"
                fill
                className="object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]"
              />
            </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-wider">
              Panel de Ingeniería
            </h1>
            <p className="text-gray-400 text-sm mt-1">Gestión y Auditoría Hospital San Vicente de Arauca</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-0 w-full md:w-auto">
          {/* BOTÓN EXPORTAR TODO */}
          <button 
            onClick={() => handleGeneratePDF(inspecciones, "Todos_Los_Registros_Hospital.pdf")}
            disabled={inspecciones.length === 0}
            className="flex-1 md:flex-none px-6 py-3 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white rounded-lg transition-all font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.15)]"
          >
            📄 Exportar Todos a PDF
          </button>
          
          <button 
            onClick={handleLogout}
            className="flex-1 md:flex-none px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg transition-all font-bold"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl w-full p-4 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin"></div>
          </div>
        ) : inspecciones.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-xl">No hay registros de inspección todavía.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 text-cyan-400">
                <th className="py-4 px-4 font-semibold">Reg N°</th>
                <th className="py-4 px-4 font-semibold">Fecha</th>
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
                  <td className="py-4 px-4 font-medium text-cyan-100">{inspeccion.punto_id || "-"}</td>
                  <td className="py-4 px-4 text-sm">{inspeccion.ubicacion || "-"}</td>
                  <td className="py-4 px-4 text-center">
                    {inspeccion.foto_1_base64 || inspeccion.foto_2_base64 ? "📷 Sí" : "❌ No"}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center gap-2">
                      {/* Botón Ver */}
                      <button onClick={() => setViewDoc(inspeccion)} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-colors" title="Ver Detalles">
                        👁️
                      </button>
                      {/* Botón Editar */}
                      <button onClick={() => setEditDoc(inspeccion)} className="p-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors" title="Editar">
                        ✏️
                      </button>
                      {/* Botón PDF INDIVIDUAL */}
                      <button onClick={() => handleGeneratePDF([inspeccion], `Reporte_Punto_${inspeccion.punto_id || 'Inspeccion'}.pdf`)} className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded transition-colors" title="Exportar a PDF">
                        📄
                      </button>
                      {/* Botón Eliminar */}
                      <button onClick={() => handleDelete(inspeccion.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors" title="Eliminar">
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
          MODAL DE VISUALIZACIÓN DE DETALLES Y FOTOS
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
                <div className="bg-white/5 p-4 rounded-lg">
                  <h3 className="text-cyan-500 font-bold mb-2">📍 Datos Principales</h3>
                  <p><span className="text-gray-400">Registro N°:</span> {viewDoc.registro_num}</p>
                  <p><span className="text-gray-400">Fecha:</span> {viewDoc.fecha_hora}</p>
                  <p><span className="text-gray-400">Punto ID:</span> {viewDoc.punto_id}</p>
                  <p><span className="text-gray-400">Ubicación:</span> {viewDoc.ubicacion}</p>
                </div>
                
                <div className="bg-white/5 p-4 rounded-lg">
                  <h3 className="text-cyan-500 font-bold mb-2">🔌 Red y Conectividad</h3>
                  <p><span className="text-gray-400">Puerto Switch:</span> {viewDoc.switch_port || "N/A"}</p>
                  <p><span className="text-gray-400">Estado Switch:</span> {viewDoc.switch_estado || "N/A"}</p>
                  <p><span className="text-gray-400">Enlace:</span> {viewDoc.enlace || "N/A"}</p>
                  <p><span className="text-gray-400">Prueba DHCP:</span> {viewDoc.dhcp || "N/A"}</p>
                </div>

                <div className="bg-white/5 p-4 rounded-lg">
                  <h3 className="text-cyan-500 font-bold mb-2">🏗️ Infraestructura Física</h3>
                  <p><span className="text-gray-400">Canalización:</span> {viewDoc.tipo_canalizacion || "N/A"}</p>
                  <p><span className="text-gray-400">Estado Canalización:</span> {viewDoc.est_canalizacion || "N/A"}</p>
                  <p><span className="text-gray-400">Patch Cord:</span> {viewDoc.patch_estado || "N/A"} - {viewDoc.patch_cat}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-cyan-500 font-bold bg-white/5 p-3 rounded-lg text-center">📸 Registro Fotográfico</h3>
                
                <div className="border border-white/10 rounded-lg p-2 bg-black/50">
                  <p className="text-xs text-gray-400 mb-2">1. Panorámica / Ubicación</p>
                  {viewDoc.foto_1_base64 ? (
                    <img src={viewDoc.foto_1_base64} alt="Foto 1" className="w-full h-auto max-h-48 object-contain rounded" />
                  ) : (
                    <div className="h-32 flex items-center justify-center text-gray-600 bg-white/5 rounded">Sin foto</div>
                  )}
                </div>

                <div className="border border-white/10 rounded-lg p-2 bg-black/50">
                  <p className="text-xs text-gray-400 mb-2">2. Detalle Faceplate</p>
                  {viewDoc.foto_2_base64 ? (
                    <img src={viewDoc.foto_2_base64} alt="Foto 2" className="w-full h-auto max-h-48 object-contain rounded" />
                  ) : (
                    <div className="h-32 flex items-center justify-center text-gray-600 bg-white/5 rounded">Sin foto</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <button onClick={() => setViewDoc(null)} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors">
                Cerrar Detalles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE EDICIÓN DE REGISTRO
         ========================================================= */}
      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-yellow-500/30 p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(234,179,8,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-yellow-400">Editar Registro Principal</h2>
              <button onClick={() => setEditDoc(null)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Punto ID:</label>
                <input type="text" name="punto_id" defaultValue={editDoc.punto_id} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Ubicación:</label>
                <input type="text" name="ubicacion" defaultValue={editDoc.ubicacion} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Puerto Switch:</label>
                <input type="text" name="switch_port" defaultValue={editDoc.switch_port} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
              </div>

              <div className="pt-6 border-t border-white/10 flex gap-4">
                <button type="button" onClick={() => setEditDoc(null)} className="w-1/2 py-3 bg-transparent border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg transition-colors font-bold">
                  Cancelar
                </button>
                <button type="submit" className="w-1/2 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}