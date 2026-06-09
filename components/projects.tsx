"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ExternalLink, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "web_projects"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setProjects(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <section id="proyectos" className="py-24 bg-card/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-accent/5 rounded-full blur-[100px] -translate-y-1/2" />
      
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-medium text-primary uppercase tracking-wider mb-4 px-4 py-1 rounded-full bg-primary/10 border border-primary/20">
            Portafolio
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground text-balance">
            Proyectos <span className="text-gradient">Destacados</span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground leading-relaxed">
            Soluciones implementadas para clientes en diversos sectores industriales.
          </p>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No hay proyectos disponibles en este momento.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="group relative overflow-hidden rounded-2xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-500 backdrop-blur-sm"
              >
                {/* Project Visual */}
                <div className="aspect-video bg-gradient-to-br from-primary/10 via-background to-accent/10 relative overflow-hidden">
                  {/* Circuit pattern overlay */}
                  <div className="absolute inset-0 bg-circuit-pattern opacity-30" />
                  
                  {/* Number indicator */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-8xl font-bold text-foreground/5 group-hover:text-primary/10 transition-colors duration-500">
                      0{index + 1}
                    </span>
                  </div>
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Detalles
                    </Button>
                  </div>

                  {/* Animated corner accent */}
                  <div className="absolute top-0 right-0 w-20 h-20">
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/30 group-hover:border-primary transition-colors duration-500" />
                  </div>
                </div>

                {/* Project Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary uppercase tracking-wider">
                      {project.category}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {project.description}
                  </p>

                  {/* Tech Stack */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {project.tech?.map((tech: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 text-xs rounded-full bg-secondary/50 text-secondary-foreground border border-border/50"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View All Button */}
        <div className="text-center mt-12">
          <Button
            variant="outline"
            size="lg"
            className="border-accent/50 text-foreground hover:bg-accent/10 hover:border-accent transition-all duration-300"
          >
            Ver Todos los Proyectos
          </Button>
        </div>
      </div>
    </section>
  );
}
