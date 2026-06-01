"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

export function DynamicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize particles
    const particleCount = 80;
    const colors = ["rgba(237, 28, 36, ", "rgba(34, 42, 104, ", "rgba(255, 255, 255, "];
    
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 1000,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      ctx.fillStyle = "rgba(8, 8, 18, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Update and draw particles
      particles.forEach((particle, i) => {
        // Parallax effect based on z-depth
        const perspective = 1000;
        const scale = perspective / (perspective + particle.z);
        
        // Mouse interaction - subtle attraction
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200) {
          particle.vx += (dx / dist) * 0.01;
          particle.vy += (dy / dist) * 0.01;
        }

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.z -= 0.5;

        // Apply friction
        particle.vx *= 0.99;
        particle.vy *= 0.99;

        // Reset particle if out of bounds
        if (particle.z < 0) {
          particle.z = 1000;
          particle.x = Math.random() * canvas.width;
          particle.y = Math.random() * canvas.height;
        }

        if (particle.x < 0 || particle.x > canvas.width) {
          particle.x = Math.random() * canvas.width;
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.y = Math.random() * canvas.height;
        }

        // Draw particle with depth effect
        const adjustedSize = particle.size * scale;
        const adjustedOpacity = particle.opacity * scale;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, adjustedSize, 0, Math.PI * 2);
        ctx.fillStyle = `${particle.color}${adjustedOpacity})`;
        ctx.fill();

        // Draw connections between nearby particles
        particles.slice(i + 1).forEach((other) => {
          const otherScale = perspective / (perspective + other.z);
          const distance = Math.sqrt(
            Math.pow(particle.x - other.x, 2) + Math.pow(particle.y - other.y, 2)
          );

          if (distance < 120) {
            const lineOpacity = (1 - distance / 120) * 0.15 * scale * otherScale;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(237, 28, 36, ${lineOpacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      // Draw subtle grid lines with perspective
      const gridSpacing = 100;
      const horizonY = canvas.height * 0.4;
      
      ctx.strokeStyle = "rgba(34, 42, 104, 0.03)";
      ctx.lineWidth = 1;

      for (let i = 0; i <= canvas.width; i += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, canvas.height);
        ctx.lineTo(canvas.width / 2 + (i - canvas.width / 2) * 0.1, horizonY);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity: 0.7 }}
      />
      {/* Gradient overlays for depth */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-t from-transparent via-transparent to-secondary/10" />
      {/* Radial glow effects */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] pointer-events-none z-0 opacity-20 blur-[120px] bg-primary/30 rounded-full" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] pointer-events-none z-0 opacity-15 blur-[100px] bg-secondary/40 rounded-full" />
    </>
  );
}
