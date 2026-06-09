"use client";

import { useEffect, useRef } from "react";

export function Background3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particlesArray: Particle[] = [];
    let animationFrameId: number;
    let maxDistance = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      maxDistance = (canvas.width / 10) * (canvas.height / 10);
      init();
    };
    
    window.addEventListener("resize", resize);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    maxDistance = (canvas.width / 10) * (canvas.height / 10);

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.8;
        this.speedY = (Math.random() - 0.5) * 0.8;
        // Colores corporativos: Rojo primario y un azul muy sutil
        this.color = Math.random() > 0.5 ? "rgba(239, 68, 68, 0.8)" : "rgba(59, 130, 246, 0.6)";
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
      }
      
      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    const init = () => {
      particlesArray = [];
      const particleCount = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 120);
      for (let i = 0; i < particleCount; i++) {
        particlesArray.push(new Particle());
      }
    };

    const connect = () => {
      if (!ctx) return;
      let opacityValue = 1;
      const len = particlesArray.length;
      for (let a = 0; a < len; a++) {
        for (let b = a + 1; b < len; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = dx * dx + dy * dy;
          
          if (distance < maxDistance) {
            opacityValue = Math.max(0, 1 - (distance / 15000));
            // Líneas de conexión rojas (fibra óptica)
            ctx.strokeStyle = `rgba(239, 68, 68, ${opacityValue * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      connect();
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[0] overflow-hidden bg-[#03060f] pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />
      
      {/* Orbes de plasma sutiles para profundidad ambiental */}
      <div 
        className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-red-600 opacity-[0.05] blur-[120px] animate-pulse" 
        style={{ animationDuration: '8s' }} 
      />
      <div 
        className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-blue-600 opacity-[0.05] blur-[120px] animate-pulse" 
        style={{ animationDuration: '12s', animationDelay: '2s' }} 
      />
    </div>
  );
}