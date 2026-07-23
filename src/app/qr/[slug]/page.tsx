'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MessageSquare, Send, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export default function PublicQREvaluationPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [waUrl, setWaUrl] = useState<string>('');

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/qr/${slug}`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        const rawPhone = resData?.whatsappPhone || '';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        const messageText = `Hola este es mi codigo: ${slug}`;
        const url = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
          : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
        setWaUrl(url);

        // AUTO-REDIRECT IMMEDIATELY TO WHATSAPP
        if (typeof window !== 'undefined') {
          window.location.href = url;
        }
      })
      .catch((err) => {
        console.error('Error fetching QR data:', err);
        const fallbackUrl = `https://wa.me/?text=${encodeURIComponent(`Hola este es mi codigo: ${slug}`)}`;
        setWaUrl(fallbackUrl);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const isEval = slug?.startsWith('evaluation_') || slug?.startsWith('EVAL-');
  const isMem = slug?.startsWith('membership_') || slug?.startsWith('MEM-');
  const flowTitle = isEval
    ? 'EVALUACIÓN DE ENTRENADORES'
    : isMem
    ? 'PAGO DE MENSUALIDAD'
    : 'PAGO TIENDA RETAIL';

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#FFFFFF] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#1F2833] border border-[#2C3E50] rounded-xl p-6 md:p-8 space-y-6 text-center shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#B08D57]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-3">
          <div className="w-16 h-16 bg-emerald-950/60 border border-emerald-600/50 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-900/20">
            <MessageSquare className="w-8 h-8" />
          </div>

          <span className="text-[10px] font-title font-bold tracking-widest text-[#B08D57] uppercase bg-[#0B0C10] px-3 py-1 rounded-full border border-[#2C3E50] inline-block">
            BOT AUTOMÁTICO WHATSAPP
          </span>

          <h1 className="font-title text-xl font-bold text-[#FFFFFF] tracking-wide uppercase">
            {flowTitle}
          </h1>

          <p className="text-xs text-[#C5C6C7] max-w-xs mx-auto">
            {data?.tenantName ? data.tenantName : 'Plataforma Gimnasio & Retail'}
          </p>
        </div>

        {/* Status card */}
        <div className="p-5 bg-[#0B0C10] border border-[#2C3E50] rounded-lg space-y-4">
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs font-title tracking-wider">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ABRIENDO WHATSAPP...
          </div>

          <p className="text-xs text-[#C5C6C7] leading-relaxed">
            Te estamos redirigiendo directamente a WhatsApp para iniciar tu flujo y capturar tus datos automáticamente.
          </p>

          {waUrl && (
            <a
              href={waUrl}
              target="_self"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs font-title tracking-wider uppercase rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 group"
            >
              <Send className="w-4 h-4" />
              ABRIR WHATSAPP AHORA
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </a>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-[#C5C6C7]/60 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Código QR: {slug}
        </div>
      </div>
    </div>
  );
}
