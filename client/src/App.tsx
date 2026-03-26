import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, PackageOpen, ShoppingBag, Users, ClipboardList, User, Download, Sun, Moon, Settings2, LogOut } from 'lucide-react';
import { io } from 'socket.io-client';
import { ToastProvider } from './components/Toast';
import { api, clearStoredToken, getStoredToken, storeToken } from './lib/api';
import { STATUS_COLORS } from './lib/status';
import Inventory from './pages/Inventory';
import Sold from './pages/Sold';
import Suppliers from './pages/Suppliers';
import Journal from './pages/Journal';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import type { AuthSuccessPayload, AuthUser } from './types/auth';

const socket = io('/', { transports: ['websocket'] });

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
const Header = ({ darkMode, toggleDark, currentUser }: { darkMode: boolean; toggleDark: () => void; currentUser: AuthUser }) => (
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
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-primary)' }}>{currentUser.fullName || currentUser.login}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>@{currentUser.login}</span>
        </div>
      </div>
    </div>
  </div>
);

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('ru-RU')} ₽`;

const SalesPeriodCard = ({ title, count, revenue }: { title: string; count: number; revenue: number }) => (
  <div className="card">
    <div className="caption">{title}</div>
    <div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px' }}>{count}</div>
    <div style={{ marginTop: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>{formatCurrency(revenue)}</div>
  </div>
);

const MetricCard = ({ title, value, hint, accent }: { title: string; value: ReactNode; hint: string; accent?: string }) => (
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

const WAREHOUSE_COLUMNS = [
  { key: 'name', label: 'Название', width: '22%', align: 'left' as const },
  { key: 'purchasePrice', label: 'Закупка', width: '14%', align: 'right' as const },
  { key: 'salePrice', label: 'Продажа', width: '14%', align: 'right' as const },
  { key: 'category', label: 'Категория', width: '16%', align: 'left' as const },
  { key: 'status', label: 'Статус', width: '10%', align: 'center' as const },
  { key: 'daysOnStock', label: 'Дней на складе', width: '12%', align: 'center' as const },
  { key: 'daysToSell', label: 'Дней до продажи', width: '12%', align: 'center' as const },
];

const WarehouseSummaryPill = ({ label, value }: { label: string; value: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', padding: '8px 12px', borderRadius: '999px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
  </div>
);

const WarehouseText = ({ children, align = 'left', muted = false, strong = false }: { children: ReactNode; align?: 'left' | 'center' | 'right'; muted?: boolean; strong?: boolean }) => (
  <span style={{ display: 'block', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: align, color: muted ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: strong ? 500 : 400 }}>
    {children}
  </span>
);

const WarehouseCard = ({ warehouse }: { warehouse: any }) => {
  const headerCellStyle = { padding: '12px 16px', fontWeight: 400 as const, fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' as const };
  const bodyCellStyle = { padding: '14px 16px', verticalAlign: 'middle' as const, borderTop: '1px solid var(--border-color)' };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ marginBottom: '4px' }}>Склад: {warehouse.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Остатки и движение по выбранному складу</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <WarehouseSummaryPill label="На складе" value={warehouse.active} />
          <WarehouseSummaryPill label="Продано" value={warehouse.sold} />
          <WarehouseSummaryPill label="Брак" value={warehouse.defect} />
          <WarehouseSummaryPill label="Стоимость" value={formatCurrency(warehouse.totalValue)} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left', fontSize: '13px' }}>
          <colgroup>
            {WAREHOUSE_COLUMNS.map(column => <col key={column.key} style={{ width: column.width }} />)}
          </colgroup>
          <thead>
            <tr style={{ background: 'var(--bg-primary)' }}>
              {WAREHOUSE_COLUMNS.map(column => (
                <th key={column.key} style={{ ...headerCellStyle, textAlign: column.align }}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {warehouse.products.length === 0 ? (
              <tr>
                <td colSpan={WAREHOUSE_COLUMNS.length} style={{ padding: '26px', textAlign: 'center', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}>
                  Нет товаров
                </td>
              </tr>
            ) : (
              warehouse.products.map((product: any, index: number) => {
                const color = STATUS_COLORS[product.status] || STATUS_COLORS['Склад'];
                return (
                  <tr key={`${warehouse.name}-${index}`} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(60,60,67,0.02)' }}>
                    <td style={bodyCellStyle}><WarehouseText strong>{product.name}</WarehouseText></td>
                    <td style={bodyCellStyle}><WarehouseText align="right">{formatCurrency(product.purchasePrice)}</WarehouseText></td>
                    <td style={bodyCellStyle}><WarehouseText align="right">{product.salePrice !== null && product.salePrice !== undefined ? formatCurrency(product.salePrice) : '-'}</WarehouseText></td>
                    <td style={bodyCellStyle}><WarehouseText muted>{product.category}</WarehouseText></td>
                    <td style={bodyCellStyle}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={{ background: color.bg, color: color.text, padding: '4px 10px', borderRadius: '999px', fontSize: '12px', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{product.status}</span>
                      </div>
                    </td>
                    <td style={bodyCellStyle}><WarehouseText align="center" strong>{product.daysOnStock !== null ? `${product.daysOnStock}д` : '-'}</WarehouseText></td>
                    <td style={bodyCellStyle}><WarehouseText align="center" strong>{product.daysToSell !== null ? `${product.daysToSell}д` : '-'}</WarehouseText></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {stats?.warehouseStats?.map((w: any) => <WarehouseCard key={w.name} warehouse={w} />)}
          </div>
        </section>
      </div>
    </div>
  );
};

// ====== LAYOUT ======
const Layout = ({ children, darkMode, toggleDark, onLogout, currentUser }: { children: ReactNode; darkMode: boolean; toggleDark: () => void; onLogout: () => void; currentUser: AuthUser }) => (
  <div className="app-container">
    <Sidebar onLogout={onLogout} />
    <div className="main-content">
      <Header darkMode={darkMode} toggleDark={toggleDark} currentUser={currentUser} />
      {children}
    </div>
  </div>
);

// ====== APP ======
export default function App() {
  const [token, setToken] = useState(getStoredToken());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(getStoredToken()));
  const [darkMode, setDarkMode] = useState(localStorage.getItem('sklDark') === 'true');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('sklDark', String(darkMode));
  }, [darkMode]);

  useEffect(() => { socket.on('connect', () => console.log('WS ok')); return () => { socket.off('connect'); }; }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      if (!token) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }
      if (!currentUser) {
        setAuthLoading(true);
      }
      try {
        const res = await api('/api/auth/me');
        if (!res.ok) {
          throw new Error('unauthorized');
        }
        const data = await res.json();
        if (!cancelled) {
          setCurrentUser(data.user);
        }
      } catch {
        clearStoredToken();
        if (!cancelled) {
          setToken('');
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    loadMe();
    return () => { cancelled = true; };
  }, [token]);

  const handleAuthSuccess = ({ token: nextToken, user, rememberMe }: AuthSuccessPayload) => {
    storeToken(nextToken, rememberMe);
    setToken(nextToken);
    setCurrentUser(user);
    setAuthLoading(false);
  };
  const handleLogout = () => {
    clearStoredToken();
    setToken('');
    setCurrentUser(null);
  };
  const toggleDark = () => setDarkMode(d => !d);

  return (
    <ToastProvider>
      <BrowserRouter>
        {authLoading ? (
          <div className="auth-page">
            <div className="auth-card" style={{ maxWidth: '420px', textAlign: 'center' }}>
              <div className="auth-brand" style={{ justifyContent: 'center' }}>
                <div className="auth-brand-icon">
                  <PackageOpen size={26} />
                </div>
              </div>
              <h1 style={{ marginBottom: '8px' }}>Подключаем кабинет</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Проверяем сессию и загружаем профиль пользователя.</p>
            </div>
          </div>
        ) : token && currentUser ? (
          <Layout darkMode={darkMode} toggleDark={toggleDark} onLogout={handleLogout} currentUser={currentUser}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/sold" element={<Sold />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/journal" element={<Journal canViewAudit={currentUser.isAdmin} />} />
              <Route path="/settings" element={<Settings currentUser={currentUser} onCurrentUserChange={(user) => setCurrentUser(user)} />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLogin={handleAuthSuccess} />} />
            <Route path="/register" element={<Register onRegister={handleAuthSuccess} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </BrowserRouter>
    </ToastProvider>
  );
}
