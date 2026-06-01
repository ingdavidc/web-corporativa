export function Background3D() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#03060f] pointer-events-none">
      {/* Orbes de plasma sutiles */}
      <div 
        className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[#ff003c] opacity-[0.08] blur-[120px] animate-pulse" 
        style={{ animationDuration: '8s' }} 
      />
      <div 
        className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#00f2fe] opacity-[0.08] blur-[120px] animate-pulse" 
        style={{ animationDuration: '12s', animationDelay: '2s' }} 
      />

      {/* Suelo de cuadrícula 3D (Matrix Floor) */}
      <div 
        className="absolute bottom-0 left-[-50%] w-[200%] h-[120%] opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 0, 60, 0.3) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(0, 242, 254, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transform: 'perspective(1200px) rotateX(75deg) translateY(50px) translateZ(-50px)',
          transformOrigin: 'bottom center',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)'
        }}
      />
    </div>
  );
}