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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

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

  // ========================================================
  // MOTOR DE GENERACIÓN DE PDF PROFESIONAL (AJUSTADO A 1 HOJA)
  // ========================================================
  const exportToPDF = async (inspeccionesToExport: Inspeccion[], filename: string) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ format: "letter" }); // Tamaño Carta Exacto: 215.9mm x 279.4mm

      // 1. Cargar el Logo Corporativo de forma local
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

      // 2. Generar el reporte para cada inspección en 1 sola hoja
      for (let i = 0; i < inspeccionesToExport.length; i++) {
        const item = inspeccionesToExport[i];
        if (i > 0) doc.addPage();

        // Margen y coordenadas iniciales
        let y = 35;

        // --- ENCABEZADO CORPORATIVO ---
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 15, 12, 34, 12); 
        }

        doc.setFont("helvetica", "bold");
        doc.setTextColor(6, 182, 212); // Cian Corporativo
        doc.setFontSize(14);
        doc.text("INFORME DE AUDITORÍA DE RED", 200, 18, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139); // Gris
        doc.setFontSize(8);
        doc.text("Hospital San Vicente de Arauca — DC Telemática", 200, 23, { align: "right" });

        // Línea divisoria elegante
        doc.setDrawColor(6, 182, 212);
        doc.setLineWidth(0.4);
        doc.line(15, 28, 200, 28);

        // --- FUNCIONES INTERNAS DE DIBUJO ---
        const drawSectionHeader = (title: string, yPos: number) => {
          doc.setFillColor(6, 182, 212); // Fondo Cian
          doc.rect(15, yPos, 185, 5, 'F');
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8.5);
          doc.text(title, 18, yPos + 3.7);
        };

        const drawInfoRow = (label1: string, val1: string, label2: string, val2: string, yPos: number) => {
          // Fondo alternado sutil para legibilidad
          doc.setFillColor(248, 250, 252);
          doc.rect(15, yPos, 185, 5, 'F');

          doc.setFont("helvetica", "bold");
          doc.setTextColor(71, 85, 105);
          doc.setFontSize(8);
          doc.text(`${label1}:`, 18, yPos + 3.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          doc.text(`${val1 || "N/A"}`, 48, yPos + 3.5);

          if (label2) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(71, 85, 105);
            doc.text(`${label2}:`, 110, yPos + 3.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(15, 23, 42);
            doc.text(`${val2 || "N/A"}`, 140, yPos + 3.5);
          }
        };

        // --- SECCIÓN 1: DATOS DE IDENTIFICACIÓN ---
        drawSectionHeader("1. IDENTIFICACIÓN GENERAL", y);
        y += 5;
        drawInfoRow("Registro Número", item.registro_num || "N/A", "Fecha / Hora", item.fecha_hora || "N/A", y);
        y += 5;
        drawInfoRow("ID Punto de Red", item.punto_id || "N/A", "Ubicación Física", item.ubicacion || "N/A", y);
        y += 8;

        // --- SECCIÓN 2: RED Y CAPA ACTIVA ---
        drawSectionHeader("2. CONECTIVIDAD Y EQUIPO ACTIVO", y);
        y += 5;
        drawInfoRow("Puerto en Switch", item.switch_port || "N/A", "Estado del Puerto", item.switch_estado || "N/A", y);
        y += 5;
        drawInfoRow("Estado del Enlace", item.enlace || "N/A", "Prueba DHCP / IP", item.dhcp || "N/A", y);
        y += 8;

        // --- SECCIÓN 3: INFRAESTRUCTURA FÍSICA ---
        drawSectionHeader("3. INFRAESTRUCTURA FÍSICA Y ESTRUCTURAL", y);
        y += 5;
        drawInfoRow("Tipo Canalización", item.tipo_canalizacion || "N/A", "Estado Canalización", item.est_canalizacion || "N/A", y);
        y += 5;
        drawInfoRow("Estado Faceplate", item.fisico || "N/A", "Patch Cord (Toma-PC)", item.patch_estado || "N/A", y);
        y += 5;
        drawInfoRow("Categoría Cable", item.patch_cat || "N/A", "Fabricación Cable", item.patch_tipo || "N/A", y);
        y += 8;

        // --- SECCIÓN 4: REGISTRO FOTOGRÁFICO LADO A LADO ---
        drawSectionHeader("4. REGISTRO FOTOGRÁFICO", y);
        y += 5;

        // Diseñar rejilla lado a lado (3 fotos). Ancho de página útil = 185mm. 
        // Cada imagen medirá 56mm de ancho por 42mm de alto (Proporción perfecta 4:3)
        const imgWidth = 56;
        const imgHeight = 42;
        const imgY = y + 4;

        const drawPhotoWithLabel = (base64: string | undefined, title: string, xPos: number) => {
          doc.setFont("helvetica", "italic");
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(7.5);
          doc.text(title, xPos + (imgWidth / 2), y + 2, { align: "center" });

          // Dibujar marco gris
          doc.setDrawColor(226, 232, 240);
          doc.setFillColor(248, 250, 252);
          doc.rect(xPos, imgY, imgWidth, imgHeight, 'F');
          doc.rect(xPos, imgY, imgWidth, imgHeight, 'S');

          if (base64) {
            try {
              doc.addImage(base64, 'JPEG', xPos + 1, imgY + 1, imgWidth - 2, imgHeight - 2);
            } catch (e) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7);
              doc.text("(Error de imagen)", xPos + (imgWidth / 2), imgY + (imgHeight / 2), { align: "center" });
            }
          } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text("(Sin registro)", xPos + (imgWidth / 2), imgY + (imgHeight / 2), { align: "center" });
          }
        };

        // Renderizar fotos lado a lado con 8.5mm de separación
        drawPhotoWithLabel(item.foto_1_base64, "Panorámica", 15);
        drawPhotoWithLabel(item.foto_2_base64, "Detalle Faceplate", 79.5);
        drawPhotoWithLabel(item.foto_3_base64, "Adicional / Novedad", 144);

        y += imgHeight + 12;

        // --- PIE DE PÁGINA Y CONTROL DE CALIDAD ---
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(15, y, 200, y);
        y += 4;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(7.5);
        doc.text("Auditor Técnico:", 15, y);
        doc.line(15, y + 10, 80, y + 10); // Línea para firma del técnico

        doc.text("Firma de Recibido (Hospital):", 115, y);
        doc.line(115, y + 10, 180, y + 10); // Línea para firma de hospital

        doc.setFont("helvetica", "italic");
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(6.5);
        doc.text(`Documento generado por el Panel de Ingeniería de DC Telemática. Id Registro: ${item.id}`, 107.5, 268, { align: "center" });
      }

      doc.save(filename);
    } catch (error) {
      console.error("Error generando PDF:", error);
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
    <main className="relative z-10 min-h-screen p-4 md:p-8 text-gray-200">
      
      {/* Estilos para animación 3D de logotipo y tarjetas */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        @keyframes subtleOrbit {
          0% { transform: rotateY(-6deg) rotateX(4deg) translateY(0px); }
          50% { transform: rotateY(6deg) rotateX(-4deg) translateY(-5px); }
          100% { transform: rotateY(-6deg) rotateX(4deg) translateY(0px); }
        }
        .animate-3d-tilt {
          animation: subtleOrbit 6s ease-in-out infinite;
          transform-style: preserve-3d;
        }
      `}</style>

      {/* =========================================================
          MODAL DE CARGA DE PDF (Bloqueo elegante)
         ========================================================= */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
           <div className="w-16 h-16 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
           <h2 className="text-2xl font-bold text-cyan-400 animate-pulse text-center px-4">Diseñando Documento Carta...</h2>
           <p className="text-gray-400 mt-2 text-center px-4 max-w-md">Estructurando campos de red y distribuyendo registro fotográfico lado a lado en una sola página.</p>
        </div>
      )}

      {/* Encabezado del Panel con Animación 3D */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-6">
           {/* Logo Corporativo Animado en 3D sutil */}
           <div className="relative w-20 h-20 md:w-28 md:h-28 perspective-1000">
              <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative w-full h-full animate-3d-tilt">
                <Image
                  src="/logo.png" 
                  alt="Logo DC Telemática"
                  fill
                  className="object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.7)]"
                />
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
          {/* BOTÓN EXPORTAR TODO */}
          <button 
            onClick={() => handleGeneratePDF(inspecciones, "Reporte_General_Auditoria.pdf")}
            disabled={inspecciones.length === 0}
            className="flex-1 md:flex-none px-6 py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-black rounded-lg transition-all font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          >
            📄 Exportar Todo a PDF
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
                      <button onClick={() => handleGeneratePDF([inspeccion], `Reporte_Punto_${inspeccion.punto_id || 'Inspeccion'}.pdf`)} className="p-2 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black rounded transition-colors" title="Exportar a PDF">
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
          MODAL DE VISUALIZACIÓN DE DETALLES
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