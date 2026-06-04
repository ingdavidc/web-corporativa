"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Wrench, ShieldCheck, X } from "lucide-react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAuJtE7VKOm1wG5BEd_pde8_9aDaq33j8E",
  authDomain: "dc-telematica-auditoria.firebaseapp.com",
  projectId: "dc-telematica-auditoria",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export function CorporateLogin() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<"tecnico" | "ingeniero" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Verificamos que las credenciales existan en Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const db = getFirestore(app);
      
      // 2. Buscamos el rol de este usuario en la base de datos
      const userDocRef = doc(db, "usuarios", email);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // SOLUCIÓN A CUENTAS ANTIGUAS: Si el usuario ya existía en Firebase pero no tiene un rol asignado,
        // le otorgamos automáticamente el rol con el que está intentando entrar ahora mismo.
        await setDoc(userDocRef, {
          email: email,
          role: role,
          createdAt: new Date().toISOString()
        });
      } else {
        // 3. Si el usuario ya tiene rol asignado, validamos que entre por la puerta correcta
        const userData = userDoc.data();
        if (userData.role !== role) {
          await auth.signOut();
          setError(`Acceso denegado: El perfil asignado a este correo es "${userData.role === 'tecnico' ? 'Técnico Operativo' : 'Ingeniero Administrador'}". Por favor elige la opción correcta.`);
          setLoading(false);
          return;
        }
      }

      setIsOpen(false);
      
      // ✅ Redirección a la ruta correspondiente
      if (role === "tecnico") {
        router.push("/formulario");
      } else {
        router.push("/panel");
      }

    } catch (err) {
      setError("Credenciales incorrectas. Verifique e intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30"
      >
        <UserCircle size={18} />
        <span>Acceso Corporativo</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0a] border border-cyan-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] relative">
            
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
              <h2 className="text-xl font-bold text-cyan-400">Portal Corporativo</h2>
              <button onClick={() => { setIsOpen(false); setRole(null); setError(""); }} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 md:p-8">
              {!role ? (
                <div className="flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
                  <p className="text-gray-400 text-center mb-2">Seleccione su perfil de acceso:</p>
                  
                  <button onClick={() => setRole("tecnico")} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all group text-left">
                    <div className="bg-cyan-500/20 p-3 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform">
                      <Wrench size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Personal Técnico</h3>
                      <p className="text-xs text-gray-500">Acceso a formularios de auditoría</p>
                    </div>
                  </button>

                  <button onClick={() => setRole("ingeniero")} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all group text-left">
                    <div className="bg-purple-500/20 p-3 rounded-lg text-purple-400 group-hover:scale-110 transition-transform">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Ingeniería / Admin</h3>
                      <p className="text-xs text-gray-500">Panel de control y reportes</p>
                    </div>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-center mb-2">
                    <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-2 ${role === 'tecnico' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                      Perfil: {role === 'tecnico' ? 'Técnico Operativo' : 'Ingeniero Administrador'}
                    </span>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-400 font-semibold mb-1 block">Correo Electrónico</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors" placeholder="usuario@dctelematica.com" />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 font-semibold mb-1 block">Contraseña</label>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors" placeholder="••••••••" />
                  </div>

                  <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-lg mt-2 ${loading ? 'opacity-70 cursor-not-allowed bg-gray-600' : role === 'tecnico' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/25' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/25'}`}>
                    {loading ? "Verificando..." : "Ingresar"}
                  </button>

                  <button type="button" onClick={() => { setRole(null); setError(""); setPassword(""); }} className="text-gray-500 hover:text-white text-sm mt-2 transition-colors underline">
                    Volver atrás
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}