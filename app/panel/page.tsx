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
  
  // Estados para los modales
  const [viewDoc, setViewDoc] = useState<Inspeccion | null>(null);
  const [editDoc, setEditDoc] = useState<Inspeccion | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // 1. Protección de ruta
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      }
    });

    // 2. Traer los datos en tiempo real ordenados por fecha
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

  // Función para eliminar un registro (Elimina de la base de datos, NO resetea el contador local)
  const handleDelete = async (id: string) => {
    if (window.confirm("⚠️ ¿Estás seguro de que deseas eliminar este registro permanentemente del panel?")) {
      try {
        await deleteDoc(doc(db, "inspecciones", id));
        // Nota: NO modificamos localStorage("dc_telematica_contador") aquí.
        // Esto asegura que la secuencia en el formulario (Registro N°) continúe sin alterarse.
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

  if (!isClient) return null;

  return (
    <main className="relative z-10 min-h-screen p-4 md:p-8 text-gray-200">
      
      {/* Encabezado del Panel */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-6">
           {/* Logo con animación 3D sutil */}
           <div className="relative w-24 h-24 md:w-32 md:h-32 transition-transform duration-700 hover:scale-110 hover:rotate-y-12 hover:rotate-x-12 perspective-1000">
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
        <button 
          onClick={handleLogout}
          className="mt-4 md:mt-0 px-6 py-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg transition-all font-bold"
        >
          Cerrar Sesión
        </button>
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
          <table className="w-full text-left border-collapse">
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
                  <td className="py-4 px-4 text-sm text-gray-400">{inspeccion.fecha_hora || "-"}</td>
                  <td className="py-4 px-4 font-medium text-cyan-100">{inspeccion.punto_id || "-"}</td>
                  <td className="py-4 px-4 text-sm">{inspeccion.ubicacion || "-"}</td>
                  <td className="py-4 px-4 text-center">
                    {inspeccion.foto_1_base64 || inspeccion.foto_2_base64 ? "📷 Sí" : "❌ No"}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center gap-3">
                      {/* Botón Ver */}
                      <button onClick={() => setViewDoc(inspeccion)} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-colors" title="Ver Detalles">
                        👁️
                      </button>
                      {/* Botón Editar */}
                      <button onClick={() => setEditDoc(inspeccion)} className="p-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors" title="Editar">
                        ✏️
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
              {/* Columna de Datos de Texto */}
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

              {/* Columna de Registro Fotográfico */}
              <div className="space-y-4">
                <h3 className="text-cyan-500 font-bold bg-white/5 p-3 rounded-lg text-center">📸 Registro Fotográfico</h3>
                
                {/* Foto 1 */}
                <div className="border border-white/10 rounded-lg p-2 bg-black/50">
                  <p className="text-xs text-gray-400 mb-2">1. Panorámica / Ubicación</p>
                  {viewDoc.foto_1_base64 ? (
                    <img src={viewDoc.foto_1_base64} alt="Foto 1" className="w-full h-auto max-h-48 object-contain rounded" />
                  ) : (
                    <div className="h-32 flex items-center justify-center text-gray-600 bg-white/5 rounded">Sin foto</div>
                  )}
                </div>

                {/* Foto 2 */}
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