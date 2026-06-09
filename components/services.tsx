"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as LucideIcons from "lucide-react";
import { ArrowRight } from "lucide-react";

export function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Usamos onSnapshot para lectura en tiempo real
    const q = query(collection(db, "web_services"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setServices(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <section id="servicios" className="py-24 relative overflow-hidden">
      {/* Elegant Divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="absolute inset-0 bg-circuit-pattern opacity-10" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-medium text-primary uppercase tracking-wider mb-4 px-4 py-1 rounded-full bg-primary/10 border border-primary/20">
            Nuestros Servicios
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground text-balance">
            Soluciones en
            <br />
            <span className="text-gradient">Telecomunicaciones</span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground leading-relaxed">
            Ofrecemos servicios integrales de telecomunicaciones e infraestructura
            tecnológica para empresas que buscan excelencia.
          </p>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No hay servicios disponibles en este momento.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => {
              // Mapeo dinámico de íconos
              const IconComponent = (LucideIcons as any)[service.icon] || LucideIcons.Network;

              return (
                <div
                  key={service.id}
                  className="group p-6 rounded-2xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 backdrop-blur-sm relative overflow-hidden"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
                    <IconComponent className="h-7 w-7 text-primary" />
                  </div>

                  <h3 className="relative text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>

                  <p className="relative text-muted-foreground text-sm leading-relaxed mb-4">
                    {service.description}
                  </p>

                  <div className="relative flex flex-wrap gap-2 mb-4">
                    {service.features?.map((feature: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 text-xs rounded-full bg-secondary/50 text-secondary-foreground border border-border/50"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  <a
                    href="#contacto"
                    className="relative inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors group/link"
                  >
                    Saber más
                    <ArrowRight className="ml-1 h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
