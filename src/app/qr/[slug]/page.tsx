'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Dumbbell, Star, CheckCircle, ShieldAlert, CreditCard, ShoppingBag, MessageSquare, Send } from 'lucide-react';

export default function PublicQREvaluationPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  // Manual fallback form states
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!slug) return;

    if (slug.startsWith('evaluation_') || slug.startsWith('membership_') || slug.startsWith('retail_')) {
      const type = slug.startsWith('evaluation_')
        ? 'EVALUATION'
        : slug.startsWith('membership_')
        ? 'MEMBERSHIP'
        : 'RETAIL';

      if (type === 'EVALUATION') {
        fetch(`/api/qr/${slug}`)
          .then((res) => res.json())
          .then((resData) => {
            if (resData.error) setError(resData.error);
            else setData({ ...resData, type: 'EVALUATION' });
          })
          .catch(() => setError('Error al cargar QR'))
          .finally(() => setLoading(false));
      } else {
        setData({ type, token: slug });
        setLoading(false);
      }
    } else {
      fetch(`/api/qr/${slug}`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.error) setError(resData.error);
          else setData({ ...resData, type: 'EVALUATION' });
        })
        .catch(() => setError('Error al cargar información del QR'))
        .finally(() => setLoading(false));
    }
  }, [slug]);

  const handleOpenWhatsAppFlow = () => {
    // Standard WhatsApp message prompt trigger
    const waPhone = '51987654321'; // Configured gym WhatsApp or default
    const message = encodeURIComponent(`Hola este es mi codigo: ${slug}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainerId) {
      setError('Por favor selecciona un entrenador');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/qr/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId: selectedTrainerId,
          rating,
          comment,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error enviando evaluación');
      setSuccessMsg('¡Muchas gracias! Tu evaluación ha sido registrada exitosamente.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: slug,
          type: data?.type,
          customerName,
          customerPhone,
          amount,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error procesando solicitud de pago');
      setSuccessMsg(`¡Solicitud registrada! Código de referencia: ${json.referenceCode}. Esperando verificación del administrador.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center text-[#C5C6C7] text-sm font-sans">
        Cargando QR...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center p-4">
        <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-6 text-center max-w-sm">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="font-title text-base font-bold text-[#FFFFFF] mb-1">QR NO VÁLIDO</h2>
          <p className="text-xs text-[#C5C6C7]">{error}</p>
        </div>
      </div>
    );
  }

  if (successMsg) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center p-4">
        <div className="bg-[#1F2833] border border-[#2C3E50] rounded-lg p-8 text-center max-w-sm space-y-4">
          <CheckCircle className="w-16 h-16 text-[#B08D57] mx-auto" />
          <h2 className="font-title text-xl font-bold text-[#FFFFFF]">¡PROCESO COMPLETADO!</h2>
          <p className="text-xs text-[#C5C6C7]">{successMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#FFFFFF] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#1F2833] border border-[#2C3E50] rounded-lg p-6 md:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#0B0C10] border border-[#2C3E50] rounded-lg flex items-center justify-center mx-auto text-[#B08D57]">
            {data?.type === 'EVALUATION' ? (
              <Dumbbell className="w-6 h-6" />
            ) : data?.type === 'MEMBERSHIP' ? (
              <CreditCard className="w-6 h-6" />
            ) : (
              <ShoppingBag className="w-6 h-6" />
            )}
          </div>
          <h1 className="font-title text-lg font-bold text-[#FFFFFF]">
            {data?.type === 'EVALUATION'
              ? 'EVALUACIÓN DE COACHES'
              : data?.type === 'MEMBERSHIP'
              ? 'PAGO DE MENSUALIDAD'
              : 'PAGO TIENDA RETAIL'}
          </h1>
          <p className="text-xs text-[#C5C6C7]">
            {data?.tenantName ? `${data.tenantName} • ${data.branchName}` : 'Plataforma Gimnasios & Retail'}
          </p>
        </div>

        {/* PROMINENT WHATSAPP AUTOMATION BUTTON */}
        <div className="p-4 bg-[#0B0C10] border border-[#2C3E50] rounded-lg text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs font-title tracking-wider uppercase">
            <MessageSquare className="w-4 h-4" /> RECOMENDADO: FLUJO INTERACTIVO WHATSAPP
          </div>
          <p className="text-xs text-[#C5C6C7]">
            Haz clic abajo para iniciar la conversación por WhatsApp. El bot detectará tu código QR automáticamente.
          </p>
          <button
            onClick={handleOpenWhatsAppFlow}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs font-title tracking-wider uppercase rounded transition flex items-center justify-center gap-2 shadow-lg"
          >
            <Send className="w-4 h-4" /> CONTINUAR POR WHATSAPP
          </button>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#2C3E50]"></div>
          <span className="flex-shrink mx-4 text-[10px] text-[#C5C6C7] font-title uppercase">O COMPLETA AQUÍ WEB</span>
          <div className="flex-grow border-t border-[#2C3E50]"></div>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs rounded">
            {error}
          </div>
        )}

        {/* EVALUATION FORM */}
        {data?.type === 'EVALUATION' && (
          <form onSubmit={handleSubmitEvaluation} className="space-y-5">
            <div>
              <label className="block text-xs font-title font-semibold uppercase text-[#C5C6C7] mb-2 tracking-wider">
                SELECCIONA TU ENTRENADOR / COACH
              </label>
              <select
                value={selectedTrainerId}
                onChange={(e) => setSelectedTrainerId(e.target.value)}
                required
                className="w-full py-3 px-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] text-sm focus:outline-none focus:border-[#C5C6C7]"
              >
                <option value="">-- Seleccionar Entrenador --</option>
                {data?.trainers?.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-title font-semibold uppercase text-[#C5C6C7] mb-2 tracking-wider">
                CALIFICACIÓN (1 A 5 ESTRELLAS)
              </label>
              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={`flex-1 py-3 rounded font-bold border transition flex items-center justify-center gap-1 font-number text-lg ${
                      rating >= star
                        ? 'bg-[#0B0C10] border-[#B08D57] text-[#B08D57]'
                        : 'bg-[#0B0C10] border-[#2C3E50] text-[#C5C6C7]/40'
                    }`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                    {star}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-title font-semibold uppercase text-[#C5C6C7] mb-2 tracking-wider">
                COMENTARIO U OBSERVACIÓN (OPCIONAL)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full py-3 px-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] text-sm focus:outline-none focus:border-[#C5C6C7] placeholder-[#C5C6C7]/40"
                placeholder="¿Qué te pareció la atención o rutina?"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#C5C6C7] hover:bg-[#FFFFFF] font-bold text-[#000000] font-title text-xs tracking-widest uppercase rounded transition shadow-md disabled:opacity-50"
            >
              {submitting ? 'ENVIANDO...' : 'ENVIAR EN WEB'}
            </button>
          </form>
        )}

        {/* PAYMENT FORM (MEMBERSHIP OR RETAIL) */}
        {data?.type !== 'EVALUATION' && (
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div>
              <label className="block text-xs font-title font-semibold uppercase text-[#C5C6C7] mb-1">
                NOMBRE COMPLETO
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full py-3 px-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] text-sm focus:outline-none focus:border-[#C5C6C7]"
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-semibold uppercase text-[#C5C6C7] mb-1">
                TELÉFONO WHATSAPP
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                className="w-full py-3 px-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] text-sm focus:outline-none focus:border-[#C5C6C7]"
                placeholder="Ej. 51987654321"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-semibold uppercase text-[#C5C6C7] mb-1">
                MONTO PAGADO (S/)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full py-3 px-4 bg-[#0B0C10] border border-[#2C3E50] rounded text-[#FFFFFF] text-sm focus:outline-none focus:border-[#C5C6C7]"
                placeholder="Ej. 120.00"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#C5C6C7] hover:bg-[#FFFFFF] font-bold text-[#000000] font-title text-xs tracking-widest uppercase rounded transition shadow-md disabled:opacity-50"
            >
              {submitting ? 'REGISTRANDO...' : 'REGISTRAR PAGO EN WEB'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
