import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail } from "lucide-react";
import { assets } from "@/shared/lib/assets";
import { getApiBaseUrl } from "@/shared/lib/api";
import { invalidateAdminAuthCache } from "@/features/admin/hooks/useAdminAuth";
import { writeAdminToken } from "@/features/admin/lib/adminSession";

const navyBg = {
  background: "linear-gradient(135deg, #080f1e 0%, #0d1f3c 60%, #080f1e 100%)",
};

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Error" }));
        throw new Error(data.detail || "Credenciales inválidas");
      }

      // Guardar el token para mandarlo como header Authorization en cada request.
      // Es lo que hace funcionar el panel en celular (la cookie cross-site se
      // bloquea en Safari iOS / Chrome móvil). Ver adminSession.ts.
      const data = await res.json().catch(() => null);
      if (data?.access_token) {
        writeAdminToken(data.access_token);
      }

      // Tras un login exitoso la cookie ya está puesta, pero el authCache
      // global puede tener un estado "no autenticado" viejo (de cuando se
      // entró a /admin sin sesión). Sin invalidarlo, AdminAuthProvider reusa
      // ese caché y rebota de vuelta al login -> loop infinito. Lo limpiamos
      // para forzar un /me fresco al montar /admin.
      invalidateAdminAuthCache();
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden px-4 py-6"
      style={navyBg}
    >
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gold/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-7">
          <img
            src={assets.logo}
            alt="Class VIP Transfers"
            className="h-32 md:h-36 mx-auto drop-shadow-[0_8px_28px_rgba(212,175,55,0.55)]"
          />
        </div>

        <div
          className="rounded-3xl p-6 md:p-8 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(22px)",
            border: "1px solid rgba(212,175,55,0.18)",
          }}
        >
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
              style={{
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.2)",
              }}
            >
              <Lock size={11} className="text-gold" />
              <span className="text-gold text-[10px] font-bold uppercase tracking-[0.2em]">
                Panel de Control
              </span>
            </div>
            <h1 className="text-2xl font-display text-white mb-1">Bienvenido</h1>
            <p className="text-white/40 text-sm">
              Ingresa tus credenciales para acceder
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-white/50 uppercase tracking-widest mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/50" />
                <input
                  type="email" value={email} required disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(212,175,55,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.08)"; }}
                  onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                  placeholder="admin@classviptransfers.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-white/50 uppercase tracking-widest mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/50" />
                <input
                  type="password" value={password} required disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(212,175,55,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.08)"; }}
                  onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full gold-gradient text-secondary-foreground py-3.5 rounded-xl text-sm font-bold tracking-wide hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 gold-glow"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : "Acceder al Panel"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="text-[11px] text-white/25">
              Solo personal autorizado | Class VIP Transfers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
