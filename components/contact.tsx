"use client";

import { useState, useEffect } from "react";
import { Mail, MapPin, MessageCircle, Send } from "lucide-react";
import { useWebContent } from "@/components/web-content-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "contacto@dctelematica.com",
    href: "mailto:contacto@dctelematica.com",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+57 317 425 1419",
    href: "https://wa.me/573174251419",
  },
  {
    icon: MapPin,
    label: "Ubicación",
    value: "Bogotá, Colombia",
    href: "#",
  },
];

export function Contact() {
  const { data: content } = useWebContent("contact");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  return (
    <section id="contacto" className="py-24 relative overflow-hidden">
      {/* Elegant Divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
      
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-medium text-primary uppercase tracking-wider mb-4 px-4 py-1 rounded-full bg-primary/10 border border-primary/20">
            Contacto
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground text-balance">
            {"¿Listo para "}<span className="text-gradient">conectar</span>{"?"}
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground leading-relaxed">
            Cuéntanos sobre tu proyecto y te responderemos en menos de 24 horas.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-card/50 border border-border rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            
            <h3 className="relative text-xl font-semibold text-foreground mb-6">
              Envíanos un mensaje
            </h3>
            <form onSubmit={handleSubmit} className="relative space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Nombre
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre"
                    className="bg-input/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="bg-input/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Empresa (opcional)
                </label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Nombre de tu empresa"
                  className="bg-input/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Mensaje
                </label>
                <textarea
                  id="message"
                  rows={5}
                  placeholder="Cuéntanos sobre tu proyecto..."
                  className="w-full px-4 py-3 rounded-lg bg-input/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary resize-none transition-colors"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Mensaje
                </span>
                <span className="absolute inset-0 bg-accent translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-6">
                Información de contacto
              </h3>
              <div className="space-y-4">
                  <a
                    href={`mailto:${content?.email || "contacto@dctelematica.com"}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300 group backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {content?.email || "contacto@dctelematica.com"}
                      </div>
                    </div>
                  </a>

                  <a
                    href={`https://wa.me/${(content?.whatsapp || "573174251419").replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300 group backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      <MessageCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">WhatsApp</div>
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {content?.whatsapp || "+57 317 425 1419"}
                      </div>
                    </div>
                  </a>

                  <a
                    href="#"
                    className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300 group backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Ubicación</div>
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {content?.location || "Bogotá, Colombia"}
                      </div>
                    </div>
                  </a>
              </div>
            </div>

            {/* CTA Card */}
            <div className="relative overflow-hidden rounded-2xl p-8 border border-primary/30">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10" />
              <div className="absolute inset-0 bg-circuit-pattern opacity-20" />
              <div className="relative">
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  {"¿Necesitas una respuesta rápida?"}
                </h4>
                <p className="text-muted-foreground text-sm mb-4">
                  Agenda una llamada de 15 minutos para discutir tu proyecto
                  directamente con nuestro equipo de ingenieros.
                </p>
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  Agendar Llamada
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
