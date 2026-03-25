import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowRightLeft, Bell, PackageOpen } from 'lucide-react';
import { io } from 'socket.io-client';
import Inventory from './pages/Inventory';

const socket = io('/', { transports: ['websocket'] });

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div style={{ padding: '0 10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PackageOpen size={16} />
        </div>
        <span style={{ fontSize: '15px', fontWeight: 500 }}>СКЛАД</span>
      </div>
      
      <div className="sidebar-title">Меню</div>
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <LayoutDashboard className="icon" size={18} />
        Сводка
      </NavLink>
      <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Package className="icon" size={18} />
        Товары
      </NavLink>
      <NavLink to="/movements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <ArrowRightLeft className="icon" size={18} />
        Движение
      </NavLink>
    </div>
  );
};

const Header = () => {
  return (
    <div className="header">
      <span style={{ fontSize: '14px', fontWeight: 400 }}>СКЛАД</span>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'color 0.15s' }}>
        <Bell size={18} />
      </button>
    </div>
  );
};

const Dashboard = () => {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => { if (Array.isArray(d)) setProducts(d); }).catch(() => {});
    socket.on('products:updated', () => {
      fetch('/api/products').then(r => r.json()).then(d => { if (Array.isArray(d)) setProducts(d); }).catch(() => {});
    });
  }, []);

  const active = products.filter(p => p.status === 'Активен').length;
  const archive = products.filter(p => p.status === 'Архив').length;
  const defect = products.filter(p => p.status === 'Брак').length;

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '18px' }}>Сводка</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <div className="card">
          <div className="caption">Всего товаров</div>
          <div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px' }}>{products.length}</div>
        </div>
        <div className="card">
          <div className="caption">Активных</div>
          <div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px', color: 'var(--system-green)' }}>{active}</div>
        </div>
        <div className="card">
          <div className="caption">В архиве</div>
          <div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px', color: 'var(--system-orange)' }}>{archive}</div>
        </div>
        <div className="card">
          <div className="caption">Брак</div>
          <div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px', color: 'var(--system-red)' }}>{defect}</div>
        </div>
      </div>
    </div>
  );
};

const Movements = () => {
  const [movements, setMovements] = useState<any[]>([]);

  const load = () => {
    fetch('/api/movements').then(r => r.json()).then(d => { if (Array.isArray(d)) setMovements(d); }).catch(() => {});
  };

  useEffect(() => {
    load();
    socket.on('products:updated', load);
    return () => { socket.off('products:updated', load); };
  }, []);

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '18px' }}>Движение товаров</h1>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Товар</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Куда ушел</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Комментарий</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дата</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет записей</td></tr>
            ) : movements.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 400 }}>{m.productName || '—'}</td>
                <td style={{ padding: '10px 14px' }}>{m.destination}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{m.comment || '—'}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{new Date(m.date).toLocaleDateString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="app-container">
    <Sidebar />
    <div className="main-content">
      <Header />
      {children}
    </div>
  </div>
);

export default function App() {
  useEffect(() => {
    socket.on('connect', () => console.log('WS connected'));
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
