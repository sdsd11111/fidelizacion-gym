'use client';

import { useState } from 'react';
import {
  Star,
  Users,
  Search,
  Phone,
  Clock,
  Plus,
  X,
  CreditCard,
  ShoppingBag,
} from 'lucide-react';
import { useDashboard } from '../layout';

export default function EvaluationsPage() {
  const { data, loading } = useDashboard();

  // Evaluation filters
  const [evalFilterTrainer, setEvalFilterTrainer] = useState('');
  const [evalFilterRating, setEvalFilterRating] = useState('');

  // Customers search & Activity Modal & Limits
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerLimit, setCustomerLimit] = useState(5);
  const [evalLimit, setEvalLimit] = useState(5);
  const [selectedCustomerModal, setSelectedCustomerModal] = useState<any>(null);
  const [modalTab, setModalTab] = useState<'membership' | 'retail' | 'evaluations'>('membership');

  const filteredEvaluations = (data?.evaluations || []).filter((ev: any) => {
    if (evalFilterTrainer && ev.trainerId !== evalFilterTrainer) return false;
    if (evalFilterRating && ev.rating !== parseInt(evalFilterRating)) return false;
    return true;
  });

  const filteredCustomers = (data?.allCustomers || []).filter((c: any) => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-[#7A93B2] font-mono text-sm">
        Cargando Evaluaciones y Registro de Clientes...
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <h2 className="font-title text-base md:text-lg font-bold text-gradient-cyan tracking-widest">
        EVALUACIONES & CLIENTES
      </h2>

      {/* === EVALUATIONS SECTION === */}
      <div className="space-y-4">
        <h3 className="font-title text-sm font-bold text-[#FFFFFF] tracking-wider flex items-center gap-2">
          <Star className="w-4 h-4 text-[#00F5D4]" />
          REGISTRO DE EVALUACIONES
        </h3>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-[10px] text-[#7A93B2] uppercase font-semibold mb-1">
              Filtrar por Entrenador
            </label>
            <select
              value={evalFilterTrainer}
              onChange={(e) => setEvalFilterTrainer(e.target.value)}
              className="w-full py-2.5 px-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
            >
              <option value="">Todos los Entrenadores</option>
              {data?.trainerSummaries?.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} (★ {t.ratingAvg})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-[#7A93B2] uppercase font-semibold mb-1">
              Filtrar por Calificación
            </label>
            <select
              value={evalFilterRating}
              onChange={(e) => setEvalFilterRating(e.target.value)}
              className="w-full py-2.5 px-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
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
              onClick={() => {
                setEvalFilterTrainer('');
                setEvalFilterRating('');
              }}
              className="self-end px-3 py-2.5 bg-[#02050B] hover:bg-[#0E1B2E] border border-[#0E1B2E] text-[#7A93B2] text-xs font-semibold rounded-sm transition cursor-pointer"
            >
              Limpiar Filtros
            </button>
          )}
        </div>

        {/* Evaluations count */}
        <div className="text-xs text-[#7A93B2]">
          Mostrando <span className="text-[#FFFFFF] font-bold">{filteredEvaluations.length}</span> de{' '}
          {data?.evaluations?.length || 0} evaluaciones
        </div>

        {/* Table */}
        <div className="sharp-card border border-[#0E1B2E] overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-[#02050B] text-[#7A93B2] border-b border-[#0E1B2E] font-title text-xs">
              <tr>
                <th className="p-4">FECHA Y HORA</th>
                <th className="p-4">ENTRENADOR</th>
                <th className="p-4">CALIFICACIÓN</th>
                <th className="p-4">COMENTARIO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0E1B2E]">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-[#7A93B2] text-xs">
                    Sin evaluaciones{' '}
                    {evalFilterTrainer || evalFilterRating
                      ? 'con los filtros seleccionados'
                      : 'registradas'}
                    .
                  </td>
                </tr>
              ) : (
                filteredEvaluations.slice(0, evalLimit).map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-[#02050B]">
                    <td className="p-4 text-[#7A93B2] font-mono text-xs">
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-[#FFFFFF]">{ev.trainer?.name || 'Coach'}</td>
                    <td className="p-4">
                      <span className="font-number text-lg text-[#00F5D4] px-2.5 py-0.5 bg-[#02050B] border border-[#0E1B2E] rounded-sm">
                        ★ {ev.rating}
                      </span>
                    </td>
                    <td className="p-4 text-[#7A93B2] italic max-w-xs truncate">
                      {ev.comment || 'Sin comentario'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredEvaluations.length > evalLimit && (
          <button
            onClick={() => setEvalLimit((prev) => prev + 5)}
            className="w-full py-3 bg-[#02050B] hover:bg-[#060D18] border border-[#0E1B2E] text-[#00F5D4] text-xs font-bold font-title tracking-wider rounded-sm transition flex items-center justify-center gap-1.5 cursor-pointer glow-cyan"
          >
            <Plus className="w-3.5 h-3.5" /> VER MÁS OPINIONES (Mostrando {evalLimit} de{' '}
            {filteredEvaluations.length})
          </button>
        )}
      </div>

      {/* === CUSTOMERS SECTION === */}
      <div className="space-y-4 pt-4 border-t border-[#0E1B2E]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-title text-sm font-bold text-[#FFFFFF] tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00F5D4]" />
              TODOS LOS CLIENTES REGISTRADOS ({data?.allCustomers?.length || 0})
            </h3>
            <p className="text-xs text-[#7A93B2]">
              Mostrando {Math.min(customerLimit, filteredCustomers.length)} de{' '}
              {filteredCustomers.length} clientes.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#7A93B2] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o WhatsApp..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setCustomerLimit(5);
              }}
              className="w-full py-2.5 pl-9 pr-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
            />
          </div>
        </div>

        {/* Customers Table */}
        <div className="sharp-card border border-[#0E1B2E] overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-[#02050B] text-[#7A93B2] border-b border-[#0E1B2E] font-title text-xs">
              <tr>
                <th className="p-4">NOMBRE (WHATSAPP)</th>
                <th className="p-4">NÚMERO</th>
                <th className="p-4">ESTADO</th>
                <th className="p-4">MEMBRESÍA HASTA</th>
                <th className="p-4">REGISTRADO</th>
                <th className="p-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0E1B2E]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[#7A93B2] text-xs">
                    Sin clientes registrados.
                  </td>
                </tr>
              ) : (
                filteredCustomers.slice(0, customerLimit).map((c: any) => (
                  <tr key={c.id} className="hover:bg-[#02050B] transition">
                    <td className="p-4 font-bold text-[#FFFFFF] text-xs">{c.name}</td>
                    <td className="p-4 text-[#7A93B2] font-mono text-xs flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-[#00F5D4]" />
                      {c.phone}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-sm text-[10px] font-bold tracking-wider ${
                          c.membershipActive
                            ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-400'
                            : 'bg-rose-950/40 border border-rose-800/50 text-rose-400'
                        }`}
                      >
                        {c.membershipActive ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="p-4 text-[#7A93B2] font-mono text-xs">
                      {c.membershipExpiry
                        ? new Date(c.membershipExpiry).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="p-4 text-[#7A93B2] font-mono text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedCustomerModal(c)}
                        className="px-3.5 py-1.5 bg-[#02050B] hover:bg-[#0E1B2E] border border-[#00F5D4]/40 text-[#00F5D4] hover:text-[#FFFFFF] text-xs font-semibold rounded-sm font-title tracking-wider transition flex items-center justify-center gap-1.5 ml-auto cursor-pointer glow-cyan"
                      >
                        <Clock className="w-3.5 h-3.5" /> VER ACTIVIDAD
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length > customerLimit && (
          <button
            onClick={() => setCustomerLimit((prev) => prev + 5)}
            className="w-full py-3 bg-[#02050B] hover:bg-[#060D18] border border-[#0E1B2E] text-[#00F5D4] hover:text-[#FFFFFF] text-xs font-bold font-title tracking-wider rounded-sm transition flex items-center justify-center gap-1.5 cursor-pointer glow-cyan"
          >
            <Plus className="w-4 h-4" /> VER MÁS CLIENTES (Mostrando {customerLimit} de{' '}
            {filteredCustomers.length})
          </button>
        )}
      </div>

      {/* CUSTOMER ACTIVITY DETAIL MODAL WITH TABS */}
      {selectedCustomerModal && (
        <div className="fixed inset-0 z-50 bg-[#02050B]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="sharp-panel rounded-none w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#00F5D4]/30">
            {/* Modal Header */}
            <div className="p-5 bg-[#02050B] border-b border-[#0E1B2E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#060D18] border border-[#00F5D4]/40 rounded-sm flex items-center justify-center text-[#00F5D4] glow-cyan">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#FFFFFF] text-base font-title tracking-wide">
                    {selectedCustomerModal.name}
                  </h3>
                  <p className="text-xs text-[#7A93B2] font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#00F5D4]" /> +{selectedCustomerModal.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerModal(null)}
                className="p-2 text-[#7A93B2] hover:text-[#FFFFFF] hover:bg-[#0E1B2E] rounded-sm transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs Header */}
            <div className="bg-[#02050B] border-b border-[#0E1B2E] p-1.5 grid grid-cols-3 gap-1">
              {[
                {
                  key: 'membership' as const,
                  label: 'MENSUALIDAD & REF.',
                  icon: CreditCard,
                  count:
                    (selectedCustomerModal.payments?.filter((p: any) => p.type === 'MEMBERSHIP')
                      .length || 0) + (selectedCustomerModal.referralsGiven?.length || 0),
                },
                {
                  key: 'retail' as const,
                  label: 'TIENDA RETAIL',
                  icon: ShoppingBag,
                  count:
                    selectedCustomerModal.payments?.filter((p: any) => p.type === 'RETAIL_STORE')
                      .length || 0,
                },
                {
                  key: 'evaluations' as const,
                  label: 'OPINIÓN COACHES',
                  icon: Star,
                  count: selectedCustomerModal.evaluations?.length || 0,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setModalTab(tab.key)}
                  className={`py-2 px-1 text-[11px] font-bold font-title tracking-wider rounded-sm transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalTab === tab.key
                      ? 'bg-[#060D18] text-[#FFFFFF] border border-[#00F5D4]/40 glow-cyan'
                      : 'text-[#7A93B2] hover:text-[#FFFFFF] hover:bg-[#060D18]/50'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5 text-[#00F5D4] shrink-0 hidden sm:inline-block" />
                  <span className="truncate">{tab.label}</span>
                  <span className="bg-[#02050B] text-[#00F5D4] text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-sm border border-[#0E1B2E] shrink-0">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Modal Content Area */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {modalTab === 'membership' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3.5 bg-[#02050B] border border-[#0E1B2E] rounded-sm">
                    <div>
                      <span className="text-[10px] font-title font-semibold text-[#7A93B2] uppercase block">
                        ESTADO DE MEMBRESÍA
                      </span>
                      <span
                        className={`text-xs font-bold font-title tracking-wider ${
                          selectedCustomerModal.membershipActive
                            ? 'text-[#00F5D4]'
                            : 'text-rose-400'
                        }`}
                      >
                        {selectedCustomerModal.membershipActive ? '● ACTIVA' : '○ INACTIVA'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-title font-semibold text-[#7A93B2] uppercase block">
                        VENCIMIENTO
                      </span>
                      <span className="text-xs font-mono font-bold text-[#FFFFFF]">
                        {selectedCustomerModal.membershipExpiry
                          ? new Date(selectedCustomerModal.membershipExpiry).toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-title text-xs font-bold text-[#FFFFFF] tracking-wider uppercase flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#00F5D4]" /> PAGOS DE MENSUALIDAD
                    </h4>
                    {selectedCustomerModal.payments?.filter((p: any) => p.type === 'MEMBERSHIP')
                      .length === 0 ? (
                      <div className="p-3.5 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#7A93B2] text-center">
                        Sin historial de mensualidades registradas.
                      </div>
                    ) : (
                      selectedCustomerModal.payments
                        ?.filter((p: any) => p.type === 'MEMBERSHIP')
                        .map((p: any) => (
                          <div
                            key={p.id}
                            className="p-3.5 bg-[#02050B] border border-[#0E1B2E] rounded-sm flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-xs text-[#FFFFFF]">
                                Renovación Mensualidad Gym
                              </div>
                              <div className="text-[10px] text-[#7A93B2] font-mono">
                                {new Date(p.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right font-number text-lg font-bold text-[#00F5D4]">
                              $ {Number(p.amount).toFixed(2)}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {modalTab === 'retail' && (
                <div className="space-y-2">
                  <h4 className="font-title text-xs font-bold text-[#FFFFFF] tracking-wider uppercase flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#00F5D4]" /> COMPRAS EN TIENDA RETAIL
                  </h4>
                  {selectedCustomerModal.payments?.filter((p: any) => p.type === 'RETAIL_STORE')
                    .length === 0 ? (
                    <div className="p-3.5 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#7A93B2] text-center">
                      Sin compras registradas en la tienda retail.
                    </div>
                  ) : (
                    selectedCustomerModal.payments
                      ?.filter((p: any) => p.type === 'RETAIL_STORE')
                      .map((p: any) => (
                        <div
                          key={p.id}
                          className="p-3.5 bg-[#02050B] border border-[#0E1B2E] rounded-sm flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-xs text-[#FFFFFF]">
                              Compra Tienda Retail ({p.referenceCode})
                            </div>
                            <div className="text-[10px] text-[#7A93B2] font-mono">
                              {new Date(p.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right font-number text-lg font-bold text-[#00F5D4]">
                            $ {Number(p.amount).toFixed(2)}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}

              {modalTab === 'evaluations' && (
                <div className="space-y-2">
                  <h4 className="font-title text-xs font-bold text-[#FFFFFF] tracking-wider uppercase flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-[#00F5D4]" /> RESEÑAS A ENTRENADORES
                  </h4>
                  {selectedCustomerModal.evaluations?.length === 0 ? (
                    <div className="p-3.5 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#7A93B2] text-center">
                      Este cliente no ha dejado opiniones registradas.
                    </div>
                  ) : (
                    selectedCustomerModal.evaluations?.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="p-3.5 bg-[#02050B] border border-[#0E1B2E] rounded-sm space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#FFFFFF]">
                            Coach: {ev.trainer?.name}
                          </span>
                          <span className="font-number text-sm text-[#00F5D4]">
                            ★ {ev.rating}
                          </span>
                        </div>
                        <p className="text-xs text-[#7A93B2] italic">
                          "{ev.comment || 'Sin comentario'}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
