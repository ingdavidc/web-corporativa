"use client";

import React from "react";
import { DndContext, useDraggable, useDroppable, DragEndEvent } from "@dnd-kit/core";

// Interfaces básicas
interface DispositivoRed {
  id: string;
  tipo: string;
  nombre: string;
  marca: string;
  modelo: string;
  unidadesU?: number;
}

interface RackDeviceAssignment {
  id: string;
  uPos: number;
  heightU: number;
  isPassive: boolean;
}

interface Gabinete {
  id: string;
  nombre: string;
  ubicacion: string;
  unidades: number;
  dispositivos?: RackDeviceAssignment[];
}

interface RackBuilderProps {
  activeGabinete: Gabinete;
  dispositivos: DispositivoRed[];
  onAssign: (deviceId: string, startU: number) => void;
  onRemove: (deviceId: string) => void;
  onClose: () => void;
}

// ========================================================
// 1. DISEÑOS REALISTAS DE HARDWARE
// ========================================================

const RealisticSwitch = ({ is48 = false, name, model }: { is48?: boolean, name: string, model: string }) => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-900 border border-gray-500 rounded-sm flex flex-col justify-between p-1 shadow-inner relative overflow-hidden">
      <div className="absolute top-1 left-2 flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]"></div>
      </div>
      <div className="text-[8px] text-gray-300 font-mono text-right truncate pl-12">{name} - {model}</div>
      <div className="flex justify-center gap-0.5 mt-auto mb-1">
        {Array.from({ length: is48 ? 48 : 24 }).map((_, i) => (
          <div key={i} className="w-1.5 h-2.5 bg-black border border-gray-600 rounded-[1px] relative">
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-yellow-600"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RealisticPatchPanel = ({ name }: { name: string }) => {
  return (
    <div className="w-full h-full bg-black border border-gray-800 flex items-center justify-center p-1 relative overflow-hidden">
      <div className="absolute left-2 text-[8px] text-gray-400 font-mono truncate max-w-[50px]">{name}</div>
      <div className="flex gap-2 ml-10">
        {Array.from({ length: 4 }).map((_, block) => (
          <div key={block} className="flex gap-0.5 p-0.5 bg-gray-900 border border-gray-700 rounded-sm">
            {Array.from({ length: 6 }).map((_, p) => (
              <div key={p} className="w-2 h-2 rounded-full bg-black border border-gray-600 shadow-inner"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const RealisticServer = ({ name }: { name: string }) => {
  return (
    <div className="w-full h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-2 border-gray-600 flex items-center p-2 gap-4">
      <div className="flex flex-col gap-1 w-1/4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-full h-3 bg-black border border-gray-500 flex items-center px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_3px_#22c55e] animate-pulse"></div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col justify-center items-center opacity-30">
        <div className="w-3/4 h-1 bg-gray-500 mb-1 rounded-full"></div>
        <div className="w-1/2 h-1 bg-gray-500 rounded-full"></div>
      </div>
      <div className="text-[10px] text-gray-300 font-bold uppercase truncate max-w-[80px]">{name}</div>
    </div>
  );
};

const RealisticUPS = ({ name }: { name: string }) => {
  return (
    <div className="w-full h-full bg-zinc-900 border-2 border-zinc-700 p-2 flex items-center justify-between">
      <div className="w-12 h-8 bg-black border border-zinc-600 flex items-center justify-center text-[10px] text-cyan-400 font-mono font-bold">
        220V
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
           <div key={i} className="w-1 h-8 bg-zinc-800 rounded-full"></div>
        ))}
      </div>
      <div className="text-[10px] text-zinc-400 font-bold truncate max-w-[80px]">{name}</div>
    </div>
  );
};

// ========================================================
// 2. COMPONENTES DND-KIT (Arrastrables y Contenedores)
// ========================================================

const DraggableDeviceItem = ({ device, categoryStyle }: { device: DispositivoRed, categoryStyle: any }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: device.id,
    data: { device }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 9999,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`${categoryStyle.bg} border ${categoryStyle.border} rounded p-3 flex justify-between items-center cursor-grab active:cursor-grabbing ${categoryStyle.hover} transition-all shadow-sm ${isDragging ? 'opacity-90 scale-105 shadow-xl ring-2 ring-cyan-500 z-50 bg-black/90 backdrop-blur-md' : ''}`}
    >
      <div>
        <div className={`${categoryStyle.textTitle} font-bold text-sm flex items-center gap-2 pointer-events-none`}>
          ≡ {device.nombre}
        </div>
        <div className="text-gray-400 text-[10px] mt-1 pointer-events-none">{device.tipo} • {device.unidadesU || 1}U</div>
      </div>
      <div className={`text-xs ${categoryStyle.textBtn} font-bold pointer-events-none`}>
        ARRASTRAR
      </div>
    </div>
  );
};

const DroppableUSlot = ({ 
  uNumber, 
  deviceAtU, 
  isCovered, 
  dispositivos,
  onRemove
}: { 
  uNumber: number; 
  deviceAtU?: RackDeviceAssignment; 
  isCovered: boolean;
  dispositivos: DispositivoRed[];
  onRemove: (id: string) => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${uNumber}`,
    data: { uNumber },
    disabled: !!deviceAtU || isCovered
  });

  if (isCovered) return null;

  const deviceData = deviceAtU ? dispositivos.find(d => d.id === deviceAtU.id) : null;
  const is48Port = deviceData?.nombre.includes("48") || deviceData?.modelo.includes("48");

  const renderRealisticDevice = () => {
    if (!deviceData) return null;
    if (deviceData.tipo === "Switch" || deviceData.tipo === "Router") return <RealisticSwitch name={deviceData.nombre} model={deviceData.modelo} is48={is48Port} />;
    if (deviceData.tipo === "Patch Panel" || deviceData.tipo === "Organizador") return <RealisticPatchPanel name={deviceData.nombre} />;
    if (deviceData.tipo === "Servidor") return <RealisticServer name={deviceData.nombre} />;
    if (deviceData.tipo === "UPS" || deviceData.tipo === "PDU") return <RealisticUPS name={deviceData.nombre} />;
    
    // Default fallback
    return (
      <div className="w-full px-8 flex justify-between items-center h-full bg-cyan-900/40 border-l-4 border-cyan-500">
        <span className="text-cyan-300 font-bold text-sm">{deviceData.nombre}</span>
      </div>
    );
  };

  return (
    <div 
      ref={setNodeRef}
      className={`relative flex w-full border-t border-zinc-800 transition-all ${isOver ? 'bg-indigo-600/30 ring-2 ring-inset ring-indigo-400' : ''} ${!deviceAtU ? 'hover:bg-indigo-900/10' : ''}`} 
      style={{ height: deviceAtU ? `${40 * (deviceAtU.heightU || 1)}px` : '40px' }}
    >
      <div className="w-8 shrink-0 flex items-center justify-center bg-zinc-950 border-r border-zinc-800 text-[10px] font-bold text-zinc-600">
        {uNumber}U
      </div>
      
      <div className="flex-1 relative group bg-black/40">
        {/* Orificios del Rack */}
        <div className="absolute left-1 top-0 bottom-0 w-2 flex flex-col justify-between py-1 opacity-20 z-10 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-white"></div>
          <div className="w-2 h-2 rounded-full bg-white"></div>
        </div>
        <div className="absolute right-1 top-0 bottom-0 w-2 flex flex-col justify-between py-1 opacity-20 z-10 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-white"></div>
          <div className="w-2 h-2 rounded-full bg-white"></div>
        </div>

        {deviceAtU ? (
          <div className="w-full h-full relative">
            {renderRealisticDevice()}
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(deviceAtU.id); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 hover:text-white hover:bg-red-500 bg-black/90 rounded p-1.5 opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg"
              title="Retirar equipo"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center pointer-events-none">
             {isOver ? (
               <span className="text-indigo-300 font-bold text-xs animate-pulse">Soltar aquí...</span>
             ) : (
               <span className="text-zinc-800 font-bold text-[10px]">VACÍO</span>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================================
// 3. MAIN RACK BUILDER COMPONENT
// ========================================================

export default function RackBuilder({ activeGabinete, dispositivos, onAssign, onRemove, onClose }: RackBuilderProps) {
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (over && active) {
      const deviceId = active.id as string;
      const uNumber = over.data.current?.uNumber as number;
      onAssign(deviceId, uNumber);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-[80vh] animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-indigo-400">{activeGabinete.nombre}</h2>
            <p className="text-gray-400">{activeGabinete.ubicacion} • {activeGabinete.unidades}U</p>
          </div>
          <button 
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold transition-colors"
          >
            Volver a Gabinetes
          </button>
        </div>

        <div className="flex flex-1 gap-6 min-h-0">
          {/* Rack Visual (Izquierda) */}
          <div className="w-1/2 md:w-2/3 bg-zinc-950/80 rounded-xl border border-white/10 overflow-y-auto flex justify-center p-6 shadow-inner">
            <div className="w-full max-w-[420px] border-[12px] border-zinc-800 rounded-sm bg-[#050505] flex flex-col-reverse shadow-[inset_0_0_30px_rgba(0,0,0,1),_0_20px_40px_rgba(0,0,0,0.8)] relative">
              
              {/* Rack Post Left/Right visual */}
              <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-zinc-800 to-zinc-900 border-r border-black pointer-events-none z-10"></div>
              <div className="absolute top-0 bottom-0 right-0 w-3 bg-gradient-to-l from-zinc-800 to-zinc-900 border-l border-black pointer-events-none z-10"></div>

              {Array.from({ length: activeGabinete.unidades }).map((_, i) => {
                const uNumber = i + 1;
                const deviceAtU = activeGabinete.dispositivos?.find(d => d.uPos === uNumber);
                const isCovered = activeGabinete.dispositivos?.some(d => uNumber > d.uPos && uNumber < d.uPos + (d.heightU || 1)) || false;

                return (
                  <DroppableUSlot 
                    key={uNumber}
                    uNumber={uNumber}
                    deviceAtU={deviceAtU}
                    isCovered={isCovered}
                    dispositivos={dispositivos}
                    onRemove={onRemove}
                  />
                );
              })}
            </div>
          </div>

          {/* Inventario (Derecha) */}
          <div className="w-1/2 md:w-1/3 bg-black/40 rounded-xl border border-white/10 p-4 flex flex-col">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></span>
              Equipos Libres
            </h3>
            <p className="text-xs text-gray-400 mb-4">Arrastra los equipos desde aquí hacia los espacios del Rack.</p>
            
            <div className="overflow-y-auto flex-1 pr-2 space-y-4">
              {[
                { title: "Equipos Activos", types: ["Switch", "Router", "Servidor", "AP", "Firewall"], style: { bg: "bg-cyan-900/20", border: "border-cyan-500/30", textTitle: "text-cyan-300", hover: "hover:bg-cyan-900/40", textBtn: "text-cyan-500/50" } },
                { title: "Elementos Pasivos", types: ["Patch Panel", "Organizador", "Bandeja"], style: { bg: "bg-purple-900/20", border: "border-purple-500/30", textTitle: "text-purple-300", hover: "hover:bg-purple-900/40", textBtn: "text-purple-500/50" } },
                { title: "Eléctricos", types: ["UPS", "PDU"], style: { bg: "bg-orange-900/20", border: "border-orange-500/30", textTitle: "text-orange-300", hover: "hover:bg-orange-900/40", textBtn: "text-orange-500/50" } },
              ].map((category) => (
                <div key={category.title}>
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 bg-white/5 py-1 px-2 rounded">{category.title}</h4>
                  <div className="space-y-2">
                    {dispositivos
                      .filter(d => category.types.includes(d.tipo) && !activeGabinete.dispositivos?.some(ad => ad.id === d.id))
                      .map(dev => (
                        <DraggableDeviceItem key={dev.id} device={dev as any} categoryStyle={category.style} />
                    ))}
                    {dispositivos.filter(d => category.types.includes(d.tipo) && !activeGabinete.dispositivos?.some(ad => ad.id === d.id)).length === 0 && (
                      <p className="text-[10px] text-gray-600 italic px-2">No hay elementos libres.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
