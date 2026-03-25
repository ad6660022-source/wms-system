import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowRightLeft, Bell } from 'lucide-react';
import { io } from 'socket.io-client';
import Inventory from './pages/Inventory';

const socket = io('/', { transports: ['websocket'] });

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div style={{ padding: '0 12px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--system-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
          С
        </div>
        <h3 style={{ fontSize: '18px', margin: 0 }}>СКЛАД</h3>
      </div>
      
      <div className="sidebar-title">Меню</div>
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <LayoutDashboard className="icon" />
        Сводка
      </NavLink>
      <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Package className="icon" />
        Товары
      </NavLink>
      <NavLink to="/movements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <ArrowRightLeft className="icon" />
        Движение
      </NavLink>
    </div>
  );
};

const Header = () => {
  return (
    <div className="header">
      <h2 style={{ fontSize: '17px', margin: 0, fontWeight: 600 }}>СКЛАД</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
          <Bell size={20} />
        </button>
      </div>
    </div>
  );
};

const Dashboard = () => (
  <div className="page-container" style={{ paddingTop: '100px' }}>
    <h1 style={{ marginBottom: '24px' }}>Сводка</h1>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
      <div className="card">
        <div className="caption">Всего товаров</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px' }}>—</div>
      </div>
      <div className="card">
        <div className="caption">Активных</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px', color: 'var(--system-green)' }}>—</div>
      </div>
      <div className="card">
        <div className="caption">В архиве</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px', color: 'var(--system-orange)' }}>—</div>
      </div>
    </div>
  </div>
);

const Movements = () => {
  const [movements, setMovements] = useState<any[]>([]);

  const load = () => {
    fetch('/api/movements').then(r => r.json()).then(d => { if (Array.isArray(d)) setMovements(d); }).catch(console.error);
  };

  useEffect(() => {
    load();
    socket.on('products:updated', load);
    return () => { socket.off('products:updated', load); };
  }, []);

  return (
    <div className="page-container" style={{ paddingTop: '100px' }}>
      <h1 style={{ marginBottom: '24px' }}>Движение товаров</h1>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 500 }}>Товар</th>
              <th style={{ padding: '12px 16px', fontWeight: 500 }}>Куда ушел</th>
              <th style={{ padding: '12px 16px', fontWeight: 500 }}>Комментарий</th>
              <th style={{ padding: '12px 16px', fontWeight: 500 }}>Дата</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет записей</td></tr>
            ) : movements.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{m.product?.name || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{m.destination}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{m.comment || '—'}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{new Date(m.date).toLocaleDateString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        {children}
      </div>
    </div>
  );
};

export default function App() {
  useEffect(() => {
    socket.on('connect', () => console.log('Connected to WebSocket'));
    return () => { socket.off('connect'); };
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/movements" element={<Movements />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
