'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Dumbbell,
  Star,
  Users,
  LogOut,
  Sliders,
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  CreditCard,
  ShoppingBag,
  UserCheck,
  ChevronRight,
  QrCode,
  Check,
  RefreshCw,
  Menu,
  X,
  Download,
  Plus,
  Trash2,
  UserPlus,
  Search,
  Phone,
  Calendar,
  Gift,
  Bell,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'evaluations' | 'wallet' | 'config'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Evaluation filters
  const [evalFilterTrainer, setEvalFilterTrainer] = useState('');
  const [evalFilterRating, setEvalFilterRating] = useState('');

  // Customers search
  const [customerSearch, setCustomerSearch] = useState('');

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
  const [newTrainerPhone, setNewTrainerPhone] = useState('');
  const [addingTrainer, setAddingTrainer] = useState(false);
  const [trainerMessage, setTrainerMessage] = useState('');

  // Plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newPlanDays, setNewPlanDays] = useState('30');
  const [addingPlan, setAddingPlan] = useState(false);
  const [planMessage, setPlanMessage] = useState('');

  // WhatsApp state
  const [waState, setWaState] = useState<'CONNECTED' | 'DISCONNECTED' | 'LOADING'>('LOADING');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waInstanceName, setWaInstanceName] = useState<string>('default');
  const [waLoading, setWaLoading] = useState(false);

  // Wallet state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState('');
  const [redeemError, setRedeemError] = useState('');

  // Payment verification & Push Notifications
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [prevPendingCount, setPrevPendingCount] = useState<number>(0);

  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

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
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);

      if (perm === 'granted') {
        try {
          // Register service worker if available and subscribe to PushManager
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready.catch(() => null) ||
              await navigator.serviceWorker.register('/sw.js').catch(() => null);

            if (reg && reg.pushManager) {
              const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BPhZFyScCH4K3tGvdqMmjPUR7ebMmCm7Fw4WNZO8nDbej8BGeArkhrDc7lZTb_uaLmPo0xuQ6_mcip_VjQShQWA';
              const convertedVapidKey = urlBase64ToUint8Array(vapidKey);

              let sub = await reg.pushManager.getSubscription();
              if (!sub) {
                sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: convertedVapidKey,
                });
              }

              // Send subscription object to backend database
              await fetch('/api/owner/push-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub }),
              });
            }
          }
        } catch (pushErr) {
          console.error('Error establishing Push Subscription:', pushErr);
        }

        new Notification('🔔 ¡Notificaciones Activadas!', {
          body: 'Hola Administrador, a partir de ahora recibirás alertas en tiempo real en este dispositivo cada vez que un cliente escanee un QR de Mensualidad o Tienda.',
          icon: '/favicon.ico',
        });
      }
    }
  };

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/owner/dashboard');
      if (res.status === 401) { router.push('/login'); return; }
      const json = await res.json();
      
      // Check if new pending payments arrived for Push notification alert
      const newPending = json.pendingPayments || [];
      if (newPending.length > prevPendingCount && prevPendingCount > 0) {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const latest = newPending[0];
          const currencySymbol = json.tenant?.currency === 'PEN' ? 'S/' : '$';

          if (latest.type === 'MEMBERSHIP') {
            new Notification('💳 ¡Nuevo Pago de Mensualidad!', {
              body: `${latest.customerName} solicita verificación de pago de Mensualidad por ${currencySymbol} ${Number(latest.amount).toFixed(2)}. ¡Haz clic para verificar!`,
              icon: '/favicon.ico',
            });
          } else {
            new Notification('🛍️ ¡Nuevo Pago en Tienda Retail!', {
              body: `${latest.customerName} solicita verificación de compra en Tienda por ${currencySymbol} ${Number(latest.amount).toFixed(2)}. ¡Haz clic para verificar!`,
              icon: '/favicon.ico',
            });
          }
        }
      }
      setPrevPendingCount(newPending.length);

      setData(json);
      setCommPct(json.tenant?.referralCommPct || '10.00');
      setStoreCommPct(json.tenant?.storeReferralCommPct || '5.00');
      setInactivityDays(json.tenant?.inactivityThresholdDays || '14');
      setWaPhone(json.tenant?.whatsappPhone || '');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Auto-refresh dashboard every 12 seconds for pending payments
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard();
    }, 12000);
    return () => clearInterval(interval);
  }, [prevPendingCount]);

  const loadTrainers = async () => {
    try {
      const res = await fetch('/api/owner/trainers');
      const json = await res.json();
      if (json.trainers) setTrainers(json.trainers);
    } catch (err) { console.error(err); }
  };

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/owner/plans');
      const json = await res.json();
      if (json.plans) setPlans(json.plans);
    } catch (err) { console.error(err); }
  };

  const loadWhatsAppStatus = async () => {
    setWaLoading(true);
    try {
      const res = await fetch('/api/owner/whatsapp-instance');
      if (res.ok) {
        const json = await res.json();
        setWaState(json.state === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED');
        setWaQr(json.qrcode);
        setWaInstanceName(json.instanceName || 'default');
        if (json.whatsappPhone) {
          setWaPhone(json.whatsappPhone);
          loadDashboard(); // Refresh dashboard data if phone was newly saved
        }
      } else { setWaState('DISCONNECTED'); }
    } catch { setWaState('DISCONNECTED'); }
    finally { setWaLoading(false); }
  };

  const handleInitWhatsAppInstance = async () => {
    setWaLoading(true);
    try {
      const res = await fetch('/api/owner/whatsapp-instance', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setWaQr(json.qrcode);
        setWaInstanceName(json.instanceName || 'default');
        loadWhatsAppStatus();
      }
    } catch (err) { console.error(err); }
    finally { setWaLoading(false); }
  };

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { if (activeTab === 'config') { loadWhatsAppStatus(); loadTrainers(); loadPlans(); } }, [activeTab]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
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
          referralCommPct: commPct,
          storeReferralCommPct: storeCommPct,
          currency: 'USD',
          inactivityThresholdDays: inactivityDays,
          whatsappPhone: waPhone,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setConfigMessage('Configuración guardada exitosamente');
        loadDashboard();
      }
    } catch { setConfigMessage('Error guardando configuración'); }
    finally { setConfigSaving(false); }
  };

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrainerName) return;
    setAddingTrainer(true);
    setTrainerMessage('');
    try {
      const res = await fetch('/api/owner/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTrainerName, phone: newTrainerPhone }),
      });
      const json = await res.json();
      if (json.success) {
        setTrainerMessage('Entrenador agregado exitosamente');
        setNewTrainerName('');
        setNewTrainerPhone('');
        loadTrainers();
        loadDashboard();
      }
    } catch { setTrainerMessage('Error al agregar entrenador'); }
    finally { setAddingTrainer(false); }
  };

  const handleDeleteTrainer = async (trainerId: string) => {
    if (!confirm('¿Deseas eliminar este entrenador?')) return;
    try {
      const res = await fetch(`/api/owner/trainers?id=${trainerId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setTrainerMessage('Entrenador eliminado');
        loadTrainers();
        loadDashboard();
      } else {
        setTrainerMessage(json.error || 'Error al eliminar');
      }
    } catch { setTrainerMessage('Error de red al eliminar'); }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName || !newPlanPrice || !newPlanDays) return;
    setAddingPlan(true);
    setPlanMessage('');
    try {
      const res = await fetch('/api/owner/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlanName, price: newPlanPrice, durationDays: newPlanDays }),
      });
      const json = await res.json();
      if (json.success) {
        setPlanMessage('Plan de membresía creado exitosamente');
        setNewPlanName('');
        setNewPlanPrice('');
        setNewPlanDays('30');
        loadPlans();
      }
    } catch { setPlanMessage('Error al crear plan'); }
    finally { setAddingPlan(false); }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('¿Deseas eliminar este plan de membresía?')) return;
    try {
      const res = await fetch(`/api/owner/plans?id=${planId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setPlanMessage('Plan eliminado');
        loadPlans();
      }
    } catch { setPlanMessage('Error al eliminar plan'); }
  };

  const handleVerifyPayment = async (paymentId: string, action: 'APPROVE' | 'REJECT') => {
    setVerifyingId(paymentId);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });
      if ((await res.json()).success) loadDashboard();
    } catch (err) { console.error(err); }
    finally { setVerifyingId(null); }
  };

  const handleRedeemWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError(''); setRedeemSuccess('');
    try {
      const res = await fetch('/api/wallet/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedCustomerId, amount: redeemAmount, description: 'Canje de saldo presencial' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error en canje');
      setRedeemSuccess(`Canje exitoso. Nuevo saldo: $ ${json.newBalance.toFixed(2)}`);
      setRedeemAmount('');
      loadDashboard();
    } catch (err: any) { setRedeemError(err.message); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center text-[#C5C6C7] font-sans text-sm">
        Cargando Panel...
      </div>
    );
  }

  const getQRUrl = (token: string) => {
    const phone = data?.tenant?.whatsappPhone || waPhone || '';
    const cleanPhone = String(phone).replace(/\D/g, '');
    const message = encodeURIComponent(`Hola este es mi codigo: ${token}`);
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${message}`;
    }
    return `https://wa.me/?text=${message}`;
  };

  const handleDownloadQR = (qrId: string, label: string) => {
    const canvas = document.getElementById(qrId) as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR_${label.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filtered evaluations
  const filteredEvaluations = (data?.evaluations || []).filter((ev: any) => {
    if (evalFilterTrainer && ev.trainer?.id !== evalFilterTrainer) return false;
    if (evalFilterRating && ev.rating !== parseInt(evalFilterRating, 10)) return false;
    return true;
  });

  // Filtered customers
  const filteredCustomers = (data?.allCustomers || []).filter((c: any) => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return (c.name?.toLowerCase().includes(q) || c.phone?.includes(q));
  });

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#FFFFFF] flex flex-col font-sans">
      {/* Header with Universal Hamburger Menu */}
      <header className="bg-[#1F2833] border-b border-[#2C3E50] px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-[#C5C6C7] hover:text-[#FFFFFF] bg-[#0B0C10] hover:bg-[#2C3E50] border border-[#2C3E50] rounded-md transition flex items-center justify-center gap-2"
            title="Menú de Navegación"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-xs font-title font-bold uppercase hidden sm:inline-block">MENÚ</span>
          </button>

          <div className="w-9 h-9 md:w-10 md:h-10 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex items-center justify-center text-[#B08D57]">
            <Award className="w-5 h-5" />
          </div>
          <h1 className="font-title text-sm md:text-base font-bold text-[#FFFFFF] tracking-wider truncate max-w-[180px] md:max-w-none">
            {data?.tenant?.name || 'Gimnasio & Retail'}
          </h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 md:gap-2 px-3 py-2 bg-[#0B0C10] hover:bg-[#2C3E50] border border-[#2C3E50] text-[#C5C6C7] text-xs font-semibold rounded-md transition">
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Cerrar Sesión</span>
        </button>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar overlay backdrop for small screens when open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-[#0B0C10]/80 backdrop-blur-sm z-20 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Collapsible Sidebar for both Desktop and Mobile */}
        {sidebarOpen && (
          <aside className="w-64 bg-[#0B0C10] border-r border-[#2C3E50] p-4 space-y-1 shrink-0 z-20 transition-all duration-200">
            {([
              { key: 'overview' as const, icon: Users, label: 'RESUMEN GENERAL', badge: data?.pendingPayments?.length || 0 },
              { key: 'evaluations' as const, icon: Star, label: 'EVALUACIONES & CLIENTES', badge: 0 },
              { key: 'wallet' as const, icon: Wallet, label: 'BILLETERA & CANJES', badge: 0 },
              { key: 'config' as const, icon: Sliders, label: 'CONFIGURACIÓN OWNER', badge: 0 },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold transition tracking-wider font-title ${activeTab === tab.key ? 'bg-[#1F2833] text-[#FFFFFF] border border-[#2C3E50]' : 'text-[#C5C6C7] hover:bg-[#1F2833]/50'}`}
              >
                <tab.icon className="w-4 h-4 text-[#B08D57]" />
                {tab.label}
                {tab.badge ? <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{tab.badge}</span> : null}
              </button>
            ))}
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto w-full">

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 md:space-y-8">
              <h2 className="font-title text-base md:text-lg font-bold text-[#FFFFFF] tracking-widest">RESUMEN GENERAL</h2>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {[
                  { label: 'CLIENTES TOTALES', value: data?.totalCustomers || 0, Icon: Users, targetTab: 'evaluations' as const },
                  { label: 'MEMBRESÍAS ACTIVAS', value: data?.activeMemberships || 0, Icon: UserCheck, targetTab: 'evaluations' as const },
                  { label: 'PAGOS POR VERIFICAR', value: data?.pendingPayments?.length || 0, Icon: Clock, targetTab: 'overview' as const },
                ].map((kpi) => (
                  <button
                    key={kpi.label}
                    onClick={() => {
                      if (kpi.targetTab === 'overview') {
                        // Scroll down to payments verification section
                        const el = document.getElementById('payments-verification-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        setActiveTab(kpi.targetTab);
                      }
                    }}
                    className="bg-[#1F2833] hover:bg-[#2C3E50]/50 border border-[#2C3E50] hover:border-[#B08D57]/60 rounded-lg p-5 md:p-6 flex items-center justify-between text-left transition group cursor-pointer"
                  >
                    <div>
                      <span className="text-[11px] text-[#C5C6C7] group-hover:text-[#FFFFFF] uppercase font-title font-semibold tracking-wider block mb-1 transition">
                        {kpi.label}
                      </span>
                      <span className="font-number text-3xl md:text-4xl text-[#FFFFFF] group-hover:text-[#B08D57] transition">
                        {kpi.value}
                      </span>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0B0C10] border border-[#2C3E50] group-hover:border-[#B08D57] rounded-lg flex items-center justify-center text-[#B08D57] transition">
                      <kpi.Icon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                  </button>
                ))}
              </div>

              {/* QR Codes */}
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="font-title text-sm md:text-base font-bold text-[#FFFFFF] tracking-wider">3 CÓDIGOS QR ÚNICOS</h3>
                  <p className="text-xs text-[#C5C6C7] mt-0.5">Cada QR genera un código dinámico cambiante al ser escaneado para su flujo correspondiente.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {[
                    { id: 'qr-eval', icon: Star, label: 'OPINIÓN DE ENTRENADORES', token: data?.qrTokens?.EVALUATION || 'eval_demo', downloadLabel: 'Opinion_Entrenadores' },
                    { id: 'qr-membership', icon: CreditCard, label: 'PAGO DE MENSUALIDAD (VERIFICACIÓN ADMIN)', token: data?.qrTokens?.MEMBERSHIP || 'membership_demo', downloadLabel: 'Pago_Mensualidad' },
                    { id: 'qr-retail', icon: ShoppingBag, label: 'PAGO DE TIENDA RETAIL (VERIFICACIÓN ADMIN)', token: data?.qrTokens?.RETAIL || 'retail_demo', downloadLabel: 'Pago_Tienda_Retail' },
                  ].map((qr) => (
                    <div key={qr.id} className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-5 md:p-6 flex flex-col items-center text-center space-y-4">
                      <div className="w-10 h-10 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex items-center justify-center text-[#B08D57]">
                        <qr.icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-title font-bold text-xs text-[#FFFFFF] tracking-wider uppercase">{qr.label}</h4>
                      <div className="p-4 bg-white rounded-lg border border-[#2C3E50]">
                        <QRCodeCanvas id={qr.id} value={getQRUrl(qr.token)} size={140} />
                      </div>
                      <button onClick={() => handleDownloadQR(qr.id, qr.downloadLabel)} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#C5C6C7] hover:bg-[#FFFFFF] text-[#000000] text-xs font-bold font-title tracking-wider uppercase rounded transition w-full">
                        <Download className="w-3.5 h-3.5" /> Descargar QR
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Verification */}
              <div id="payments-verification-section" className="space-y-4 pt-2">
                <h3 className="font-title text-sm md:text-base font-bold text-[#FFFFFF] tracking-wider">VERIFICACIÓN DE PAGOS</h3>
                {data?.pendingPayments?.length === 0 ? (
                  <div className="p-6 bg-[#1F2833] border border-[#2C3E50] rounded-lg text-center text-[#C5C6C7] text-xs">Sin pagos pendientes por verificar.</div>
                ) : (
                  <div className="space-y-3">
                    {data?.pendingPayments?.map((p: any) => (
                      <div key={p.id} className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#FFFFFF] text-sm">{p.customerName}</span>
                            <span className="text-[10px] bg-[#0B0C10] border border-[#2C3E50] text-[#B08D57] px-2 py-0.5 rounded font-mono">{p.referenceCode}</span>
                          </div>
                          <div className="text-xs text-[#C5C6C7]">WhatsApp: {p.customerPhone} • Tipo: {p.type === 'MEMBERSHIP' ? 'Mensualidad Gym' : 'Tienda Retail'}</div>
                          {Number(p.amount) > 0 ? (
                            <div className="font-number text-xl font-bold text-[#FFFFFF]">
                              {data?.tenant?.currency === 'PEN' ? 'S/' : '$'} {Number(p.amount).toFixed(2)}
                            </div>
                          ) : (
                            <div className="text-xs font-title font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded inline-block">
                              SOLICITUD DE ACCESO / VERIFICACIÓN
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button onClick={() => handleVerifyPayment(p.id, 'REJECT')} disabled={verifyingId === p.id} className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-rose-950/50 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold uppercase rounded transition">
                            <XCircle className="w-3.5 h-3.5" /> Rechazar
                          </button>
                          <button onClick={() => handleVerifyPayment(p.id, 'APPROVE')} disabled={verifyingId === p.id} className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3.5 py-2 bg-[#C5C6C7] hover:bg-[#FFFFFF] text-[#000000] text-xs font-bold font-title tracking-wider uppercase rounded transition">
                            <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Trainer Summary Cards */}
              <div className="space-y-4 pt-2">
                <h3 className="font-title text-sm md:text-base font-bold text-[#FFFFFF] tracking-wider">RESUMEN DE ENTRENADORES</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data?.trainerSummaries?.map((t: any) => (
                    <button key={t.id} onClick={() => { setEvalFilterTrainer(t.id); setActiveTab('evaluations'); }} className="bg-[#1F2833] hover:bg-[#2C3E50]/40 border border-[#2C3E50] rounded-lg p-5 text-left transition flex items-center justify-between group">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#FFFFFF] text-base group-hover:text-[#B08D57] transition">{t.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-number text-2xl text-[#FFFFFF]">★ {t.ratingAvg}</span>
                          <span className="text-xs text-[#C5C6C7]">({t.reviewCount} reseñas)</span>
                        </div>
                        <p className="text-xs text-[#C5C6C7] italic line-clamp-1">"{t.recentComment}"</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#C5C6C7] group-hover:translate-x-1 transition" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: EVALUATIONS & CLIENTS */}
          {activeTab === 'evaluations' && (
            <div className="space-y-6 md:space-y-8">
              <h2 className="font-title text-base md:text-lg font-bold text-[#FFFFFF] tracking-widest">EVALUACIONES & CLIENTES</h2>

              {/* === EVALUATIONS SECTION === */}
              <div className="space-y-4">
                <h3 className="font-title text-sm font-bold text-[#FFFFFF] tracking-wider flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#B08D57]" />
                  REGISTRO DE EVALUACIONES
                </h3>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] text-[#C5C6C7] uppercase font-semibold mb-1">Filtrar por Entrenador</label>
                    <select
                      value={evalFilterTrainer}
                      onChange={(e) => setEvalFilterTrainer(e.target.value)}
                      className="w-full py-2.5 px-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-xs text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]"
                    >
                      <option value="">Todos los Entrenadores</option>
                      {data?.trainerSummaries?.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name} (★ {t.ratingAvg})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-[#C5C6C7] uppercase font-semibold mb-1">Filtrar por Calificación</label>
                    <select
                      value={evalFilterRating}
                      onChange={(e) => setEvalFilterRating(e.target.value)}
                      className="w-full py-2.5 px-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-xs text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]"
                    >
                      <option value="">Todas las Calificaciones</option>
                      <option value="5">⭐ 5 - Excelente</option>
                      <option value="4">⭐ 4 - Buena</option>
                      <option value="3">⭐ 3 - Regular</option>
                      <option value="2">⭐ 2 - Mala</option>
                      <option value="1">⭐ 1 - Muy mala</option>
                    </select>
                  </div>
                  {(evalFilterTrainer || evalFilterRating) && (
                    <button
                      onClick={() => { setEvalFilterTrainer(''); setEvalFilterRating(''); }}
                      className="self-end px-3 py-2.5 bg-[#1F2833] hover:bg-[#2C3E50] border border-[#2C3E50] text-[#C5C6C7] text-xs font-semibold rounded transition"
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </div>

                {/* Evaluations count */}
                <div className="text-xs text-[#C5C6C7]">
                  Mostrando <span className="text-[#FFFFFF] font-bold">{filteredEvaluations.length}</span> de {data?.evaluations?.length || 0} evaluaciones
                </div>

                {/* Table */}
                <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="bg-[#0B0C10] text-[#C5C6C7] border-b border-[#2C3E50] font-title text-xs">
                      <tr>
                        <th className="p-4">FECHA Y HORA</th>
                        <th className="p-4">ENTRENADOR</th>
                        <th className="p-4">CALIFICACIÓN</th>
                        <th className="p-4">COMENTARIO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2C3E50]">
                      {filteredEvaluations.length === 0 ? (
                        <tr><td colSpan={4} className="p-6 text-center text-[#C5C6C7] text-xs">Sin evaluaciones {evalFilterTrainer || evalFilterRating ? 'con los filtros seleccionados' : 'registradas'}.</td></tr>
                      ) : (
                        filteredEvaluations.map((ev: any) => (
                          <tr key={ev.id} className="hover:bg-[#0B0C10]/40">
                            <td className="p-4 text-[#C5C6C7] font-mono text-xs">{new Date(ev.createdAt).toLocaleString()}</td>
                            <td className="p-4 font-bold text-[#FFFFFF]">{ev.trainer?.name || 'Coach'}</td>
                            <td className="p-4">
                              <span className="font-number text-lg text-[#FFFFFF] px-2 py-0.5 bg-[#0B0C10] border border-[#2C3E50] rounded">★ {ev.rating}</span>
                            </td>
                            <td className="p-4 text-[#C5C6C7] italic max-w-xs truncate">{ev.comment || 'Sin comentario'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* === CUSTOMERS SECTION === */}
              <div className="space-y-4 pt-4 border-t border-[#2C3E50]">
                <h3 className="font-title text-sm font-bold text-[#FFFFFF] tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#B08D57]" />
                  TODOS LOS CLIENTES REGISTRADOS ({data?.allCustomers?.length || 0})
                </h3>

                {/* Search */}
                <div className="relative max-w-md">
                  <Search className="w-4 h-4 text-[#C5C6C7] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o número de WhatsApp..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full py-2.5 pl-9 pr-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-xs text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]"
                  />
                </div>

                <div className="text-xs text-[#C5C6C7]">
                  Mostrando <span className="text-[#FFFFFF] font-bold">{filteredCustomers.length}</span> clientes
                </div>

                {/* Customers Table */}
                <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[700px]">
                    <thead className="bg-[#0B0C10] text-[#C5C6C7] border-b border-[#2C3E50] font-title text-xs">
                      <tr>
                        <th className="p-4">NOMBRE (WHATSAPP)</th>
                        <th className="p-4">NÚMERO</th>
                        <th className="p-4">ESTADO</th>
                        <th className="p-4">MEMBRESÍA HASTA</th>
                        <th className="p-4">REGISTRADO</th>
                        <th className="p-4">ÚLTIMA ACTIVIDAD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2C3E50]">
                      {filteredCustomers.length === 0 ? (
                        <tr><td colSpan={6} className="p-6 text-center text-[#C5C6C7] text-xs">Sin clientes registrados.</td></tr>
                      ) : (
                        filteredCustomers.map((c: any) => (
                          <tr key={c.id} className="hover:bg-[#0B0C10]/40">
                            <td className="p-4 font-bold text-[#FFFFFF] text-xs">{c.name}</td>
                            <td className="p-4 text-[#C5C6C7] font-mono text-xs flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-[#B08D57]" />
                              {c.phone}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                c.membershipActive
                                  ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-400'
                                  : 'bg-rose-950/40 border border-rose-800/50 text-rose-400'
                              }`}>
                                {c.membershipActive ? 'ACTIVO' : 'INACTIVO'}
                              </span>
                            </td>
                            <td className="p-4 text-[#C5C6C7] font-mono text-xs">
                              {c.membershipExpiry ? new Date(c.membershipExpiry).toLocaleDateString() : '—'}
                            </td>
                            <td className="p-4 text-[#C5C6C7] font-mono text-xs flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-[#B08D57]" />
                              {new Date(c.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-[#C5C6C7] font-mono text-xs">
                              {new Date(c.updatedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: WALLET */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <h2 className="font-title text-base md:text-lg font-bold text-[#FFFFFF] tracking-widest">BILLETERA & CANJES (HASTA 100%)</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Redeem Form */}
                <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-6 space-y-4">
                  <h3 className="font-title text-sm font-bold text-[#FFFFFF] flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#B08D57]" /> PROCESAR CANJE
                  </h3>
                  {redeemSuccess && <div className="p-3 bg-[#0B0C10] border border-[#2C3E50] text-[#FFFFFF] text-xs rounded">{redeemSuccess}</div>}
                  {redeemError && <div className="p-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs rounded">{redeemError}</div>}
                  <form onSubmit={handleRedeemWallet} className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#C5C6C7] mb-1 uppercase font-semibold">Seleccionar Cliente</label>
                      <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} required className="w-full py-2.5 px-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-sm text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]">
                        <option value="">-- Elige un cliente --</option>
                        {data?.wallets?.map((w: any) => (
                          <option key={w.customerId} value={w.customerId}>{w.customer.name} (Saldo: $ {Number(w.balance).toFixed(2)})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#C5C6C7] mb-1 uppercase font-semibold">Monto a Canjear ($)</label>
                      <input type="number" step="0.01" value={redeemAmount} onChange={(e) => setRedeemAmount(e.target.value)} required className="w-full py-2.5 px-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-sm text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]" placeholder="Ej. 45.00" />
                    </div>
                    <button type="submit" className="w-full py-3 bg-[#C5C6C7] hover:bg-[#FFFFFF] font-bold text-[#000000] text-xs font-title tracking-wider uppercase rounded transition">Ejecutar Canje (Hasta 100%)</button>
                  </form>
                </div>

                {/* Wallets Ledger */}
                <div className="md:col-span-2 bg-[#1F2833] border border-[#2C3E50] rounded-lg p-6 space-y-4">
                  <h3 className="font-title text-sm font-bold text-[#FFFFFF]">SALDOS DE CLIENTES</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data?.wallets?.map((w: any) => (
                      <div key={w.id} className="bg-[#0B0C10] border border-[#2C3E50] rounded p-4 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-[#FFFFFF]">{w.customer.name}</div>
                          <div className="text-xs text-[#C5C6C7]">{w.customer.phone}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-number text-2xl font-semibold text-[#FFFFFF]">$ {Number(w.balance).toFixed(2)}</div>
                          <div className="text-xs text-[#C5C6C7]">{w.transactions.length} transacciones</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONFIG */}
          {activeTab === 'config' && (
            <div className="max-w-3xl space-y-6 md:space-y-8">
              <h2 className="font-title text-base md:text-lg font-bold text-[#FFFFFF] tracking-widest">CONFIGURACIÓN OWNER</h2>

              {/* 1. TRAINERS MANAGEMENT */}
              <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-4 md:p-6 space-y-5">
                <div className="border-b border-[#2C3E50] pb-3">
                  <h3 className="font-title font-bold text-xs md:text-sm text-[#FFFFFF] tracking-wider uppercase flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[#B08D57]" />
                    GESTIÓN DE ENTRENADORES
                  </h3>
                  <p className="text-xs text-[#C5C6C7] mt-0.5">Agrega o elimina entrenadores para que tus clientes puedan calificarlos en el flujo 1 de WhatsApp.</p>
                </div>

                {trainerMessage && <div className="p-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-emerald-400 text-xs">{trainerMessage}</div>}

                <form onSubmit={handleAddTrainer} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" placeholder="Nombre Entrenador" value={newTrainerName} onChange={(e) => setNewTrainerName(e.target.value)} required className="py-2.5 px-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-xs text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]" />
                  <input type="tel" placeholder="Teléfono / WhatsApp (Opcional)" value={newTrainerPhone} onChange={(e) => setNewTrainerPhone(e.target.value)} className="py-2.5 px-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-xs text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]" />
                  <button type="submit" disabled={addingTrainer} className="py-2.5 bg-[#C5C6C7] hover:bg-[#FFFFFF] text-[#000000] font-bold text-xs font-title tracking-wider uppercase rounded transition flex items-center justify-center gap-1.5">
                    <Plus className="w-4 h-4" /> {addingTrainer ? 'AGREGANDO...' : 'AGREGAR COACH'}
                  </button>
                </form>

                <div className="space-y-2 pt-2">
                  <span className="text-xs font-title text-[#C5C6C7] uppercase block">ENTRENADORES ACTIVOS ({trainers.length})</span>
                  {trainers.length === 0 ? (
                    <div className="p-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-xs text-[#C5C6C7] text-center">No hay entrenadores registrados. Agrega uno arriba.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {trainers.map((t) => (
                        <div key={t.id} className="bg-[#0B0C10] border border-[#2C3E50] rounded p-3 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs text-[#FFFFFF]">{t.name}</div>
                            {t.phone && <div className="text-[11px] text-[#C5C6C7]">{t.phone}</div>}
                          </div>
                          <button onClick={() => handleDeleteTrainer(t.id)} className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded transition" title="Eliminar Entrenador">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 1.5. MEMBERSHIP PLANS MANAGEMENT */}
              <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-4 md:p-6 space-y-5">
                <div className="border-b border-[#2C3E50] pb-3">
                  <h3 className="font-title font-bold text-xs md:text-sm text-[#FFFFFF] tracking-wider uppercase flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#B08D57]" />
                    PLANES DE MEMBRESÍA DEL GIMNASIO
                  </h3>
                  <p className="text-xs text-[#C5C6C7] mt-0.5">Configura los precios y duraciones para que el bot de WhatsApp los presente en el flujo 2.</p>
                </div>

                {planMessage && <div className="p-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-emerald-400 text-xs">{planMessage}</div>}

                <form onSubmit={handleAddPlan} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input type="text" placeholder="Nombre Plan (Ej. Mensual)" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} required className="py-2.5 px-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-xs text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]" />
                  <input type="number" placeholder="Precio ($)" value={newPlanPrice} onChange={(e) => setNewPlanPrice(e.target.value)} required className="py-2.5 px-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-xs text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]" />
                  <input type="number" placeholder="Días (Ej. 30)" value={newPlanDays} onChange={(e) => setNewPlanDays(e.target.value)} required className="py-2.5 px-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-xs text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]" />
                  <button type="submit" disabled={addingPlan} className="py-2.5 bg-[#C5C6C7] hover:bg-[#FFFFFF] text-[#000000] font-bold text-xs font-title tracking-wider uppercase rounded transition flex items-center justify-center gap-1.5">
                    <Plus className="w-4 h-4" /> {addingPlan ? 'CREANDO...' : 'CREAR PLAN'}
                  </button>
                </form>

                <div className="space-y-2 pt-2">
                  <span className="text-xs font-title text-[#C5C6C7] uppercase block">PLANES ACTIVOS ({plans.length})</span>
                  {plans.length === 0 ? (
                    <div className="p-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-xs text-[#C5C6C7] text-center">No hay planes creados. Agrega un plan mensual arriba.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {plans.map((p) => (
                        <div key={p.id} className="bg-[#0B0C10] border border-[#2C3E50] rounded p-3 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs text-[#FFFFFF]">{p.name}</div>
                            <div className="text-xs text-[#B08D57] font-mono">$ {Number(p.price).toFixed(2)} • {p.durationDays} días</div>
                          </div>
                          <button onClick={() => handleDeletePlan(p.id)} className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded transition" title="Eliminar Plan">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. WHATSAPP INSTANCE */}
              <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-4 md:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2C3E50] pb-4 gap-3">
                  <div>
                    <h3 className="font-title font-bold text-xs md:text-sm text-[#FFFFFF] tracking-wider uppercase">VINCULACIÓN INSTANCIA WHATSAPP</h3>
                    <p className="text-xs text-[#C5C6C7] mt-0.5">Vincule su número de WhatsApp escaneando el código QR para habilitar el bot automático.</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-bold font-title tracking-wider self-start sm:self-center ${waState === 'CONNECTED' ? 'bg-[#0B0C10] border border-[#2C3E50] text-emerald-400' : 'bg-amber-950/40 border border-amber-800/50 text-amber-300'}`}>
                    {waState === 'CONNECTED' ? '● CONECTADO' : '○ DESCONECTADO'}
                  </span>
                </div>

                {waState === 'CONNECTED' ? (
                  <div className="p-4 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold text-[#FFFFFF] text-sm flex items-center gap-2">
                          Instancia Vinculada Correctamente
                          {(waPhone || data?.tenant?.whatsappPhone) && (
                            <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-mono rounded">
                              +{waPhone || data?.tenant?.whatsappPhone}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-[#C5C6C7]">
                          Instancia: {waInstanceName}
                        </div>
                      </div>
                    </div>
                    <button onClick={loadWhatsAppStatus} className="px-3 py-1.5 bg-[#1F2833] hover:bg-[#2C3E50] text-[#C5C6C7] text-xs font-semibold rounded border border-[#2C3E50] transition flex items-center justify-center gap-1.5 self-start sm:self-center">
                      <RefreshCw className="w-3.5 h-3.5" /> Verificar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 bg-[#0B0C10] border border-[#2C3E50] rounded-lg space-y-4">
                    {waQr ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="p-4 bg-white rounded-lg border border-[#2C3E50]">
                          <img src={waQr.startsWith('data:') ? waQr : `data:image/png;base64,${waQr}`} alt="WhatsApp QR Code" className="w-48 h-48 md:w-52 md:h-52 object-contain" />
                        </div>
                        <p className="text-xs text-[#C5C6C7] text-center max-w-xs">Abre WhatsApp en tu teléfono, ve a <b>Dispositivos vinculados</b> y escanea este código.</p>
                      </div>
                    ) : (
                      <div className="text-center space-y-3">
                        <QrCode className="w-10 h-10 md:w-12 md:h-12 text-[#B08D57] mx-auto opacity-80" />
                        <p className="text-xs text-[#C5C6C7] max-w-sm">Haz clic abajo para vincular tu WhatsApp de forma segura.</p>
                        <button onClick={handleInitWhatsAppInstance} disabled={waLoading} className="px-5 py-2.5 bg-[#C5C6C7] hover:bg-[#FFFFFF] text-[#000000] font-bold text-xs font-title tracking-wider uppercase rounded transition">
                          {waLoading ? 'GENERANDO QR...' : 'VINCULAR WHATSAPP'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. PWA / BROWSER NOTIFICATIONS */}
              <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-4 md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2C3E50] pb-3 gap-2">
                  <div>
                    <h3 className="font-title font-bold text-xs md:text-sm text-[#FFFFFF] tracking-wider uppercase flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#B08D57]" />
                      NOTIFICACIONES EN TIEMPO REAL (PWA / CELULAR)
                    </h3>
                    <p className="text-xs text-[#C5C6C7] mt-0.5">Reciba alertas sonoras e instantáneas en su celular o PC cuando un cliente solicite verificar un pago.</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold font-title tracking-wider ${notifPermission === 'granted' ? 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-400' : 'bg-amber-950/40 border border-amber-800/50 text-amber-300'}`}>
                    {notifPermission === 'granted' ? '● ACTIVADAS' : '○ DESACTIVADAS'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-[#0B0C10] border border-[#2C3E50] rounded-lg">
                  <div className="text-xs text-[#C5C6C7]">
                    {notifPermission === 'granted'
                      ? 'Las notificaciones instantáneas están activas en este navegador / dispositivo.'
                      : 'Activa las notificaciones en tu celular o PC para recibir alertas en tiempo real al ingresar pagos de mensualidad o tienda.'}
                  </div>
                  {notifPermission !== 'granted' && (
                    <button
                      onClick={requestPushPermission}
                      type="button"
                      className="w-full sm:w-auto px-4 py-2 bg-[#C5C6C7] hover:bg-[#FFFFFF] text-[#000000] font-bold text-xs font-title tracking-wider uppercase rounded transition shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <Bell className="w-3.5 h-3.5" /> ACTIVAR NOTIFICACIONES
                    </button>
                  )}
                </div>
              </div>

              {/* 4. REFERRAL PERCENTAGES */}
              {configMessage && (
                <div className="p-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#B08D57]" /> {configMessage}
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-4 md:p-6 space-y-5">
                <div className="border-b border-[#2C3E50] pb-3">
                  <h3 className="font-title font-bold text-xs md:text-sm text-[#FFFFFF] tracking-wider uppercase">COMISIONES POR REFERIDO & PARÁMETROS</h3>
                  <p className="text-xs text-[#C5C6C7] mt-0.5">Configura las comisiones por referido para mensualidad, tienda retail e inactividad.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-title font-bold text-[#FFFFFF] tracking-wider mb-1">COMISIÓN POR MENSUALIDAD GYM (%)</label>
                    <input type="number" step="0.01" min="0" max="100" value={commPct} onChange={(e) => setCommPct(e.target.value)} required className="w-full py-3 px-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] text-sm focus:outline-none focus:border-[#C5C6C7]" />
                    <p className="text-[11px] text-[#C5C6C7] mt-1">Si un cliente referido paga $100 de mensualidad y la comisión es 10%, el referidor recibe $10 en su billetera.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-title font-bold text-[#FFFFFF] tracking-wider mb-1">COMISIÓN POR COMPRAS EN TIENDA RETAIL (%)</label>
                    <input type="number" step="0.01" min="0" max="100" value={storeCommPct} onChange={(e) => setStoreCommPct(e.target.value)} required className="w-full py-3 px-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] text-sm focus:outline-none focus:border-[#C5C6C7]" />
                    <p className="text-[11px] text-[#C5C6C7] mt-1">Porcentaje de ganancia acumulada para el referidor por compras de su referido en la tienda retail.</p>
                  </div>
                </div>

                <div className="max-w-xs">
                  <label className="block text-xs font-title font-bold text-[#FFFFFF] tracking-wider mb-1">UMBRAL DE INACTIVIDAD EN DÍAS</label>
                  <input type="number" value={inactivityDays} onChange={(e) => setInactivityDays(e.target.value)} required className="w-full py-3 px-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] text-sm focus:outline-none focus:border-[#C5C6C7]" />
                  <p className="text-[11px] text-[#C5C6C7] mt-1">Cantidad de días sin actividad antes de notificar al cliente por WhatsApp.</p>
                </div>

                <button type="submit" disabled={configSaving} className="w-full sm:w-auto px-6 py-3 bg-[#C5C6C7] hover:bg-[#FFFFFF] font-bold text-[#000000] text-xs font-title tracking-wider uppercase rounded transition">
                  {configSaving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
