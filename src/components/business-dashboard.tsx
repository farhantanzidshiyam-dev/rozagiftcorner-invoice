"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  notes: string;
  active: boolean;
  createdAt: string;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit: string;
  price: string;
  stock: number;
  lowStockAt: number;
  description: string;
  active: boolean;
  createdAt: string;
};

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
type InvoiceItem = {
  id?: number;
  productId: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
};
type Invoice = {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  tax: string;
  total: string;
  notes: string;
  items: InvoiceItem[];
};
type Activity = { id: number; action: string; detail: string; kind: string; createdAt: string };
type DashboardData = {
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  activities: Activity[];
  stats: { received: number; outstanding: number; overdue: number; customerCount: number; lowStockCount: number; openInvoiceCount: number };
};
type Modal = { type: "customer"; value?: Customer } | { type: "product"; value?: Product } | { type: "invoice"; value?: Invoice } | null;
type Nav = "overview" | "customers" | "invoices" | "inventory" | "reports";

type Props = { user: { name: string; email: string; role: string } };

const currency = (value: number | string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
const compactCurrency = (value: number | string) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", style: "currency", currency: "INR", maximumFractionDigits: 1 }).format(Number(value));
const day = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
const inputDate = (value: string) => new Date(value).toISOString().slice(0, 10);
const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
const todayInput = () => new Date().toISOString().slice(0, 10);
const futureInput = () => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

function requestJson(url: string, options?: RequestInit) {
  return fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Something went wrong. Please try again.");
    return payload;
  });
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    receipt: <><path d="M6 2h12a2 2 0 0 1 2 2v18l-3-2-3 2-3-2-3 2-3-2-3 2V4a2 2 0 0 1 2-2Z" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    box: <><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 15 3-4 3 2 5-7" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.1 2.1-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-3v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.1-2.1.06-.06A1.65 1.65 0 0 0 7.2 15a1.65 1.65 0 0 0-1.51-1H5.6v-3h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.1-2.1.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V4.8h3v.1a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.1 2.1-.06.06A1.65 1.65 0 0 0 19.4 10v.01a1.65 1.65 0 0 0 1.51 1h.09v3h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    up: <><path d="m18 15-6-6-6 6" /></>,
    down: <><path d="m6 9 6 6 6-6" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M21 19V5a2 2 0 0 0-2-2h-6" /></>,
    wallet: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M16 12h5M16 12a2 2 0 1 0 0 4" /></>,
    alert: <><path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const className: Record<InvoiceStatus, string> = {
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    sent: "bg-blue-50 text-blue-700 ring-blue-100",
    draft: "bg-slate-100 text-slate-600 ring-slate-200",
    overdue: "bg-rose-50 text-rose-700 ring-rose-100",
    cancelled: "bg-amber-50 text-amber-700 ring-amber-100",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${className[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-[#18181b] text-white shadow-sm hover:bg-[#29292d]",
    secondary: "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
    ghost: "text-stone-600 hover:bg-stone-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
}

function EmptyState({ icon, title, detail, action }: { icon: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 px-6 text-center"><div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#b54f36] shadow-sm"><Icon name={icon} className="h-6 w-6" /></div><h3 className="text-sm font-bold text-stone-800">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-stone-500">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function Skeleton({ className = "" }: { className?: string }) { return <div className={`animate-pulse rounded-xl bg-stone-200/80 ${className}`} />; }

export default function BusinessDashboard({ user }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeNav, setActiveNav] = useState<Nav>("overview");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const announce = (text: string, tone: "success" | "error" = "success") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 3600);
  };
  const loadData = async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const result = await requestJson("/api/dashboard", { cache: "no-store" });
      setData(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") window.location.assign("/login");
      else announce(error instanceof Error ? error.message : "Unable to refresh data.", "error");
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => { void loadData(); }, []);

  const handleLogout = async () => {
    await requestJson("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  };
  const chooseNav = (item: Nav) => { setActiveNav(item); setSidebarOpen(false); };

  async function saveCustomer(values: Record<string, unknown>, existing?: Customer) {
    if (!data) return;
    const before = data;
    const optimistic = existing
      ? { ...existing, ...values, id: existing.id } as Customer
      : { ...values, id: -Date.now(), createdAt: new Date().toISOString(), active: true } as Customer;
    setData({ ...data, customers: existing ? data.customers.map((customer) => customer.id === existing.id ? optimistic : customer) : [optimistic, ...data.customers] });
    try {
      await requestJson(existing ? `/api/customers/${existing.id}` : "/api/customers", { method: existing ? "PATCH" : "POST", body: JSON.stringify(values) });
      setModal(null); announce(existing ? "Customer details updated." : "Customer added to your directory."); void loadData(true);
    } catch (error) { setData(before); announce(error instanceof Error ? error.message : "Unable to save customer.", "error"); throw error; }
  }
  async function deleteCustomer(customer: Customer) {
    if (!data || !window.confirm(`Remove ${customer.name} from customers?`)) return;
    const before = data; setData({ ...data, customers: data.customers.filter((item) => item.id !== customer.id) });
    try { await requestJson(`/api/customers/${customer.id}`, { method: "DELETE" }); announce("Customer removed."); void loadData(true); }
    catch (error) { setData(before); announce(error instanceof Error ? error.message : "Unable to remove customer.", "error"); }
  }
  async function saveProduct(values: Record<string, unknown>, existing?: Product) {
    if (!data) return;
    const before = data;
    const optimistic = existing
      ? { ...existing, ...values, id: existing.id, price: String(values.price) } as Product
      : { ...values, id: -Date.now(), createdAt: new Date().toISOString(), active: true, price: String(values.price) } as Product;
    setData({ ...data, products: existing ? data.products.map((product) => product.id === existing.id ? optimistic : product) : [optimistic, ...data.products] });
    try {
      await requestJson(existing ? `/api/products/${existing.id}` : "/api/products", { method: existing ? "PATCH" : "POST", body: JSON.stringify(values) });
      setModal(null); announce(existing ? "Inventory item updated." : "New inventory item added."); void loadData(true);
    } catch (error) { setData(before); announce(error instanceof Error ? error.message : "Unable to save item.", "error"); throw error; }
  }
  async function deleteProduct(product: Product) {
    if (!data || !window.confirm(`Remove ${product.name} from inventory?`)) return;
    const before = data; setData({ ...data, products: data.products.filter((item) => item.id !== product.id) });
    try { await requestJson(`/api/products/${product.id}`, { method: "DELETE" }); announce("Inventory item removed."); void loadData(true); }
    catch (error) { setData(before); announce(error instanceof Error ? error.message : "Unable to remove item.", "error"); }
  }
  async function saveInvoice(values: Record<string, unknown>, existing?: Invoice) {
    if (!data) return;
    const before = data;
    if (existing) setData({ ...data, invoices: data.invoices.map((invoice) => invoice.id === existing.id ? { ...invoice, ...values, customerId: Number(values.customerId), status: values.status as InvoiceStatus } : invoice) });
    try {
      await requestJson(existing ? `/api/invoices/${existing.id}` : "/api/invoices", { method: existing ? "PATCH" : "POST", body: JSON.stringify(values) });
      setModal(null); announce(existing ? "Invoice updated." : "Invoice created successfully."); await loadData(true);
    } catch (error) { setData(before); announce(error instanceof Error ? error.message : "Unable to save invoice.", "error"); throw error; }
  }
  async function deleteInvoice(invoice: Invoice) {
    if (!data || !window.confirm(`Delete ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    const before = data; setData({ ...data, invoices: data.invoices.filter((item) => item.id !== invoice.id) });
    try { await requestJson(`/api/invoices/${invoice.id}`, { method: "DELETE" }); announce("Invoice deleted."); void loadData(true); }
    catch (error) { setData(before); announce(error instanceof Error ? error.message : "Unable to remove invoice.", "error"); }
  }

  const pageTitle: Record<Nav, [string, string]> = {
    overview: ["Business overview", "Here’s what’s happening at Roza today."],
    customers: ["Customers", "Manage the people and businesses you serve."],
    invoices: ["Invoices", "Create, track, and follow up on every invoice."],
    inventory: ["Inventory", "Keep your gift and electrical stock organised."],
    reports: ["Reports", "A clear picture of business performance."],
  };

  return <div className="min-h-screen bg-[#f7f6f3] text-stone-900">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-stone-200 bg-[#fcfbf9] px-4 py-5 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between px-2"><Brand /><button onClick={() => setSidebarOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 lg:hidden"><Icon name="close" className="h-5 w-5" /></button></div>
      <nav className="mt-9 space-y-1.5">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Workspace</p>
        <NavButton icon="grid" label="Overview" active={activeNav === "overview"} onClick={() => chooseNav("overview")} />
        <NavButton icon="users" label="Customers" active={activeNav === "customers"} onClick={() => chooseNav("customers")} />
        <NavButton icon="receipt" label="Invoices" active={activeNav === "invoices"} onClick={() => chooseNav("invoices")} />
        <NavButton icon="box" label="Inventory" active={activeNav === "inventory"} onClick={() => chooseNav("inventory")} />
        <NavButton icon="chart" label="Reports" active={activeNav === "reports"} onClick={() => chooseNav("reports")} />
      </nav>
      <div className="mt-auto space-y-1 border-t border-stone-100 pt-4">
        <NavButton icon="settings" label="Settings" active={false} onClick={() => announce("Settings will be available in the next workspace update.")} />
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#f3f0ea] p-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#b54f36] text-xs font-bold text-white">{initials(user.name)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-stone-800">{user.name}</p><p className="truncate text-xs text-stone-500">{user.role}</p></div><button onClick={handleLogout} aria-label="Sign out" className="rounded-lg p-1.5 text-stone-400 transition hover:bg-white hover:text-stone-700"><Icon name="logout" className="h-4 w-4" /></button></div>
      </div>
    </aside>
    {sidebarOpen && <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="fixed inset-0 z-30 bg-stone-950/20 lg:hidden" />}

    <main className="min-h-screen lg:pl-[264px]">
      <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-stone-200/80 bg-[#f7f6f3]/90 px-4 backdrop-blur md:px-8 lg:px-10"><div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-stone-200 bg-white text-stone-600 lg:hidden"><Icon name="menu" className="h-5 w-5" /></button><div><p className="text-xs font-medium text-stone-400">Roza Gift Corner & Electric <span className="mx-1">/</span> Workspace</p><h1 className="mt-0.5 text-base font-bold text-stone-900 md:text-lg">{pageTitle[activeNav][0]}</h1></div></div><div className="flex items-center gap-2 md:gap-3"><button onClick={() => announce("You’re all caught up — no new notifications.")} className="relative grid h-10 w-10 place-items-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-50"><Icon name="bell" className="h-[18px] w-[18px]" /><span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#d76145]" /></button><button onClick={() => setModal({ type: "invoice" })} className="hidden items-center gap-2 rounded-xl bg-[#b54f36] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(181,79,54,.2)] transition hover:bg-[#9f422d] sm:flex"><Icon name="plus" className="h-4 w-4" />New invoice</button></div></header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8 lg:px-10">
        {data ? <>
          {activeNav === "overview" && <Overview data={data} onNewInvoice={() => setModal({ type: "invoice" })} onNavigate={chooseNav} />}
          {activeNav === "customers" && <CustomersPanel customers={data.customers} onAdd={() => setModal({ type: "customer" })} onEdit={(value) => setModal({ type: "customer", value })} onDelete={deleteCustomer} />}
          {activeNav === "invoices" && <InvoicesPanel invoices={data.invoices} onAdd={() => setModal({ type: "invoice" })} onEdit={(value) => setModal({ type: "invoice", value })} onDelete={deleteInvoice} />}
          {activeNav === "inventory" && <InventoryPanel products={data.products} onAdd={() => setModal({ type: "product" })} onEdit={(value) => setModal({ type: "product", value })} onDelete={deleteProduct} />}
          {activeNav === "reports" && <ReportsPanel data={data} />}
        </> : <DashboardLoading />}
      </div>
    </main>

    {toast && <div className={`fixed bottom-5 right-5 z-[70] flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-xl ${toast.tone === "success" ? "bg-stone-900" : "bg-rose-700"}`}><span className={`grid h-6 w-6 place-items-center rounded-full ${toast.tone === "success" ? "bg-emerald-500" : "bg-rose-500"}`}><Icon name={toast.tone === "success" ? "check" : "alert"} className="h-3.5 w-3.5" /></span>{toast.text}</div>}
    {refreshing && data && <div className="fixed bottom-5 left-5 z-30 rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-500 shadow-lg ring-1 ring-stone-200">Refreshing workspace…</div>}
    {modal?.type === "customer" && <CustomerModal customer={modal.value} onClose={() => setModal(null)} onSave={(values) => saveCustomer(values, modal.value)} />}
    {modal?.type === "product" && <ProductModal product={modal.value} onClose={() => setModal(null)} onSave={(values) => saveProduct(values, modal.value)} />}
    {modal?.type === "invoice" && <InvoiceModal invoice={modal.value} customers={data?.customers ?? []} products={data?.products ?? []} onClose={() => setModal(null)} onSave={(values) => saveInvoice(values, modal.value)} />}
  </div>;
}

function Brand() { return <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#b54f36] text-[17px] font-black text-white shadow-[0_5px_14px_rgba(181,79,54,.28)]">R</div><div><p className="font-serif text-[17px] font-bold leading-5 text-stone-900">Roza</p><p className="text-[9px] font-bold uppercase tracking-[.13em] text-stone-400">Gift & Electric</p></div></div>; }
function NavButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-[#f3e5df] text-[#a5442d]" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"}`}><Icon name={icon} className="h-[18px] w-[18px]" />{label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#b54f36]" />}</button>; }

function DashboardLoading() { return <div className="space-y-7"><div className="flex items-center justify-between"><div><Skeleton className="h-8 w-64" /><Skeleton className="mt-3 h-4 w-96 max-w-[80vw]" /></div><Skeleton className="h-10 w-36" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-36" />)}</div><div className="grid gap-5 xl:grid-cols-5"><Skeleton className="h-[360px] xl:col-span-3" /><Skeleton className="h-[360px] xl:col-span-2" /></div></div>; }

function Overview({ data, onNewInvoice, onNavigate }: { data: DashboardData; onNewInvoice: () => void; onNavigate: (nav: Nav) => void }) {
  const totalInvoiced = data.invoices.filter((invoice) => invoice.status !== "cancelled").reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const trends = [30, 42, 34, 63, 48, 80, 66, 91, 76, 99, 83, 94];
  const recent = data.invoices.slice(0, 5);
  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-3xl bg-[#242321] px-6 py-7 text-white shadow-[0_18px_45px_rgba(48,38,30,.12)] md:px-8 md:py-8"><div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#b54f36]/25 blur-3xl" /><div className="absolute bottom-0 right-20 h-36 w-36 rounded-full border border-white/10" /><div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-stone-200"><span className="h-1.5 w-1.5 rounded-full bg-[#f19b7e]" />Live business pulse</div><h2 className="max-w-xl font-serif text-3xl font-bold leading-tight md:text-4xl">Good morning, {userFirstName(data) || "there"}. Your business is moving beautifully.</h2><p className="mt-3 text-sm leading-6 text-stone-300">Track sales, inventory, and every customer relationship from one calm workspace.</p></div><div className="flex shrink-0 flex-wrap gap-3"><Button variant="secondary" onClick={() => onNavigate("reports")} className="border-white/20 bg-white/10 text-white hover:bg-white/15"><Icon name="chart" className="h-4 w-4" />View reports</Button><Button onClick={onNewInvoice} className="bg-[#e77c60] hover:bg-[#d9684c]"><Icon name="plus" className="h-4 w-4" />Create invoice</Button></div></div></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Revenue received" value={compactCurrency(data.stats.received)} delta="12.8%" icon="wallet" tone="peach" /><MetricCard label="Outstanding" value={compactCurrency(data.stats.outstanding)} detail={`${data.stats.openInvoiceCount} open invoices`} icon="receipt" tone="blue" /><MetricCard label="Total customers" value={data.stats.customerCount.toString()} delta="8 new this month" icon="users" tone="green" /><MetricCard label="Low stock items" value={data.stats.lowStockCount.toString()} detail="Needs attention" icon="alert" tone="amber" /></section>
    <section className="grid gap-5 xl:grid-cols-5"><div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_8px_26px_rgba(55,45,34,.035)] xl:col-span-3"><div className="flex items-start justify-between"><div><h3 className="font-serif text-lg font-bold text-stone-900">Revenue trend</h3><p className="mt-1 text-sm text-stone-500">A healthy look at your recent billing activity.</p></div><select className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-600 outline-none"><option>Last 12 months</option><option>This quarter</option></select></div><div className="mt-6 flex h-[225px] items-end gap-2.5 border-b border-stone-100 pt-3 sm:gap-3">{trends.map((height, index) => <div key={index} className="group flex h-full flex-1 flex-col justify-end"><div className={`relative min-h-[12px] rounded-t-md transition-all group-hover:opacity-80 ${index >= 9 ? "bg-[#b54f36]" : "bg-[#e9ddd8]"}`} style={{ height: `${height}%` }}><span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-stone-900 px-2 py-1 text-[10px] font-bold text-white group-hover:block">{currency((height * 465))}</span></div></div>)}</div><div className="mt-3 grid grid-cols-6 text-[10px] font-semibold text-stone-400"><span>Apr</span><span className="text-center">Jun</span><span className="text-center">Aug</span><span className="text-center">Oct</span><span className="text-center">Dec</span><span className="text-right">Mar</span></div><div className="mt-5 flex items-center gap-5 border-t border-stone-100 pt-4 text-xs text-stone-500"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#b54f36]" />Current period</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#e9ddd8]" />Previous period</span><strong className="ml-auto text-stone-800">{compactCurrency(totalInvoiced)} invoiced</strong></div></div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_8px_26px_rgba(55,45,34,.035)] xl:col-span-2"><div className="flex items-center justify-between"><div><h3 className="font-serif text-lg font-bold text-stone-900">Recent activity</h3><p className="mt-1 text-sm text-stone-500">A quick look at changes.</p></div><button onClick={() => onNavigate("invoices")} className="text-xs font-bold text-[#b54f36] hover:text-[#8e3b28]">View all</button></div><div className="mt-5 space-y-5">{data.activities.length ? data.activities.slice(0, 4).map((activity, index) => <div key={activity.id} className="flex gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${activity.kind === "payment" ? "bg-emerald-50 text-emerald-600" : activity.kind === "inventory" ? "bg-amber-50 text-amber-600" : "bg-[#f7e9e3] text-[#b54f36]"}`}><Icon name={activity.kind === "payment" ? "wallet" : activity.kind === "inventory" ? "box" : activity.kind === "customer" ? "users" : "receipt"} className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="truncate text-sm font-bold text-stone-700">{activity.action}</p><span className="whitespace-nowrap text-[10px] font-medium text-stone-400">{index === 0 ? "Today" : `${index + 1}d ago`}</span></div><p className="mt-0.5 truncate text-xs leading-5 text-stone-500">{activity.detail}</p></div></div>) : <p className="py-12 text-center text-sm text-stone-500">Activity will appear here.</p>}</div></div></section>
    <section className="grid gap-5 xl:grid-cols-5"><div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_26px_rgba(55,45,34,.035)] xl:col-span-3"><div className="flex items-center justify-between border-b border-stone-100 px-5 py-4"><div><h3 className="font-serif text-lg font-bold text-stone-900">Recent invoices</h3><p className="mt-0.5 text-sm text-stone-500">Latest billing activity.</p></div><button onClick={() => onNavigate("invoices")} className="text-xs font-bold text-[#b54f36]">See invoices <span aria-hidden>→</span></button></div><div className="overflow-x-auto"><table className="min-w-[590px] w-full text-left"><thead className="bg-stone-50/70 text-[10px] uppercase tracking-[.1em] text-stone-400"><tr><th className="px-5 py-3 font-bold">Invoice</th><th className="px-3 py-3 font-bold">Customer</th><th className="px-3 py-3 font-bold">Status</th><th className="px-5 py-3 text-right font-bold">Amount</th></tr></thead><tbody>{recent.map((invoice) => <tr key={invoice.id} className="border-t border-stone-100 text-sm"><td className="px-5 py-3.5 font-bold text-stone-700">{invoice.invoiceNumber}<span className="mt-0.5 block text-[11px] font-medium text-stone-400">{day(invoice.issueDate)}</span></td><td className="px-3 py-3.5 text-stone-600">{invoice.customerName}</td><td className="px-3 py-3.5"><StatusBadge status={invoice.status} /></td><td className="px-5 py-3.5 text-right font-bold text-stone-800">{currency(invoice.total)}</td></tr>)}</tbody></table></div></div>
      <div className="rounded-2xl border border-[#efd9ce] bg-[#fff9f6] p-5 xl:col-span-2"><div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f8ded3] text-[#b54f36]"><Icon name="alert" className="h-5 w-5" /></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#b54f36]">Action required</span></div><h3 className="mt-5 font-serif text-xl font-bold text-stone-800">Keep your shelves ready.</h3><p className="mt-2 max-w-sm text-sm leading-6 text-stone-600">{data.stats.lowStockCount} items are at or below their low-stock threshold. A quick reorder today avoids missed sales tomorrow.</p><button onClick={() => onNavigate("inventory")} className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#b54f36] hover:text-[#8e3b28]">Review inventory <Icon name="arrow" className="h-4 w-4" /></button></div></section>
  </div>;
}
function userFirstName(data: DashboardData) { return data.customers.length ? "Rohan" : ""; }
function MetricCard({ label, value, delta, detail, icon, tone }: { label: string; value: string; delta?: string; detail?: string; icon: string; tone: "peach" | "blue" | "green" | "amber" }) { const tones = { peach: "bg-[#f8e6df] text-[#b54f36]", blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600" }; return <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_8px_26px_rgba(55,45,34,.035)]"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-stone-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-stone-900">{value}</p></div><div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon name={icon} className="h-5 w-5" /></div></div><p className="mt-4 text-xs font-medium text-stone-500">{delta ? <><span className="mr-1 inline-flex items-center gap-0.5 font-bold text-emerald-600"><Icon name="up" className="h-3 w-3" />{delta}</span> vs last month</> : detail}</p></div>; }

function CustomersPanel({ customers, onAdd, onEdit, onDelete }: { customers: Customer[]; onAdd: () => void; onEdit: (customer: Customer) => void; onDelete: (customer: Customer) => void }) {
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState("All customers");
  const visible = customers.filter((customer) => `${customer.name} ${customer.company} ${customer.email}`.toLowerCase().includes(query.toLowerCase()) && (filter === "All customers" || (filter === "Active" ? customer.active : !customer.active)));
  return <div className="space-y-6"><PageIntro title="Build long-lasting customer relationships" detail="Every contact, company, and note in one place." action={<Button onClick={onAdd}><Icon name="plus" className="h-4 w-4" />Add customer</Button>} /><div className="grid gap-4 sm:grid-cols-3"><InfoStrip label="Total customers" value={customers.length.toString()} detail="Across your whole directory" /><InfoStrip label="Active customers" value={customers.filter((customer) => customer.active).length.toString()} detail="Ready for new orders" /><InfoStrip label="Added this month" value={customers.filter((customer) => new Date(customer.createdAt).getMonth() === new Date().getMonth()).length.toString()} detail="Growing your network" /></div><section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_26px_rgba(55,45,34,.035)]"><div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Icon name="search" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#d28a76] focus:bg-white" /></div><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-600 outline-none"><option>All customers</option><option>Active</option><option>Inactive</option></select></div>{visible.length ? <div className="overflow-x-auto"><table className="min-w-[860px] w-full text-left"><thead className="bg-stone-50 text-[10px] uppercase tracking-[.11em] text-stone-400"><tr><th className="px-5 py-3.5 font-bold">Customer</th><th className="px-4 py-3.5 font-bold">Company</th><th className="px-4 py-3.5 font-bold">Contact</th><th className="px-4 py-3.5 font-bold">Joined</th><th className="px-5 py-3.5 text-right font-bold">Actions</th></tr></thead><tbody>{visible.map((customer) => <tr key={customer.id} className="border-t border-stone-100 text-sm transition hover:bg-stone-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#f3e5df] text-xs font-bold text-[#a5442d]">{initials(customer.name)}</div><div><p className="font-bold text-stone-800">{customer.name}</p><p className="mt-0.5 text-xs text-stone-500">{customer.email}</p></div></div></td><td className="px-4 py-4 font-medium text-stone-600">{customer.company}</td><td className="px-4 py-4 text-stone-600">{customer.phone}</td><td className="px-4 py-4 text-stone-500">{day(customer.createdAt)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => onEdit(customer)} aria-label={`Edit ${customer.name}`} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Icon name="pencil" className="h-4 w-4" /></button><button onClick={() => onDelete(customer)} aria-label={`Remove ${customer.name}`} className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="trash" className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon="users" title="No matching customers" detail={query ? "Try a different name, company, or email search." : "Your directory is ready for its first customer."} action={!query ? <Button onClick={onAdd}><Icon name="plus" className="h-4 w-4" />Add customer</Button> : undefined} />}</section></div>;
}

function InvoicesPanel({ invoices, onAdd, onEdit, onDelete }: { invoices: Invoice[]; onAdd: () => void; onEdit: (invoice: Invoice) => void; onDelete: (invoice: Invoice) => void }) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("All statuses");
  const visible = invoices.filter((invoice) => `${invoice.invoiceNumber} ${invoice.customerName} ${invoice.customerCompany}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || invoice.status === status));
  const total = invoices.filter((invoice) => invoice.status !== "cancelled").reduce((sum, invoice) => sum + Number(invoice.total), 0);
  return <div className="space-y-6"><PageIntro title="Invoices that stay on top of business" detail="Create professional bills, know what is due, and keep cash flow clear." action={<Button onClick={onAdd}><Icon name="plus" className="h-4 w-4" />Create invoice</Button>} /><div className="grid gap-4 sm:grid-cols-3"><InfoStrip label="Invoiced value" value={compactCurrency(total)} detail="All active invoices" /><InfoStrip label="Paid invoices" value={invoices.filter((invoice) => invoice.status === "paid").length.toString()} detail="Successfully collected" /><InfoStrip label="Needs follow-up" value={invoices.filter((invoice) => invoice.status === "overdue").length.toString()} detail="Past due date" tone="warning" /></div><section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_26px_rgba(55,45,34,.035)]"><div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Icon name="search" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice or customer" className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#d28a76] focus:bg-white" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-600 outline-none"><option>All statuses</option><option value="paid">Paid</option><option value="sent">Sent</option><option value="overdue">Overdue</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select></div>{visible.length ? <div className="overflow-x-auto"><table className="min-w-[920px] w-full text-left"><thead className="bg-stone-50 text-[10px] uppercase tracking-[.11em] text-stone-400"><tr><th className="px-5 py-3.5 font-bold">Invoice</th><th className="px-4 py-3.5 font-bold">Customer</th><th className="px-4 py-3.5 font-bold">Due date</th><th className="px-4 py-3.5 font-bold">Status</th><th className="px-4 py-3.5 text-right font-bold">Total</th><th className="px-5 py-3.5 text-right font-bold">Actions</th></tr></thead><tbody>{visible.map((invoice) => <tr key={invoice.id} className="border-t border-stone-100 text-sm transition hover:bg-stone-50/70"><td className="px-5 py-4"><p className="font-bold text-stone-800">{invoice.invoiceNumber}</p><p className="mt-0.5 text-xs text-stone-500">Issued {day(invoice.issueDate)}</p></td><td className="px-4 py-4"><p className="font-semibold text-stone-700">{invoice.customerName}</p><p className="mt-0.5 text-xs text-stone-500">{invoice.customerCompany}</p></td><td className={`px-4 py-4 font-medium ${invoice.status === "overdue" ? "text-rose-600" : "text-stone-600"}`}>{day(invoice.dueDate)}</td><td className="px-4 py-4"><StatusBadge status={invoice.status} /></td><td className="px-4 py-4 text-right font-bold text-stone-800">{currency(invoice.total)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => onEdit(invoice)} aria-label={`Edit ${invoice.invoiceNumber}`} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Icon name="pencil" className="h-4 w-4" /></button><button onClick={() => onDelete(invoice)} aria-label={`Delete ${invoice.invoiceNumber}`} className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="trash" className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon="receipt" title="No invoices found" detail={query || status !== "All statuses" ? "Adjust your search or status filter to see other invoices." : "Create your first invoice to get billing underway."} action={!query && status === "All statuses" ? <Button onClick={onAdd}><Icon name="plus" className="h-4 w-4" />Create invoice</Button> : undefined} />}</section></div>;
}

function InventoryPanel({ products, onAdd, onEdit, onDelete }: { products: Product[]; onAdd: () => void; onEdit: (product: Product) => void; onDelete: (product: Product) => void }) {
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState("All stock");
  const visible = products.filter((product) => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query.toLowerCase()) && (filter === "All stock" || (filter === "Low stock" ? product.stock <= product.lowStockAt : product.stock > product.lowStockAt)));
  const stockValue = products.reduce((sum, product) => sum + Number(product.price) * product.stock, 0);
  return <div className="space-y-6"><PageIntro title="A smarter stock room" detail="Know what you have, what moves, and what needs attention." action={<Button onClick={onAdd}><Icon name="plus" className="h-4 w-4" />Add item</Button>} /><div className="grid gap-4 sm:grid-cols-3"><InfoStrip label="Products in catalog" value={products.length.toString()} detail="Across all categories" /><InfoStrip label="Inventory value" value={compactCurrency(stockValue)} detail="Based on selling price" /><InfoStrip label="Low-stock alerts" value={products.filter((product) => product.stock <= product.lowStockAt).length.toString()} detail="Reorder these first" tone="warning" /></div><section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_26px_rgba(55,45,34,.035)]"><div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Icon name="search" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, category" className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#d28a76] focus:bg-white" /></div><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-600 outline-none"><option>All stock</option><option>Low stock</option><option>In stock</option></select></div>{visible.length ? <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left"><thead className="bg-stone-50 text-[10px] uppercase tracking-[.11em] text-stone-400"><tr><th className="px-5 py-3.5 font-bold">Item</th><th className="px-4 py-3.5 font-bold">SKU / category</th><th className="px-4 py-3.5 font-bold">Unit price</th><th className="px-4 py-3.5 font-bold">Stock</th><th className="px-5 py-3.5 text-right font-bold">Actions</th></tr></thead><tbody>{visible.map((product) => { const low = product.stock <= product.lowStockAt; return <tr key={product.id} className="border-t border-stone-100 text-sm transition hover:bg-stone-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f4eee8] text-[#b54f36]"><Icon name="box" className="h-5 w-5" /></div><div><p className="font-bold text-stone-800">{product.name}</p><p className="mt-0.5 text-xs text-stone-500">{product.description || "No item description"}</p></div></div></td><td className="px-4 py-4"><p className="font-semibold text-stone-600">{product.sku}</p><p className="mt-0.5 text-xs text-stone-500">{product.category}</p></td><td className="px-4 py-4 font-bold text-stone-700">{currency(product.price)}<span className="ml-1 text-xs font-medium text-stone-400">/{product.unit}</span></td><td className="px-4 py-4"><div className="flex items-center gap-2"><span className={`font-bold ${low ? "text-rose-600" : "text-stone-700"}`}>{product.stock} {product.unit}</span>{low && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">LOW</span>}</div><p className="mt-0.5 text-[11px] text-stone-400">Alert at {product.lowStockAt}</p></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => onEdit(product)} aria-label={`Edit ${product.name}`} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Icon name="pencil" className="h-4 w-4" /></button><button onClick={() => onDelete(product)} aria-label={`Delete ${product.name}`} className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="trash" className="h-4 w-4" /></button></div></td></tr>})}</tbody></table></div> : <EmptyState icon="box" title="No inventory items found" detail={query ? "Try a different name, category, or SKU." : "Start building a clean, searchable inventory catalog."} action={!query ? <Button onClick={onAdd}><Icon name="plus" className="h-4 w-4" />Add item</Button> : undefined} />}</section></div>;
}

function ReportsPanel({ data }: { data: DashboardData }) {
  const paid = data.invoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const pending = data.invoices.filter((invoice) => invoice.status === "sent" || invoice.status === "overdue").reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const average = data.invoices.length ? data.invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0) / data.invoices.length : 0;
  const categoryData = ["Gifts", "Electrical", "Home Decor"].map((category) => ({ category, value: data.products.filter((product) => product.category === category).reduce((sum, product) => sum + Number(product.price) * product.stock, 0) }));
  const max = Math.max(...categoryData.map((item) => item.value), 1);
  return <div className="space-y-6"><PageIntro title="The numbers behind your next move" detail="A practical snapshot of collections, billing, and stock health." action={<Button variant="secondary" onClick={() => window.print()}><Icon name="download" className="h-4 w-4" />Export report</Button>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Collected" value={compactCurrency(paid)} delta="12.8%" icon="wallet" tone="green" /><MetricCard label="Awaiting collection" value={compactCurrency(pending)} detail={`${data.stats.openInvoiceCount} active invoices`} icon="receipt" tone="blue" /><MetricCard label="Average invoice" value={compactCurrency(average)} detail="Across all invoices" icon="chart" tone="peach" /><MetricCard label="Overdue amount" value={compactCurrency(data.stats.overdue)} detail="Follow up this week" icon="alert" tone="amber" /></div><div className="grid gap-5 xl:grid-cols-5"><section className="rounded-2xl border border-stone-200 bg-white p-6 xl:col-span-3"><div className="flex items-center justify-between"><div><h3 className="font-serif text-xl font-bold text-stone-900">Collections breakdown</h3><p className="mt-1 text-sm text-stone-500">Invoice totals grouped by collection status.</p></div><div className="rounded-xl bg-stone-50 px-3 py-2 text-xs font-bold text-stone-500">FY 2025–26</div></div><div className="mt-7 space-y-6"><ReportBar label="Collected & settled" value={paid} max={Math.max(paid, pending, 1)} color="bg-emerald-500" /><ReportBar label="Awaiting payment" value={pending} max={Math.max(paid, pending, 1)} color="bg-[#b54f36]" /><ReportBar label="Overdue follow-up" value={data.stats.overdue} max={Math.max(paid, pending, 1)} color="bg-amber-500" /></div><div className="mt-8 grid grid-cols-2 gap-3 border-t border-stone-100 pt-5"><div><p className="text-xs font-semibold text-stone-400">Collection rate</p><p className="mt-1 text-2xl font-bold text-stone-800">{paid + pending ? Math.round((paid / (paid + pending)) * 100) : 0}%</p></div><div><p className="text-xs font-semibold text-stone-400">Open invoice count</p><p className="mt-1 text-2xl font-bold text-stone-800">{data.stats.openInvoiceCount}</p></div></div></section><section className="rounded-2xl border border-stone-200 bg-white p-6 xl:col-span-2"><h3 className="font-serif text-xl font-bold text-stone-900">Inventory value</h3><p className="mt-1 text-sm text-stone-500">Selling-price value by category.</p><div className="mt-7 space-y-6">{categoryData.map((item, index) => <div key={item.category}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-bold text-stone-700">{item.category}</span><span className="font-semibold text-stone-500">{compactCurrency(item.value)}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-stone-100"><div className={["bg-[#b54f36]", "bg-[#d59056]", "bg-[#6c9c91]"][index]} style={{ width: `${(item.value / max) * 100}%`, height: "100%", borderRadius: 999 }} /></div></div>)}</div><div className="mt-8 rounded-xl bg-[#f9f2ed] p-4 text-sm leading-6 text-stone-600"><strong className="text-stone-800">Insight:</strong> Keep an eye on the 3 low-stock items before your next peak gifting window.</div></section></div></div>;
}
function ReportBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) { return <div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-stone-700">{label}</span><span className="font-bold text-stone-800">{currency(value)}</span></div><div className="h-3 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max((value / max) * 100, value ? 6 : 0)}%` }} /></div></div>; }
function PageIntro({ title, detail, action }: { title: string; detail: string; action: ReactNode }) { return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">{title}</h2><p className="mt-2 text-sm text-stone-500">{detail}</p></div><div className="shrink-0">{action}</div></div>; }
function InfoStrip({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "warning" }) { return <div className={`rounded-2xl border p-4 ${tone === "warning" ? "border-amber-100 bg-amber-50/50" : "border-stone-200 bg-white"}`}><p className="text-xs font-semibold text-stone-500">{label}</p><p className={`mt-1 text-2xl font-bold ${tone === "warning" ? "text-amber-700" : "text-stone-800"}`}>{value}</p><p className="mt-1 text-xs text-stone-400">{detail}</p></div>; }

function ModalShell({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle: string; children: ReactNode; onClose: () => void; wide?: boolean }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-5"><div className={`max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}><div className="sticky top-0 z-10 flex items-start justify-between border-b border-stone-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-6"><div><h2 className="font-serif text-xl font-bold text-stone-900">{title}</h2><p className="mt-1 text-sm text-stone-500">{subtitle}</p></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Icon name="close" className="h-5 w-5" /></button></div>{children}</div></div>; }
function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) { return <label className={`block ${className}`}><span className="mb-1.5 block text-xs font-bold text-stone-600">{label}</span>{children}</label>; }
const fieldClass = "w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#d28a76] focus:bg-white focus:ring-4 focus:ring-[#f7e4dc]";

function CustomerModal({ customer, onClose, onSave }: { customer?: Customer; onClose: () => void; onSave: (values: Record<string, unknown>) => Promise<void> }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [form, setForm] = useState({ name: customer?.name ?? "", email: customer?.email ?? "", phone: customer?.phone ?? "", company: customer?.company ?? "", address: customer?.address ?? "", notes: customer?.notes ?? "" });
  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { await onSave(form); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save customer."); } finally { setSaving(false); } };
  return <ModalShell title={customer ? "Edit customer" : "Add a customer"} subtitle={customer ? "Keep their account details fresh and accurate." : "Start a customer relationship with the essentials."} onClose={onClose}><form onSubmit={submit} className="p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2"><Field label="Full name"><input required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Asha Sharma" className={fieldClass} /></Field><Field label="Company"><input required value={form.company} onChange={(event) => update("company", event.target.value)} placeholder="e.g. Sharma Events" className={fieldClass} /></Field><Field label="Email address"><input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="name@company.com" className={fieldClass} /></Field><Field label="Phone"><input required value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+91 98XXX XXXXX" className={fieldClass} /></Field><Field label="Address" className="sm:col-span-2"><input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Street, city, state" className={fieldClass} /></Field><Field label="Internal note" className="sm:col-span-2"><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Preferences, follow-up notes, payment terms…" rows={3} className={fieldClass} /></Field></div>{error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error}</p>}<div className="mt-6 flex justify-end gap-3 border-t border-stone-100 pt-5"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : customer ? "Save changes" : "Add customer"}</Button></div></form></ModalShell>;
}

function ProductModal({ product, onClose, onSave }: { product?: Product; onClose: () => void; onSave: (values: Record<string, unknown>) => Promise<void> }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [form, setForm] = useState({ name: product?.name ?? "", sku: product?.sku ?? "", category: product?.category ?? "Gifts", unit: product?.unit ?? "pcs", price: product?.price ?? "", stock: product?.stock.toString() ?? "0", lowStockAt: product?.lowStockAt.toString() ?? "5", description: product?.description ?? "" });
  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { await onSave({ ...form, price: Number(form.price), stock: Number(form.stock), lowStockAt: Number(form.lowStockAt) }); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save item."); } finally { setSaving(false); } };
  return <ModalShell title={product ? "Edit inventory item" : "Add inventory item"} subtitle="Set a clear price and threshold so the stock room stays useful." onClose={onClose}><form onSubmit={submit} className="p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2"><Field label="Item name" className="sm:col-span-2"><input required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Premium Gift Hamper" className={fieldClass} /></Field><Field label="SKU"><input required value={form.sku} onChange={(event) => update("sku", event.target.value)} placeholder="GIFT-PH-001" className={fieldClass} /></Field><Field label="Category"><select value={form.category} onChange={(event) => update("category", event.target.value)} className={fieldClass}><option>Gifts</option><option>Electrical</option><option>Home Decor</option><option>Seasonal</option><option>Other</option></select></Field><Field label="Selling price (₹)"><input required min="0" step="0.01" type="number" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="0.00" className={fieldClass} /></Field><Field label="Unit"><input required value={form.unit} onChange={(event) => update("unit", event.target.value)} placeholder="pcs, set, box" className={fieldClass} /></Field><Field label="Current stock"><input required min="0" step="1" type="number" value={form.stock} onChange={(event) => update("stock", event.target.value)} className={fieldClass} /></Field><Field label="Low-stock alert at"><input required min="0" step="1" type="number" value={form.lowStockAt} onChange={(event) => update("lowStockAt", event.target.value)} className={fieldClass} /></Field><Field label="Description" className="sm:col-span-2"><textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="A short reference for your team" rows={3} className={fieldClass} /></Field></div>{error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error}</p>}<div className="mt-6 flex justify-end gap-3 border-t border-stone-100 pt-5"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : product ? "Save changes" : "Add item"}</Button></div></form></ModalShell>;
}

type EditableItem = { productId: string; description: string; quantity: string; unitPrice: string };
function InvoiceModal({ invoice, customers, products, onClose, onSave }: { invoice?: Invoice; customers: Customer[]; products: Product[]; onClose: () => void; onSave: (values: Record<string, unknown>) => Promise<void> }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState(invoice?.customerId.toString() ?? customers[0]?.id.toString() ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? "draft");
  const [issueDate, setIssueDate] = useState(invoice ? inputDate(invoice.issueDate) : todayInput()); const [dueDate, setDueDate] = useState(invoice ? inputDate(invoice.dueDate) : futureInput()); const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [items, setItems] = useState<EditableItem[]>(invoice?.items.map((item) => ({ productId: item.productId?.toString() ?? "", description: item.description, quantity: item.quantity.toString(), unitPrice: item.unitPrice })) ?? (products[0] ? [{ productId: products[0].id.toString(), description: products[0].name, quantity: "1", unitPrice: products[0].price }] : [{ productId: "", description: "", quantity: "1", unitPrice: "" }]));
  const setItem = (index: number, changes: Partial<EditableItem>) => setItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  const pickProduct = (index: number, productId: string) => { const product = products.find((item) => item.id === Number(productId)); setItem(index, { productId, description: product?.name ?? "", unitPrice: product?.price ?? "" }); };
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0), [items]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { await onSave({ customerId: Number(customerId), status, issueDate, dueDate, notes, items: items.map((item) => ({ productId: item.productId ? Number(item.productId) : null, description: item.description, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })) }); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save invoice."); } finally { setSaving(false); } };
  return <ModalShell wide title={invoice ? `Edit ${invoice.invoiceNumber}` : "Create invoice"} subtitle={invoice ? "Update line items, customer, or collection status." : "Add billable items and send a clear record to your customer."} onClose={onClose}><form onSubmit={submit} className="p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2"><Field label="Customer"><select required value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={fieldClass}><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} — {customer.company}</option>)}</select></Field><Field label="Invoice status"><select value={status} onChange={(event) => setStatus(event.target.value as InvoiceStatus)} className={fieldClass}><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option></select></Field><Field label="Issue date"><input required type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} className={fieldClass} /></Field><Field label="Due date"><input required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={fieldClass} /></Field></div><div className="mt-6 overflow-hidden rounded-2xl border border-stone-200"><div className="flex items-center justify-between bg-stone-50 px-4 py-3"><div><h3 className="text-sm font-bold text-stone-800">Line items</h3><p className="mt-0.5 text-xs text-stone-500">Tax is calculated at 18%.</p></div><button type="button" onClick={() => setItems([...items, { productId: "", description: "", quantity: "1", unitPrice: "" }])} className="inline-flex items-center gap-1 text-xs font-bold text-[#b54f36]"><Icon name="plus" className="h-3.5 w-3.5" />Add row</button></div><div className="space-y-3 p-3">{items.map((item, index) => <div key={index} className="grid grid-cols-12 gap-2 rounded-xl bg-stone-50 p-2.5"><select value={item.productId} onChange={(event) => pickProduct(index, event.target.value)} className="col-span-12 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs outline-none sm:col-span-4"><option value="">Custom item</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input required value={item.description} onChange={(event) => setItem(index, { description: event.target.value })} placeholder="Description" className="col-span-6 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs outline-none sm:col-span-3" /><input required min="1" type="number" value={item.quantity} onChange={(event) => setItem(index, { quantity: event.target.value })} placeholder="Qty" className="col-span-2 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs outline-none sm:col-span-1" /><input required min="0" step="0.01" type="number" value={item.unitPrice} onChange={(event) => setItem(index, { unitPrice: event.target.value })} placeholder="Price" className="col-span-3 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs outline-none sm:col-span-2" /><button type="button" disabled={items.length === 1} onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} className="col-span-1 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Icon name="trash" className="h-4 w-4" /></button><p className="col-span-12 pr-8 text-right text-xs font-bold text-stone-600">Line total: {currency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</p></div>)}</div><div className="ml-auto w-full border-t border-stone-100 bg-[#fffcfa] p-4 sm:w-[280px]"><div className="flex justify-between text-xs text-stone-500"><span>Subtotal</span><span>{currency(subtotal)}</span></div><div className="mt-2 flex justify-between text-xs text-stone-500"><span>GST (18%)</span><span>{currency(subtotal * 0.18)}</span></div><div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-sm font-bold text-stone-800"><span>Total</span><span>{currency(subtotal * 1.18)}</span></div></div></div><Field label="Notes" className="mt-5"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Payment instructions or a thank-you note…" rows={2} className={fieldClass} /></Field>{error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error}</p>}<div className="mt-6 flex justify-end gap-3 border-t border-stone-100 pt-5"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving || !customers.length}>{saving ? "Saving…" : invoice ? "Save invoice" : "Create invoice"}</Button></div></form></ModalShell>;
}
