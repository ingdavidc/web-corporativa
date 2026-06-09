"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Lightbulb, Target, Users } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const values = [
  {
    icon: Lightbulb,
    title: "Innovación",
    description:
      "Implementamos tecnología de vanguardia para soluciones duraderas.",
  },
  {
    icon: Target,
    title: "Precisión",
    description:
      "Cada proyecto se ejecuta con estándares de calidad internacional.",
  },
  {
    icon: Users,
    title: "Colaboración",
    description:
      "Trabajamos junto a nuestros clientes para alcanzar sus objetivos.",
  },
  {
    icon: CheckCircle,
    title: "Excelencia",
    description:
      "Compromiso con la calidad y la mejora continua en cada servicio.",
  },
];

const technologies = [
  "Cisco",
  "Juniper",
  "Aruba",
  "Fortinet",
  "VMware",
  "Dell EMC",
  "HP Enterprise",
  "Schneider",
  "APC",
  "Ubiquiti",
  "Asterisk",
  "MikroTik",
];

const certifications = [
  "CCNA/CCNP",
  "JNCIA/JNCIS",
  "VCP-DCV",
  "CompTIA Network+",
  "ISO 27001",
  "ITIL v4",
];

export function About() {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "web_content", "about"), (docSnap) => {
      if (docSnap.exists()) {
        setContent(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, []);

  const dynamicTech = content?.tech || technologies;
  const dynamicCerts = content?.certs || certifications;

  return (
    <section id="nosotros" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      
      {/* Decorative orbs */}
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <span className="inline-block text-sm font-medium text-primary uppercase tracking-wider mb-4 px-4 py-1 rounded-full bg-primary/10 border border-primary/20">
              Sobre Nosotros
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground text-balance">
              {content?.title || "Expertos en"}
              <span className="text-gradient"> {content?.highlight || "Telecomunicaciones"}</span>
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed whitespace-pre-line">
              {content?.p1 || `DC Telemática es una empresa especializada en soluciones de
              telecomunicaciones e infraestructura tecnológica con más de 10 años
              de experiencia en el mercado.

              Nuestro equipo de ingenieros certificados diseña e implementa
              soluciones robustas que garantizan la conectividad y seguridad
              de su organización.`}
            </p>

            {/* Values */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              {values.map((value, index) => (
                <div 
                  key={value.title} 
                  className="flex items-start gap-3 p-3 rounded-xl bg-card/30 border border-border/50 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <value.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {value.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {value.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack Visual */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 rounded-3xl blur-3xl" />
            <div className="relative bg-card/50 border border-border rounded-2xl p-8 backdrop-blur-sm">
              {/* Technologies */}
              <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Tecnologías y Marcas
              </h3>
              <div className="flex flex-wrap gap-3 mb-8">
                {dynamicTech.map((tech: string) => (
                  <span
                    key={tech}
                    className="px-4 py-2 rounded-lg bg-secondary/50 text-secondary-foreground text-sm font-medium border border-border/50 hover:border-primary/30 hover:bg-primary/10 hover:text-primary transition-all duration-300 cursor-default"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {/* Certifications */}
              <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Certificaciones
              </h3>
              <div className="flex flex-wrap gap-2 mb-8">
                {dynamicCerts.map((cert: string) => (
                  <span
                    key={cert}
                    className="px-3 py-1.5 rounded-full bg-accent/10 text-accent-foreground text-xs font-medium border border-accent/30"
                  >
                    {cert}
                  </span>
                ))}
              </div>

              {/* Stats Counter */}
              <div className="pt-6 border-t border-border">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-xl bg-background/50">
                    <div className="text-3xl font-bold text-gradient">100+</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Proyectos
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-background/50">
                    <div className="text-3xl font-bold text-gradient">50+</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Clientes
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-background/50">
                    <div className="text-3xl font-bold text-gradient">10+</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Años
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
