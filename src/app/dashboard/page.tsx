'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
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
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'evaluations' | 'wallet' | 'config'>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Selected trainer for detail view
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);

  // Config state
  const [commPct, setCommPct] = useState('');
  const [inactivityDays, setInactivityDays] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState('');

  // WhatsApp Instance state
  const [waState, setWaState] = useState<'CONNECTED' | 'DISCONNECTED' | 'LOADING'>('LOADING');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waInstanceName, setWaInstanceName] = useState<string>('default');
  const [waLoading, setWaLoading] = useState(false);

  // Wallet Redeem state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState('');
  const [redeemError, setRedeemError] = useState('');

  // Payment Verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const router = useRouter();

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/owner/dashboard');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      setData(json);
      setCommPct(json.tenant?.referralCommPct || '10.00');
      setInactivityDays(json.tenant?.inactivityThresholdDays || '14');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      } else {
        setWaState('DISCONNECTED');
      }
    } catch (err) {
      setWaState('DISCONNECTED');
    } finally {
      setWaLoading(false);
    }
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
    } catch (err) {
      console.error(err);
    } finally {
      setWaLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === 'config') {
      loadWhatsAppStatus();
    }
  }, [activeTab]);

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
          inactivityThresholdDays: inactivityDays,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setConfigMessage('Configuración guardada exitosamente');
        loadDashboard();
      }
    } catch (err: any) {
      setConfigMessage('Error guardando configuración');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string, action: 'APPROVE' | 'REJECT') => {
    setVerifyingId(paymentId);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });
      const json = await res.json();
      if (json.success) {
        loadDashboard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRedeemWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError('');
    setRedeemSuccess('');
    try {
      const res = await fetch('/api/wallet/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          amount: redeemAmount,
          description: 'Canje de saldo presencial',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error en canje');
      setRedeemSuccess(`Canje exitoso. Nuevo saldo: S/ ${json.newBalance.toFixed(2)}`);
      setRedeemAmount('');
      loadDashboard();
    } catch (err: any) {
      setRedeemError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center text-[#C5C6C7] font-sans text-sm">
        Cargando Panel...
      </div>
    );
  }

  const selectedTrainer = data?.trainerSummaries?.find((t: any) => t.id === selectedTrainerId);
  const trainerEvaluations = data?.evaluations?.filter((e: any) => e.trainerId === selectedTrainerId);

  const getQRUrl = (token: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/qr/${token}`;
    }
    return `/qr/${token}`;
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

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#FFFFFF] flex flex-col font-sans">
      {/* Header Mobile & Desktop */}
      <header className="bg-[#1F2833] border-b border-[#2C3E50] px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#C5C6C7] hover:text-[#FFFFFF] bg-[#0B0C10] border border-[#2C3E50] rounded-md"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-9 h-9 md:w-10 md:h-10 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex items-center justify-center text-[#B08D57]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-title text-sm md:text-base font-bold text-[#FFFFFF] tracking-wider truncate max-w-[180px] md:max-w-none">
              {data?.tenant?.name || 'Gimnasio & Retail'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-2 bg-[#0B0C10] hover:bg-[#2C3E50] border border-[#2C3E50] text-[#C5C6C7] text-xs font-semibold rounded-md transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 relative">
        {/* Mobile Navigation Backdrop & Drawer */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-[#0B0C10]/80 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed md:static inset-y-0 left-0 z-20 w-64 bg-[#0B0C10] border-r border-[#2C3E50] p-4 space-y-1 transform transition-transform duration-200 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0 top-[65px]' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <button
            onClick={() => {
              setActiveTab('overview');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold transition tracking-wider font-title relative ${
              activeTab === 'overview' ? 'bg-[#1F2833] text-[#FFFFFF] border border-[#2C3E50]' : 'text-[#C5C6C7] hover:bg-[#1F2833]/50'
            }`}
          >
            <Users className="w-4 h-4 text-[#B08D57]" />
            RESUMEN GENERAL
            {data?.pendingPayments?.length > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {data.pendingPayments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('evaluations');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold transition tracking-wider font-title ${
              activeTab === 'evaluations' ? 'bg-[#1F2833] text-[#FFFFFF] border border-[#2C3E50]' : 'text-[#C5C6C7] hover:bg-[#1F2833]/50'
            }`}
          >
            <Star className="w-4 h-4 text-[#B08D57]" />
            EVALUACIONES
          </button>

          <button
            onClick={() => {
              setActiveTab('wallet');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold transition tracking-wider font-title ${
              activeTab === 'wallet' ? 'bg-[#1F2833] text-[#FFFFFF] border border-[#2C3E50]' : 'text-[#C5C6C7] hover:bg-[#1F2833]/50'
            }`}
          >
            <Wallet className="w-4 h-4 text-[#B08D57]" />
            BILLETERA & CANJES
          </button>

          <button
            onClick={() => {
              setActiveTab('config');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold transition tracking-wider font-title ${
              activeTab === 'config' ? 'bg-[#1F2833] text-[#FFFFFF] border border-[#2C3E50]' : 'text-[#C5C6C7] hover:bg-[#1F2833]/50'
            }`}
          >
            <Sliders className="w-4 h-4 text-[#B08D57]" />
            CONFIGURACIÓN OWNER
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto w-full">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 md:space-y-8">
              <h2 className="font-title text-base md:text-lg font-bold text-[#FFFFFF] tracking-widest">RESUMEN GENERAL</h2>

              {/* 1. KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-5 md:p-6 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#C5C6C7] uppercase font-title font-semibold tracking-wider block mb-1">
                      CLIENTES TOTALES
                    </span>
                    <span className="font-number text-3xl md:text-4xl text-[#FFFFFF]">{data?.totalCustomers || 0}</span>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex items-center justify-center text-[#B08D57]">
                    <Users className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                </div>

                <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-5 md:p-6 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#C5C6C7] uppercase font-title font-semibold tracking-wider block mb-1">
                      MEMBRESÍAS ACTIVAS
                    </span>
                    <span className="font-number text-3xl md:text-4xl text-[#FFFFFF]">{data?.activeMemberships || 0}</span>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex items-center justify-center text-[#B08D57]">
                    <UserCheck className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                </div>

                <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-5 md:p-6 flex items-center justify-between sm:col-span-2 md:col-span-1">
                  <div>
                    <span className="text-[11px] text-[#C5C6C7] uppercase font-title font-semibold tracking-wider block mb-1">
                      PAGOS POR VERIFICAR
                    </span>
                    <span className="font-number text-3xl md:text-4xl text-[#FFFFFF]">{data?.pendingPayments?.length || 0}</span>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex items-center justify-center text-[#B08D57]">
                    <Clock className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                </div>
              </div>

              {/* 2. 3 Dynamic QR Codes Section */}
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="font-title text-sm md:text-base font-bold text-[#FFFFFF] tracking-wider">
                    3 CÓDIGOS QR ÚNICOS
                  </h3>
                  <p className="text-xs text-[#C5C6C7] mt-0.5">
                    Cada QR genera un código dinámico cambiante al ser escaneado para su flujo correspondiente.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {/* QR 1: Opinión Entrenadores */}
                  <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-5 md:p-6 flex flex-col items-center text-center space-y-4">
                    <div className="w-10 h-10 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex items-center justify-center text-[#B08D57]">
                      <Star className="w-5 h-5" />
                    </div>
                    <h4 className="font-title font-bold text-xs text-[#FFFFFF] tracking-wider uppercase">
                      OPINIÓN DE ENTRENADORES
                    </h4>
                    <div className="p-4 bg-white rounded-lg border border-[#2C3E50]">
                      <QRCodeCanvas id="qr-eval" value={getQRUrl(data?.qrTokens?.EVALUATION || 'eval_demo')} size={140} />
                    </div>
                    <button
                      onClick={() => handleDownloadQR('qr-eval', 'Opinion_Entrenadores')}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#C5C6C7] hover:bg-[#FFFFFF] text-[#000000] text-xs font-bold font-title tracking-wider uppercase rounded transition w-full"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar QR
                    </button>
                  </div>

                  {/* QR 2: Pago Mensualidad */}
                  <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-5 md:p-6 flex flex-col items-center text-center space-y-4">
                    <div className="w-10 h-10 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex items-center justify-center text-[#B08D57]">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <h4 className="font-title font-bold text-xs text-[#FFFFFF] tracking-wider uppercase">
                      PAGO DE MENSUALIDAD (VERIFICACIÓN ADMIN)
                    </h4>
                    <div className="p-4 bg-white rounded-lg border border-[#2C3E50]">
                      <QRCodeCanvas id="qr-membership" value={getQRUrl(data?.qrTokens?.MEMBERSHIP || 'membership_demo')} size={140} />
                    </div>
                    <button
                      onClick={() => handleDownloadQR('qr-membership', 'Pago_Mensualidad')}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#C5C6C7] hover:bg-[#FFFFFF] text-[#000000] text-xs font-bold font-title tracking-wider uppercase rounded transition w-full"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar QR
                    </button>
                  </div>

                  {/* QR 3: Pago Tienda */}
                  <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-5 md:p-6 flex flex-col items-center text-center space-y-4">
                    <div className="w-10 h-10 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex items-center justify-center text-[#B08D57]">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <h4 className="font-title font-bold text-xs text-[#FFFFFF] tracking-wider uppercase">
                      PAGO DE TIENDA RETAIL (VERIFICACIÓN ADMIN)
                    </h4>
                    <div className="p-4 bg-white rounded-lg border border-[#2C3E50]">
                      <QRCodeCanvas id="qr-retail" value={getQRUrl(data?.qrTokens?.RETAIL || 'retail_demo')} size={140} />
                    </div>
                    <button
                      onClick={() => handleDownloadQR('qr-retail', 'Pago_Tienda_Retail')}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#C5C6C7] hover:bg-[#FFFFFF] text-[#000000] text-xs font-bold font-title tracking-wider uppercase rounded transition w-full"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar QR
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Payments Verification Section */}
              <div className="space-y-4 pt-2">
                <h3 className="font-title text-sm md:text-base font-bold text-[#FFFFFF] tracking-wider">
                  VERIFICACIÓN DE PAGOS
                </h3>

                {data?.pendingPayments?.length === 0 ? (
                  <div className="p-6 bg-[#1F2833] border border-[#2C3E50] rounded-lg text-center text-[#C5C6C7] text-xs">
                    Sin pagos pendientes por verificar.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data?.pendingPayments?.map((p: any) => (
                      <div
                        key={p.id}
                        className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#FFFFFF] text-sm">{p.customerName}</span>
                            <span className="text-[10px] bg-[#0B0C10] border border-[#2C3E50] text-[#B08D57] px-2 py-0.5 rounded font-mono">
                              {p.referenceCode}
                            </span>
                          </div>
                          <div className="text-xs text-[#C5C6C7]">
                            WhatsApp: {p.customerPhone} • Tipo: {p.type === 'MEMBERSHIP' ? 'Mensualidad Gym' : 'Tienda Retail'}
                          </div>
                          <div className="font-number text-xl font-bold text-[#FFFFFF]">S/ {Number(p.amount).toFixed(2)}</div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleVerifyPayment(p.id, 'REJECT')}
                            disabled={verifyingId === p.id}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-rose-950/50 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold uppercase rounded transition"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Rechazar
                          </button>

                          <button
                            onClick={() => handleVerifyPayment(p.id, 'APPROVE')}
                            disabled={verifyingId === p.id}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3.5 py-2 bg-[#C5C6C7] hover:bg-[#FFFFFF] text-[#000000] text-xs font-bold font-title tracking-wider uppercase rounded transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Trainers Mini-Summary (Clickable) */}
              <div className="space-y-4 pt-2">
                <h3 className="font-title text-sm md:text-base font-bold text-[#FFFFFF] tracking-wider">
                  RESUMEN DE ENTRENADORES (HAZ CLIC PARA VER EVALUACIONES)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data?.trainerSummaries?.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTrainerId(t.id);
                        setActiveTab('evaluations');
                      }}
                      className="bg-[#1F2833] hover:bg-[#2C3E50]/40 border border-[#2C3E50] rounded-lg p-5 text-left transition flex items-center justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#FFFFFF] text-base group-hover:text-[#B08D57] transition">
                            {t.name}
                          </span>
                          <span className="text-xs text-[#C5C6C7] bg-[#0B0C10] px-2 py-0.5 rounded border border-[#2C3E50]">
                            {t.branchName}
                          </span>
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

          {/* TAB: EVALUATIONS */}
          {activeTab === 'evaluations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-title text-base md:text-lg font-bold text-[#FFFFFF] tracking-widest">
                  REGISTRO DETALLADO DE EVALUACIONES
                </h2>
                {selectedTrainerId && (
                  <button
                    onClick={() => setSelectedTrainerId(null)}
                    className="text-xs text-[#C5C6C7] hover:text-[#FFFFFF] underline font-medium"
                  >
                    Ver Todos los Entrenadores
                  </button>
                )}
              </div>

              {selectedTrainer && (
                <div className="p-4 bg-[#1F2833] border border-[#2C3E50] rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#C5C6C7] uppercase">Filtrado por Entrenador:</span>
                    <h3 className="font-bold text-[#FFFFFF] text-base">{selectedTrainer.name}</h3>
                  </div>
                  <div className="font-number text-3xl text-[#FFFFFF]">★ {selectedTrainer.ratingAvg}</div>
                </div>
              )}

              <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[600px]">
                  <thead className="bg-[#0B0C10] text-[#C5C6C7] border-b border-[#2C3E50] font-title text-xs">
                    <tr>
                      <th className="p-4">FECHA Y HORA</th>
                      <th className="p-4">ENTRENADOR</th>
                      <th className="p-4">SUCURSAL</th>
                      <th className="p-4">CALIFICACIÓN</th>
                      <th className="p-4">COMENTARIO</th>
                      <th className="p-4">METADATOS QR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2C3E50]">
                    {(selectedTrainerId ? trainerEvaluations : data?.evaluations)?.map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-[#0B0C10]/40">
                        <td className="p-4 text-[#C5C6C7] font-mono text-xs">{new Date(ev.createdAt).toLocaleString()}</td>
                        <td className="p-4 font-bold text-[#FFFFFF]">{ev.trainer?.name || 'Coach'}</td>
                        <td className="p-4 text-[#C5C6C7]">{ev.branch?.name || 'Sucursal Principal'}</td>
                        <td className="p-4">
                          <span className="font-number text-lg text-[#FFFFFF] px-2 py-0.5 bg-[#0B0C10] border border-[#2C3E50] rounded">
                            ★ {ev.rating}
                          </span>
                        </td>
                        <td className="p-4 text-[#C5C6C7] italic">{ev.comment || 'Sin comentario'}</td>
                        <td className="p-4 text-xs font-mono text-[#C5C6C7]/60">qrSlug: {ev.qrSlugId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: WALLET */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <h2 className="font-title text-base md:text-lg font-bold text-[#FFFFFF] tracking-widest">
                BILLETERA & CANJES (HASTA 100%)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Redeem Form */}
                <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-6 space-y-4">
                  <h3 className="font-title text-sm font-bold text-[#FFFFFF] flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#B08D57]" />
                    PROCESAR CANJE
                  </h3>

                  {redeemSuccess && (
                    <div className="p-3 bg-[#0B0C10] border border-[#2C3E50] text-[#FFFFFF] text-xs rounded">
                      {redeemSuccess}
                    </div>
                  )}
                  {redeemError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs rounded">
                      {redeemError}
                    </div>
                  )}

                  <form onSubmit={handleRedeemWallet} className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#C5C6C7] mb-1 uppercase font-semibold">
                        Seleccionar Cliente
                      </label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        required
                        className="w-full py-2.5 px-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-sm text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]"
                      >
                        <option value="">-- Elige un cliente --</option>
                        {data?.wallets?.map((w: any) => (
                          <option key={w.customerId} value={w.customerId}>
                            {w.customer.name} (Saldo: S/ {Number(w.balance).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[#C5C6C7] mb-1 uppercase font-semibold">
                        Monto a Canjear (S/)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={redeemAmount}
                        onChange={(e) => setRedeemAmount(e.target.value)}
                        required
                        className="w-full py-2.5 px-3 bg-[#0B0C10] border border-[#2C3E50] rounded text-sm text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]"
                        placeholder="Ej. 45.00"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-[#C5C6C7] hover:bg-[#FFFFFF] font-bold text-[#000000] text-xs font-title tracking-wider uppercase rounded transition"
                    >
                      Ejecutar Canje (Hasta 100%)
                    </button>
                  </form>
                </div>

                {/* Wallets Ledger */}
                <div className="md:col-span-2 bg-[#1F2833] border border-[#2C3E50] rounded-lg p-6 space-y-4">
                  <h3 className="font-title text-sm font-bold text-[#FFFFFF]">SALDOS DE CLIENTES</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data?.wallets?.map((w: any) => (
                      <div
                        key={w.id}
                        className="bg-[#0B0C10] border border-[#2C3E50] rounded p-4 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-[#FFFFFF]">{w.customer.name}</div>
                          <div className="text-xs text-[#C5C6C7]">{w.customer.phone}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-number text-2xl font-semibold text-[#FFFFFF]">
                            S/ {Number(w.balance).toFixed(2)}
                          </div>
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

              {/* WhatsApp Instance Scanner Section */}
              <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-4 md:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2C3E50] pb-4 gap-3">
                  <div>
                    <h3 className="font-title font-bold text-xs md:text-sm text-[#FFFFFF] tracking-wider uppercase">
                      VINCULACIÓN INSTANCIA WHATSAPP
                    </h3>
                    <p className="text-xs text-[#C5C6C7] mt-0.5">
                      Vincule su número de WhatsApp escaneando el código QR para habilitar el envío automático de mensajes.
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-xs font-bold font-title tracking-wider self-start sm:self-center ${
                      waState === 'CONNECTED'
                        ? 'bg-[#0B0C10] border border-[#2C3E50] text-emerald-400'
                        : 'bg-amber-950/40 border border-amber-800/50 text-amber-300'
                    }`}
                  >
                    {waState === 'CONNECTED' ? '● CONECTADO' : '○ DESCONECTADO'}
                  </span>
                </div>

                {waState === 'CONNECTED' ? (
                  <div className="p-4 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold text-[#FFFFFF] text-sm">Instancia Vinculada Correctamente</div>
                        <div className="text-xs font-mono text-[#C5C6C7]">{waInstanceName}</div>
                      </div>
                    </div>
                    <button
                      onClick={loadWhatsAppStatus}
                      className="px-3 py-1.5 bg-[#1F2833] hover:bg-[#2C3E50] text-[#C5C6C7] text-xs font-semibold rounded border border-[#2C3E50] transition flex items-center justify-center gap-1.5 self-start sm:self-center"
                    >
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
                        <p className="text-xs text-[#C5C6C7] text-center max-w-xs">
                          Abre WhatsApp en tu teléfono, ve a <b>Dispositivos vinculados</b> y escanea este código.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center space-y-3">
                        <QrCode className="w-10 h-10 md:w-12 md:h-12 text-[#B08D57] mx-auto opacity-80" />
                        <p className="text-xs text-[#C5C6C7] max-w-sm">
                          Haz clic abajo para vincular tu WhatsApp de forma segura.
                        </p>
                        <button
                          onClick={handleInitWhatsAppInstance}
                          disabled={waLoading}
                          className="px-5 py-2.5 bg-[#C5C6C7] hover:bg-[#FFFFFF] text-[#000000] font-bold text-xs font-title tracking-wider uppercase rounded transition"
                        >
                          {waLoading ? 'GENERANDO QR...' : 'VINCULAR WHATSAPP'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* General Tenant Config Form */}
              {configMessage && (
                <div className="p-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#B08D57]" />
                  {configMessage}
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-4 md:p-6 space-y-5">
                <div>
                  <label className="block text-xs font-title font-bold text-[#FFFFFF] tracking-wider mb-1">
                    PORCENTAJE DE COMISIÓN POR REFERIDO (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={commPct}
                    onChange={(e) => setCommPct(e.target.value)}
                    required
                    className="w-full py-3 px-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]"
                  />
                  <p className="text-xs text-[#C5C6C7] mt-1">
                    Configurable por el dueño. Se calcula en la primera compra pagada del referido.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-title font-bold text-[#FFFFFF] tracking-wider mb-1">
                    UMBRAL DE INACTIVIDAD EN DÍAS
                  </label>
                  <input
                    type="number"
                    value={inactivityDays}
                    onChange={(e) => setInactivityDays(e.target.value)}
                    required
                    className="w-full py-3 px-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] focus:outline-none focus:border-[#C5C6C7]"
                  />
                  <p className="text-xs text-[#C5C6C7] mt-1">
                    Días de inasistencia para enviar plantilla WhatsApp de reactivación.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={configSaving}
                  className="w-full sm:w-auto px-6 py-3 bg-[#C5C6C7] hover:bg-[#FFFFFF] font-bold text-[#000000] text-xs font-title tracking-wider uppercase rounded transition"
                >
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
