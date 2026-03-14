
// import { useState } from "react";
// import { NavLink, useNavigate } from "react-router-dom";
// import logo from "./../assets/logo.png";
// import {
//   LayoutDashboard,
//   Package,
//   Layers,
//   Factory,
//   Users,
//   UserCheck,
//   Truck,
//   ShoppingCart,
//   FileText,
//   Clock,
//   DollarSign,
//   TrendingUp,
//   Trash2,
//   LogOut,
//   ChevronLeft,
//   ChevronRight,
//   Building2,
//   ScrollText,
//   Box,
//   RotateCcw,
//   ArrowLeftRight,
//   Receipt,
//   Wallet,
//   Sun,
//   Moon,
// } from "lucide-react";
// import { useBusinessMode } from "../context/BusinessModeContext";
// import { useTheme } from "../context/ThemeContext";

// // ─── YARN workspace nav ───────────────────────────────────────────────────────
// const yarnNavItems = [
//   { path: "/", icon: LayoutDashboard, label: "Dashboard" },
//   { type: "divider", label: "INVENTORY" },
//   { path: "/categories", icon: Layers, label: "Categories" },
//   { path: "/products", icon: Box, label: "Products" },
//   { path: "/inventory", icon: Package, label: "Stock" },
//   { path: "/lots", icon: Layers, label: "Lots" },
//   { path: "/purchases", icon: ShoppingCart, label: "Purchases" },
//   { path: "/purchase-returns", icon: RotateCcw, label: "Purchase Returns" },
//   { type: "divider", label: "MANUFACTURING" },
//   { path: "/manufacturing", icon: Factory, label: "Dyeing" },
//   { path: "/wastage", icon: Trash2, label: "Wastage" },
//   { type: "divider", label: "SALES" },
//   { path: "/sales", icon: TrendingUp, label: "Sales" },
//   { path: "/sale-returns", icon: RotateCcw, label: "Sale Returns" },
//   { path: "/gate-passes", icon: FileText, label: "Gate Passes" },
//   { type: "divider", label: "PARTNERS" },
//   { path: "/suppliers", icon: Truck, label: "Suppliers" },
//   { path: "/customers", icon: Users, label: "Customers" },
//   { type: "divider", label: "SYSTEM" },
//   { path: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
// ];

// // ─── CHEMICAL workspace nav (no Categories) ───────────────────────────────────
// const chemicalNavItems = [
//   { path: "/", icon: LayoutDashboard, label: "Dashboard" },
//   { type: "divider", label: "INVENTORY" },
//   { path: "/products", icon: Box, label: "Products" },
//   { path: "/inventory", icon: Package, label: "Stock" },
//   { path: "/lots", icon: Layers, label: "Lots" },
//   { path: "/purchases", icon: ShoppingCart, label: "Purchases" },
//   { path: "/purchase-returns", icon: RotateCcw, label: "Purchase Returns" },
//   { type: "divider", label: "MANUFACTURING" },
//   { path: "/manufacturing", icon: Factory, label: "Manufacturing" },
//   { path: "/wastage", icon: Trash2, label: "Wastage" },
//   { type: "divider", label: "SALES" },
//   { path: "/sales", icon: TrendingUp, label: "Sales" },
//   { path: "/sale-returns", icon: RotateCcw, label: "Sale Returns" },
//   { path: "/gate-passes", icon: FileText, label: "Gate Passes" },
//   { type: "divider", label: "PARTNERS" },
//   { path: "/suppliers", icon: Truck, label: "Suppliers" },
//   { path: "/customers", icon: Users, label: "Customers" },
//   { type: "divider", label: "SYSTEM" },
//   { path: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
// ];

// // ─── OPERATIONS workspace nav ─────────────────────────────────────────────────
// const operationsNavItems = [
//   { path: "/", icon: LayoutDashboard, label: "Dashboard" },
//   { type: "divider", label: "HR MANAGEMENT" },
//   { path: "/employees", icon: UserCheck, label: "Employees" },
//   { path: "/attendance", icon: Clock, label: "Attendance" },
//   { path: "/payroll", icon: DollarSign, label: "Payroll" },
//   { type: "divider", label: "FINANCE" },
//   { path: "/finance", icon: Building2, label: "Profit Engine" },
//   { path: "/expenses", icon: Receipt, label: "Expenses" },
//   { type: "divider", label: "SYSTEM" },
//   { path: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
// ];

// export function AppLayout({ children }) {
//   const [collapsed, setCollapsed] = useState(false);
//   const navigate = useNavigate();
//   const { businessMode, clearMode } = useBusinessMode();
//   const { theme, toggleTheme } = useTheme();

//   const isYarn = businessMode === "YARN";
//   const isChemical = businessMode === "CHEMICAL";
//   const isOperations = businessMode === "OPERATIONS";
//   const isLightTheme = theme === "light";
  
//   // Select navigation items based on mode
//   let navItems = yarnNavItems;
//   if (isChemical) navItems = chemicalNavItems;
//   else if (isOperations) navItems = operationsNavItems;

//   // Mode accent colours
//   let modeColor = "amber";
//   let modeBg = "bg-amber-500/10 border-amber-500/20 text-amber-400";
//   let modeLabel = "Yarn";
//   let modeEmoji = "🧵";
  
//   if (isChemical) {
//     modeColor = "blue";
//     modeBg = "bg-blue-500/10 border-blue-500/20 text-blue-400";
//     modeLabel = "Chemical";
//     modeEmoji = "🧪";
//   } else if (isOperations) {
//     modeColor = "green";
//     modeBg = "bg-green-500/10 border-green-500/20 text-green-400";
//     modeLabel = "Operations";
//     modeEmoji = "⚙️";
//   }

//   const handleLogout = () => {
//     localStorage.removeItem("erp_token");
//     localStorage.removeItem("erp_user");
//     localStorage.removeItem("erp_business_mode");
//     navigate("/login");
//   };

//   const handleSwitchMode = () => {
//     clearMode();
//     navigate("/select-mode");
//   };

//   // Get active nav styling based on mode
//   const getActiveStyle = () => {
//     if (isChemical) return "bg-blue-500/10 text-blue-400 border-l-2 border-blue-500";
//     if (isOperations) return "bg-green-500/10 text-green-400 border-l-2 border-green-500";
//     return "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500";
//   };

//   return (
//     <div className={`flex h-screen overflow-hidden ${isLightTheme ? 'bg-gray-50' : 'bg-[#020408]'} transition-colors duration-300`}>
//       {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
//       <aside
//         data-testid="app-sidebar"
//         className={`${
//           collapsed ? "w-16" : "w-56"
//         } flex flex-col ${isLightTheme ? 'bg-white border-gray-200' : 'bg-[#0A0F1C] border-[#2D3648]'} border-r transition-all duration-200 flex-shrink-0`}
//       >
//         {/* Logo row with Theme Toggle */}
//         <div className={`flex items-center h-14 px-3 border-b ${isLightTheme ? 'border-gray-200' : 'border-[#2D3648]'}`}>
//           <img
//             src={logo}
//             alt="GH & Sons Logo"
//             className="w-6 h-6 object-contain flex-shrink-0"
//           />
//           {!collapsed && (
//             <span
//               className={`ml-2 text-base font-bold tracking-wider uppercase truncate ${isLightTheme ? 'text-gray-900' : 'text-white'}`}
//               style={{ fontFamily: "Barlow Condensed" }}
//             >
//               GH & Sons
//             </span>
//           )}
//           {/* Theme Toggle Button */}
//           <button
//             data-testid="theme-toggle"
//             onClick={toggleTheme}
//             title={isLightTheme ? "Switch to Dark Mode" : "Switch to Light Mode"}
//             className={`ml-auto p-1.5 rounded-sm transition-colors ${
//               isLightTheme 
//                 ? 'text-gray-600 hover:text-amber-600 hover:bg-amber-50' 
//                 : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
//             }`}
//           >
//             {isLightTheme ? <Moon size={16} /> : <Sun size={16} />}
//           </button>
//           <button
//             data-testid="sidebar-toggle"
//             onClick={() => setCollapsed(!collapsed)}
//             className={`p-1 transition-colors flex-shrink-0 ${isLightTheme ? 'text-gray-500 hover:text-gray-900' : 'text-slate-500 hover:text-white'}`}
//           >
//             {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
//           </button>
//         </div>

//         {/* Mode badge */}
//         <div
//           className={`mx-2 mt-2 mb-1 border rounded-sm flex items-center gap-2 px-2 py-1.5 ${modeBg} ${
//             collapsed ? "justify-center" : ""
//           }`}
//         >
//           <span className="text-sm flex-shrink-0">{modeEmoji}</span>
//           {!collapsed && (
//             <span
//               className="text-xs font-bold uppercase tracking-wider flex-1"
//               style={{ fontFamily: "Barlow Condensed" }}
//             >
//               {modeLabel} Workspace
//             </span>
//           )}
//         </div>

//         {/* Nav items */}
//         <nav className="flex-1 overflow-y-auto py-2 px-2">
//           {navItems.map((item, i) => {
//             if (item.type === "divider") {
//               if (collapsed) return <div key={i} className="h-px bg-[#2D3648] my-2" />;
//               return (
//                 <div key={i} className="px-2 pt-4 pb-1">
//                   <span
//                     className="text-[10px] font-semibold text-slate-600 tracking-widest uppercase"
//                     style={{ fontFamily: "Barlow Condensed" }}
//                   >
//                     {item.label}
//                   </span>
//                 </div>
//               );
//             }
//             const Icon = item.icon;
//             return (
//               <NavLink
//                 key={item.path}
//                 to={item.path}
//                 end={item.path === "/"}
//                 data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
//                 className={({ isActive }) =>
//                   `flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm transition-all duration-150 mb-0.5 ${
//                     isActive
//                       ? getActiveStyle()
//                       : "text-slate-400 hover:text-white hover:bg-[#1E2738]/50 border-l-2 border-transparent"
//                   }`
//                 }
//               >
//                 <Icon size={18} className="flex-shrink-0" />
//                 {!collapsed && (
//                   <span className="truncate" style={{ fontFamily: "Manrope" }}>
//                     {item.label}
//                   </span>
//                 )}
//               </NavLink>
//             );
//           })}
//         </nav>

//         {/* Footer: switch mode + logout */}
//         <div className={`border-t p-2 space-y-1 ${isLightTheme ? 'border-gray-200' : 'border-[#2D3648]'}`}>
//           <button
//             data-testid="switch-mode-button"
//             onClick={handleSwitchMode}
//             title="Switch Workspace"
//             className={`flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded-sm transition-colors ${
//               isLightTheme 
//                 ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' 
//                 : 'text-slate-400 hover:text-white hover:bg-[#1E2738]/50'
//             }`}
//           >
//             <ArrowLeftRight size={18} className="flex-shrink-0" />
//             {!collapsed && <span>Switch Workspace</span>}
//           </button>
//           <button
//             data-testid="logout-button"
//             onClick={handleLogout}
//             className={`flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded-sm transition-colors ${
//               isLightTheme 
//                 ? 'text-gray-600 hover:text-red-600 hover:bg-red-50' 
//                 : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
//             }`}
//           >
//             <LogOut size={18} className="flex-shrink-0" />
//             {!collapsed && <span>Logout</span>}
//           </button>
//         </div>
//       </aside>

//       {/* ── Main content ─────────────────────────────────────────────────────── */}
//       <main className={`flex-1 overflow-auto ${isLightTheme ? 'bg-gray-50' : ''}`}>
//         <div className="p-6">{children}</div>
//       </main>
//     </div>
//   );
// }
// import { useState } from "react";
// import { NavLink, useNavigate } from "react-router-dom";
// import logo from "./../assets/logo.png";
// import {
//   LayoutDashboard,
//   Package,
//   Layers,
//   Factory,
//   Users,
//   UserCheck,
//   Truck,
//   ShoppingCart,
//   FileText,
//   Clock,
//   DollarSign,
//   TrendingUp,
//   Trash2,
//   LogOut,
//   ChevronLeft,
//   ChevronRight,
//   Building2,
//   ScrollText,
//   Box,
//   RotateCcw,
// } from "lucide-react";

// const navItems = [
//   { path: "/", icon: LayoutDashboard, label: "Dashboard" },
//   { type: "divider", label: "INVENTORY" },
//   { path: "/categories", icon: Layers, label: "Categories" },
//   { path: "/products", icon: Box, label: "Products" },
//   { path: "/inventory", icon: Package, label: "Stock" },
//   { path: "/lots", icon: Layers, label: "Lots" },
//   { path: "/purchases", icon: ShoppingCart, label: "Purchases" },
//   { path: "/purchase-returns", icon: RotateCcw, label: "Purchase Returns" },
//   { type: "divider", label: "MANUFACTURING" },
//   { path: "/manufacturing", icon: Factory, label: "Production" },
//   { path: "/wastage", icon: Trash2, label: "Wastage" },
//   { type: "divider", label: "SALES" },
//   { path: "/sales", icon: TrendingUp, label: "Sales" },
//   { path: "/sale-returns", icon: RotateCcw, label: "Sale Returns" },
//   { path: "/gate-passes", icon: FileText, label: "Gate Passes" },
//   { type: "divider", label: "PARTNERS" },
//   { path: "/suppliers", icon: Truck, label: "Suppliers" },
//   { path: "/customers", icon: Users, label: "Customers" },
//   { type: "divider", label: "HR & PAYROLL" },
//   { path: "/employees", icon: UserCheck, label: "Employees" },
//   { path: "/attendance", icon: Clock, label: "Attendance" },
//   { path: "/payroll", icon: DollarSign, label: "Payroll" },
//   { type: "divider", label: "FINANCE" },
//   { path: "/finance", icon: Building2, label: "Profit Engine" },
//   { type: "divider", label: "SYSTEM" },
//   { path: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
// ];

// export function AppLayout({ children }) {
//   const [collapsed, setCollapsed] = useState(false);
//   const navigate = useNavigate();
//   const user = JSON.parse(localStorage.getItem("erp_user") || "{}");

//   const handleLogout = () => {
//     localStorage.removeItem("erp_token");
//     localStorage.removeItem("erp_user");
//     navigate("/login");
//   };

//   return (
//     <div className="flex h-screen overflow-hidden bg-[#020408]">
//       {/* Sidebar */}
//       <aside
//         data-testid="app-sidebar"
//         className={`${collapsed ? "w-16" : "w-56"} flex flex-col bg-[#0A0F1C] border-r border-[#2D3648] transition-all duration-200 flex-shrink-0`}
//       >
//         {/* Logo */}
//         <div className="flex items-center h-14 px-3 border-b border-[#2D3648]">
//           <img
//             src={logo}
//             alt="GH & Sons Logo"
//             className="w-6 h-6 object-contain flex-shrink-0"
//           />
//           {!collapsed && (
//             <span
//               className="ml-2 text-base font-bold text-white tracking-wider font-barlow uppercase"
//               style={{ fontFamily: "Barlow Condensed" }}
//             >
//               GH & Sons Enterprises
//             </span>
//           )}
//           <button
//             data-testid="sidebar-toggle"
//             onClick={() => setCollapsed(!collapsed)}
//             className="ml-auto text-slate-500 hover:text-white transition-colors p-1"
//           >
//             {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
//           </button>
//         </div>

//         {/* Nav */}
//         <nav className="flex-1 overflow-y-auto py-2 px-2">
//           {navItems.map((item, i) => {
//             if (item.type === "divider") {
//               if (collapsed)
//                 return <div key={i} className="h-px my-2" style={{ backgroundColor: "hsl(var(--border))" }} />;
//               return (
//                 <div key={i} className="px-2 pt-4 pb-1">
//                   <span
//                     className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--muted-foreground))" }}
//                     style={{ fontFamily: "Barlow Condensed" }}
//                   >
//                     {item.label}
//                   </span>
//                 </div>
//               );
//             }
//             const Icon = item.icon;
//             return (
//               <NavLink
//                 key={item.path}
//                 to={item.path}
//                 end={item.path === "/"}
//                 data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
//                 className={({ isActive }) =>
//                   `flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm transition-all duration-150 mb-0.5 ${
//                     isActive
//                       ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500"
//                       : `border-l-2 border-transparent ${isLightTheme ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" : "text-slate-400 hover:text-white hover:bg-[#1E2738]/50"}`
//                   }`
//                 }
//               >
//                 <Icon size={18} className="flex-shrink-0" />
//                 {!collapsed && (
//                   <span className="truncate" style={{ fontFamily: "Manrope" }}>
//                     {item.label}
//                   </span>
//                 )}
//               </NavLink>
//             );
//           })}
//         </nav>

//         {/* User */}
//         <div className="border-t border-[#2D3648] p-2">
//           <button
//             data-testid="logout-button"
//             onClick={handleLogout}
//             className="flex items-center gap-2 w-full px-2.5 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-colors"
//           >
//             <LogOut size={18} />
//             {!collapsed && <span>Logout</span>}
//           </button>
//         </div>
//       </aside>

//       {/* Main */}
//       <main className="flex-1 overflow-auto">
//         <div className="p-6">{children}</div>
//       </main>
//     </div>
//   );
// }


import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "./../assets/logo.png";
import {
  LayoutDashboard,
  Package,
  Layers,
  Factory,
  Users,
  UserCheck,
  Truck,
  ShoppingCart,
  FileText,
  Clock,
  DollarSign,
  TrendingUp,
  Trash2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  ScrollText,
  Box,
  RotateCcw,
  ArrowLeftRight,
  Receipt,
  Wallet,
  Sun,
  Moon,
  BarChart2,
} from "lucide-react";
import { useBusinessMode } from "../context/BusinessModeContext";
import { useTheme } from "../context/ThemeContext";
 
// ─── YARN workspace nav ───────────────────────────────────────────────────────
const yarnNavItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { type: "divider", label: "INVENTORY" },
  { path: "/categories", icon: Layers, label: "Categories" },
  { path: "/products", icon: Box, label: "Products" },
  { path: "/inventory", icon: Package, label: "Stock" },
  { path: "/lots", icon: Layers, label: "Lots" },
  { path: "/purchases", icon: ShoppingCart, label: "Purchases" },
  { path: "/purchase-returns", icon: RotateCcw, label: "Purchase Returns" },
  { type: "divider", label: "MANUFACTURING" },
  { path: "/manufacturing", icon: Factory, label: "Dyeing" },
  { path: "/wastage", icon: Trash2, label: "Wastage" },
  { type: "divider", label: "SALES" },
  { path: "/sales", icon: TrendingUp, label: "Sales" },
  { path: "/sale-returns", icon: RotateCcw, label: "Sale Returns" },
  { path: "/gate-passes", icon: FileText, label: "Gate Passes" },
  { type: "divider", label: "PARTNERS" },
  { path: "/suppliers", icon: Truck, label: "Suppliers" },
  { path: "/customers", icon: Users, label: "Customers" },
  { type: "divider", label: "SYSTEM" },
  { path: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
];
 
// ─── CHEMICAL workspace nav (no Categories) ───────────────────────────────────
const chemicalNavItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { type: "divider", label: "INVENTORY" },
  { path: "/products", icon: Box, label: "Products" },
  { path: "/inventory", icon: Package, label: "Stock" },
  { path: "/lots", icon: Layers, label: "Lots" },
  { path: "/purchases", icon: ShoppingCart, label: "Purchases" },
  { path: "/purchase-returns", icon: RotateCcw, label: "Purchase Returns" },
  { type: "divider", label: "MANUFACTURING" },
  { path: "/manufacturing", icon: Factory, label: "Manufacturing" },
  { path: "/wastage", icon: Trash2, label: "Wastage" },
  { type: "divider", label: "SALES" },
  { path: "/sales", icon: TrendingUp, label: "Sales" },
  { path: "/sale-returns", icon: RotateCcw, label: "Sale Returns" },
  { path: "/gate-passes", icon: FileText, label: "Gate Passes" },
  { type: "divider", label: "REPORTS" },
  { path: "/reports", icon: BarChart2, label: "Reports" },
  { type: "divider", label: "PARTNERS" },
  { path: "/suppliers", icon: Truck, label: "Suppliers" },
  { path: "/customers", icon: Users, label: "Customers" },
  { type: "divider", label: "SYSTEM" },
  { path: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
];
 
// ─── OPERATIONS workspace nav ─────────────────────────────────────────────────
const operationsNavItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { type: "divider", label: "HR MANAGEMENT" },
  { path: "/employees", icon: UserCheck, label: "Employees" },
  { path: "/attendance", icon: Clock, label: "Attendance" },
  { path: "/payroll", icon: DollarSign, label: "Payroll" },
  { type: "divider", label: "FINANCE" },
  { path: "/finance", icon: Building2, label: "Profit Engine" },
  { path: "/expenses", icon: Receipt, label: "Expenses" },
  { type: "divider", label: "SYSTEM" },
  { path: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
];
 
export function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { businessMode, clearMode } = useBusinessMode();
  const { theme, toggleTheme } = useTheme();
 
  const isYarn = businessMode === "YARN";
  const isChemical = businessMode === "CHEMICAL";
  const isOperations = businessMode === "OPERATIONS";
  const isLightTheme = theme === "light";
  
  // Select navigation items based on mode
  let navItems = yarnNavItems;
  if (isChemical) navItems = chemicalNavItems;
  else if (isOperations) navItems = operationsNavItems;
 
  // Mode accent colours
  let modeColor = "amber";
  let modeBg = "bg-amber-500/10 border-amber-500/20 text-amber-400";
  let modeLabel = "Yarn";
  let modeEmoji = "🧵";
  
  if (isChemical) {
    modeColor = "blue";
    modeBg = "bg-blue-500/10 border-blue-500/20 text-blue-400";
    modeLabel = "Chemical";
    modeEmoji = "🧪";
  } else if (isOperations) {
    modeColor = "green";
    modeBg = "bg-green-500/10 border-green-500/20 text-green-400";
    modeLabel = "Operations";
    modeEmoji = "⚙️";
  }
 
  const handleLogout = () => {
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_user");
    localStorage.removeItem("erp_business_mode");
    navigate("/login");
  };
 
  const handleSwitchMode = () => {
    clearMode();
    navigate("/select-mode");
  };
 
  // Get active nav styling based on mode
  const getActiveStyle = () => {
    if (isChemical) return "bg-blue-500/10 text-blue-400 border-l-2 border-blue-500";
    if (isOperations) return "bg-green-500/10 text-green-400 border-l-2 border-green-500";
    return "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500";
  };
 
  return (
    <div className={`flex h-screen overflow-hidden ${isLightTheme ? 'bg-gray-50' : 'bg-[#020408]'} transition-colors duration-300`}>
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        data-testid="app-sidebar"
        className={`${
          collapsed ? "w-16" : "w-56"
        } flex flex-col ${isLightTheme ? 'bg-white border-gray-200' : 'bg-[#0A0F1C] border-[#2D3648]'} border-r transition-all duration-200 flex-shrink-0`}
      >
        {/* Logo row with Theme Toggle */}
        <div className={`flex items-center h-14 px-3 border-b ${isLightTheme ? 'border-gray-200' : 'border-[#2D3648]'}`}>
          <img
            src={logo}
            alt="GH & Sons Logo"
            className="w-6 h-6 object-contain flex-shrink-0"
          />
          {!collapsed && (
            <span
              className={`ml-2 text-base font-bold tracking-wider uppercase truncate ${isLightTheme ? 'text-gray-900' : 'text-white'}`}
              style={{ fontFamily: "Barlow Condensed" }}
            >
              GH & Sons
            </span>
          )}
          {/* Theme Toggle Button */}
          <button
            data-testid="theme-toggle"
            onClick={toggleTheme}
            title={isLightTheme ? "Switch to Dark Mode" : "Switch to Light Mode"}
            className={`ml-auto p-1.5 rounded-sm transition-colors ${
              isLightTheme 
                ? 'text-gray-600 hover:text-amber-600 hover:bg-amber-50' 
                : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            {isLightTheme ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            data-testid="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1 transition-colors flex-shrink-0 ${isLightTheme ? 'text-gray-500 hover:text-gray-900' : 'text-slate-500 hover:text-white'}`}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
 
        {/* Mode badge */}
        <div
          className={`mx-2 mt-2 mb-1 border rounded-sm flex items-center gap-2 px-2 py-1.5 ${modeBg} ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <span className="text-sm flex-shrink-0">{modeEmoji}</span>
          {!collapsed && (
            <span
              className="text-xs font-bold uppercase tracking-wider flex-1"
              style={{ fontFamily: "Barlow Condensed" }}
            >
              {modeLabel} Workspace
            </span>
          )}
        </div>
 
        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navItems.map((item, i) => {
            if (item.type === "divider") {
              if (collapsed) return <div key={i} className="h-px my-2" style={{ backgroundColor: "hsl(var(--border))" }} />;
              return (
                <div key={i} className="px-2 pt-4 pb-1">
                  <span
                    className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--muted-foreground))" , fontFamily: "Barlow Condensed"}}
                  
                  >
                    {item.label}
                  </span>
                </div>
              );
            }
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm transition-all duration-150 mb-0.5 ${
                    isActive
                      ? getActiveStyle()
                      : `border-l-2 border-transparent ${isLightTheme ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" : "text-slate-400 hover:text-white hover:bg-[#1E2738]/50"}`
                  }`
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="truncate" style={{ fontFamily: "Manrope" }}>
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
 
        {/* Footer: switch mode + logout */}
        <div className={`border-t p-2 space-y-1 ${isLightTheme ? 'border-gray-200' : 'border-[#2D3648]'}`}>
          <button
            data-testid="switch-mode-button"
            onClick={handleSwitchMode}
            title="Switch Workspace"
            className={`flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded-sm transition-colors ${
              isLightTheme 
                ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' 
                : 'text-slate-400 hover:text-white hover:bg-[#1E2738]/50'
            }`}
          >
            <ArrowLeftRight size={18} className="flex-shrink-0" />
            {!collapsed && <span>Switch Workspace</span>}
          </button>
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            className={`flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded-sm transition-colors ${
              isLightTheme 
                ? 'text-gray-600 hover:text-red-600 hover:bg-red-50' 
                : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
 
      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className={`flex-1 overflow-auto ${isLightTheme ? 'bg-gray-50' : ''}`}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}