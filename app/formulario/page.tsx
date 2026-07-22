"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDocs, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface DispositivoRed {
  id: string;
  tipo: string;
  nombre: string;
  ip: string;
  marca: string;
  modelo: string;
  mac: string;
  mapCoords: { x: number, y: number } | null;
  createdAt: string;
}

export default function FormularioPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [registroNum, setRegistroNum] = useState(1);
  const [fechaHora, setFechaHora] = useState("");
  const [numSwitches, setNumSwitches] = useState<number | string>(1);
  const [showOtros, setShowOtros] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [photos, setPhotos] = useState<{ [key: number]: string | null }>({ 1: null, 2: null, 3: null });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);

  // Estado para las coordenadas GPS
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Estado para el plano de ubicación
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ x: number, y: number } | null>(null);
  
  // Estado para Dispositivos de Red
  const [dispositivos, setDispositivos] = useState<DispositivoRed[]>([]);
  const [selectedSwitches, setSelectedSwitches] = useState<Record<number, string>>({});
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [mapTarget, setMapTarget] = useState<"punto" | "dispositivo">("punto");
  const [ubicacionText, setUbicacionText] = useState("");
  
  // Datos del nuevo dispositivo
  const [newDevice, setNewDevice] = useState<Partial<DispositivoRed>>({ tipo: "Switch" });
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  
  // Datos del auditor
  const [auditorName, setAuditorName] = useState("Ing. David Carreño");
  const [auditorEmail, setAuditorEmail] = useState("");

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (pendingSync) {
        setPendingSync(false);
        alert("✅ Conexión recuperada: Todos los reportes guardados localmente han sido sincronizados en segundo plano.");
      }
    };
    const handleOffline = () => setIsOffline(true);
    
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pendingSync]);

  useEffect(() => {
    setIsClient(true);
    const fetchUltimoRegistro = async () => {
      try {
        const q = query(collection(db, "inspecciones"), orderBy("timestamp", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          // Buscar el número más alto en los últimos 5 registros por si alguno se corrompió
          let maxNum = 0;
          querySnapshot.forEach(doc => {
            const num = parseInt(doc.data().registro_num || "0", 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          });
          setRegistroNum(maxNum > 0 ? maxNum + 1 : 1);
        } else {
          setRegistroNum(1);
        }
      } catch (error) {
        console.warn("No se pudo obtener último registro (offline o error), usando fallback:", error);
        const contadorLocal = parseInt(localStorage.getItem("dc_telematica_contador") || "1", 10);
        setRegistroNum(isNaN(contadorLocal) ? 1 : contadorLocal);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        setAuditorEmail(user.email || "");
        if (user.displayName) {
          setAuditorName(user.displayName);
        } else {
          setAuditorName("Ing. David Carreño");
        }
        fetchUltimoRegistro();
      }
    });

    // Actualizar reloj
    const now = new Date();
    setFechaHora(now.toLocaleString("es-CO", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    }));

    // --- INICIAR RASTREO GPS ---
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("No se pudo obtener la ubicación GPS:", error.message);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }

    return () => {
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const q = query(collection(db, "dispositivos_red"), orderBy("nombre", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DispositivoRed));
      setDispositivos(list);
    }, (error) => {
      console.error("Error cargando dispositivos:", error);
    });
    return () => unsubscribe();
  }, []);

  // --- MOTOR DE COMPRESIÓN Y MARCA DE AGUA TIPO "TIMEMARK" ---
  const processAndWatermarkImage = (base64Str: string, maxWidth = 1000): Promise<string> => {
    return new Promise((resolve) => {
      const img = new globalThis.Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = maxWidth / img.width;
        
        canvas.width = ratio < 1 ? maxWidth : img.width;
        canvas.height = ratio < 1 ? img.height * ratio : img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(base64Str); 

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const now = new Date();
        const dateStr = now.toLocaleDateString('es-CO');
        const timeStr = now.toLocaleTimeString('es-CO');
        const coordsStr = location 
          ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}` 
          : "GPS: Buscando satélites...";
        
        const fontSize = Math.floor(canvas.width * 0.025);
        const padding = fontSize;
        const lineSpacing = fontSize * 1.5;
        const boxHeight = (lineSpacing * 3.5) + padding;

        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);

        ctx.textAlign = "left";
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        ctx.fillStyle = "#ffffff";
        ctx.fillText("PROYECTO: HOSPITAL SAN VICENTE DE ARAUCA - DC TELEMÁTICA", padding, canvas.height - boxHeight + padding + fontSize);
        
        ctx.fillStyle = "#06b6d4";
        ctx.fillText(`FECHA: ${dateStr} - HORA: ${timeStr}`, padding, canvas.height - boxHeight + padding + fontSize + lineSpacing);
        
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(`UBICACIÓN: ${coordsStr}`, padding, canvas.height - boxHeight + padding + fontSize + (lineSpacing * 2));

        const logoImg = new globalThis.Image();
        logoImg.src = "/logo.png";
        
        logoImg.onload = () => {
          const logoHeight = boxHeight * 0.7;
          const logoWidth = logoImg.width * (logoHeight / logoImg.height);
          const logoX = canvas.width - logoWidth - padding;
          const logoY = canvas.height - boxHeight + (boxHeight - logoHeight) / 2;

          ctx.globalAlpha = 0.7; 
          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0; 

          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };

        logoImg.onerror = () => {
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
      };
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const originalBase64 = reader.result as string;
        const watermarkedBase64 = await processAndWatermarkImage(originalBase64);
        setPhotos((prev) => ({ ...prev, [index]: watermarkedBase64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- GUARDAR DISPOSITIVO DE RED ---
  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevice.nombre || !newDevice.tipo) return;
    setIsSavingDevice(true);
    try {
      await addDoc(collection(db, "dispositivos_red"), {
        ...newDevice,
        createdAt: new Date().toISOString(),
      });
      setShowDeviceModal(false);
      setNewDevice({ tipo: "Switch" });
    } catch (error) {
      console.error("Error guardando dispositivo:", error);
      alert("Hubo un error al guardar el dispositivo.");
    } finally {
      setIsSavingDevice(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowModal(true);
    setSaveSuccess(null); 
  };

  const procesarGuardado = async (accion: string) => {
    if (!formRef.current) return;
    setIsSaving(true); 

    try {
      const formData = new FormData(formRef.current);
      const data = Object.fromEntries(formData.entries());
      data.accion_post_guardado = accion;
      data.timestamp = new Date().toISOString();
      data.auditor_email = auditorEmail;

      delete data.foto_1;
      delete data.foto_2;
      delete data.foto_3;

      data.foto_1_base64 = photos[1] || "";
      data.foto_2_base64 = photos[2] || "";
      data.foto_3_base64 = photos[3] || "";

      if (mapCoords) {
        data.plano_x = String(mapCoords.x);
        data.plano_y = String(mapCoords.y);
      }

      // Evitar duplicidad de registro_num consultando el último justo antes de guardar (si hay internet)
      let finalRegistroNum: string | number = registroNum;
      if (navigator.onLine) {
        try {
          const q = query(collection(db, "inspecciones"), orderBy("timestamp", "desc"), limit(5));
          const querySnapshot = await getDocs(q);
          let maxNum = 0;
          querySnapshot.forEach(doc => {
            const num = parseInt(String(doc.data().registro_num || "0").split('-')[0], 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          });
          finalRegistroNum = maxNum > 0 ? maxNum + 1 : 1;
        } catch (e) {
          console.warn("No se pudo refrescar el contador antes de guardar.", e);
        }
      } else {
        // Para registros offline concurrentes, agregamos un distintivo corto
        finalRegistroNum = `${registroNum}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }

      data.registro_num = String(finalRegistroNum);

      await addDoc(collection(db, "inspecciones"), data);
      
      localStorage.setItem("dc_telematica_contador", (registroNum + 1).toString());

      if (!navigator.onLine) {
        setSaveSuccess("⚠️ Guardado Localmente. No hay conexión a internet, los datos se sincronizarán cuando recuperes la señal.");
        setPendingSync(true);
      } else {
        setSaveSuccess("✅ ¡Registro Guardado y Sincronizado Exitosamente!");
      }

      setIsSaving(false);

      setTimeout(() => {
        if (accion === "continuar_punto") {
          window.location.reload();
        } else {
          router.push("/");
        }
      }, !navigator.onLine ? 4000 : 1500);

    } catch (error: unknown) {
      console.error("Error al guardar en Firebase:", error);
      alert("Error al guardar: Las fotos pueden ser muy pesadas o hay falla de red.");
      setIsSaving(false);
    }
  };

  if (!isClient) return null;

  return (
    <main className="container mx-auto px-4 py-8 relative">
      
      {/* Estilos para animación 3D de logotipo */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
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

        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 flex items-center justify-center gap-2 font-bold animate-pulse">
            ⚠️ Estás sin conexión. El modo offline está activo. Los datos se guardarán localmente.
          </div>
        )}

      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-3xl p-6 md:p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)] mx-auto">
        
        {/* Cabecera con Logotipo Animado en 3D */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8 border border-cyan-500/30 bg-cyan-900/10 p-6 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <div className="relative w-24 h-24 md:w-28 md:h-28 perspective-1000 shrink-0">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-full h-full animate-3d-tilt">
              <Image
                src="/logo.png" 
                alt="Logo DC Telemática"
                fill
                className="object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                priority
              />
            </div>
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-wider">
              Consultoría Hospital San Vicente de Arauca
            </h1>
            <p className="text-cyan-100/70 text-sm mt-2 font-medium tracking-wide">
              MÓDULO DE AUDITORÍA TÉCNICA E INSPECCIÓN FÍSICA
            </p>
            {/* Indicador de GPS */}
            <p className={`text-xs mt-2 font-bold ${location ? 'text-green-400' : 'text-yellow-400 animate-pulse'}`}>
              {location ? `📍 GPS Activo: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "📍 Buscando señal GPS..."}
            </p>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
          
          {/* Metadatos */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="col-span-1">
              <label className="text-xs text-gray-400 uppercase font-semibold">Registro N°:</label>
              <input type="text" name="registro_num" value={registroNum} readOnly className="w-full bg-black/50 border border-white/10 rounded p-3 text-cyan-400 font-bold text-center mt-1 outline-none" />
            </div>
            <div className="col-span-1 md:col-span-1">
              <label className="text-xs text-gray-400 uppercase font-semibold">Fecha y Hora:</label>
              <input type="text" name="fecha_hora" value={fechaHora} readOnly className="w-full bg-black/50 border border-white/10 rounded p-3 text-gray-300 font-bold mt-1 outline-none text-center" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="text-xs text-gray-400 uppercase font-semibold">Auditor Profesional:</label>
              <input type="text" name="auditor_profesional" value={auditorName} readOnly className="w-full bg-black/50 border border-white/10 rounded p-3 text-cyan-100 font-bold mt-1 outline-none" />
            </div>
          </div>

          {/* 1. Identificación del Punto */}
          <section>
            <h2 className="text-xl font-bold text-cyan-400 border-b border-white/10 pb-2 mb-4 relative after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:w-16 after:h-[2px] after:bg-red-500">
              1. Identificación del Punto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">ID del Punto de Red:</label>
                <input type="text" name="punto_id" placeholder="Ej. Nodo A, P-01..." required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 focus:border-cyan-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Ubicación Física:</label>
                <div className="flex gap-2">
                  <input type="text" name="ubicacion" value={ubicacionText} onChange={(e) => setUbicacionText(e.target.value)} placeholder="Ej. Piso 2, Oficina Contabilidad..." required={!mapCoords} className="flex-1 w-full bg-black/40 border border-white/10 rounded-lg p-3 focus:border-cyan-500 outline-none transition-colors" />
                  <button type="button" onClick={() => { setMapTarget("punto"); setShowMapModal(true); }} className={`font-bold px-3 py-3 rounded-lg transition-colors flex items-center justify-center shrink-0 text-white ${mapCoords ? 'bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-cyan-600 hover:bg-cyan-500'}`} title="Ubicar en plano">
                    {mapCoords ? "✅ Plano Guardado" : "📍 Ubicar en Plano"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Estado Físico y Estructural */}
          <section>
            <h2 className="text-xl font-bold text-cyan-400 border-b border-white/10 pb-2 mb-4 relative after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:w-16 after:h-[2px] after:bg-red-500">
              2. Estado Físico y Estructural
            </h2>
            
            <div className="space-y-6">
              {/* Faceplate */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <label className="font-semibold block mb-3 text-cyan-100">Faceplate y Jack RJ45:</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/5 rounded"><input type="checkbox" name="fisico" value="buen_estado" className="w-5 h-5 accent-cyan-500" /><span>Buen estado general</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/5 rounded"><input type="checkbox" name="fisico" value="roto" className="w-5 h-5 accent-cyan-500" /><span>Faceplate roto/suelto</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/5 rounded"><input type="checkbox" name="fisico" value="pines_dañados" className="w-5 h-5 accent-cyan-500" /><span>Pines oxidados/doblados</span></label>
                </div>
              </div>

              {/* Cableado */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <label className="font-semibold block mb-3 text-cyan-100">Cableado y Etiquetado:</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/5 rounded"><input type="checkbox" name="cable" value="etiquetado" className="w-5 h-5 accent-cyan-500" /><span>Correctamente etiquetado</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/5 rounded"><input type="checkbox" name="cable" value="sin_etiqueta" className="w-5 h-5 accent-cyan-500" /><span>Sin identificar</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/5 rounded"><input type="checkbox" name="cable" value="expuesto" className="w-5 h-5 accent-cyan-500" /><span>Cable expuesto</span></label>
                </div>
              </div>

              {/* Continuidad */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <label className="font-semibold block mb-3 text-cyan-100">Continuidad del Cableado Horizontal:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/5 rounded"><input type="checkbox" name="continuidad" value="ok" className="w-5 h-5 accent-cyan-500" /><span>Continuidad OK (8 hilos)</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/5 rounded"><input type="checkbox" name="continuidad" value="abierto" className="w-5 h-5 accent-cyan-500" /><span>Pares abiertos / rotos</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/5 rounded"><input type="checkbox" name="continuidad" value="cruzado" className="w-5 h-5 accent-cyan-500" /><span>Pares cruzados</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/5 rounded"><input type="checkbox" name="continuidad" value="corto" className="w-5 h-5 accent-cyan-500" /><span>Cortocircuito</span></label>
                </div>
              </div>

              {/* Canalización */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <label className="font-semibold block mb-3 text-cyan-100">Tipo de Canalización:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="tipo_canalizacion" value="canaleta" className="w-5 h-5 accent-cyan-500" /><span>Canaleta Plástica</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="tipo_canalizacion" value="emt" className="w-5 h-5 accent-cyan-500" /><span>Tubería EMT</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="tipo_canalizacion" value="pvc" className="w-5 h-5 accent-cyan-500" /><span>Tubería PVC</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="tipo_canalizacion" value="bandeja" className="w-5 h-5 accent-cyan-500" /><span>Bandeja Portacable</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="tipo_canalizacion" value="otros" onChange={(e) => setShowOtros(e.target.checked)} className="w-5 h-5 accent-cyan-500" /><span>Otros</span></label>
                </div>
                {showOtros && (
                  <input type="text" name="otro_canalizacion_texto" placeholder="Especifique..." className="w-full bg-black/40 border border-white/10 rounded p-3 mb-4 outline-none focus:border-cyan-500" />
                )}

                <label className="font-semibold block mb-3 mt-4 text-cyan-100 border-t border-white/10 pt-4">Estado de la Canalización:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="est_canalizacion" value="buen_estado" className="w-5 h-5 accent-cyan-500" /><span>Buen estado</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="est_canalizacion" value="suelta" className="w-5 h-5 accent-cyan-500" /><span>Suelta / Mal fijada</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="est_canalizacion" value="saturada" className="w-5 h-5 accent-cyan-500" /><span>Sobresaturada</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="est_canalizacion" value="rota" className="w-5 h-5 accent-cyan-500" /><span>Rota / Sin tapas</span></label>
                </div>
              </div>

              {/* Patch Cord */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <label className="font-semibold block mb-3 text-cyan-100">Patch Cord (Toma a PC):</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="patch_estado" value="buen_estado" className="w-5 h-5 accent-cyan-500" /><span>Buen estado</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="patch_estado" value="roto" className="w-5 h-5 accent-cyan-500" /><span>Conectores rotos</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="patch_estado" value="deteriorado" className="w-5 h-5 accent-cyan-500" /><span>Cable deteriorado</span></label>
                  <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" name="patch_estado" value="ausente" className="w-5 h-5 accent-cyan-500" /><span>Ausente</span></label>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 mb-4">
                  <label className="flex items-center space-x-2"><input type="checkbox" name="patch_cat" value="cat5e" className="w-5 h-5 accent-cyan-500" /><span>Cat 5e</span></label>
                  <label className="flex items-center space-x-2"><input type="checkbox" name="patch_cat" value="cat6" className="w-5 h-5 accent-cyan-500" /><span>Cat 6/6A</span></label>
                  <label className="flex items-center space-x-2"><input type="checkbox" name="patch_tipo" value="fabrica" className="w-5 h-5 accent-cyan-500" /><span>De Fábrica</span></label>
                  <label className="flex items-center space-x-2"><input type="checkbox" name="patch_tipo" value="armado" className="w-5 h-5 accent-cyan-500" /><span>Armado (Hechizo)</span></label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" name="patch_marca" placeholder="Marca (Ej. Panduit)" className="w-full bg-black/40 border border-white/10 rounded p-3 outline-none focus:border-cyan-500" />
                  <input type="text" name="patch_longitud" placeholder="Longitud (Ej. 2m)" className="w-full bg-black/40 border border-white/10 rounded p-3 outline-none focus:border-cyan-500" />
                </div>
              </div>
            </div>
          </section>

          {/* 3. Trazabilidad a Switch */}
          <section>
            <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-4 relative after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:w-16 after:h-[2px] after:bg-red-500">
              <h2 className="text-xl font-bold text-cyan-400">
                3. Trazabilidad a Cuarto de Equipos
              </h2>
              <button 
                type="button" 
                onClick={() => setShowDeviceModal(true)}
                className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white px-3 py-1.5 rounded-lg border border-cyan-500/30 transition-colors text-sm font-bold flex items-center gap-1"
              >
                <span>➕</span> Registrar Equipo
              </button>
            </div>
            
            <div className="mb-4">
              <label className="text-sm font-semibold mb-1 block">Cantidad Total de Switches en la ruta:</label>
              <input 
                type="number" 
                min="1" 
                value={numSwitches} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setNumSwitches("");
                  } else {
                    setNumSwitches(parseInt(val, 10) || 1);
                  }
                }} 
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 outline-none focus:border-cyan-500" 
              />
            </div>

            <div className="space-y-4">
              {Array.from({ length: numSwitches === "" ? 0 : (numSwitches as number) }).map((_, i) => {
                const deviceId = selectedSwitches[i + 1];
                const device = dispositivos.find(d => d.id === deviceId);
                return (
                  <div key={i} className="bg-black/30 border-l-4 border-cyan-500 p-4 rounded-r-xl border border-white/5">
                    <h3 className="font-bold text-cyan-400 mb-3">{i === 0 ? "Switch 1 (Acceso / Borde)" : `Switch ${i + 1} (Intermedio / Core)`}</h3>
                    
                    {/* Campos ocultos para PDF */}
                    <input type="hidden" name={`switch_nombre_${i + 1}`} value={device?.nombre || ""} />
                    <input type="hidden" name={`switch_marca_${i + 1}`} value={device?.marca || ""} />
                    <input type="hidden" name={`switch_ref_${i + 1}`} value={device?.modelo || ""} />

                    <div className="mb-3">
                      <select 
                        value={deviceId || ""} 
                        onChange={(e) => setSelectedSwitches(prev => ({ ...prev, [i + 1]: e.target.value }))}
                        className="w-full bg-black/50 border border-white/10 rounded p-3 outline-none focus:border-cyan-500 cursor-pointer"
                        required
                      >
                        <option value="">-- Seleccionar Equipo de Red --</option>
                        {dispositivos
                          .filter(d => d.tipo === "Switch")
                          .map(d => (
                          <option key={d.id} value={d.id}>{d.tipo} - {d.nombre} ({d.ip})</option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-white/5 p-3 rounded">
                    <label className="text-xs text-gray-400 uppercase font-semibold mb-2 block">Medio de Enlace:</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <label className="flex items-center space-x-2 text-sm"><input type="radio" name={`switch_cable_${i + 1}`} value="FO" className="w-4 h-4 accent-cyan-500" /><span>FO</span></label>
                      <label className="flex items-center space-x-2 text-sm"><input type="radio" name={`switch_cable_${i + 1}`} value="6" className="w-4 h-4 accent-cyan-500" /><span>Cat 6</span></label>
                      <label className="flex items-center space-x-2 text-sm"><input type="radio" name={`switch_cable_${i + 1}`} value="6A" className="w-4 h-4 accent-cyan-500" /><span>Cat 6A</span></label>
                      <label className="flex items-center space-x-2 text-sm"><input type="radio" name={`switch_cable_${i + 1}`} value="5E" className="w-4 h-4 accent-cyan-500" /><span>Cat 5e</span></label>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold mb-1 block">Puerto del Switch / Patch Panel:</label>
              <input type="text" name="switch_port" placeholder="Ej. Gi1/0/24 o Panel A-12" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 outline-none focus:border-cyan-500 mb-4" />
              
              <label className="text-sm font-semibold mb-2 block text-cyan-100">Estado en el Equipo Activo:</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                <label className="flex items-center space-x-2"><input type="checkbox" name="switch_estado" value="up" className="w-5 h-5 accent-cyan-500" /><span>Puerto Up</span></label>
                <label className="flex items-center space-x-2"><input type="checkbox" name="switch_estado" value="down" className="w-5 h-5 accent-cyan-500" /><span>Shutdown</span></label>
                <label className="flex items-center space-x-2"><input type="checkbox" name="switch_estado" value="poe" className="w-5 h-5 accent-cyan-500" /><span>PoE Activo</span></label>
              </div>
            </div>
          </section>

          {/* 4. Conectividad */}
          <section>
            <h2 className="text-xl font-bold text-cyan-400 border-b border-white/10 pb-2 mb-4 relative after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:w-16 after:h-[2px] after:bg-red-500">
              4. Conectividad y Capa Lógica
            </h2>
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="font-semibold block mb-3 text-cyan-100">Estado del Enlace:</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2"><input type="checkbox" name="enlace" value="estable" className="w-5 h-5 accent-cyan-500" /><span>Estable</span></label>
                  <label className="flex items-center space-x-2"><input type="checkbox" name="enlace" value="intermitente" className="w-5 h-5 accent-cyan-500" /><span>Intermitente</span></label>
                  <label className="flex items-center space-x-2"><input type="checkbox" name="enlace" value="sin_conexion" className="w-5 h-5 accent-cyan-500" /><span>Sin conexión (Down)</span></label>
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-3 text-cyan-100">Prueba DHCP / IP:</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2"><input type="checkbox" name="dhcp" value="exitoso" className="w-5 h-5 accent-cyan-500" /><span>Asignación IP correcta</span></label>
                  <label className="flex items-center space-x-2"><input type="checkbox" name="dhcp" value="falla" className="w-5 h-5 accent-cyan-500" /><span>Falla DHCP / Conflicto</span></label>
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-3 text-cyan-100">Velocidad del Enlace:</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2"><input type="radio" name="velocidad_enlace" value="10M" className="w-5 h-5 accent-cyan-500" /><span>10M</span></label>
                  <label className="flex items-center space-x-2"><input type="radio" name="velocidad_enlace" value="100M" className="w-5 h-5 accent-cyan-500" /><span>100M</span></label>
                  <label className="flex items-center space-x-2"><input type="radio" name="velocidad_enlace" value="GIGA" className="w-5 h-5 accent-cyan-500" /><span>GIGA</span></label>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Fotos */}
          <section>
            <h2 className="text-xl font-bold text-cyan-400 border-b border-white/10 pb-2 mb-4 relative after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:w-16 after:h-[2px] after:bg-red-500">
              5. Registro Fotográfico (Con GPS e Info)
            </h2>
            <p className="text-sm text-yellow-400 mb-4 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
              ⚠️ Al tomar la foto, el sistema incrustará automáticamente la ubicación GPS, fecha, hora y proyecto sobre la imagen.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex flex-col">
                  <label className="text-sm font-semibold mb-2">
                    {num === 1 ? "1. Panorámica (Ubicación)" : num === 2 ? "2. Detalle (Faceplate/Jack)" : "3. Evidencia Adicional"}
                  </label>
                  <label
                    htmlFor={`foto_${num}`}
                    className="h-48 border-2 border-dashed border-cyan-500/50 rounded-xl flex items-center justify-center cursor-pointer hover:bg-cyan-500/10 transition-colors bg-cover bg-center overflow-hidden"
                    style={{ backgroundImage: photos[num] ? `url(${photos[num]})` : "none", borderStyle: photos[num] ? 'solid' : 'dashed' }}
                  >
                    <span className="bg-black/70 text-white px-4 py-2 rounded-full font-bold shadow-lg text-sm pointer-events-none backdrop-blur-sm">
                      {photos[num] ? "🔄 Cambiar Foto" : "📷 Tomar Foto"}
                    </span>
                  </label>
                  <input type="file" id={`foto_${num}`} name={`foto_${num}`} accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoChange(e, num)} />
                </div>
              ))}
            </div>
          </section>

          <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            Guardar Inspección
          </button>
        </form>
      </div>

      {/* Modal de Decisión y Animación de Guardado */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-opacity duration-300">
          <div className="bg-[#0a0a0a] border border-cyan-500/30 p-6 md:p-8 rounded-2xl w-full max-w-sm text-center shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden">
            
            {/* ESTADO 1: Animación de Carga */}
            {isSaving && (
              <div className="flex flex-col items-center py-6 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-bold text-cyan-400 animate-pulse">Guardando datos...</h3>
                <p className="text-sm text-gray-500 mt-2">Comprimiendo imágenes y enviando registro</p>
              </div>
            )}

            {/* ESTADO 2: Mensaje de Éxito */}
            {!isSaving && saveSuccess && (
              <div className="flex flex-col items-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-20 h-20 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mb-6 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 leading-relaxed">{saveSuccess}</h3>
              </div>
            )}

            {/* ESTADO 3: Pregunta inicial */}
            {!isSaving && !saveSuccess && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-2xl font-bold text-cyan-400 mb-2">Inspección Lista</h3>
                <p className="text-gray-400 mb-6">¿Qué deseas hacer a continuación?</p>
                
                <div className="flex flex-col gap-3">
                  <button onClick={() => procesarGuardado('continuar_punto')} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-all hover:scale-[1.02]">
                    Siguiente Punto de Red
                  </button>
                  <button onClick={() => procesarGuardado('terminar_jornada')} className="w-full bg-transparent border-2 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 font-bold py-3 rounded-lg transition-all hover:scale-[1.02]">
                    Terminar Jornada del Día
                  </button>
                  <button onClick={() => setShowModal(false)} className="w-full text-gray-500 hover:text-white underline py-2 mt-2 transition-colors">
                    Cancelar y revisar formulario
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal del Plano Interactivo */}
      {showMapModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-[#0a0a0a] border border-cyan-500/30 p-4 md:p-6 rounded-xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.15)]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg md:text-xl font-bold text-cyan-400">Seleccionar Ubicación en Plano</h3>
              <button type="button" onClick={() => setShowMapModal(false)} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
            </div>
            <p className="text-xs md:text-sm text-gray-400 mb-4">Haz clic sobre el plano para marcar el punto exacto de la red.</p>
            
            <div className="flex-1 overflow-hidden bg-[#111] rounded-lg border border-white/10 relative flex justify-center items-center shadow-inner">
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={10}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
                pinch={{ step: 5 }}
                doubleClick={{ disabled: true }}
              >
                {({ zoomIn, zoomOut, state }) => (
                  <div className="flex flex-col w-full h-full">
                    <div className="flex-1 overflow-hidden w-full h-full cursor-grab active:cursor-grabbing">
                      <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                        <div 
                          className="relative inline-block touch-none"
                          onTouchStartCapture={(e) => {
                            if (e.touches.length === 1) {
                              e.currentTarget.dataset.startX = String(e.touches[0].clientX);
                              e.currentTarget.dataset.startY = String(e.touches[0].clientY);
                            }
                          }}
                          onTouchEndCapture={(e) => {
                            if (e.changedTouches.length === 1) {
                              const startX = parseFloat(e.currentTarget.dataset.startX || "0");
                              const startY = parseFloat(e.currentTarget.dataset.startY || "0");
                              const touch = e.changedTouches[0];
                              
                              if (Math.abs(touch.clientX - startX) > 25 || Math.abs(touch.clientY - startY) > 25) {
                                return;
                              }
                              
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = ((touch.clientX - rect.left) / rect.width) * 100;
                              const y = ((touch.clientY - rect.top) / rect.height) * 100;
                              if (mapTarget === "punto") setMapCoords({ x, y });
                              else setNewDevice(prev => ({ ...prev, mapCoords: { x, y } }));
                            }
                          }}
                          onClickCapture={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            if (mapTarget === "punto") setMapCoords({ x, y });
                            else setNewDevice(prev => ({ ...prev, mapCoords: { x, y } }));
                          }}
                        >
                          <img src="/plano_hospital.webp" alt="Plano del Hospital" className="w-full max-w-[800px] h-auto block pointer-events-none" />
                          
                          {/* Pin del Formulario */}
                          {mapTarget === "punto" && mapCoords && (
                            <div 
                              className="absolute flex items-center justify-center pointer-events-none transition-all"
                              style={{ 
                                left: `calc(${mapCoords.x}% - 8px)`, 
                                top: `calc(${mapCoords.y}% - 8px)`,
                                transform: `scale(${1 / state.scale})`
                              }}
                            >
                              <div className="w-4 h-4 bg-cyan-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(6,182,212,1)]"></div>
                            </div>
                          )}

                          {/* Pin del Dispositivo */}
                          {mapTarget === "dispositivo" && newDevice.mapCoords && (
                            <div 
                              className="absolute flex items-center justify-center pointer-events-none transition-all"
                              style={{ 
                                left: `calc(${newDevice.mapCoords.x}% - 8px)`, 
                                top: `calc(${newDevice.mapCoords.y}% - 8px)`,
                                transform: `scale(${1 / state.scale})`
                              }}
                            >
                              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(59,130,246,1)]"></div>
                            </div>
                          )}
                        </div>
                      </TransformComponent>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10 px-2 shrink-0">
                      <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/10">
                        <button type="button" onClick={() => zoomOut()} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded font-bold text-xl transition-colors">-</button>
                        <span className="text-white text-sm font-bold min-w-[40px] text-center">{Math.round(state.scale * 100)}%</span>
                        <button type="button" onClick={() => zoomIn()} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded font-bold text-xl transition-colors">+</button>
                      </div>

                      <div className="flex gap-3">
                        <button type="button" onClick={() => {
                          if (mapTarget === "punto") {
                            setMapCoords(null);
                            setUbicacionText("");
                          }
                          else setNewDevice(prev => ({ ...prev, mapCoords: null }));
                        }} className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-semibold text-sm">
                          Borrar Marca
                        </button>
                        <button type="button" onClick={() => {
                          setShowMapModal(false);
                          if (mapTarget === "punto" && mapCoords) {
                            setUbicacionText("📍 Ubicación Guardada en Plano");
                          }
                        }} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors text-sm">
                          Confirmar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </TransformWrapper>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Dispositivo */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-cyan-500/30 p-6 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(6,182,212,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-cyan-400">Registrar Equipo Activo</h2>
              <button onClick={() => setShowDeviceModal(false)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleSaveDevice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Tipo de Equipo:</label>
                  <select value={newDevice.tipo} onChange={e=>setNewDevice({...newDevice, tipo: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none">
                    <option value="Switch">Switch</option>
                    <option value="Router">Router</option>
                    <option value="AP">Access Point (AP)</option>
                    <option value="Firewall">Firewall</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Nombre (Hostname):</label>
                  <input type="text" required value={newDevice.nombre || ""} onChange={e=>setNewDevice({...newDevice, nombre: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="Ej. SW-PISO-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Dirección IP:</label>
                  <input type="text" value={newDevice.ip || ""} onChange={e=>setNewDevice({...newDevice, ip: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="Ej. 10.0.0.5" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Dirección MAC:</label>
                  <input type="text" value={newDevice.mac || ""} onChange={e=>setNewDevice({...newDevice, mac: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="AA:BB:CC..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Marca:</label>
                  <input type="text" required value={newDevice.marca || ""} onChange={e=>setNewDevice({...newDevice, marca: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="Ej. Cisco" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Modelo / Ref:</label>
                  <input type="text" required value={newDevice.modelo || ""} onChange={e=>setNewDevice({...newDevice, modelo: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="Ej. C9200L" />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-2">Ubicación Física:</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setMapTarget("dispositivo"); setShowMapModal(true); }} className={`flex-1 flex items-center justify-center py-3 rounded-lg border font-semibold transition-colors ${newDevice.mapCoords ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}>
                    {newDevice.mapCoords ? "📍 Ubicación Guardada" : "📍 Ubicar en el Plano"}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex gap-4 mt-2">
                <button type="button" onClick={() => setShowDeviceModal(false)} className="w-1/2 py-3 bg-transparent border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg transition-colors font-bold">Cancelar</button>
                <button type="submit" disabled={isSavingDevice} className="w-1/2 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
                  {isSavingDevice ? "Guardando..." : "Guardar Equipo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}