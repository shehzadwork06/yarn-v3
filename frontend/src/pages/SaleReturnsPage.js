import { useState, useEffect } from "react";
import { saleReturnsAPI, salesAPI } from "@/lib/api";
import { toast } from "sonner";
import { Plus, RotateCcw, XCircle } from "lucide-react";

const RESTOCK_LOCATIONS = ['FINISHED_STORE', 'STORE', 'CHEMICAL_STORE'];

export default function SaleReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [sales, setSales] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saleDetail, setSaleDetail] = useState(null);
  const [form, setForm] = useState({
    sale_id: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    notes: '',
    restock_location: 'FINISHED_STORE',
  });
  const [items, setItems] = useState([]);

  const load = () => saleReturnsAPI.list().then(r => setReturns(r.data));

  useEffect(() => {
    load();
    salesAPI.list().then(r => setSales(r.data));
  }, []);

  // When sale is selected, load its items
  const handleSaleSelect = async (saleId) => {
    setForm(f => ({ ...f, sale_id: saleId }));
    setItems([]);
    setSaleDetail(null);
    if (!saleId) return;
    try {
      const { data } = await salesAPI.get(saleId);
      setSaleDetail(data);
      setItems((data.items || []).map(item => ({
        lot_id: item.lot_id,
        product_id: item.product_id,
        lot_number: item.lot_number,
        product_name: item.product_name,
        original_qty: item.quantity,
        rate: item.rate,
        quantity: '',
      })));
    } catch {
      toast.error("Failed to load sale details");
    }
  };

  const updateItemQty = (idx, qty) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: qty } : it));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const returnItems = items
      .filter(it => parseFloat(it.quantity) > 0)
      .map(it => ({
        lot_id: it.lot_id,
        product_id: it.product_id,
        quantity: parseFloat(it.quantity),
        rate: it.rate,
      }));

    if (!returnItems.length) {
      toast.error("Enter a return quantity for at least one item");
      return;
    }

    try {
      await saleReturnsAPI.create({ ...form, items: returnItems });
      toast.success("Sale return recorded — stock restored");
      setShowForm(false);
      setForm({ sale_id: '', date: new Date().toISOString().split('T')[0], reason: '', notes: '', restock_location: 'FINISHED_STORE' });
      setItems([]);
      setSaleDetail(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error creating return");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this return? All stock and ledger effects will be reversed.")) return;
    try {
      await saleReturnsAPI.cancel(id);
      toast.success("Return cancelled and reversed");
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error cancelling return");
    }
  };

  const viewDetail = async (id) => {
    const { data } = await saleReturnsAPI.get(id);
    setSelected(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
            Sale Returns
          </h1>
          <p className="text-sm text-slate-500 mt-1">Process customer returns and restock goods</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSelected(null); }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider rounded-sm h-10 px-5 text-xs flex items-center gap-2 transition-all active:scale-95"
          style={{ fontFamily: 'Barlow Condensed' }}
        >
          <Plus size={16} /> New Return
        </button>
      </div>

      {/* New Return Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="industrial-card p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed' }}>
            New Sale Return
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
            <div className="lg:col-span-2">
              <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>Sale *</label>
              <select
                value={form.sale_id}
                onChange={e => handleSaleSelect(e.target.value)}
                required
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none"
              >
                <option value="">Select sale</option>
                {sales.filter(s => s.status !== 'CANCELLED').map(s => (
                  <option key={s.id} value={s.id}>{s.sale_number} — {s.customer_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>Date *</label>
              <input
                type="date" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>Restock Location</label>
              <select
                value={form.restock_location}
                onChange={e => setForm({ ...form, restock_location: e.target.value })}
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none"
              >
                {RESTOCK_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>Reason *</label>
              <input
                value={form.reason} required
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Quality issue"
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>Notes</label>
            <input
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none"
            />
          </div>

          {/* Items */}
          {items.length > 0 && (
            <>
              <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                Return Quantities <span className="text-slate-600 normal-case">(leave 0 for items not being returned)</span>
              </h4>
              <div className="space-y-2 mb-4">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-3 items-center bg-[#0A0F1C] border border-[#2D3648] rounded-sm px-3 py-2">
                    <div>
                      <p className="text-slate-200 text-xs font-medium">{item.product_name}</p>
                      <p className="text-amber-400 font-mono text-xs">{item.lot_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Sold Qty</p>
                      <p className="text-slate-300 font-mono text-sm">{item.original_qty} No Of Cones</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Rate</p>
                      <p className="text-slate-300 font-mono text-sm">{item.rate}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Return Qty (No Of Cones)</label>
                      <input
                        type="number" min="0" max={item.original_qty} step="0.01"
                        value={item.quantity}
                        onChange={e => updateItemQty(idx, e.target.value)}
                        placeholder="0"
                        className="w-full bg-[#111827] border border-[#2D3648] text-white rounded-sm px-3 h-9 text-sm outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {form.sale_id && items.length === 0 && (
            <p className="text-slate-500 text-sm mb-4">Loading sale items...</p>
          )}

          <div className="flex gap-2">
            <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider rounded-sm h-9 px-5 text-xs" style={{ fontFamily: 'Barlow Condensed' }}>
              Record Return
            </button>
            <button type="button" onClick={() => { setShowForm(false); setSaleDetail(null); setItems([]); }}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-sm h-9 px-5 text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Returns Table + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${selected ? 'lg:col-span-2' : 'lg:col-span-3'} industrial-card`}>
          <table className="w-full erp-table">
            <thead>
              <tr>
                <th>Return #</th><th>Sale #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id} onClick={() => viewDetail(r.id)} className="cursor-pointer">
                  <td className="text-amber-400 font-mono text-xs">{r.return_number}</td>
                  <td className="text-slate-400 font-mono text-xs">{r.sale_number}</td>
                  <td className="text-slate-200">{r.customer_name}</td>
                  <td className="text-slate-400 font-mono text-xs">{r.date}</td>
                  <td className="text-white font-mono font-bold">{r.total_amount?.toLocaleString()}</td>
                  <td>
                    <span className={r.status === 'COMPLETED' ? 'badge-success' : 'badge-error'}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {returns.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-10">
                    <RotateCcw size={24} className="mx-auto mb-2 text-slate-700" />
                    No sale returns yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="industrial-card p-5 animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white uppercase" style={{ fontFamily: 'Barlow Condensed' }}>Return Detail</h3>
              <button onClick={() => setSelected(null)} className="text-xs text-slate-500 hover:text-white">CLOSE</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Return #</span><span className="text-amber-400 font-mono">{selected.return_number}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Sale #</span><span className="text-slate-300 font-mono">{selected.sale_number}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="text-white">{selected.customer_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="text-slate-300 font-mono">{selected.date}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Reason</span><span className="text-slate-300">{selected.reason}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Restock At</span><span className="badge-info">{selected.restock_location}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Amount</span><span className="text-amber-400 font-mono font-bold">{selected.total_amount?.toLocaleString()}</span></div>
              {selected.notes && <div className="flex justify-between"><span className="text-slate-500">Notes</span><span className="text-slate-400 text-xs">{selected.notes}</span></div>}

              {selected.items?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Returned Items</p>
                  {selected.items.map(item => (
                    <div key={item.id} className="bg-[#0A0F1C] border border-[#2D3648] p-3 rounded-sm mb-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-300 font-medium">{item.product_name}</span>
                        <span className="text-amber-400 font-mono">{item.lot_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Qty</span>
                        <span className="font-mono text-white">{item.quantity} No Of Cones</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount</span>
                        <span className="font-mono text-emerald-400">{item.amount?.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cancel button — only for COMPLETED returns */}
              {selected.status === 'COMPLETED' && (
                <div className="mt-5 pt-4 border-t border-[#2D3648]">
                  <button
                    onClick={() => handleCancel(selected.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/20 text-red-400 hover:bg-red-900/30 border border-red-700/40 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors"
                    style={{ fontFamily: 'Barlow Condensed' }}
                  >
                    <XCircle size={13} /> Cancel Return
                  </button>
                  <p className="text-xs text-slate-600 text-center mt-1">This will reverse all stock and ledger effects</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
