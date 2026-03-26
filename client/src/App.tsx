import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, PackageOpen, ShoppingBag, Users, ClipboardList, User, Download, Sun, Moon, Settings2, LogOut } from 'lucide-react';
import { io } from 'socket.io-client';
import { ToastProvider } from './components/Toast';
import Inventory from './pages/Inventory';
import Sold from './pages/Sold';
import Suppliers from './pages/Suppliers';
import Journal from './pages/Journal';
import Settings from './pages/Settings';
import Login from './pages/Login';

const socket = io('/', { transports: ['websocket'] });

// ====== API HELPER ======
export const token = () => localStorage.getItem('sklToken') || '';
export const api = (url: string, opts: RequestInit = {}) =>
  fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...((opts as any).headers || {}) } });

// ====== SIDEBAR ======
const Sidebar = ({ onLogout }: { onLogout: () => void }) => (
  <div className="sidebar">
    <div className="sidebar-title" style={{ marginTop: '56px' }}>Меню</div>
    <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
      <LayoutDashboard className="icon" size={18} /> Сводка
    </NavLink>
    <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <Package className="icon" size={18} /> Товары
    </NavLink>
    <NavLink to="/sold" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <ShoppingBag className="icon" size={18} /> Проданное
    </NavLink>
    <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <Users className="icon" size={18} /> Поставщики
    </NavLink>
    <NavLink to="/journal" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <ClipboardList className="icon" size={18} /> Журнал
    </NavLink>
    <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <Settings2 className="icon" size={18} /> Настройки
    </NavLink>
    <div style={{ flex: 1 }} />
    <button className="nav-item" onClick={onLogout} style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', color: 'var(--system-red)', marginBottom: '8px' }}>
      <LogOut className="icon" size={18} style={{ color: 'var(--system-red)' }} /> Выйти
    </button>
  </div>
);

// ====== HEADER ======
const Header = ({ darkMode, toggleDark }: { darkMode: boolean; toggleDark: () => void }) => (
  <div className="header">
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PackageOpen size={16} />
      </div>
      <span style={{ fontSize: '15px', fontWeight: 500 }}>СКЛАД</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button onClick={toggleDark} style={{ background: 'var(--system-gray-6)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.18s' }}>
        {darkMode ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderRadius: 'var(--border-radius-sm)', background: 'var(--system-gray-6)' }}>
        <User size={16} color="var(--text-secondary)" />
        <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-primary)' }}>Администратор</span>
      </div>
    </div>
  </div>
);

// ====== STATUS COLORS ======
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Склад': { bg: 'rgba(52,199,89,0.1)', text: '#34C759' },
  'Активен': { bg: 'rgba(52,199,89,0.1)', text: '#34C759' },
  'Архив': { bg: 'rgba(142,142,147,0.1)', text: '#8E8E93' },
  'Брак': { bg: 'rgba(255,59,48,0.1)', text: '#FF3B30' },
  'Продан': { bg: 'rgba(255,59,48,0.1)', text: '#FF3B30' },
  'Продано': { bg: 'rgba(255,59,48,0.1)', text: '#FF3B30' },
};

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('ru-RU')} ₽`;

const SalesPeriodCard = ({ title, count, revenue }: { title: string; count: number; revenue: number }) => (
  <div className="card">
    <div className="caption">{title}</div>
    <div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px' }}>{count}</div>
    <div style={{ marginTop: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>{formatCurrency(revenue)}</div>
  </div>
);

const MetricCard = ({ title, value, hint, accent }: { title: string; value: React.ReactNode; hint: string; accent?: string }) => (
  <div className="card" style={{ minHeight: '118px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
    <div className="caption">{title}</div>
    <div style={{ fontSize: '28px', fontWeight: 500, color: accent || 'var(--text-primary)' }}>{value}</div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{hint}</div>
  </div>
);

const SectionHeader = ({ title, caption }: { title: string; caption?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'end', marginBottom: '14px', flexWrap: 'wrap' }}>
    <div>
      <h2 style={{ marginBottom: '4px' }}>{title}</h2>
      {caption ? <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{caption}</p> : null}
    </div>
  </div>
);

const SalesChart = ({ trend }: { trend: Array<{ label: string; count: number; revenue: number }> }) => {
  const maxRevenue = Math.max(...trend.map(item => item.revenue), 1);

  return (
    <div className="card" style={{ marginTop: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: '4px' }}>Диаграмма продаж</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Последние 14 дней по выручке</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, minmax(0, 1fr))', gap: '8px', alignItems: 'end', height: '220px' }}>
        {trend.map(item => (
          <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
            <div title={`${item.label}: ${item.count} шт / ${formatCurrency(item.revenue)}`} style={{ borderRadius: '10px 10px 4px 4px', background: 'linear-gradient(180deg, rgba(52,199,89,0.95) 0%, rgba(52,199,89,0.25) 100%)', minHeight: '10px', height: `${Math.max((item.revenue / maxRevenue) * 100, item.revenue > 0 ? 12 : 4)}%`, transition: 'height 0.18s' }} />
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ====== DASHBOARD ======
const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const load = () => {
    api('/api/statistics').then(r => r.json()).then(d => setStats(d)).catch(() => {});
  };
  useEffect(() => { load(); socket.on('products:updated', load); return () => { socket.off('products:updated', load); }; }, []);

  const exportExcel = async () => {
    const res = await api('/api/export/statistics', { method: 'POST' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'statistics.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  const inventory = stats?.inventory || { count: 0, value: 0, soldCount: 0, soldRevenue: 0, defectCount: 0 };
  const sales = stats?.sales || { day: { count: 0, revenue: 0 }, week: { count: 0, revenue: 0 }, month: { count: 0, revenue: 0 }, all: { count: 0, revenue: 0 } };
  const trend = stats?.trend || [];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h1 style={{ margin: 0 }}>Сводка</h1>
        <button className="btn btn-primary" onClick={exportExcel}><Download size={14} /> Excel</button>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        <section>
          <SectionHeader title="Остатки и выручка" caption="Ключевые показатели по текущему состоянию склада" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
            <MetricCard title="На складе" value={inventory.count} hint={formatCurrency(inventory.value)} accent="var(--system-green)" />
            <MetricCard title="Продано всего" value={inventory.soldCount} hint={formatCurrency(inventory.soldRevenue)} accent="var(--system-red)" />
            <MetricCard title="Всего товаров" value={stats?.totalProducts || 0} hint="Вся база товаров" />
            <MetricCard title="Брак" value={inventory.defectCount} hint="Проблемные товары" accent="var(--system-orange)" />
          </div>
        </section>

        <section>
          <SectionHeader title="Статистика продаж" caption="Сравнение продаж по основным периодам" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
            <SalesPeriodCard title="За день" count={sales.day.count} revenue={sales.day.revenue} />
            <SalesPeriodCard title="За неделю" count={sales.week.count} revenue={sales.week.revenue} />
            <SalesPeriodCard title="За месяц" count={sales.month.count} revenue={sales.month.revenue} />
            <SalesPeriodCard title="За всё время" count={sales.all.count} revenue={sales.all.revenue} />
          </div>
        </section>

        {trend.length > 0 && <SalesChart trend={trend} />}

        <section>
          <SectionHeader title="Склады" caption="Остатки и движение по каждому складу" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(520px, 100%), 1fr))', gap: '18px' }}>
            {stats?.warehouseStats?.map((w: any) => (
              <div key={w.name} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 18px 12px' }}>
                  <h3 style={{ marginBottom: '6px' }}>Склад: {w.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    На складе: {w.active} | Продано: {w.sold} | Брак: {w.defect} | Стоимость: {formatCurrency(w.totalValue)}
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 400 }}>Название</th>
                      <th style={{ padding: '10px 14px', fontWeight: 400 }}>Закупка</th>
                      <th style={{ padding: '10px 14px', fontWeight: 400 }}>Продажа</th>
                      <th style={{ padding: '10px 14px', fontWeight: 400 }}>Категория</th>
                      <th style={{ padding: '10px 14px', fontWeight: 400 }}>Статус</th>
                      <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дней на складе</th>
                      <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дней до продажи</th>
                    </tr></thead>
                    <tbody>
                      {w.products.length === 0 ? <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет товаров</td></tr> :
                        w.products.map((p: any, i: number) => {
                          const c = STATUS_COLORS[p.status] || STATUS_COLORS['Склад'];
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 400 }}>{p.name}</td>
                              <td style={{ padding: '10px 14px' }}>{formatCurrency(p.purchasePrice)}</td>
                              <td style={{ padding: '10px 14px' }}>{p.salePrice !== null && p.salePrice !== undefined ? formatCurrency(p.salePrice) : '-'}</td>
                              <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.category}</td>
                              <td style={{ padding: '10px 14px' }}><span style={{ background: c.bg, color: c.text, padding: '3px 8px', borderRadius: '5px', fontSize: '12px' }}>{p.status}</span></td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>{p.daysOnStock !== null ? <span style={{ fontWeight: 500, color: p.daysOnStock > 30 ? 'var(--system-orange)' : 'var(--text-primary)' }}>{p.daysOnStock}д</span> : '-'}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>{p.daysToSell !== null ? <span style={{ fontWeight: 500, color: 'var(--system-green)' }}>{p.daysToSell}д</span> : '-'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

// ====== LAYOUT ======
const Layout = ({ children, darkMode, toggleDark, onLogout }: { children: React.ReactNode; darkMode: boolean; toggleDark: () => void; onLogout: () => void }) => (
  <div className="app-container">
    <Sidebar onLogout={onLogout} />
    <div className="main-content">
      <Header darkMode={darkMode} toggleDark={toggleDark} />
      {children}
    </div>
  </div>
);

// ====== APP ======
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('sklToken') || '');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('sklDark') === 'true');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('sklDark', String(darkMode));
  }, [darkMode]);

  useEffect(() => { socket.on('connect', () => console.log('WS ok')); return () => { socket.off('connect'); }; }, []);

  const handleLogin = (t: string) => setToken(t);
  const handleLogout = () => { localStorage.removeItem('sklToken'); setToken(''); };
  const toggleDark = () => setDarkMode(d => !d);

  if (!token) {
    return (
      <ToastProvider>
        <Login onLogin={handleLogin} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Layout darkMode={darkMode} toggleDark={toggleDark} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sold" element={<Sold />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ToastProvider>
  );
}
