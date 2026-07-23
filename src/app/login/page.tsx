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
    <div className="min-h-screen bg-[#0B0C10] text-[#FFFFFF] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1F2833] border border-[#2C3E50] rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex items-center justify-center mb-4 text-[#C5C6C7]">
            <Dumbbell className="w-7 h-7 text-[#B08D57]" />
          </div>
          <h1 className="font-title text-xl font-bold tracking-widest text-[#FFFFFF]">VANGUARD SAAS</h1>
          <p className="text-[#C5C6C7] text-xs mt-1">Plataforma de Fidelización y Evaluaciones Premium</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/30 border border-rose-800/50 rounded-lg flex items-center gap-3 text-rose-300 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#C5C6C7] mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-[#C5C6C7]/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-[#0B0C10] border border-[#2C3E50] rounded-md focus:outline-none focus:border-[#C5C6C7] text-[#FFFFFF] placeholder-[#C5C6C7]/40 text-sm transition"
                placeholder="owner@gimnasio.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#C5C6C7] mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-[#C5C6C7]/60" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-[#0B0C10] border border-[#2C3E50] rounded-md focus:outline-none focus:border-[#C5C6C7] text-[#FFFFFF] placeholder-[#C5C6C7]/40 text-sm transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#C5C6C7] hover:bg-[#FFFFFF] font-bold text-[#000000] rounded-md transition disabled:opacity-50 font-title text-sm tracking-widest uppercase shadow-md"
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
