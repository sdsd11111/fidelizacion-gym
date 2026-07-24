'use client';

import { useState, useEffect } from 'react';
import { Wallet, Search } from 'lucide-react';

export default function WalletPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Redeem form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemError, setRedeemError] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState('');

  // Search state
  const [walletSearch, setWalletSearch] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/owner/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
          amount: parseFloat(redeemAmount),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al canjear saldo');

      setRedeemSuccess(`¡Canje de $ ${parseFloat(redeemAmount).toFixed(2)} procesado exitosamente!`);
      setRedeemAmount('');
      loadData();
    } catch (err: any) {
      setRedeemError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#7A93B2] font-mono text-sm">
        Cargando Billetera & Canjes...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-title text-base md:text-lg font-bold text-gradient-cyan tracking-widest">
        BILLETERA & CANJES (HASTA 100%)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Redeem Form & Selected Customer Activity */}
        <div className="space-y-4">
          <div className="sharp-card rounded-sm p-6 space-y-4 border border-[#0E1B2E]">
            <h3 className="font-title text-sm font-bold text-[#FFFFFF] flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#00F5D4]" /> PROCESAR CANJE
            </h3>
            {redeemSuccess && (
              <div className="p-3 bg-[#02050B] border border-[#00F5D4]/40 text-[#00F5D4] text-xs rounded-sm">
                {redeemSuccess}
              </div>
            )}
            {redeemError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs rounded-sm">
                {redeemError}
              </div>
            )}
            <form onSubmit={handleRedeemWallet} className="space-y-3">
              <div>
                <label className="block text-xs text-[#7A93B2] mb-1 uppercase font-semibold">
                  Seleccionar Cliente
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-sm text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
                >
                  <option value="">-- Elige un cliente --</option>
                  {data?.wallets?.map((w: any) => (
                    <option key={w.customerId} value={w.customerId}>
                      {w.customer?.name || 'Cliente'} (Saldo: $ {Number(w.balance).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#7A93B2] mb-1 uppercase font-semibold">
                  Monto a Canjear ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-sm text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
                  placeholder="Ej. 45.00"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 btn-cyan-gradient font-bold text-xs font-title tracking-wider uppercase rounded-sm transition cursor-pointer"
              >
                Ejecutar Canje (Hasta 100%)
              </button>
            </form>
          </div>

          {/* Selected Customer Activity Breakdown */}
          {selectedCustomerId && (() => {
            const activeWalletObj = data?.wallets?.find(
              (w: any) => w.customerId === selectedCustomerId
            );
            if (!activeWalletObj) return null;
            return (
              <div className="sharp-card rounded-sm p-5 space-y-3 border border-[#00F5D4]/30">
                <div className="flex items-center justify-between border-b border-[#0E1B2E] pb-3">
                  <div>
                    <span className="text-[10px] font-title font-semibold text-[#7A93B2] uppercase block">
                      CLIENTE SELECCIONADO
                    </span>
                    <div className="font-bold text-xs text-[#FFFFFF]">{activeWalletObj.customer?.name}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-title font-semibold text-[#7A93B2] uppercase block">
                      SALDO DISPONIBLE
                    </span>
                    <div className="font-number text-lg font-bold text-[#00F5D4]">
                      $ {Number(activeWalletObj.balance).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-title font-bold text-[#FFFFFF] uppercase block">
                    HISTORIAL DE ACUMULACIÓN Y CANJES
                  </span>
                  {activeWalletObj.transactions?.length === 0 ? (
                    <div className="p-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#7A93B2] text-center">
                      Sin transacciones registradas en billetera.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {activeWalletObj.transactions?.map((tx: any) => (
                        <div
                          key={tx.id}
                          className="p-2.5 bg-[#02050B] border border-[#0E1B2E] rounded-sm flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#FFFFFF] text-[11px]">
                              {tx.description || tx.type}
                            </div>
                            <div className="text-[10px] text-[#7A93B2] font-mono">
                              {new Date(tx.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <span
                            className={`font-number font-bold text-xs ${
                              tx.amount > 0 ? 'text-[#00F5D4]' : 'text-rose-400'
                            }`}
                          >
                            {tx.amount > 0
                              ? `+ $ ${Number(tx.amount).toFixed(2)}`
                              : `- $ ${Math.abs(Number(tx.amount)).toFixed(2)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Wallets Ledger with Search & Top 10 Limit */}
        <div className="md:col-span-2 sharp-card rounded-sm p-6 space-y-4 border border-[#0E1B2E]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0E1B2E] pb-3">
            <div>
              <h3 className="font-title text-sm font-bold text-[#FFFFFF]">SALDOS DE CLIENTES</h3>
              <p className="text-[11px] text-[#7A93B2]">
                Mostrando los 10 clientes con actividad más reciente.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#7A93B2] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar cliente o WhatsApp..."
                value={walletSearch}
                onChange={(e) => setWalletSearch(e.target.value)}
                className="w-full py-2 pl-9 pr-3 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#FFFFFF] focus:outline-none focus:border-[#00F5D4]"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {(() => {
              const filteredWallets = (data?.wallets || [])
                .filter((w: any) => {
                  if (!walletSearch) return true;
                  const q = walletSearch.toLowerCase();
                  return (
                    w.customer?.name?.toLowerCase().includes(q) ||
                    w.customer?.phone?.includes(q)
                  );
                })
                .slice(0, 10);

              if (filteredWallets.length === 0) {
                return (
                  <div className="p-6 bg-[#02050B] border border-[#0E1B2E] rounded-sm text-xs text-[#7A93B2] text-center">
                    No se encontraron clientes con el criterio de búsqueda.
                  </div>
                );
              }

              return filteredWallets.map((w: any) => (
                <div
                  key={w.id}
                  onClick={() => setSelectedCustomerId(w.customerId)}
                  className={`p-4 border rounded-sm flex items-center justify-between cursor-pointer transition ${
                    selectedCustomerId === w.customerId
                      ? 'bg-[#02050B] border-[#00F5D4] glow-cyan'
                      : 'bg-[#02050B]/60 hover:bg-[#02050B] border-[#0E1B2E]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-[#FFFFFF] text-sm flex items-center gap-2">
                      {w.customer?.name}
                      {selectedCustomerId === w.customerId && (
                        <span className="text-[9px] bg-[#00F5D4] text-[#02050B] font-bold font-title px-1.5 py-0.2 rounded-sm uppercase">
                          SELECCIONADO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#7A93B2] font-mono">
                      WhatsApp: +{w.customer?.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-number text-2xl font-semibold text-[#00F5D4]">
                      $ {Number(w.balance).toFixed(2)}
                    </div>
                    <div className="text-xs text-[#7A93B2] font-mono">
                      {w.transactions?.length || 0} movimientos
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
