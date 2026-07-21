"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Clock, CheckCircle, XCircle, Edit, UploadCloud } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function MisRegistrosPage() {
  const router = useRouter();
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Modals state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [motivo, setMotivo] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPhotos, setEditPhotos] = useState<{ [key: number]: string | null }>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
        loadRegistros(user.email);
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadRegistros = async (email: string) => {
    setLoading(true);
    try {
      // Query inspecciones created by this user
      const q = query(
        collection(db, "inspecciones"),
        where("tecnico_email", "==", email)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort in memory because we can't reliably multi-query without an index
      docs.sort((a: any, b: any) => {
        const dateA = a.timestamp ? a.timestamp.toMillis() : 0;
        const dateB = b.timestamp ? b.timestamp.toMillis() : 0;
        return dateB - dateA;
      });
      
      setRegistros(docs);
    } catch (error) {
      console.error("Error loading records:", error);
    } finally {
      setLoading(false);
    }
  };

  const openRequestModal = (registro: any) => {
    setSelectedDoc(registro);
    setMotivo("");
    setRequestModalOpen(true);
  };

  const submitModificationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !motivo.trim()) return;

    try {
      await updateDoc(doc(db, "inspecciones", selectedDoc.id), {
        solicitud_modificacion: "Pendiente",
        motivo_modificacion: motivo.trim()
      });
      setRequestModalOpen(false);
      if (userEmail) loadRegistros(userEmail);
    } catch (error) {
      console.error("Error submitting request:", error);
    }
  };

  const openEditModal = (registro: any) => {
    setSelectedDoc(registro);
    setEditPhotos({
      1: registro.foto_1_base64 || null,
      2: registro.foto_2_base64 || null,
      3: registro.foto_3_base64 || null,
    });
    setEditModalOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, num: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhotos(prev => ({ ...prev, [num]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const submitEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDoc) return;

    const formData = new FormData(e.currentTarget);
    const dataToUpdate = {
      punto_id: formData.get("punto_id"),
      ubicacion: formData.get("ubicacion"),
      switch_port: formData.get("switch_port"),
      foto_1_base64: editPhotos[1],
      foto_2_base64: editPhotos[2],
      foto_3_base64: editPhotos[3],
      // Reset the modification request since it has been fulfilled
      solicitud_modificacion: null,
      motivo_modificacion: null
    };

    try {
      await updateDoc(doc(db, "inspecciones", selectedDoc.id), dataToUpdate);
      setEditModalOpen(false);
      if (userEmail) loadRegistros(userEmail);
    } catch (error) {
      console.error("Error updating record:", error);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-200 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <button 
          onClick={() => router.push("/portal-tecnico")}
          className="flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors"
        >
          <ArrowLeft className="mr-2" /> Volver al Portal
        </button>

        <h1 className="text-3xl font-bold text-white mb-6">Mis Registros de Consultoría</h1>

        {loading ? (
          <p className="text-cyan-400 animate-pulse">Cargando registros...</p>
        ) : registros.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400">No has enviado ninguna inspección aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registros.map(reg => (
              <div key={reg.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-cyan-500/30 transition-colors relative flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{reg.punto_id || "Sin ID"}</h3>
                      <p className="text-sm text-gray-400">{reg.ubicacion || "Sin ubicación"}</p>
                    </div>
                    <span className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-1 rounded font-semibold">
                      {reg.fecha_hora?.split(" ")[0]}
                    </span>
                  </div>

                  {/* Status Badges */}
                  <div className="mb-4">
                    {!reg.solicitud_modificacion && (
                      <span className="inline-flex items-center text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded">
                        Enviado
                      </span>
                    )}
                    {reg.solicitud_modificacion === "Pendiente" && (
                      <span className="inline-flex items-center text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded font-bold border border-yellow-500/30">
                        <Clock size={12} className="mr-1" /> Modificación Pendiente de Aprobación
                      </span>
                    )}
                    {reg.solicitud_modificacion === "Aprobada" && (
                      <span className="inline-flex items-center text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold border border-green-500/30">
                        <CheckCircle size={12} className="mr-1" /> Edición Aprobada
                      </span>
                    )}
                    {reg.solicitud_modificacion === "Rechazada" && (
                      <span className="inline-flex items-center text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-bold border border-red-500/30 flex flex-wrap mt-1">
                        <XCircle size={12} className="mr-1 mt-0.5" /> Solicitud Rechazada
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-white/10 mt-2">
                  {reg.solicitud_modificacion === "Aprobada" ? (
                    <button 
                      onClick={() => openEditModal(reg)}
                      className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                    >
                      <Edit size={16} className="mr-2" /> Editar Registro
                    </button>
                  ) : (
                    <button 
                      onClick={() => openRequestModal(reg)}
                      disabled={reg.solicitud_modificacion === "Pendiente"}
                      className={`w-full py-2 rounded-lg font-bold transition-colors text-sm flex items-center justify-center ${
                        reg.solicitud_modificacion === "Pendiente" 
                        ? "bg-white/5 text-gray-500 cursor-not-allowed" 
                        : "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black border border-cyan-500/30"
                      }`}
                    >
                      {reg.solicitud_modificacion === "Pendiente" ? "Solicitud en Revisión..." : "Solicitar Modificación"}
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL PARA SOLICITAR MODIFICACION */}
      {requestModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-cyan-500/30 rounded-2xl w-full max-w-md p-6 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            <h2 className="text-xl font-bold text-white mb-2">Solicitar Modificación</h2>
            <p className="text-sm text-gray-400 mb-6">
              El administrador debe aprobar esta solicitud antes de que puedas editar el registro <strong className="text-cyan-400">{selectedDoc.punto_id}</strong>.
            </p>
            <form onSubmit={submitModificationRequest}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-cyan-300 mb-2">Motivo de la modificación:</label>
                <textarea 
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej. Me equivoqué en el número de puerto del switch..."
                  required
                  rows={4}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none resize-none"
                ></textarea>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setRequestModalOpen(false)} className="flex-1 py-3 bg-transparent border border-gray-600 text-gray-300 hover:bg-white/5 rounded-lg transition-colors font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]">Enviar Solicitud</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR EL REGISTRO (UNA VEZ APROBADO) */}
      {editModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111] border border-green-500/30 rounded-2xl w-full max-w-2xl p-6 my-8 shadow-[0_0_40px_rgba(34,197,94,0.15)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-green-400">Editar Registro: {selectedDoc.punto_id}</h2>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            <form onSubmit={submitEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Punto ID:</label>
                  <input type="text" name="punto_id" defaultValue={selectedDoc.punto_id} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Puerto Switch:</label>
                  <input type="text" name="switch_port" defaultValue={selectedDoc.switch_port} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Ubicación:</label>
                  <input type="text" name="ubicacion" defaultValue={selectedDoc.ubicacion} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <label className="text-sm font-semibold text-gray-300 block mb-4">Fotos (Clic para cambiar):</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="relative">
                      <label 
                        htmlFor={`edit_foto_${num}`}
                        className="h-32 border border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors bg-cover bg-center overflow-hidden relative group"
                        style={{ backgroundImage: editPhotos[num] ? `url(${editPhotos[num]})` : "none" }}
                      >
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <UploadCloud className="text-white" />
                        </div>
                        {!editPhotos[num] && <span className="text-xs text-gray-500">Sin Foto {num}</span>}
                      </label>
                      <input type="file" id={`edit_foto_${num}`} accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(e, num)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-8 pt-4">
                <button type="button" onClick={() => setEditModalOpen(false)} className="w-1/3 py-3 bg-transparent border border-gray-600 text-gray-300 hover:bg-white/5 rounded-lg transition-colors font-bold">Cancelar</button>
                <button type="submit" className="w-2/3 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)]">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
