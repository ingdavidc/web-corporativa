"use client";

import {
  Network,
  Wifi,
  Server,
  Shield,
  Cpu,
  Radio,
  ArrowRight,
} from "lucide-react";

const services = [
  {
    icon: Network,
    title: "Redes y Conectividad",
    description:
      "Diseño e implementación de redes LAN, WAN y WLAN con la más alta disponibilidad y seguridad.",
    features: ["Fibra Óptica", "Switches", "Routers"],
  },
  {
    icon: Wifi,
    title: "Soluciones Wireless",
    description:
      "Infraestructura inalámbrica empresarial con cobertura óptima y gestión centralizada.",
    features: ["WiFi 6/7", "Mesh Networks", "Site Survey"],
  },
  {
    icon: Server,
    title: "Data Centers",
    description:
      "Diseño y construcción de centros de datos con estándares internacionales de calidad.",
    features: ["Tier III/IV", "Cooling", "UPS"],
  },
  {
    icon: Shield,
    title: "Ciberseguridad",
    description:
      "Protección integral de infraestructura con firewalls, VPNs y monitoreo continuo.",
    features: ["Firewalls", "IDS/IPS", "SIEM"],
  },
  {
    icon: Cpu,
    title: "Infraestructura TI",
    description:
      "Soluciones de servidores, virtualización y almacenamiento de alta disponibilidad.",
    features: ["VMware", "Hyper-V", "SAN/NAS"],
  },
  {
    icon: Radio,
    title: "Telecomunicaciones",
    description:
      "Sistemas de comunicación unificada, VoIP y enlaces de radiofrecuencia.",
    features: ["VoIP", "PBX", "RF Links"],
  },
];

export function Services() {
  return (
    <section id="servicios" className="py-24 relative overflow-hidden">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group p-6 rounded-2xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 backdrop-blur-sm relative overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Hover gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Icon */}
              <div className="relative w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
                <service.icon className="h-7 w-7 text-primary" />
              </div>

              {/* Title */}
              <h3 className="relative text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {service.title}
              </h3>

              {/* Description */}
              <p className="relative text-muted-foreground text-sm leading-relaxed mb-4">
                {service.description}
              </p>

              {/* Features */}
              <div className="relative flex flex-wrap gap-2 mb-4">
                {service.features.map((feature) => (
                  <span
                    key={feature}
                    className="px-3 py-1 text-xs rounded-full bg-secondary/50 text-secondary-foreground border border-border/50"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Link */}
              <a
                href="#contacto"
                className="relative inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors group/link"
              >
                Saber más
                <ArrowRight className="ml-1 h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
