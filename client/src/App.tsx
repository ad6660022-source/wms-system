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
  'Активен': { bg: 'rgba(52,199,89,0.1)', text: '#34C759' },
  'Архив': { bg: 'rgba(142,142,147,0.1)', text: '#8E8E93' },
  'Брак': { bg: 'rgba(255,59,48,0.1)', text: '#FF3B30' },
  'Продано': { bg: 'rgba(255,59,48,0.1)', text: '#FF3B30' },
};

// ====== DASHBOARD ======
const Dashboard = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const load = () => {
    api('/api/products').then(r => r.json()).then(d => { if (Array.isArray(d)) setProducts(d); }).catch(() => {});
    api('/api/statistics').then(r => r.json()).then(d => setStats(d)).catch(() => {});
  };
  useEffect(() => { load(); socket.on('products:updated', load); return () => { socket.off('products:updated', load); }; }, []);

  const active = products.filter(p => p.status === 'Активен');
  const sold = products.filter(p => p.status === 'Продано');
  const totalValue = active.reduce((s, p) => s + p.price, 0);
  const soldValue = sold.reduce((s, p) => s + p.price, 0);

  const exportExcel = async () => {
    const res = await api('/api/export/statistics', { method: 'POST' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'statistics.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h1 style={{ margin: 0 }}>Сводка</h1>
        <button className="btn btn-primary" onClick={exportExcel}><Download size={14} /> Excel</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
        <div className="card"><div className="caption">Всего</div><div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px' }}>{products.length}</div></div>
        <div className="card"><div className="caption">Активных</div><div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px', color: 'var(--system-green)' }}>{active.length}</div></div>
        <div className="card"><div className="caption">Продано</div><div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px', color: 'var(--system-red)' }}>{sold.length}</div></div>
        <div className="card"><div className="caption">Брак</div><div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px', color: 'var(--system-orange)' }}>{products.filter(p => p.status === 'Брак').length}</div></div>
      </div>

      <h2 style={{ marginTop: '28px', marginBottom: '14px' }}>Финансы</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="card"><div className="caption">На складе</div><div style={{ fontSize: '22px', fontWeight: 500, marginTop: '6px' }}>{totalValue.toLocaleString('ru-RU')} ₽</div></div>
        <div className="card"><div className="caption">Сумма продаж</div><div style={{ fontSize: '22px', fontWeight: 500, marginTop: '6px', color: 'var(--system-green)' }}>{soldValue.toLocaleString('ru-RU')} ₽</div></div>
      </div>

      {stats?.warehouseStats?.map((w: any) => (
        <div key={w.name} style={{ marginTop: '28px' }}>
          <h2 style={{ marginBottom: '6px' }}>Склад: {w.name}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '14px', fontSize: '13px' }}>
            Активных: {w.active} | Продано: {w.sold} | Брак: {w.defect} | Стоимость: {w.totalValue.toLocaleString('ru-RU')} ₽
          </p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Название</th>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Цена</th>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Категория</th>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Статус</th>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дней на складе</th>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дней до продажи</th>
                </tr></thead>
                <tbody>
                  {w.products.length === 0 ? <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет товаров</td></tr> :
                    w.products.map((p: any, i: number) => {
                      const c = STATUS_COLORS[p.status] || STATUS_COLORS['Активен'];
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 400 }}>{p.name}</td>
                          <td style={{ padding: '10px 14px' }}>{Number(p.price).toLocaleString('ru-RU')} ₽</td>
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
        </div>
      ))}
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
