import { useState } from "react";
import { Lock, User } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api.js";

export function LoginView({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast.success(`Bienvenido ${data.user.name}`);
      onLogin(data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-[#eceae7] w-full min-h-screen">
      <div className="bg-[#f4f3f0] p-8 rounded-2xl w-full max-w-md border border-[#e5e7eb] shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#cc679c] rounded-2xl flex items-center justify-center mb-4 shadow-md shadow-[#cc679c]/20">
            <span className="text-[#eceae7] font-black text-3xl">LK</span>
          </div>
          <h1 className="text-[#cc679c] text-2xl font-black">Librería Kolores</h1>
          <p className="text-[#5db8d1] font-medium mt-2">Iniciar Sesión</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-[#cc679c]/80 font-bold text-sm mb-2 block">Email</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cc679c]/60" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#eceae7] text-[#cc679c] placeholder-[#cc679c]/50 rounded-xl pl-12 pr-4 py-4 border border-[#e5e7eb] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none transition-all shadow-inner font-bold"
            placeholder="usuario@kolores.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[#cc679c]/80 font-bold text-sm mb-2 block">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cc679c]/60" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#eceae7] text-[#cc679c] placeholder-[#cc679c]/50 rounded-xl pl-12 pr-4 py-4 border border-[#e5e7eb] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none transition-all shadow-inner font-bold"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#cc679c] hover:bg-[#b85889] disabled:bg-[#f4f3f0] disabled:text-[#cc679c]/50 text-[#eceae7] py-4 rounded-xl font-black transition-all mt-4 shadow-md shadow-[#cc679c]/20"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#e5e7eb]">
          <p className="text-[#cc679c]/60 font-medium text-sm text-center mb-4">Acceso rápido (Pruebas):</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setEmail("admin@kolores.com"); setPassword("admin123"); }}
              className="flex-1 bg-[#eceae7] hover:bg-[#cc679c]/10 text-[#cc679c] font-bold py-2 rounded-lg text-sm transition-colors border border-[#e5e7eb] shadow-sm"
            >
              Llenar Admin
            </button>
            <button
              type="button"
              onClick={() => { setEmail("cajero@kolores.com"); setPassword("caja123"); }}
              className="flex-1 bg-[#eceae7] hover:bg-[#cc679c]/10 text-[#cc679c] font-bold py-2 rounded-lg text-sm transition-colors border border-[#e5e7eb] shadow-sm"
            >
              Llenar Cajero
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
