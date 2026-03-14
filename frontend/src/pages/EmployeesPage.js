import { useState, useEffect } from "react";
import { employeesAPI } from "@/lib/api";
import { toast } from "sonner";
import { Plus, UserCheck } from "lucide-react";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showLoan, setShowLoan] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', designation: '', department: '', basic_salary: '', joining_date: '' });
  const [loanForm, setLoanForm] = useState({ amount: '', monthly_deduction: '', notes: '' });

  const load = () => employeesAPI.list().then(r => setEmployees(r.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await employeesAPI.create({ ...form, basic_salary: parseFloat(form.basic_salary) || 0 });
      toast.success("Employee added");
      setShowForm(false);
      setForm({ name: '', phone: '', address: '', designation: '', department: '', basic_salary: '', joining_date: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || "Error"); }
  };

  const handleLoan = async (e) => {
    e.preventDefault();
    try {
      await employeesAPI.addLoan(showLoan, { amount: parseFloat(loanForm.amount), monthly_deduction: parseFloat(loanForm.monthly_deduction), notes: loanForm.notes });
      toast.success("Loan added");
      setShowLoan(null);
      setLoanForm({ amount: '', monthly_deduction: '', notes: '' });
    } catch (err) { toast.error(err.response?.data?.error || "Error"); }
  };

  const departments = ['DYEING', 'PRODUCTION', 'CHEMICAL', 'STORE', 'FINANCE', 'ADMIN'];

  return (
    <div data-testid="employees-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>Employees</h1>
          <p className="text-sm text-slate-500 mt-1">HR management and loan tracking</p>
        </div>
        <button data-testid="add-employee-btn" onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider rounded-sm h-10 px-5 text-xs flex items-center gap-2 transition-all active:scale-95" style={{ fontFamily: 'Barlow Condensed' }}>
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="industrial-card p-5 animate-fade-in" data-testid="employee-form">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed' }}>New Employee</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[{ key: 'name', label: 'Name', required: true }, { key: 'phone', label: 'Phone' }, { key: 'address', label: 'Address' }, { key: 'designation', label: 'Designation' }].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>{f.label}</label>
                <input data-testid={`emp-${f.key}`} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} required={f.required}
                  className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>Department</label>
              <select data-testid="emp-department" value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none">
                <option value="">Select</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>Basic Salary</label>
              <input data-testid="emp-salary" type="number" value={form.basic_salary} onChange={e => setForm({...form, basic_salary: e.target.value})}
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1" style={{ fontFamily: 'Barlow Condensed' }}>Joining Date</label>
              <input type="date" value={form.joining_date} onChange={e => setForm({...form, joining_date: e.target.value})}
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" data-testid="submit-employee" className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider rounded-sm h-9 px-5 text-xs" style={{ fontFamily: 'Barlow Condensed' }}>Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-slate-800 hover:bg-slate-700 text-white rounded-sm h-9 px-5 text-xs">Cancel</button>
          </div>
        </form>
      )}

      {showLoan && (
        <form onSubmit={handleLoan} className="industrial-card p-5 animate-fade-in" data-testid="loan-form">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed' }}>Add Loan</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Loan Amount</label>
              <input data-testid="loan-amount" type="number" value={loanForm.amount} onChange={e => setLoanForm({...loanForm, amount: e.target.value})} required
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Monthly Deduction</label>
              <input data-testid="loan-deduction" type="number" value={loanForm.monthly_deduction} onChange={e => setLoanForm({...loanForm, monthly_deduction: e.target.value})} required
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Notes</label>
              <input value={loanForm.notes} onChange={e => setLoanForm({...loanForm, notes: e.target.value})}
                className="w-full bg-[#0A0F1C] border border-[#2D3648] text-slate-200 rounded-sm px-3 h-10 text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" data-testid="submit-loan" className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider rounded-sm h-9 px-5 text-xs" style={{ fontFamily: 'Barlow Condensed' }}>Add Loan</button>
            <button type="button" onClick={() => setShowLoan(null)} className="bg-slate-800 hover:bg-slate-700 text-white rounded-sm h-9 px-5 text-xs">Cancel</button>
          </div>
        </form>
      )}

      <div className="industrial-card" data-testid="employees-table">
        <table className="w-full erp-table">
          <thead><tr><th>Code</th><th>Name</th><th>Designation</th><th>Dept</th><th>Salary</th><th>Actions</th></tr></thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td className="text-amber-400 font-mono text-xs">{emp.employee_code}</td>
                <td className="text-slate-200">{emp.name}</td>
                <td className="text-slate-400 text-sm">{emp.designation || '-'}</td>
                <td><span className="badge-neutral">{emp.department || '-'}</span></td>
                <td className="text-white font-mono">{emp.basic_salary?.toLocaleString()}</td>
                <td><button onClick={() => setShowLoan(emp.id)} className="text-xs text-amber-400 hover:text-amber-300 font-mono uppercase">+ Loan</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
