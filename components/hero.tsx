"use client";

import { ArrowRight, Network, Server, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="absolute inset-0 bg-circuit-pattern opacity-30" />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] animate-pulse-glow" />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] animate-pulse-glow" 
        style={{ animationDelay: "2s" }} 
      />
      
      {/* Circuit Lines Decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <svg className="absolute top-20 left-10 w-40 h-40 opacity-20" viewBox="0 0 100 100">
          <path
            d="M10,50 L40,50 L50,30 L70,30 L80,50 L90,50"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary"
          />
          <circle cx="10" cy="50" r="3" className="fill-primary" />
          <circle cx="90" cy="50" r="3" className="fill-primary" />
        </svg>
        <svg className="absolute bottom-40 right-20 w-32 h-32 opacity-20" viewBox="0 0 100 100">
          <path
            d="M20,20 L20,50 L50,50 L50,80 L80,80"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-accent"
          />
          <circle cx="20" cy="20" r="3" className="fill-accent" />
          <circle cx="80" cy="80" r="3" className="fill-accent" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          {/* Animated Logo */}
          <div className="flex justify-center mb-8 animate-fade-in-up">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse-glow" />
              <Image
                src="/logo.png"
                alt="DC Telemática"
                width={280}
                height={140}
                className="relative z-10 h-28 w-auto object-contain"
                priority
              />
            </div>
          </div>

          {/* Badge */}
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-accent/30 mb-8 animate-fade-in-up backdrop-blur-sm"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm text-muted-foreground">
              Expertos en Telecomunicaciones
            </span>
          </div>

          {/* Main Heading */}
          <h1 
            className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 text-balance animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            Conectamos tu
            <br />
            <span className="text-gradient">Futuro Digital</span>
          </h1>

          {/* Subtitle */}
          <p 
            className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10 leading-relaxed text-pretty animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            Soluciones integrales en telecomunicaciones, redes e infraestructura
            tecnológica para impulsar la transformación digital de tu empresa.
          </p>

          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
          >
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 group relative overflow-hidden animate-border-glow"
            >
              <span className="relative z-10 flex items-center">
                Iniciar Proyecto
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-accent/50 text-foreground hover:bg-accent/10 hover:border-accent px-8 transition-all duration-300"
            >
              Ver Portafolio
            </Button>
          </div>

          {/* Floating Tech Icons */}
          <div className="relative mt-20">
            <div className="flex justify-center items-center gap-8 md:gap-16">
              <div 
                className="p-4 rounded-2xl bg-card/80 border border-border hover:border-primary/50 transition-all duration-300 animate-float backdrop-blur-sm"
                style={{ animationDelay: "0s" }}
              >
                <Network className="h-8 w-8 text-primary" />
              </div>
              <div 
                className="p-4 rounded-2xl bg-card/80 border border-border hover:border-accent/50 transition-all duration-300 animate-float backdrop-blur-sm"
                style={{ animationDelay: "1s" }}
              >
                <Wifi className="h-8 w-8 text-accent" />
              </div>
              <div 
                className="p-4 rounded-2xl bg-card/80 border border-border hover:border-primary/50 transition-all duration-300 animate-float backdrop-blur-sm"
                style={{ animationDelay: "2s" }}
              >
                <Server className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>

          {/* Stats with futuristic styling */}
          <div 
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in-up"
            style={{ animationDelay: "0.5s" }}
          >
            {[
              { value: "100+", label: "Proyectos Exitosos" },
              { value: "50+", label: "Clientes Satisfechos" },
              { value: "10+", label: "Años de Experiencia" },
              { value: "24/7", label: "Soporte Técnico" },
            ].map((stat, index) => (
              <div 
                key={stat.label} 
                className="text-center p-4 rounded-xl bg-card/30 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300"
              >
                <div className="text-3xl md:text-4xl font-bold text-gradient">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
