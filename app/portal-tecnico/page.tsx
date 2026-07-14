"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ClipboardList, Wrench, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function PortalTecnicoPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [tecnicoNombre, setTecnicoNombre] = useState("Técnico");

  useEffect(() => {
    setIsClient(true);
    
    // Auth Check
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        const nombreGuardado = localStorage.getItem("dc_tecnico_nombre");
        if (nombreGuardado) setTecnicoNombre(nombreGuardado);
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (!isClient) return null;

  return (
    <main className="relative min-h-screen bg-[#0a0a0a] text-gray-200 overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-900/20 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-cyan-900/20 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        <div className="flex flex-col items-center text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="w-24 h-24 mb-6 relative">
            <Image src="/logo.png" alt="DC Telemática" fill className="object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
            Portal del Técnico
          </h1>
          <p className="text-gray-400 text-lg">Bienvenido de nuevo, <span className="text-white font-semibold">{tecnicoNombre}</span></p>
          <button 
            onClick={handleLogout}
            className="mt-4 flex items-center gap-2 text-sm text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg transition-colors border border-red-500/20"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mx-auto">
          {/* Card: Consultoría */}
          <div 
            onClick={() => router.push("/formulario")}
            className="group relative flex flex-col items-center justify-center p-8 md:p-12 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div className="w-20 h-20 bg-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <ClipboardList size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Consultoría</h2>
            <p className="text-gray-400 text-center">Formularios de auditoría técnica e inspección de puntos de red.</p>
          </div>

          {/* Card: Trabajos Diarios */}
          <div 
            onClick={() => router.push("/tareas")}
            className="group relative flex flex-col items-center justify-center p-8 md:p-12 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-purple-500/10 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div className="w-20 h-20 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <Wrench size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Trabajos Diarios</h2>
            <p className="text-gray-400 text-center">Ejecución de tareas operativas y registro de evidencia fotográfica.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
