"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase'; 

export function CorporateLogin() {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<'tecnico' | 'ingeniero' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsOpen(false);
      
      // Direcciona según el rol
      if (role === 'tecnico') {
        router.push('/formulario');
      } else if (role === 'ingeniero') {
        router.push('/panel');
      }
    } catch (err) {
      setError('Credenciales incorrectas o acceso denegado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-6 py-2 border border-red-600 text-red-500 hover:bg-red-600 hover:text-white transition-all rounded-full font-semibold text-sm"
      >
        Acceso Corporativo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(255,0,60,0.15)] relative">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition">
              ✕
            </button>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white tracking-wide">Portal DC Telemática</h2>
                <p className="text-zinc-400 text-sm mt-1">Acceso exclusivo para personal</p>
            </div>
            
            {!role ? (
              <div className="flex flex-col gap-4">
                <button onClick={() => setRole('tecnico')} className="bg-zinc-900 hover:bg-zinc-800 text-white p-4 rounded-xl border border-zinc-800 hover:border-red-500/50 transition flex items-center justify-center gap-2">
                  👨‍🔧 Técnico (Auditoría)
                </button>
                <button onClick={() => setRole('ingeniero')} className="bg-zinc-900 hover:bg-zinc-800 text-white p-4 rounded-xl border border-zinc-800 hover:border-cyan-500/50 transition flex items-center justify-center gap-2">
                  👨‍💻 Ingeniero (Panel Admin)
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="flex justify-between items-center mb-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                  <span className="text-zinc-300 font-medium text-sm">
                    Rol: <span className={role === 'tecnico' ? 'text-red-400' : 'text-cyan-400 capitalize'}>{role}</span>
                  </span>
                  <button type="button" onClick={() => setRole(null)} className="text-xs text-zinc-500 hover:text-white">
                    Volver
                  </button>
                </div>
                
                <input 
                  type="email" 
                  placeholder="Correo institucional" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-900/50 border border-zinc-800 text-white p-3 rounded-lg focus:outline-none focus:border-red-500 transition"
                  required
                />
                <input 
                  type="password" 
                  placeholder="Contraseña" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-900/50 border border-zinc-800 text-white p-3 rounded-lg focus:outline-none focus:border-red-500 transition"
                  required
                />
                
                {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                
                <button 
                  type="submit" 
                  disabled={loading}
                  className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition"
                >
                  {loading ? 'Validando...' : 'Iniciar Sesión'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}