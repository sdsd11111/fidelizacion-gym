'use client';

import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Users,
  UserCheck,
  Clock,
  Star,
  CreditCard,
  ShoppingBag,
  Download,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useDashboard } from './layout';

export default function DashboardOverviewPage() {
  const { data, loading, refreshData } = useDashboard();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleVerifyPayment = async (paymentId: string, action: 'APPROVE' | 'REJECT') => {
    setVerifyingId(paymentId);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });
      if (res.ok) {
        refreshData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingId(null);
    }
  };

  const getQRUrl = (token: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/qr/${token}`;
  };

  const handleDownloadQR = (elementId: string, filename: string) => {
    const canvas = document.getElementById(elementId) as HTMLCanvasElement;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${filename}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-[#7A93B2] font-mono text-sm">
        Cargando Resumen General de ALL-crm...
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <h2 className="font-title text-base md:text-lg font-bold text-gradient-cyan tracking-widest">
        RESUMEN GENERAL
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {[
          {
            label: 'CLIENTES TOTALES',
            value: data?.totalCustomers || 0,
            Icon: Users,
            href: '/dashboard/evaluaciones',
          },
          {
            label: 'MEMBRESÍAS ACTIVAS',
            value: data?.activeMemberships || 0,
            Icon: UserCheck,
            href: '/dashboard/evaluaciones',
          },
          {
            label: 'PAGOS POR VERIFICAR',
            value: data?.pendingPayments?.length || 0,
            Icon: Clock,
            href: '/dashboard#payments-verification-section',
          },
        ].map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="sharp-card rounded-sm p-5 md:p-6 flex items-center justify-between text-left transition group cursor-pointer border border-[#0E1B2E]"
          >
            <div>
              <span className="text-[11px] text-[#7A93B2] group-hover:text-[#FFFFFF] uppercase font-title font-semibold tracking-wider block mb-1 transition">
                {kpi.label}
              </span>
              <span className="font-number text-3xl md:text-4xl text-[#FFFFFF] group-hover:text-[#00F5D4] transition">
                {kpi.value}
              </span>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#02050B] border border-[#0E1B2E] group-hover:border-[#00F5D4] rounded-sm flex items-center justify-center text-[#00F5D4] transition glow-cyan">
              <kpi.Icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </Link>
        ))}
      </div>

      {/* QR Codes */}
      <div className="space-y-4 pt-2">
        <div>
          <h3 className="font-title text-sm md:text-base font-bold text-[#FFFFFF] tracking-wider">
            3 CÓDIGOS QR ÚNICOS
          </h3>
          <p className="text-xs text-[#7A93B2] mt-0.5">
            Cada QR genera un código dinámico cambiante al ser escaneado para su flujo correspondiente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {[
            {
              id: 'qr-eval',
              icon: Star,
              label: 'OPINIÓN DE ENTRENADORES',
              token: data?.qrTokens?.EVALUATION || 'eval_demo',
              downloadLabel: 'Opinion_Entrenadores',
            },
            {
              id: 'qr-membership',
              icon: CreditCard,
              label: 'PAGO DE MENSUALIDAD (VERIFICACIÓN ADMIN)',
              token: data?.qrTokens?.MEMBERSHIP || 'membership_demo',
              downloadLabel: 'Pago_Mensualidad',
            },
            {
              id: 'qr-retail',
              icon: ShoppingBag,
              label: 'PAGO DE TIENDA RETAIL (VERIFICACIÓN ADMIN)',
              token: data?.qrTokens?.RETAIL || 'retail_demo',
              downloadLabel: 'Pago_Tienda_Retail',
            },
          ].map((qr) => (
            <div
              key={qr.id}
              className="sharp-card rounded-sm p-5 md:p-6 flex flex-col items-center text-center space-y-4 border border-[#0E1B2E]"
            >
              <div className="w-10 h-10 bg-[#02050B] border border-[#0E1B2E] rounded-sm flex items-center justify-center text-[#00F5D4] glow-cyan">
                <qr.icon className="w-5 h-5" />
              </div>
              <h4 className="font-title font-bold text-xs text-[#FFFFFF] tracking-wider uppercase">
                {qr.label}
              </h4>
              <div className="p-4 bg-white rounded-sm border border-[#00F5D4]/40 shadow-lg">
                <QRCodeCanvas id={qr.id} value={getQRUrl(qr.token)} size={140} />
              </div>
              <button
                onClick={() => handleDownloadQR(qr.id, qr.downloadLabel)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 btn-cyan-gradient text-xs font-bold font-title tracking-wider uppercase rounded-sm transition w-full cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Descargar QR
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Verification */}
      <div id="payments-verification-section" className="space-y-4 pt-2">
        <h3 className="font-title text-sm md:text-base font-bold text-[#FFFFFF] tracking-wider">
          VERIFICACIÓN DE PAGOS
        </h3>
        {data?.pendingPayments?.length === 0 ? (
          <div className="p-6 sharp-card rounded-sm text-center text-[#7A93B2] text-xs">
            Sin pagos pendientes por verificar.
          </div>
        ) : (
          <div className="space-y-3">
            {data?.pendingPayments?.map((p: any) => (
              <div
                key={p.id}
                className="sharp-card rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#00F5D4]/30"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#FFFFFF] text-sm">{p.customerName}</span>
                    <span className="text-[10px] bg-[#02050B] border border-[#0E1B2E] text-[#00F5D4] px-2 py-0.5 rounded-sm font-mono">
                      {p.referenceCode}
                    </span>
                  </div>
                  <div className="text-xs text-[#7A93B2]">
                    WhatsApp: {p.customerPhone} • Tipo:{' '}
                    {p.type === 'MEMBERSHIP' ? 'Mensualidad Gym' : 'Tienda Retail'}
                  </div>
                  {Number(p.amount) > 0 ? (
                    <div className="font-number text-xl font-bold text-[#00F5D4]">
                      {data?.tenant?.currency === 'PEN' ? 'S/' : '$'} {Number(p.amount).toFixed(2)}
                    </div>
                  ) : (
                    <div className="text-xs font-title font-semibold text-[#00F5D4] bg-[#02050B] border border-[#00F5D4]/40 px-2.5 py-1 rounded-sm inline-block">
                      SOLICITUD DE ACCESO / VERIFICACIÓN
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleVerifyPayment(p.id, 'REJECT')}
                    disabled={verifyingId === p.id}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-rose-950/50 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold uppercase rounded-sm transition cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Rechazar
                  </button>
                  <button
                    onClick={() => handleVerifyPayment(p.id, 'APPROVE')}
                    disabled={verifyingId === p.id}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 btn-cyan-gradient text-xs font-bold font-title tracking-wider uppercase rounded-sm transition cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
