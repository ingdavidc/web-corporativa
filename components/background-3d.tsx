"use client";

import { useEffect, useState } from "react";

export function Background3D() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden bg-[#03060f] pointer-events-none">
      
      {/* Estilos para la red (Grid) cibernética */}
      <style>{`
        .cyber-grid {
          position: absolute;
          width: 200vw;
          height: 200vh;
          top: -50vh;
          left: -50vw;
          background-image: 
            linear-gradient(to right, rgba(6, 182, 212, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
          transform: perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px);
          animation: gridMove 20s linear infinite;
        }

        @keyframes gridMove {
          0% { transform: perspective(500px) rotateX(60deg) translateY(0) translateZ(-200px); }
          100% { transform: perspective(500px) rotateX(60deg) translateY(50px) translateZ(-200px); }
        }
      `}</style>

      {/* Grid Animado (Fibra óptica estilizada) */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
         <div className="cyber-grid"></div>
      </div>

      {/* Gradiente Oscuro de Fondo (Viñeta) para concentrar luz al centro */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#03060f_80%)]"></div>
      
      {/* Orbes de luz fijos impulsados por CSS GPU (Rojo y Cian/Azul corporativo) */}
      <div 
        className="absolute top-[-10%] left-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full bg-red-600 opacity-[0.04] blur-[100px] md:blur-[120px] animate-pulse" 
        style={{ animationDuration: '8s' }} 
      />
      <div 
        className="absolute bottom-[-10%] right-[-5%] w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full bg-cyan-600 opacity-[0.04] blur-[100px] md:blur-[150px] animate-pulse" 
        style={{ animationDuration: '12s', animationDelay: '2s' }} 
      />
      
      {/* Detalle superior (línea de luz estilo escáner) */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
    </div>
  );
}