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
    const numberOfParticles = Math.floor(window.innerWidth / 15); // Adjust for density
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };
    
    window.addEventListener("resize", resize);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

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
        // Mezclamos cian y acentos para dar el look corporativo
        this.color = Math.random() > 0.5 ? "rgba(6, 182, 212, 0.8)" : "rgba(59, 130, 246, 0.8)";
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
      let opacityValue = 1;
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          let distance = 
            ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) +
            ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
          
          if (distance < (canvas.width / 10) * (canvas.height / 10)) {
            opacityValue = 1 - (distance / 15000);
            if (!ctx) return;
            // Fibra óptica cyan glow
            ctx.strokeStyle = `rgba(6, 182, 212, ${opacityValue * 0.4})`;
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
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#03060f] pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />
      
      {/* Orbes de plasma sutiles para profundidad ambiental */}
      <div 
        className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600 opacity-[0.05] blur-[120px] animate-pulse" 
        style={{ animationDuration: '8s' }} 
      />
      <div 
        className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-cyan-400 opacity-[0.05] blur-[120px] animate-pulse" 
        style={{ animationDuration: '12s', animationDelay: '2s' }} 
      />
    </div>
  );
}