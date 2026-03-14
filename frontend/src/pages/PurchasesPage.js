

// import { useState, useEffect, useRef } from "react";
// import { purchasesAPI, suppliersAPI, productsAPI, categoriesAPI } from "@/lib/api";
// import { toast } from "sonner";
// import { Plus, Search, X, ChevronDown, Package } from "lucide-react";
// import { useBusinessMode } from "../context/BusinessModeContext";

// // ─── Product Picker ───────────────────────────────────────────────────────────
// // Replaces the plain <select> for product with a searchable dropdown
// function ProductPicker({ value, products, categories, onChange, businessMode }) {
//   const [open, setOpen] = useState(false);
//   const [catId, setCatId] = useState('');
//   const [search, setSearch] = useState('');
//   const ref = useRef(null);

//   // Close on outside click
//   useEffect(() => {
//     const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
//     document.addEventListener('mousedown', handler);
//     return () => document.removeEventListener('mousedown', handler);
//   }, []);

//   // Filter products by workspace - only show purchasable types for the current workspace
//   const PURCHASE_TYPES = businessMode === 'CHEMICAL' 
//     ? ['CHEMICAL_RAW'] 
//     : ['RAW_YARN', 'DYED_YARN'];

//   const filtered = products.filter(p => {
//     if (!PURCHASE_TYPES.includes(p.type)) return false;
//     if (catId && String(p.category_id) !== String(catId)) return false;
//     if (search.trim()) {
//       const q = search.toLowerCase();
//       return p.name?.toLowerCase().includes(q) || p.shade_code?.toLowerCase().includes(q);
//     }
//     return true;
//   });

//   const selected = products.find(p => String(p.id) === String(value));

//   const handleSelect = (p) => {
//     onChange(p.id);
//     setOpen(false);
//     setSearch('');
//   };

//   const handleClear = (e) => {
//     e.stopPropagation();
//     onChange('');
//     setCatId('');
//     setSearch('');
//   };

//   return (
//     <div ref={ref} className="relative col-span-2">
//       {/* Trigger button */}
//       <button
//         type="button"
//         onClick={() => setOpen(o => !o)}
//         className={`w-full flex items-center justify-between gap-2 h-9 px-3 text-xs rounded-sm border transition-colors outline-none
//           ${open ? 'border-amber-500 bg-[#0A0F1C]' : 'border-[#2D3648] bg-[#0A0F1C] hover:border-amber-500/40'}
//           ${selected ? 'text-slate-200' : 'text-slate-500'}`}
//       >
//         <span className="flex items-center gap-2 truncate">
//           <Package size={11} className="shrink-0 text-slate-500" />
//           {selected ? (
//             <span className="truncate">{selected.name} <span className="text-slate-500">({selected.type})</span></span>
//           ) : (
//             <span>Select product…</span>
//           )}
//         </span>
//         <span className="flex items-center gap-1 shrink-0">
//           {selected && (
//             <span onClick={handleClear} className="text-slate-600 hover:text-slate-300 p-0.5 rounded transition-colors">
//               <X size={10} />
//             </span>
//           )}
//           <ChevronDown size={11} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
//         </span>
//       </button>

//       {/* Dropdown panel */}
//       {open && (
//         <div className="absolute z-50 top-full left-0 mt-1 w-80 bg-[#0D1423] border border-[#2D3648] rounded-sm shadow-2xl shadow-black/60">
//           {/* Filters row */}
//           <div className="flex gap-2 p-2 border-b border-[#2D3648]">
//             <select
//               value={catId}
//               onChange={e => { setCatId(e.target.value); setSearch(''); }}
//               className="flex-1 bg-[#1E2738] border border-slate-700 text-slate-300 rounded-sm px-2 h-7 text-xs outline-none focus:border-amber-500 transition-colors cursor-pointer"
//               style={{ fontFamily: 'Barlow Condensed' }}
//             >
//               <option value="">All Categories</option>
//               {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
//             </select>
//             <div className="relative flex-1">
//               <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
//               <input
//                 autoFocus
//                 type="text"
//                 value={search}
//                 onChange={e => setSearch(e.target.value)}
//                 placeholder="Search name…"
//                 className="w-full bg-[#1E2738] border border-slate-700 text-slate-200 rounded-sm pl-6 pr-2 h-7 text-xs outline-none focus:border-amber-500 transition-colors placeholder:text-slate-600"
//               />
//               {search && (
//                 <button type="button" onClick={() => setSearch('')}
//                   className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300">
//                   <X size={9} />
//                 </button>
//               )}
//             </div>
//           </div>

//           {/* Product list */}
//           <div className="max-h-52 overflow-y-auto">
//             {filtered.length === 0 ? (
//               <div className="py-6 text-center text-xs text-slate-600">No products match</div>
//             ) : (
//               filtered.map(p => (
//                 <button
//                   key={p.id}
//                   type="button"
//                   onClick={() => handleSelect(p)}
//                   className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-amber-500/10 transition-colors text-left
//                     ${String(p.id) === String(value) ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}
//                 >
//                   <span className="truncate">{p.name}</span>
//                   <span className="text-[10px] text-slate-600 font-mono ml-2 shrink-0">{p.type}</span>
//                 </button>
//               ))
//             )}
//           </div>

//           {/* Footer count */}
//           <div className="px-3 py-1.5 border-t border-[#2D3648] text-[10px] text-slate-600 font-mono">
//             {filtered.length} product{filtered.length !== 1 ? 's' : ''}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Main Page ────────────────────────────────────────────────────────────────
// export default function PurchasesPage() {
//   const { businessMode } = useBusinessMode();
//   const [purchases, setPurchases] = useState([]);
//   const [showForm, setShowForm] = useState(false);
//   const [suppliers, setSuppliers] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [form, setForm] = useState({ supplier_id: '', date: new Date().toISOString().split('T')[0], notes: '' });
//   const [items, setItems] = useState([{ product_id: '', quantity: '', rate: '', shade_code: '' }]);

//   const load = () => purchasesAPI.list().then(r => setPurchases(r.data));
//   useEffect(() => {
//     load();
//     suppliersAPI.list().then(r => setSuppliers(r.data)).catch(() => {});
//     productsAPI.list().then(r => setProducts(r.data)).catch(() => {});
//     categoriesAPI.list().then(r => setCategories(r.data)).catch(() => {});
//   }, []);

//   const addItem = () => setItems([...items, { product_id: '', quantity: '', rate: '', shade_code: '' }]);
//   const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
//   const updateItem = (i, field, val) => { const n = [...items]; n[i][field] = val; setItems(n); };

//   const handleCreate = async (e) => {
//     e.preventDefault();
//     try {
//       const payload = {
//         ...form,
//         items: items.map(i => ({
//           product_id: parseInt(i.product_id),
//           quantity: parseFloat(i.quantity),
//           rate: parseFloat(i.rate),
//           shade_code: i.shade_code || undefined
//         }))
//       };
//       await purchasesAPI.create(payload);
//       toast.success("Purchase created with lot numbers");
//       setShowForm(false);
//       setItems([{ product_id: '', quantity: '', rate: '', shade_code: '' }]);
//       load();
//     } catch (err) { toast.error(err.response?.data?.error || "Error"); }
//   };

//   return (
//     <div data-testid="purchases-page" className="space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>Purchases</h1>
//           <p className="text-sm text-slate-500 mt-1">Raw material procurement with lot generation</p>
//         </div>
//         <button data-testid="new-purchase-btn" onClick={() => setShowForm(!showForm)}
//           className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider rounded-sm h-10 px-5 text-xs flex items-center gap-2 transition-all active:scale-95"
//           style={{ fontFamily: 'Barlow Condensed' }}>
//           <Plus size={16} /> New Purchase
//         </button>
//       </div>

//       {showForm && (
//         <form onSubmit={handleCreate} className="industrial-card p-5 animate-fade-in" data-testid="purchase-form">
//           <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed' }}>New Purchase Order</h3>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
//             <div>
//               <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>Supplier</label>
//               <select data-testid="purchase-supplier" value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})} required
//                 className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none">
//                 <option value="">Select supplier</option>
//                 {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
//               </select>
//             </div>
//             <div>
//               <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>Date</label>
//               <input data-testid="purchase-date" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
//                 className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none" />
//             </div>
//             <div>
//               <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>Notes</label>
//               <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
//                 className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none" />
//             </div>
//           </div>

//           {/* Items header */}
//           <div className="grid grid-cols-6 gap-3 mb-1 px-0.5">
//             <span className="col-span-2 text-[10px] text-slate-500 uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed' }}>Product</span>
//             <span className="text-[10px] text-slate-500 uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed' }}>Qty (Cones)</span>
//             <span className="text-[10px] text-slate-500 uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed' }}>Rate / Cone</span>
//             <span className="text-[10px] text-slate-500 uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed' }}>Shade Code</span>
//             <span />
//           </div>

//           {items.map((item, i) => (
//             <div key={i} className="grid grid-cols-6 gap-3 mb-2 items-center">
//               <ProductPicker
//                 value={item.product_id}
//                 products={products}
//                 categories={categories}
//                 businessMode={businessMode}
//                 onChange={val => updateItem(i, 'product_id', val)}
//               />
//               <input
//                 type="number"
//                 placeholder="Qty"
//                 value={item.quantity}
//                 onChange={e => updateItem(i, 'quantity', e.target.value)}
//                 required
//                 className="bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-9 text-xs outline-none focus:border-amber-500/60 transition-colors"
//               />
//               <input
//                 type="number"
//                 placeholder="Rate"
//                 value={item.rate}
//                 onChange={e => updateItem(i, 'rate', e.target.value)}
//                 required
//                 className="bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-9 text-xs outline-none focus:border-amber-500/60 transition-colors"
//               />
//               <input
//                 placeholder="Shade (dyed)"
//                 value={item.shade_code}
//                 onChange={e => updateItem(i, 'shade_code', e.target.value)}
//                 className="bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-9 text-xs outline-none focus:border-amber-500/60 transition-colors"
//               />
//               <button
//                 type="button"
//                 onClick={() => removeItem(i)}
//                 className="text-slate-600 hover:text-red-400 text-xs transition-colors"
//               >
//                 Remove
//               </button>
//             </div>
//           ))}

//           <button type="button" onClick={addItem} className="text-xs text-amber-400 hover:text-amber-300 mt-1 transition-colors">
//             + Add Item
//           </button>

//           <div className="flex gap-2 mt-4">
//             <button type="submit" data-testid="submit-purchase"
//               className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider rounded-sm h-9 px-5 text-xs transition-all active:scale-95"
//               style={{ fontFamily: 'Barlow Condensed' }}>Create Purchase</button>
//             <button type="button" onClick={() => setShowForm(false)}
//               className="bg-slate-800 hover:bg-slate-700 text-white rounded-sm h-9 px-5 text-xs transition-colors">Cancel</button>
//           </div>
//         </form>
//       )}

//       <div className="industrial-card" data-testid="purchases-table">
//         <table className="w-full erp-table">
//           <thead><tr><th>PO #</th><th>Supplier</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
//           <tbody>
//             {purchases.map(p => (
//               <tr key={p.id}>
//                 <td className="text-amber-400 font-mono text-xs">{p.purchase_number}</td>
//                 <td className="text-slate-200">{p.supplier_name}</td>
//                 <td className="text-slate-400 font-mono text-xs">{p.date}</td>
//                 <td className="text-white font-mono font-bold">{p.total_amount?.toLocaleString()}</td>
//                 <td><span className="badge-success">{p.status}</span></td>
//               </tr>
//             ))}
//             {purchases.length === 0 && <tr><td colSpan={5} className="text-center text-slate-500 py-8">No purchases yet</td></tr>}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }
import { useState, useEffect, useRef } from "react";
import { purchasesAPI, suppliersAPI, productsAPI, categoriesAPI } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Search, X, ChevronDown, Package } from "lucide-react";
import { useBusinessMode } from "../context/BusinessModeContext";

// ─── Searchable Product Picker ────────────────────────────────────────────────
function ProductPicker({ value, products, categories, businessMode, onChange }) {
  const [open,   setOpen]   = useState(false);
  const [catId,  setCatId]  = useState('');
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const PURCHASE_TYPES = businessMode === 'CHEMICAL'
    ? ['CHEMICAL_RAW']
    : ['RAW_YARN', 'DYED_YARN'];

  const filtered = products.filter(p => {
    if (!PURCHASE_TYPES.includes(p.type)) return false;
    if (catId && String(p.category_id) !== String(catId)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.shade_code?.toLowerCase().includes(q);
    }
    return true;
  });

  const selected = products.find(p => String(p.id) === String(value));
  const handleSelect = (p) => { onChange(p.id, p.type); setOpen(false); setSearch(''); };
  const handleClear  = (e) => { e.stopPropagation(); onChange('', ''); };

  return (
    <div ref={ref} className="relative col-span-2">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 h-9 px-3 text-xs rounded-sm border transition-colors outline-none
          ${open ? 'border-amber-500 bg-[#0A0F1C]' : 'border-[#2D3648] bg-[#0A0F1C] hover:border-amber-500/40'}
          ${selected ? 'text-slate-200' : 'text-slate-500'}`}>
        <span className="flex items-center gap-2 truncate">
          <Package size={11} className="shrink-0 text-slate-500" />
          {selected
            ? <span className="truncate">{selected.name} <span className="text-slate-500">({selected.type})</span></span>
            : <span>Select product…</span>}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && (
            <span onClick={handleClear} className="text-slate-600 hover:text-slate-300 p-0.5 rounded">
              <X size={10} />
            </span>
          )}
          <ChevronDown size={11} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-80 bg-[#0D1423] border border-[#2D3648] rounded-sm shadow-2xl shadow-black/60">
          <div className="flex gap-2 p-2 border-b border-[#2D3648]">
            {businessMode !== 'CHEMICAL' && (
              <select value={catId} onChange={e => { setCatId(e.target.value); setSearch(''); }}
                className="flex-1 bg-[#1E2738] border border-slate-700 text-slate-300 rounded-sm px-2 h-7 text-xs outline-none focus:border-amber-500 cursor-pointer"
                style={{ fontFamily: 'Barlow Condensed' }}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            )}
            <div className="relative flex-1">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full bg-[#1E2738] border border-slate-700 text-slate-200 rounded-sm pl-6 pr-2 h-7 text-xs outline-none focus:border-amber-500 placeholder:text-slate-600" />
              {search && (
                <button type="button" onClick={() => setSearch('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300">
                  <X size={9} />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0
              ? <div className="py-6 text-center text-xs text-slate-600">No products match</div>
              : filtered.map(p => (
                <button key={p.id} type="button" onClick={() => handleSelect(p)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-amber-500/10 transition-colors text-left
                    ${String(p.id) === String(value) ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}>
                  <span className="truncate">{p.name}</span>
                  <span className="text-[10px] text-slate-600 font-mono ml-2 shrink-0">{p.type}</span>
                </button>
              ))}
          </div>
          <div className="px-3 py-1.5 border-t border-[#2D3648] text-[10px] text-slate-600 font-mono">
            {filtered.length} product{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PurchasesPage() {
  const { businessMode } = useBusinessMode();
  const [purchases,  setPurchases]  = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [suppliers,  setSuppliers]  = useState([]);
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [form, setForm] = useState({
    supplier_id: '', date: new Date().toISOString().split('T')[0], notes: ''
  });
  // Each item tracks its product_type so we can conditionally show shade_code
  const [items, setItems] = useState([
    { product_id: '', product_type: '', quantity: '', rate: '', shade_code: '' }
  ]);

  const load = () => purchasesAPI.list().then(r => setPurchases(r.data)).catch(() => {});

  useEffect(() => {
    load();
    suppliersAPI.list().then(r => setSuppliers(r.data)).catch(() => {});
    productsAPI.list().then(r => setProducts(r.data)).catch(() => {});
    if (businessMode !== 'CHEMICAL') {
      categoriesAPI.list().then(r => setCategories(r.data)).catch(() => {});
    }
  }, []);

  const addItem    = () => setItems([...items, { product_id: '', product_type: '', quantity: '', rate: '', shade_code: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const n = [...items]; n[i][field] = val; setItems(n);
  };
  const handleProductSelect = (i, id, type) => {
    const n = [...items];
    n[i].product_id   = id;
    n[i].product_type = type;
    n[i].shade_code   = ''; // reset shade when product changes
    setItems(n);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity:   parseFloat(item.quantity),
          rate:       parseFloat(item.rate),
          // Only include shade_code for DYED_YARN
          ...(item.product_type === 'DYED_YARN' && item.shade_code
            ? { shade_code: item.shade_code }
            : {}),
        })),
      };
      await purchasesAPI.create(payload);
      toast.success("Purchase created — lot numbers assigned");
      setShowForm(false);
      setForm({ supplier_id: '', date: new Date().toISOString().split('T')[0], notes: '' });
      setItems([{ product_id: '', product_type: '', quantity: '', rate: '', shade_code: '' }]);
      load();
    } catch (err) { toast.error(err.response?.data?.error || "Error creating purchase"); }
  };

  const viewDetail = async (id) => {
    try {
      const { data } = await purchasesAPI.get(id);
      setSelected(data);
    } catch { toast.error("Failed to load detail"); }
  };

  // Column count: yarn has shade_code col, chemical does not
  const isChemical = businessMode === 'CHEMICAL';
  const colClass   = isChemical ? 'grid-cols-5' : 'grid-cols-6';

  return (
    <div data-testid="purchases-page" className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-tight"
            style={{ fontFamily: 'Barlow Condensed' }}>Purchases</h1>
          <p className="text-sm text-slate-500 mt-1">Raw material procurement — lot numbers auto-assigned</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setSelected(null); }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider rounded-sm h-10 px-5 text-xs flex items-center gap-2 transition-all active:scale-95"
          style={{ fontFamily: 'Barlow Condensed' }}>
          <Plus size={16} /> New Purchase
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="industrial-card p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4"
            style={{ fontFamily: 'Barlow Condensed' }}>New Purchase Order</h3>

          {/* Header fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1"
                style={{ fontFamily: 'Barlow Condensed' }}>Supplier *</label>
              <select required value={form.supplier_id}
                onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none">
                <option value="">Select supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1"
                style={{ fontFamily: 'Barlow Condensed' }}>Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1"
                style={{ fontFamily: 'Barlow Condensed' }}>Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none" />
            </div>
          </div>

          {/* Column headers */}
          <div className={`grid ${colClass} gap-3 mb-1 px-0.5`}>
            <span className="col-span-2 text-[10px] text-slate-500 uppercase tracking-wider"
              style={{ fontFamily: 'Barlow Condensed' }}>Product</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider"
              style={{ fontFamily: 'Barlow Condensed' }}>Quantity</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider"
              style={{ fontFamily: 'Barlow Condensed' }}>Rate</span>
            {!isChemical && (
              <span className="text-[10px] text-slate-500 uppercase tracking-wider"
                style={{ fontFamily: 'Barlow Condensed' }}>Shade Code</span>
            )}
            <span />
          </div>

          {/* Item rows */}
          {items.map((item, i) => {
            const isDyed = item.product_type === 'DYED_YARN';
            return (
              <div key={i} className={`grid ${colClass} gap-3 mb-2 items-center`}>
                <ProductPicker
                  value={item.product_id}
                  products={products}
                  categories={categories}
                  businessMode={businessMode}
                  onChange={(id, type) => handleProductSelect(i, id, type)}
                />
                <input type="number" placeholder="Qty" required value={item.quantity}
                  onChange={e => updateItem(i, 'quantity', e.target.value)}
                  className="bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-9 text-xs outline-none focus:border-amber-500/60 transition-colors" />
                <input type="number" placeholder="Rate" required value={item.rate}
                  onChange={e => updateItem(i, 'rate', e.target.value)}
                  className="bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-9 text-xs outline-none focus:border-amber-500/60 transition-colors" />

                {/* Shade Code: shown in yarn workspace only, enabled only for DYED_YARN */}
                {!isChemical && (
                  isDyed
                    ? <input placeholder="Shade code" value={item.shade_code}
                        onChange={e => updateItem(i, 'shade_code', e.target.value)}
                        className="bg-[#0A0F1C] border border-amber-500/30 text-slate-200 rounded-sm px-3 h-9 text-xs outline-none focus:border-amber-500 transition-colors" />
                    : <div className="bg-[#0A0F1C]/50 border border-[#2D3648]/40 rounded-sm h-9 flex items-center px-3">
                        <span className="text-[10px] text-slate-600 italic">N/A — undyed</span>
                      </div>
                )}

                <button type="button" onClick={() => removeItem(i)}
                  className="text-slate-600 hover:text-red-400 text-xs transition-colors text-center">
                  Remove
                </button>
              </div>
            );
          })}

          <button type="button" onClick={addItem}
            className="text-xs text-amber-400 hover:text-amber-300 mt-2 transition-colors">
            + Add Item
          </button>

          <div className="flex gap-2 mt-4">
            <button type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider rounded-sm h-9 px-5 text-xs transition-all active:scale-95"
              style={{ fontFamily: 'Barlow Condensed' }}>Create Purchase</button>
            <button type="button" onClick={() => setShowForm(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-sm h-9 px-5 text-xs">Cancel</button>
          </div>
        </form>
      )}

      {/* Table + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${selected ? 'lg:col-span-2' : 'lg:col-span-3'} industrial-card`}>
          <table className="w-full erp-table">
            <thead>
              <tr><th>PO #</th><th>Supplier</th><th>Date</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id} onClick={() => viewDetail(p.id)} className="cursor-pointer">
                  <td className="text-amber-400 font-mono text-xs">{p.purchase_number}</td>
                  <td className="text-slate-200">{p.supplier_name}</td>
                  <td className="text-slate-400 font-mono text-xs">{p.date}</td>
                  <td className="text-white font-mono font-bold">{p.total_amount?.toLocaleString()}</td>
                  <td><span className="badge-success">{p.status}</span></td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr><td colSpan={5} className="text-center text-slate-500 py-8">No purchases yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="industrial-card p-5 animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white uppercase"
                style={{ fontFamily: 'Barlow Condensed' }}>Purchase Detail</h3>
              <button onClick={() => setSelected(null)} className="text-xs text-slate-500 hover:text-white">CLOSE</button>
            </div>
            <div className="space-y-2 text-sm mb-4">
              {[
                { l: 'PO #',     v: selected.purchase_number, cls: 'text-amber-400 font-mono' },
                { l: 'Supplier', v: selected.supplier_name,   cls: 'text-white' },
                { l: 'Date',     v: selected.date,            cls: 'text-slate-300 font-mono' },
                { l: 'Total',    v: `PKR ${selected.total_amount?.toLocaleString()}`, cls: 'text-amber-400 font-mono font-bold' },
              ].map(({ l, v, cls }) => (
                <div key={l} className="flex justify-between">
                  <span className="text-slate-500">{l}</span>
                  <span className={cls}>{v}</span>
                </div>
              ))}
            </div>
            {selected.items?.length > 0 && (
              <>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Items & Lot Numbers</p>
                {selected.items.map(item => (
                  <div key={item.id} className="bg-[#0A0F1C] border border-[#2D3648] p-3 rounded-sm mb-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-300 font-medium">{item.product_name}</span>
                      <span className="text-amber-400 font-mono">LOT {item.lot_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Qty × Rate</span>
                      <span className="font-mono text-white">{item.quantity} × {item.rate}</span>
                    </div>
                    {item.shade_code && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Shade</span>
                        <span className="font-mono text-amber-400">{item.shade_code}</span>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}