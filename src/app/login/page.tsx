'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Lock, Mail, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('owner@gimnasio.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falló el inicio de sesión');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040914] text-[#FFFFFF] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Neon Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#00F5D4]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl relative z-10 border border-[#00F5D4]/30">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-3 bg-[#040914]/90 border border-[#00F5D4]/40 rounded-2xl mb-3 shadow-xl glow-cyan">
            <img src="/branding/logo_main.png" alt="ALL-crm" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="font-title text-2xl font-bold tracking-widest text-gradient-cyan">
            ALL-crm
          </h1>
          <p className="text-[#8AA4C4] text-xs mt-1 font-mono">Plataforma Inteligente de Fidelización & Retención</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center gap-3 text-rose-300 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8AA4C4] mb-2 font-title">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-[#8AA4C4]/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-[#0A1424]/90 border border-[#162B48] rounded-xl focus:outline-none focus:border-[#00F5D4] text-[#FFFFFF] placeholder-[#8AA4C4]/40 text-sm transition"
                placeholder="owner@gimnasio.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8AA4C4] mb-2 font-title">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-[#8AA4C4]/60" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-[#0A1424]/90 border border-[#162B48] rounded-xl focus:outline-none focus:border-[#00F5D4] text-[#FFFFFF] placeholder-[#8AA4C4]/40 text-sm transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 btn-cyan-gradient font-bold rounded-xl transition disabled:opacity-50 font-title text-sm tracking-widest uppercase cursor-pointer"
          >
            {loading ? 'Ingresando...' : 'Ingresar al Panel'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-[#C5C6C7]/70 border-t border-[#2C3E50] pt-6">
          Aislamiento Multi-tenant activado vía DAL
        </div>
      </div>
    </div>
  );
}
