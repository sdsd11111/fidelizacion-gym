'use client';

import { useState, useEffect } from 'react';
import {
  Check,
  RefreshCw,
  QrCode,
  Bell,
  UserPlus,
  Plus,
  Trash2,
  CreditCard,
  CheckCircle,
} from 'lucide-react';

export default function ConfigPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Config state
  const [commPct, setCommPct] = useState('');
  const [storeCommPct, setStoreCommPct] = useState('');
  const [inactivityDays, setInactivityDays] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState('');

  // Trainers state
  const [trainers, setTrainers] = useState<any[]>([]);
  const [newTrainerName, setNewTrainerName] = useState('');
  const [trainerMessage, setTrainerMessage] = useState('');
  const [addingTrainer, setAddingTrainer] = useState(false);

  // Plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [planMessage, setPlanMessage] = useState('');
  const [addingPlan, setAddingPlan] = useState(false);

  // WhatsApp Instance State
  const [waInstanceName, setWaInstanceName] = useState('gym_owner_instance');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waState, setWaState] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [waLoading, setWaLoading] = useState(false);

  // Browser WebPush Notifications permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  const loadData = async () => {
    try {
      const res = await fetch('/api/owner/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setCommPct(json.tenant?.referralCommissionPct?.toString() || '10');
        setStoreCommPct(json.tenant?.storeReferralCommissionPct?.toString() || '5');
        setInactivityDays(json.tenant?.inactivityDaysThreshold?.toString() || '30');
        setWaPhone(json.tenant?.whatsappPhone || '');
        setTrainers(json.trainers || []);
        setPlans(json.plans || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadWhatsAppStatus = async () => {
    try {
      const res = await fetch(`/api/owner/whatsapp-instance?instanceName=${waInstanceName}`);
      const json = await res.json();
      if (json.state === 'open' || json.state === 'CONNECTED') {
        setWaState('CONNECTED');
        setWaQr(null);
      } else {
        setWaState('DISCONNECTED');
        if (json.qrcode) setWaQr(json.qrcode);
      }
    } catch (e) {
      console.error('Error fetching WA status:', e);
    }
  };

  useEffect(() => {
    loadData();
    loadWhatsAppStatus();

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const handleInitWhatsAppInstance = async () => {
    setWaLoading(true);
    try {
      const res = await fetch('/api/owner/whatsapp-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: waInstanceName }),
      });
      const json = await res.json();
      if (json.state === 'open' || json.state === 'CONNECTED') {
        setWaState('CONNECTED');
        setWaQr(null);
      } else if (json.qrcode) {
        setWaState('CONNECTING');
        setWaQr(json.qrcode);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWaLoading(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Este navegador no soporta notificaciones WebPush.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);

      if (perm === 'granted' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidPublicKey) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });

          await fetch('/api/owner/push-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription }),
          });
        }
      }
    } catch (e) {
      console.error('Error al activar notificaciones push:', e);
    }
  };

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingTrainer(true);
    setTrainerMessage('');
    try {
      const res = await fetch('/api/owner/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTrainerName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al agregar entrenador');
      setNewTrainerName('');
      setTrainerMessage(' Coach agregado exitosamente');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingTrainer(false);
    }
  };

  const handleDeleteTrainer = async (trainerId: string) => {
    if (!confirm('¿Seguro de eliminar este entrenador?')) return;
    try {
      const res = await fetch(`/api/owner/trainers?id=${trainerId}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingPlan(true);
    setPlanMessage('');
    try {
      const res = await fetch('/api/owner/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlanName,
          price: parseFloat(newPlanPrice),
          durationDays: 30,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al crear plan');
      setNewPlanName('');
      setNewPlanPrice('');
      setPlanMessage(' Plan de membresía creado exitosamente');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingPlan(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('¿Seguro de eliminar este plan de membresía?')) return;
    try {
      const res = await fetch(`/api/owner/plans?id=${planId}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigMessage('');
    try {
      const res = await fetch('/api/owner/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCommissionPct: parseFloat(commPct),
          storeReferralCommissionPct: parseFloat(storeCommPct),
          inactivityDaysThreshold: parseInt(inactivityDays, 10),
          whatsappPhone: waPhone,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar la configuración');
      setConfigMessage(' Configuración guardada correctamente.');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConfigSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#7A93B2] font-mono text-sm">
        Cargando Configuración Owner...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 md:space-y-8">
      <h2 className="font-title text-base md:text-lg font-bold text-gradient-cyan tracking-widest">
        CONFIGURACIÓN OWNER
      </h2>

      {/* 1. WHATSAPP INSTANCE & PWA NOTIFICATIONS */}
      <div className="sharp-card rounded-sm p-4 md:p-6 space-y-5 border border-[#0E1B2E]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#0E1B2E] pb-4 gap-3">
          <div>
            <h3 className="font-title font-bold text-xs md:text-sm text-[#FFFFFF] tracking-wider uppercase">
              VINCULACIÓN INSTANCIA WHATSAPP
            </h3>
            <p className="text-xs text-[#7A93B2] mt-0.5">
              Vincule su número de WhatsApp escaneando el código QR para habilitar el bot automático.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-sm text-xs font-bold font-title tracking-wider self-start sm:self-center ${
              waState === 'CONNECTED'
                ? 'bg-[#02050B] border border-[#00F5D4]/40 text-[#00F5D4]'
                : 'bg-amber-950/40 border border-amber-800/50 text-amber-300'
            }`}
          >
            {waState === 'CONNECTED' ? '● CONECTADO' : '○ DESCONECTADO'}
          </span>
        </div>

        {waState === 'CONNECTED' ? (
          <div className="p-4 bg-[#02050B] border border-[#0E1B2E] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-[#00F5D4] shrink-0" />
              <div>
                <div className="font-bold text-[#FFFFFF] text-sm flex items-center gap-2">
                  Instancia Vinculada Correctamente
                  {(waPhone || data?.tenant?.whatsappPhone) && (
                    <span className="px-2 py-0.5 bg-[#00F5D4]/10 border border-[#00F5D4]/40 text-[#00F5D4] text-xs font-mono rounded-sm">
                      +{waPhone || data?.tenant?.whatsappPhone}
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-[#7A93B2]">
                  Instancia: {waInstanceName}
                </div>
              </div>
            </div>
            <button
              onClick={loadWhatsAppStatus}
              className="px-3.5 py-2 bg-[#060D18] hover:bg-[#0E1B2E] text-[#7A93B2] hover:text-[#FFFFFF] text-xs font-semibold rounded-sm border border-[#0E1B2E] transition flex items-center justify-center gap-1.5 self-start sm:self-center cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Verificar
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 bg-[#02050B] border border-[#0E1B2E] rounded-sm space-y-4">
            {waQr ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="p-4 bg-white rounded-sm border border-[#00F5D4]/40 shadow-lg">
                  <img
                    src={waQr.startsWith('data:') ? waQr : `data:image/png;base64,${waQr}`}
                    alt="WhatsApp QR Code"
                    className="w-48 h-48 md:w-52 md:h-52 object-contain"
                  />
                </div>
                <p className="text-xs text-[#7A93B2] text-center max-w-xs">
                  Abre WhatsApp en tu teléfono, ve a <b>Dispositivos vinculados</b> y escanea este
                  código.
                </p>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <QrCode className="w-10 h-10 md:w-12 md:h-12 text-[#00F5D4] mx-auto opacity-80" />
                <p className="text-xs text-[#7A93B2] max-w-sm">
                  Haz clic abajo para vincular tu WhatsApp de forma segura.
                </p>
                <button
                  onClick={handleInitWhatsAppInstance}
                  disabled={waLoading}
                  className="px-5 py-2.5 btn-cyan-gradient text-xs font-title tracking-wider uppercase rounded-sm transition cursor-pointer"
                >
                  {waLoading ? 'GENERANDO QR...' : 'VINCULAR WHATSAPP'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. PWA / BROWSER NOTIFICATIONS */}
      <div className="sharp-card rounded-sm p-4 md:p-6 space-y-4 border border-[#0E1B2E]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#0E1B2E] pb-3 gap-2">
          <div>
            <h3 className="font-title font-bold text-xs md:text-sm text-[#FFFFFF] tracking-wider uppercase flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#00F5D4]" />
              NOTIFICACIONES EN TIEMPO REAL (PWA / CELULAR)
            </h3>
            <p className="text-xs text-[#7A93B2] mt-0.5">
              Reciba alertas sonoras e instantáneas en su celular o PC cuando un cliente solicite
              verificar un pago.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-sm text-xs font-bold font-title tracking-wider ${
              notifPermission === 'granted'
                ? 'bg-[#02050B] border border-[#00F5D4]/40 text-[#00F5D4]'
                : 'bg-amber-950/40 border border-amber-800/50 text-amber-300'
            }`}
          >
            {notifPermission === 'granted' ? '● ACTIVADAS' : '○ DESACTIVADAS'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-[#02050B] border border-[#0E1B2E] rounded-sm">
          <div className="text-xs text-[#7A93B2]">
            {notifPermission === 'granted'
              ? 'Las notificaciones instantáneas están activas en este navegador / dispositivo.'
              : 'Activa las notificaciones en tu celular o PC para recibir alertas en tiempo real al ingresar pagos de mensualidad o tienda.'}
          </div>
          {notifPermission !== 'granted' && (
            <button
              onClick={requestPushPermission}
              type="button"
              className="w-full sm:w-auto px-4 py-2 bg-[#00F5D4] hover:bg-[#00E5FF] text-[#02050B] font-bold text-xs font-title tracking-wider uppercase rounded-sm transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer glow-cyan"
            >
              <Bell className="w-3.5 h-3.5" /> ACTIVAR NOTIFICACIONES
            </button>
          )}
        </div>
      </div>

      {/* 3. TRAINERS MANAGEMENT (NAME ONLY) */}
      <div className="sharp-card rounded-sm p-4 md:p-6 space-y-5 border border-[#0E1B2E]">
        <div className="border-b border-[#0E1B2E] pb-3">
          <h3 className="font-title font-bold text-xs md:text-sm text-[#FFFFFF] tracking-wider uppercase flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#00F5D4]" />
            GESTIÓN DE ENTRENADORES
          </h3>
          <p className="text-xs text-[#7A93B2] mt-0.5">
            Agrega o elimina entrenadores para que tus clientes puedan calificarlos en el flujo 1 de
            WhatsApp.
          </p>
        </div>

        {trainerMessage && (
          <div className="p-3 bg-[#02050B] border border-[#00F5D4]/40 rounded-sm text-[#00F5D4] text-xs">
            {trainerMessage}
          </div>
        )}

        <form onSubmit={handleAddTrainer} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Nombre del Entrenador / Coach"
            value={newTrainerName}
            onChange={(e) => setNewTrainerName(e.target.value)}
            required
            className="flex-1 py-2.5 px-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
          />
          <button
            type="submit"
            disabled={addingTrainer}
            className="py-2.5 px-5 btn-cyan-gradient text-xs font-title tracking-wider uppercase rounded-sm transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {addingTrainer ? 'AGREGANDO...' : 'AGREGAR COACH'}
          </button>
        </form>

        <div className="space-y-2 pt-2">
          <span className="text-xs font-title text-[#7A93B2] uppercase block">
            ENTRENADORES ACTIVOS ({trainers.length})
          </span>
          {trainers.length === 0 ? (
            <div className="p-4 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#7A93B2] text-center">
              No hay entrenadores registrados. Agrega uno arriba.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {trainers.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#02050B] border border-[#0E1B2E] rounded-sm p-3 flex items-center justify-between"
                >
                  <div className="font-bold text-xs text-[#FFFFFF]">{t.name}</div>
                  <button
                    onClick={() => handleDeleteTrainer(t.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-sm transition cursor-pointer"
                    title="Eliminar Entrenador"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. MEMBERSHIP PLANS MANAGEMENT (NAME & PRICE ONLY) */}
      <div className="sharp-card rounded-sm p-4 md:p-6 space-y-5 border border-[#0E1B2E]">
        <div className="border-b border-[#0E1B2E] pb-3">
          <h3 className="font-title font-bold text-xs md:text-sm text-[#FFFFFF] tracking-wider uppercase flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#00F5D4]" />
            PLANES DE MEMBRESÍA DEL GIMNASIO
          </h3>
          <p className="text-xs text-[#7A93B2] mt-0.5">
            Configura los nombres y costos para que el bot de WhatsApp los presente en el flujo 2.
          </p>
        </div>

        {planMessage && (
          <div className="p-3 bg-[#02050B] border border-[#00F5D4]/40 rounded-sm text-[#00F5D4] text-xs">
            {planMessage}
          </div>
        )}

        <form onSubmit={handleAddPlan} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Nombre del Plan (Ej. Mensual, Trimestral)"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            required
            className="py-2.5 px-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Costo ($)"
            value={newPlanPrice}
            onChange={(e) => setNewPlanPrice(e.target.value)}
            required
            className="py-2.5 px-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
          />
          <button
            type="submit"
            disabled={addingPlan}
            className="py-2.5 btn-cyan-gradient text-xs font-title tracking-wider uppercase rounded-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {addingPlan ? 'CREANDO...' : 'CREAR PLAN'}
          </button>
        </form>

        <div className="space-y-2 pt-2">
          <span className="text-xs font-title text-[#7A93B2] uppercase block">
            PLANES ACTIVOS ({plans.length})
          </span>
          {plans.length === 0 ? (
            <div className="p-4 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#7A93B2] text-center">
              No hay planes creados. Agrega un plan arriba.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#02050B] border border-[#0E1B2E] rounded-sm p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-[#FFFFFF]">{p.name}</div>
                    <div className="text-xs text-[#00F5D4] font-mono">
                      $ {Number(p.price).toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePlan(p.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-sm transition cursor-pointer"
                    title="Eliminar Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. REFERRAL PERCENTAGES & PARAMETERS */}
      {configMessage && (
        <div className="p-4 bg-[#02050B] border border-[#00F5D4]/40 rounded-sm text-[#FFFFFF] text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#00F5D4]" /> {configMessage}
        </div>
      )}

      <form
        onSubmit={handleSaveConfig}
        className="sharp-card rounded-sm p-4 md:p-6 space-y-5 border border-[#0E1B2E]"
      >
        <div className="border-b border-[#0E1B2E] pb-3">
          <h3 className="font-title font-bold text-xs md:text-sm text-[#FFFFFF] tracking-wider uppercase">
            COMISIONES POR REFERIDO & PARÁMETROS
          </h3>
          <p className="text-xs text-[#7A93B2] mt-0.5">
            Configura las comisiones por referido para mensualidad, tienda retail e inactividad.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-title font-bold text-[#FFFFFF] tracking-wider mb-1">
              COMISIÓN POR MENSUALIDAD GYM (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={commPct}
              onChange={(e) => setCommPct(e.target.value)}
              required
              className="w-full py-3 px-4 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-[#FFFFFF] text-sm focus:outline-none focus:border-[#00F5D4]"
            />
          </div>
          <div>
            <label className="block text-xs font-title font-bold text-[#FFFFFF] tracking-wider mb-1">
              COMISIÓN POR TIENDA RETAIL (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={storeCommPct}
              onChange={(e) => setStoreCommPct(e.target.value)}
              required
              className="w-full py-3 px-4 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-[#FFFFFF] text-sm focus:outline-none focus:border-[#00F5D4]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-title font-bold text-[#FFFFFF] tracking-wider mb-1">
              UMBRAL DÍAS INACTIVIDAD ("TE EXTRAÑAMOS")
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={inactivityDays}
              onChange={(e) => setInactivityDays(e.target.value)}
              required
              className="w-full py-3 px-4 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-[#FFFFFF] text-sm focus:outline-none focus:border-[#00F5D4]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={configSaving}
          className="w-full py-3.5 btn-cyan-gradient font-bold text-xs font-title tracking-wider uppercase rounded-sm transition cursor-pointer"
        >
          {configSaving ? 'GUARDANDO CAMBIOS...' : 'GUARDAR CONFIGURACIÓN GENERAL'}
        </button>
      </form>
    </div>
  );
}
