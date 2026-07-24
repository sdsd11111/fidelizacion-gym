'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  Star,
  Wallet,
  Sliders,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const navItems = [
    { href: '/dashboard', icon: Users, label: 'RESUMEN GENERAL' },
    { href: '/dashboard/evaluaciones', icon: Star, label: 'EVALUACIONES & CLIENTES' },
    { href: '/dashboard/billetera', icon: Wallet, label: 'BILLETERA & CANJES' },
    { href: '/dashboard/configuracion', icon: Sliders, label: 'CONFIGURACIÓN OWNER' },
  ];

  return (
    <div className="min-h-screen bg-[#02050B] text-[#FFFFFF] flex flex-col font-sans">
      {/* Header with Universal Hamburger Menu */}
      <header className="bg-[#060D18] border-b border-[#0E1B2E] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-[#7A93B2] hover:text-[#FFFFFF] bg-[#02050B] hover:bg-[#0E1B2E] border border-[#0E1B2E] rounded-sm transition flex items-center justify-center gap-2 cursor-pointer"
            title="Menú de Navegación"
          >
            {sidebarOpen ? <X className="w-5 h-5 text-[#00F5D4]" /> : <Menu className="w-5 h-5 text-[#00F5D4]" />}
            <span className="text-xs font-title font-bold uppercase hidden sm:inline-block">MENÚ</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-9 px-2 bg-[#02050B] border border-[#00F5D4]/30 rounded-sm flex items-center justify-center glow-cyan">
              <img src="/branding/logo_main.png" alt="ALL-crm" className="h-7 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-title text-base font-bold text-gradient-cyan tracking-wider leading-tight">
                ALL-crm
              </span>
              <span className="text-[10px] text-[#00F5D4] font-mono font-semibold truncate max-w-[140px] md:max-w-none">
                Sistema de Fidelización
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 bg-[#02050B] hover:bg-[#0E1B2E] border border-[#0E1B2E] text-[#7A93B2] hover:text-[#FFFFFF] text-xs font-semibold rounded-sm transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden md:inline">Cerrar Sesión</span>
        </button>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar overlay backdrop for small screens when open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-[#02050B]/80 backdrop-blur-sm z-20 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Collapsible Sidebar for both Desktop and Mobile */}
        {sidebarOpen && (
          <aside className="w-64 bg-[#02050B] border-r border-[#0E1B2E] p-4 space-y-1 shrink-0 z-20 transition-all duration-200">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-xs font-semibold transition tracking-wider font-title cursor-pointer ${
                    isActive
                      ? 'bg-[#060D18] text-[#FFFFFF] border-l-2 border-l-[#00F5D4] border-t border-r border-b border-[#0E1B2E] glow-cyan'
                      : 'text-[#7A93B2] hover:bg-[#060D18]/70 hover:text-[#FFFFFF]'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-[#00F5D4]' : 'text-[#7A93B2]'}`} />
                  {item.label}
                </Link>
              );
            })}
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
