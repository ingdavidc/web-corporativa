"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeft, Camera, CheckCircle2, Clock, Upload, X } from "lucide-react";

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  asignado_a: string; // email or "Todos"
  estado: "Pendiente" | "En Progreso" | "Completada" | "Pausada";
  fecha_creacion: string;
  fecha_completada?: string;
  evidencia_foto_1?: string;
  notas_tecnico?: string;
  creado_por?: string;
  importancia?: string;
  fecha_programada?: string;
  materiales_utilizados?: string;
  estado_pago?: string;
}

export default function TareasTecnicoPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de ejecución
  const [activeTask, setActiveTask] = useState<Tarea | null>(null);
  const [notas, setNotas] = useState("");
  const [materiales, setMateriales] = useState("");
  const [fotoEvidencia, setFotoEvidencia] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        setUserEmail(user.email || "");
        
        // Cargar tareas del usuario (asignadas a él o a "Todos")
        const q = query(collection(db, "tareas_diarias"), orderBy("fecha_creacion", "desc"));
        const unsubscribeDb = onSnapshot(q, (snapshot) => {
          const docs: Tarea[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Tarea;
            if (data.asignado_a === user.email || data.asignado_a === "Todos") {
              docs.push({ ...data, id: doc.id });
            }
          });
          setTareas(docs);
          setLoading(false);
        });
        
        return () => unsubscribeDb();
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  const getCoordinates = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => {
          console.warn("Geolocation error:", error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  const loadLogo = (): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = document.createElement("img");
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "/logo.png";
    });
  };

  const handleCapturePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Obtenemos coordenadas y logo mientras se lee el archivo
    const [coords, logoImg] = await Promise.all([getCoordinates(), loadLogo()]);

    const reader = new FileReader();
    reader.onloadend = () => {
      // Compresión y adición de pie de página usando canvas
      const img = document.createElement("img");
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1024;
        const scaleSize = MAX_WIDTH / img.width;
        
        const footerHeight = 80;
        const imgHeight = img.height * scaleSize;
        
        canvas.width = MAX_WIDTH;
        canvas.height = imgHeight + footerHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Dibujar foto original
        ctx.drawImage(img, 0, 0, canvas.width, imgHeight);

        // Dibujar fondo del footer (Blanco para contraste profesional)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, imgHeight, canvas.width, footerHeight);

        // Dibujar línea separadora superior del footer
        ctx.strokeStyle = "#e5e7eb"; // gris claro
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, imgHeight);
        ctx.lineTo(canvas.width, imgHeight);
        ctx.stroke();

        // Dibujar logo si existe
        if (logoImg) {
          const logoRatio = logoImg.width / logoImg.height;
          const logoH = 50;
          const logoW = logoH * logoRatio;
          // Centrado verticalmente en el footer a la izquierda
          ctx.drawImage(logoImg, 20, imgHeight + (footerHeight - logoH) / 2, logoW, logoH);
        }

        // Textos del footer
        ctx.fillStyle = "#111111"; // Texto oscuro
        ctx.textAlign = "right";
        ctx.font = "bold 16px sans-serif";
        
        const date = new Date();
        const dateString = date.toLocaleDateString("es-ES") + " " + date.toLocaleTimeString("es-ES");
        ctx.fillText(`📅 ${dateString}`, canvas.width - 20, imgHeight + 35);
        
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#4b5563"; // Texto gris
        if (coords) {
          ctx.fillText(`📍 Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}`, canvas.width - 20, imgHeight + 60);
        } else {
          ctx.fillText(`📍 Ubicación no disponible`, canvas.width - 20, imgHeight + 60);
        }

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setFotoEvidencia(dataUrl);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !fotoEvidencia) {
      alert("La evidencia fotográfica es obligatoria para completar la tarea.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "tareas_diarias", activeTask.id), {
        estado: "Completada",
        fecha_completada: new Date().toISOString(),
        notas_tecnico: notas,
        materiales_utilizados: materiales,
        evidencia_foto_1: fotoEvidencia,
        ejecutado_por: userEmail
      });
      alert("✅ Tarea completada con éxito.");
      setActiveTask(null);
      setNotas("");
      setMateriales("");
      setFotoEvidencia(null);
    } catch (error) {
      console.error("Error al completar la tarea:", error);
      alert("Error al completar la tarea.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseTask = async () => {
    if (!activeTask) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "tareas_diarias", activeTask.id), {
        estado: "Pausada",
        notas_tecnico: notas,
        materiales_utilizados: materiales,
        evidencia_foto_1: fotoEvidencia || null,
        ejecutado_por: userEmail
      });
      alert("⏸️ Tarea pausada.");
      setActiveTask(null);
      setNotas("");
      setMateriales("");
      setFotoEvidencia(null);
    } catch (error) {
      console.error("Error al pausar la tarea:", error);
      alert("Error al pausar la tarea.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const markInProgress = async (task: Tarea) => {
    if (task.estado === "Pendiente" || task.estado === "Pausada") {
      try {
        await updateDoc(doc(db, "tareas_diarias", task.id), { estado: "En Progreso" });
      } catch (error) {
        console.error("Error al actualizar estado:", error);
      }
    }
    setActiveTask(task);
    setNotas(task.notas_tecnico || "");
    setMateriales(task.materiales_utilizados || "");
    setFotoEvidencia(task.evidencia_foto_1 || null);
  };

  if (!isClient) return null;

  const pendingTasks = tareas.filter(t => t.estado !== "Completada");
  const completedTasks = tareas.filter(t => t.estado === "Completada");

  return (
    <main className="min-h-[100dvh] bg-[#0a0a0a] text-gray-200 p-3 sm:p-4 md:p-8 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/portal-tecnico")}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-cyan-400">Trabajos Diarios</h1>
              <p className="text-xs md:text-sm text-gray-400">Bandeja de ejecución operativa</p>
            </div>
          </div>
          <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain shrink-0 md:w-[50px] md:h-[50px]" />
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Tareas Pendientes */}
            <section>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="text-yellow-500" size={20} /> Tareas Pendientes ({pendingTasks.length})
              </h2>
              {pendingTasks.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-400">
                  No tienes tareas pendientes asignadas.
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingTasks.map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => markInProgress(task)}
                      className="bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl hover:bg-white/10 cursor-pointer transition-all border-l-4 border-l-yellow-500 group"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                        <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors leading-tight">{task.titulo}</h3>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-1 shrink-0 flex-wrap">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${task.estado === 'En Progreso' ? 'bg-blue-500/20 text-blue-400' : task.estado === 'Pausada' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {task.estado}
                          </span>
                          {task.estado_pago && task.estado_pago !== 'Se debe' && (
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${task.estado_pago === 'Pago totalmente' ? 'border-green-500/30 text-green-400' : 'border-blue-500/30 text-blue-400'}`}>
                              💰 {task.estado_pago}
                            </span>
                          )}
                          {task.importancia && (
                            <span className={`px-2 py-1 rounded text-xs font-bold ${task.importancia === 'Urgente' ? 'bg-red-500/20 text-red-400' : task.importancia === 'Alta' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-300'}`}>
                              {task.importancia}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{task.descripcion}</p>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
                        <div className="text-xs text-gray-500">Asignado: {task.asignado_a}</div>
                        {task.fecha_programada && (
                          <div className="text-xs text-cyan-400 font-semibold bg-cyan-900/30 px-2 py-1 rounded w-full sm:w-auto text-center sm:text-left">
                            📅 {new Date(task.fecha_programada).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Tareas Completadas */}
            <section>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="text-green-500" size={20} /> Completadas Recientemente
              </h2>
              {completedTasks.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-400">
                  Aún no has completado tareas.
                </div>
              ) : (
                <div className="grid gap-4 opacity-70">
                  {completedTasks.slice(0, 5).map(task => (
                    <div key={task.id} className="bg-white/5 border border-white/10 p-5 rounded-xl border-l-4 border-l-green-500">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-md font-bold text-white">{task.titulo}</h3>
                        <span className="text-xs text-green-400 font-bold bg-green-500/20 px-2 py-1 rounded">Completada</span>
                      </div>
                      <p className="text-gray-400 text-sm">{task.notas_tecnico}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Modal de Ejecución de Tarea */}
      {activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#111] border border-cyan-500/30 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(6,182,212,0.15)] my-2 relative flex flex-col max-h-[96dvh]">
            
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-white/10 bg-white/5 shrink-0">
              <h2 className="text-base md:text-lg font-bold text-cyan-400 pr-4 leading-tight">{activeTask.titulo}</h2>
              <button onClick={() => setActiveTask(null)} className="text-gray-400 hover:text-white transition-colors p-1">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 md:p-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 mb-6 text-sm text-gray-300">
                <strong className="text-white block mb-1">Instrucciones de la tarea:</strong>
                {activeTask.descripcion}
              </div>

              <form onSubmit={handleCompleteTask} className="flex flex-col gap-6">
                
                {/* Notas */}
                <div>
                  <label className="text-sm font-bold text-gray-300 mb-2 block">Notas de Ejecución</label>
                  <textarea 
                    required
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Describe el trabajo realizado..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors min-h-[80px]"
                  />
                </div>

                {/* Materiales */}
                <div>
                  <label className="text-sm font-bold text-gray-300 mb-2 block">Materiales Utilizados (Opcional)</label>
                  <textarea 
                    value={materiales}
                    onChange={(e) => setMateriales(e.target.value)}
                    placeholder="Ej. 10m cable UTP, 4 conectores RJ45..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors min-h-[60px]"
                  />
                </div>

                {/* Evidencia Fotográfica (Obligatoria) */}
                <div>
                  <label className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                    Evidencia Fotográfica <span className="text-red-400 text-xs">(Obligatorio)</span>
                  </label>
                  
                  {fotoEvidencia ? (
                    <div className="relative group rounded-xl overflow-hidden border border-white/20">
                      <img src={fotoEvidencia} alt="Evidencia" className="w-full h-48 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                          <Camera size={18} /> Reemplazar Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-48 border-2 border-dashed border-cyan-500/50 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-xl flex flex-col items-center justify-center text-cyan-400 transition-colors"
                    >
                      <Camera size={40} className="mb-2 opacity-80" />
                      <span className="font-bold">Tomar Foto / Subir Archivo</span>
                    </button>
                  )}
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleCapturePhoto} 
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-3 mt-2 md:mt-4">
                  <button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={handlePauseTask}
                    className="w-1/3 py-3 md:py-4 rounded-xl font-bold text-white bg-gray-700 hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                  >
                    ⏸️ Pausar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !fotoEvidencia}
                    className={`w-2/3 py-3 md:py-4 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-1 sm:gap-2
                      ${(isSubmitting || !fotoEvidencia) ? 'opacity-50 cursor-not-allowed bg-gray-600' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/25'}`}
                  >
                    <CheckCircle2 size={20} />
                    {isSubmitting ? "Guardando..." : "Completar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
