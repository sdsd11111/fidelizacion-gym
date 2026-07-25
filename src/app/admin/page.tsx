'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Lock,
  User,
  Power,
  Building2,
  RefreshCw,
  Key,
  ShieldAlert,
  LogOut,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SuperAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // SuperAdmin Login State inside /admin
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // New Tenant Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState('');

  // Password reset state
  const [resetPasswordModalId, setResetPasswordModalId] = useState<string | null>(null);
  const [updatedPassword, setUpdatedPassword] = useState('');

  const router = useRouter();

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants');
      if (res.ok) {
        const json = await res.json();
        setTenants(json.tenants || []);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.error(e);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminUsername, password: adminPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');

      if (data.user?.role !== 'SUPERADMIN') {
        throw new Error('Sin privilegios de SuperAdmin');
      }

      setIsAuthenticated(true);
      loadTenants();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogoutAdmin = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      router.push('/login');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          username: newUsername,
          password: newPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al crear cliente');

      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setShowCreateModal(false);
      loadTenants();
    } catch (err: any) {
      setCreateError(err.message);
    }
  };

  const handleToggleTenantStatus = async (tenantId: string, currentStatus: boolean) => {
    setActionLoading(tenantId);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          isActive: !currentStatus,
        }),
      });

      if (res.ok) loadTenants();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleTab = async (
    tenantId: string,
    tabKey: 'showOverviewTab' | 'showEvaluationsTab' | 'showWalletTab' | 'showConfigTab',
    currentValue: boolean
  ) => {
    setActionLoading(`${tenantId}-${tabKey}`);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          [tabKey]: !currentValue,
        }),
      });

      if (res.ok) loadTenants();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModalId || !updatedPassword) return;

    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: resetPasswordModalId,
          password: updatedPassword,
        }),
      });

      if (res.ok) {
        setResetPasswordModalId(null);
        setUpdatedPassword('');
        loadTenants();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02050B] text-[#7A93B2] flex items-center justify-center font-mono text-xs">
        Cargando Panel...
      </div>
    );
  }

  // Minimalist Login Screen inside /admin
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#02050B] text-[#FFFFFF] flex items-center justify-center p-4">
        <div className="w-full max-w-xs sharp-card p-6 border border-[#0E1B2E] space-y-4">
          <div className="text-center space-y-1">
            <ShieldCheck className="w-6 h-6 text-[#00F5D4] mx-auto" />
            <h1 className="font-title text-sm font-bold tracking-wider text-[#FFFFFF]">SUPERADMIN</h1>
            <p className="text-[10px] text-[#7A93B2] font-mono">Consola de Control</p>
          </div>

          {loginError && (
            <div className="p-2.5 bg-rose-950/40 border border-rose-800 text-rose-300 text-[11px] rounded-sm flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-3">
            <div>
              <label className="block text-[10px] font-title text-[#7A93B2] uppercase mb-1">
                Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-2.5 top-2.5 text-[#7A93B2]/60" />
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
                  placeholder="gimnasios"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-title text-[#7A93B2] uppercase mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-2.5 top-2.5 text-[#7A93B2]/60" />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 btn-cyan-gradient text-xs font-title tracking-wider uppercase rounded-sm cursor-pointer"
            >
              {loginLoading ? 'Accediendo...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02050B] text-[#FFFFFF] font-sans p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#0E1B2E] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#060D18] border border-[#00F5D4]/30 rounded-sm flex items-center justify-center text-[#00F5D4]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-title text-sm font-bold tracking-wider text-[#FFFFFF]">SUPERADMIN</h1>
            <p className="text-[10px] text-[#7A93B2] font-mono">Gestión de Cuentas y Pestañas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTenants}
            className="p-2 bg-[#060D18] hover:bg-[#0E1B2E] border border-[#0E1B2E] text-[#7A93B2] rounded-sm transition cursor-pointer"
            title="Recargar"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 btn-cyan-gradient text-[11px] font-title tracking-wider uppercase rounded-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo Cliente
          </button>
          <button
            onClick={handleLogoutAdmin}
            className="p-2 bg-[#02050B] hover:bg-rose-950/40 border border-rose-800 text-rose-400 rounded-sm transition cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Minimalist Accounts Table */}
      <div className="sharp-card border border-[#0E1B2E] overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[750px]">
          <thead className="bg-[#02050B] text-[#7A93B2] border-b border-[#0E1B2E] font-title text-[10px]">
            <tr>
              <th className="p-3.5">GIMNASIO / CLIENTE</th>
              <th className="p-3.5">USUARIO LOGIN</th>
              <th className="p-3.5">ESTADO CUENTA</th>
              <th className="p-3.5 text-center">PESTAÑAS ACTIVAS EN PANEL CLIENTE</th>
              <th className="p-3.5 text-right">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0E1B2E]">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[#7A93B2]">
                  No hay gimnasios registrados.
                </td>
              </tr>
            ) : (
              tenants.map((t) => {
                const ownerUser = t.staff?.[0];
                return (
                  <tr key={t.id} className="hover:bg-[#02050B]/60 transition">
                    {/* Gym Name & Slug */}
                    <td className="p-3.5 font-bold text-[#FFFFFF]">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[#00F5D4] shrink-0" />
                        <span>{t.name}</span>
                        <span className="text-[10px] text-[#7A93B2] font-mono font-normal">({t.slug})</span>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="p-3.5 font-mono text-[#00F5D4] font-semibold">
                      {ownerUser?.email || 'Energym'}
                    </td>

                    {/* Status Badge Toggle */}
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleTenantStatus(t.id, t.isActive)}
                        disabled={actionLoading === t.id}
                        className={`px-2.5 py-1 rounded-sm text-[10px] font-bold font-title tracking-wider uppercase transition border flex items-center gap-1 cursor-pointer ${
                          t.isActive
                            ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400 hover:bg-rose-950/60 hover:text-rose-300'
                            : 'bg-rose-950/60 border-rose-800 text-rose-300 hover:bg-emerald-950/50 hover:text-emerald-400'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        {t.isActive ? 'ACTIVO' : 'PAUSADO'}
                      </button>
                    </td>

                    {/* Interactive Tab Badges */}
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {[
                          { key: 'showOverviewTab' as const, label: 'RESUMEN', active: t.showOverviewTab !== false },
                          { key: 'showEvaluationsTab' as const, label: 'EVALUACIONES', active: t.showEvaluationsTab !== false },
                          { key: 'showWalletTab' as const, label: 'BILLETERA', active: t.showWalletTab !== false },
                          { key: 'showConfigTab' as const, label: 'CONFIGURACIÓN', active: t.showConfigTab !== false },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => handleToggleTab(t.id, tab.key, tab.active)}
                            disabled={actionLoading === `${t.id}-${tab.key}`}
                            className={`px-2 py-0.5 rounded-sm text-[9px] font-title font-bold tracking-wider transition border cursor-pointer ${
                              tab.active
                                ? 'bg-[#02050B] border-[#00F5D4]/40 text-[#00F5D4]'
                                : 'bg-[#02050B]/30 border-[#0E1B2E] text-[#7A93B2]/40 line-through'
                            }`}
                            title={`Haz clic para ${tab.active ? 'desactivar' : 'activar'} la pestaña ${tab.label}`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </td>

                    {/* Reset Password Action */}
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setResetPasswordModalId(t.id)}
                        className="px-2.5 py-1 bg-[#02050B] hover:bg-[#060D18] border border-[#0E1B2E] text-[#7A93B2] hover:text-[#FFFFFF] text-[10px] font-semibold rounded-sm transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Key className="w-3 h-3 text-[#00F5D4]" /> Clave
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE NEW CLIENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#02050B]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="sharp-panel w-full max-w-sm p-5 space-y-4 border border-[#00F5D4]/30">
            <div className="flex items-center justify-between border-b border-[#0E1B2E] pb-3">
              <h3 className="font-title text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
                NUEVA CUENTA DE CLIENTE
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#7A93B2] hover:text-[#FFFFFF]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-800 text-rose-300 text-[11px] rounded-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="space-y-3">
              <div>
                <label className="block text-[10px] font-title text-[#7A93B2] uppercase mb-1">
                  Nombre Gimnasio / Empresa
                </label>
                <input
                  type="text"
                  placeholder="Ej. Energym"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full py-2 px-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-title text-[#7A93B2] uppercase mb-1">
                  Usuario de Login
                </label>
                <input
                  type="text"
                  placeholder="Ej. Energym"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="w-full py-2 px-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-title text-[#7A93B2] uppercase mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  placeholder="Ej. Energym123."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full py-2 px-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-[#02050B] border border-[#0E1B2E] text-[#7A93B2] text-xs font-semibold rounded-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 btn-cyan-gradient font-bold text-xs font-title tracking-wider uppercase rounded-sm"
                >
                  Crear Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetPasswordModalId && (
        <div className="fixed inset-0 z-50 bg-[#02050B]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="sharp-panel w-full max-w-xs p-5 space-y-3 border border-[#00F5D4]/30">
            <h3 className="font-title text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
              CAMBIAR CONTRASEÑA
            </h3>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-[10px] font-title text-[#7A93B2] uppercase mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={updatedPassword}
                  onChange={(e) => setUpdatedPassword(e.target.value)}
                  required
                  placeholder="Nueva clave..."
                  className="w-full py-2 px-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordModalId(null)}
                  className="px-3 py-1.5 bg-[#02050B] border border-[#0E1B2E] text-[#7A93B2] text-xs font-semibold rounded-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 btn-cyan-gradient text-xs font-bold font-title tracking-wider uppercase rounded-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
