"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function FormularioPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [registroNum, setRegistroNum] = useState(1);
  const [fechaHora, setFechaHora] = useState("");
  const [numSwitches, setNumSwitches] = useState(1);
  const [showOtros, setShowOtros] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [photos, setPhotos] = useState<{ [key: number]: string | null }>({ 1: null, 2: null, 3: null });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  
  // Estado para las coordenadas GPS
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Datos del auditor
  const [auditorName, setAuditorName] = useState("Ing. David Carreño");
  const [auditorEmail, setAuditorEmail] = useState("");

  const formRef = useRef<HTMLFormElement>(null);

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

    return () => unsubscribe();
  }, [router]);

  // --- MOTOR DE COMPRESIÓN Y MARCA DE AGUA TIPO "TIMEMARK" ---
  const processAndWatermarkImage = (base64Str: string, maxWidth = 1000): Promise<string> => {
    return new Promise((resolve) => {
      const img = new globalThis.Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = maxWidth / img.width;
        
        // Mantener proporciones
        canvas.width = ratio < 1 ? maxWidth : img.width;
        canvas.height = ratio < 1 ? img.height * ratio : img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(base64Str); // Fallback de seguridad

        // 1. Dibujar la foto original
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 2. Preparar los datos para la marca de agua
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-CO');
        const timeStr = now.toLocaleTimeString('es-CO');
        const coordsStr = location 
          ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}` 
          : "GPS: Buscando satélites...";
        
        // 3. Configurar tipografía adaptable al tamaño de la foto
        const fontSize = Math.floor(canvas.width * 0.025); // Tamaño dinámico
        const padding = fontSize;
        const lineSpacing = fontSize * 1.5;
        const boxHeight = (lineSpacing * 3.5) + padding;

        // 4. Dibujar fondo oscuro semitransparente para que las letras se lean siempre
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)"; // Negro al 65%
        ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);

        // 5. Estampar los textos (Marca de agua)
        ctx.textAlign = "left";
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        // Proyecto (Blanco)
        ctx.fillStyle = "#ffffff";
        ctx.fillText("PROYECTO: HOSPITAL SAN VICENTE DE ARAUCA - DC TELEMÁTICA", padding, canvas.height - boxHeight + padding + fontSize);
        
        // Fecha y Hora (Cian Corporativo)
        ctx.fillStyle = "#06b6d4";
        ctx.fillText(`FECHA: ${dateStr} - HORA: ${timeStr}`, padding, canvas.height - boxHeight + padding + fontSize + lineSpacing);
        
        // Coordenadas GPS (Gris claro)
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(`UBICACIÓN: ${coordsStr}`, padding, canvas.height - boxHeight + padding + fontSize + (lineSpacing * 2));

        // 6. Estampar el logo corporativo de forma sutil
        const logoImg = new globalThis.Image();
        logoImg.src = "/logo.png";
        
        logoImg.onload = () => {
          // Calcular tamaño: ocupará el 70% de la altura de la franja oscura
          const logoHeight = boxHeight * 0.7;
          const logoWidth = logoImg.width * (logoHeight / logoImg.height);
          
          // Posicionar a la derecha de la franja
          const logoX = canvas.width - logoWidth - padding;
          const logoY = canvas.height - boxHeight + (boxHeight - logoHeight) / 2;

          // Hacerlo sutil (semitransparente al 70%)
          ctx.globalAlpha = 0.7; 
          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0; // Restaurar opacidad normal

          // Devolver imagen procesada en formato JPEG
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };

        logoImg.onerror = () => {
          // Fallback: Si el logo no carga, devuelve la imagen solo con el texto
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
        // Pasa la foto por el motor de marca de agua antes de guardarla en el estado
        const watermarkedBase64 = await processAndWatermarkImage(originalBase64);
        setPhotos((prev) => ({ ...prev, [index]: watermarkedBase64 }));
      };
      reader.readAsDataURL(file);
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

      // Las fotos ya traen la marca de agua incrustada desde el handlePhotoChange
      data.foto_1_base64 = photos[1] || "";
      data.foto_2_base64 = photos[2] || "";
      data.foto_3_base64 = photos[3] || "";

      await addDoc(collection(db, "inspecciones"), data);
      
      localStorage.setItem("dc_telematica_contador", (registroNum + 1).toString());

      setIsSaving(false);

      if (accion === "continuar_punto") {
        setSaveSuccess("¡Punto de red guardado correctamente!");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setSaveSuccess("¡Muchas gracias por su dedicación y responsabilidad!");
        setTimeout(() => router.push("/"), 3500); 
      }

    } catch (error: unknown) {
      console.error("Error al guardar en Firebase:", error);
      alert("Error al guardar: Las fotos pueden ser muy pesadas o hay falla de red.");
      setIsSaving(false);
    }
  };

  if (!isClient) return null;

  return (
    <main className="relative z-10 min-h-screen p-4 md:p-8 flex justify-center pb-24 text-gray-200">
      
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

      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-3xl p-6 md:p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        
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
              MÓDULO DE AUDITORÍA PROFESIONAL E INSPECCIÓN FÍSICA
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
                <input type="text" name="ubicacion" placeholder="Ej. Piso 2, Oficina Contabilidad..." required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 focus:border-cyan-500 outline-none transition-colors" />
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
            <h2 className="text-xl font-bold text-cyan-400 border-b border-white/10 pb-2 mb-4 relative after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:w-16 after:h-[2px] after:bg-red-500">
              3. Trazabilidad a Cuarto de Equipos
            </h2>
            <div className="mb-4">
              <label className="text-sm font-semibold mb-1 block">Cantidad Total de Switches en la ruta:</label>
              <input type="number" min="1" value={numSwitches} onChange={(e) => setNumSwitches(parseInt(e.target.value) || 1)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 outline-none focus:border-cyan-500" />
            </div>

            <div className="space-y-4">
              {Array.from({ length: numSwitches }).map((_, i) => (
                <div key={i} className="bg-black/30 border-l-4 border-cyan-500 p-4 rounded-r-xl border border-white/5">
                  <h3 className="font-bold text-cyan-400 mb-3">{i === 0 ? "Switch 1 (Acceso / Borde)" : `Switch ${i + 1} (Intermedio / Core)`}</h3>
                  {i === 0 && (
                    <input type="text" name={`switch_nombre_${i + 1}`} placeholder="Nombre/IP (Ej. SW-Piso2 o 192.168.10.5)" className="w-full mb-3 bg-black/50 border border-white/10 rounded p-3 outline-none focus:border-cyan-500" />
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input type="text" name={`switch_marca_${i + 1}`} placeholder="Marca (Ej. Cisco)" className="w-full bg-black/50 border border-white/10 rounded p-3 outline-none focus:border-cyan-500" />
                    <input type="text" name={`switch_ref_${i + 1}`} placeholder="Modelo (Ej. 2960-X)" className="w-full bg-black/50 border border-white/10 rounded p-3 outline-none focus:border-cyan-500" />
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
              ))}
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
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </main>
  );
}