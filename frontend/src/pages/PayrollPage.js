import { useState, useEffect } from "react";
import { payrollAPI } from "@/lib/api";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState([]);
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const load = () => payrollAPI.list({ month, year }).then(r => setPayrolls(r.data));
  useEffect(() => { load(); }, [month, year]);

  const handleGenerate = async () => {
    try {
      const { data } = await payrollAPI.generate({ month, year: parseInt(year) });
      toast.success(`Payroll generated for ${data.length} employees`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || "Error"); }
  };

  const handleConfirm = async (id) => {
    try {
      await payrollAPI.confirm(id);
      toast.success("Payroll confirmed");
      load();
    } catch (err) { toast.error(err.response?.data?.error || "Error"); }
  };

  const handlePay = async (id) => {
    try {
      await payrollAPI.pay(id);
      toast.success("Salary paid");
      load();
    } catch (err) { toast.error(err.response?.data?.error || "Error"); }
  };

  const statusColors = { DRAFT: 'badge-warning', CONFIRMED: 'badge-info', PAID: 'badge-success' };

  return (
    <div data-testid="payroll-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>Payroll</h1>
          <p className="text-sm text-slate-500 mt-1">Salary calculation with loan deductions</p>
        </div>
        <button data-testid="generate-payroll" onClick={handleGenerate}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider rounded-sm h-10 px-5 text-xs flex items-center gap-2 transition-all active:scale-95" style={{ fontFamily: 'Barlow Condensed' }}>
          <DollarSign size={16} /> Generate Payroll
        </button>
      </div>

      {/* Month/Year selector */}
      <div className="flex gap-3 items-center">
        <select value={month} onChange={e => setMonth(e.target.value)} data-testid="payroll-month"
          className="bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none">
          {Array.from({length: 12}, (_, i) => {
            const m = (i + 1).toString().padStart(2, '0');
            return <option key={m} value={m}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>;
          })}
        </select>
        <input type="number" value={year} onChange={e => setYear(e.target.value)} data-testid="payroll-year"
          className="bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none w-24" />
      </div>

      <div className="industrial-card" data-testid="payroll-table">
        <div className="overflow-x-auto">
          <table className="w-full erp-table">
            <thead><tr><th>Employee</th><th>Basic</th><th>Present</th><th>Absent</th><th>OT Hrs</th><th>OT Amt</th><th>Absent Ded.</th><th>Loan Ded.</th><th>Net Salary</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {payrolls.map(p => (
                <tr key={p.id}>
                  <td className="text-slate-200">{p.employee_name} <span className="text-xs text-slate-500 font-mono">{p.employee_code}</span></td>
                  <td className="font-mono text-slate-400">{p.basic_salary?.toLocaleString()}</td>
                  <td className="font-mono text-emerald-400">{p.present_days}</td>
                  <td className="font-mono text-red-400">{p.absent_days}</td>
                  <td className="font-mono text-blue-400">{p.overtime_hours?.toFixed(1)}</td>
                  <td className="font-mono text-blue-400">{p.overtime_amount?.toLocaleString()}</td>
                  <td className="font-mono text-red-400">{p.absent_deduction?.toLocaleString()}</td>
                  <td className="font-mono text-amber-400">{p.loan_deduction?.toLocaleString()}</td>
                  <td className="font-mono text-white font-bold">{p.net_salary?.toLocaleString()}</td>
                  <td><span className={statusColors[p.status] || 'badge-neutral'}>{p.status}</span></td>
                  <td className="flex gap-2">
                    {p.status === 'DRAFT' && <button onClick={() => handleConfirm(p.id)} className="text-xs text-blue-400 hover:text-blue-300 uppercase font-mono">Confirm</button>}
                    {p.status === 'CONFIRMED' && <button onClick={() => handlePay(p.id)} className="text-xs text-emerald-400 hover:text-emerald-300 uppercase font-mono">Pay</button>}
                  </td>
                </tr>
              ))}
              {payrolls.length === 0 && <tr><td colSpan={11} className="text-center text-slate-500 py-8">No payroll data. Click "Generate Payroll" to create.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
