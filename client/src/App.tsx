import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowRightLeft, Bell, PackageOpen, ShoppingBag, ChevronDown, ChevronRight, Warehouse, Users, ClipboardList } from 'lucide-react';
import { io } from 'socket.io-client';
import Inventory from './pages/Inventory';
import Sold from './pages/Sold';
import Suppliers from './pages/Suppliers';
import AuditLog from './pages/AuditLog';
import WarehouseView from './pages/WarehouseView';

const socket = io('/', { transports: ['websocket'] });

const WAREHOUSES = ['Василий', 'Анна'];

const Sidebar = () => {
  const [whOpen, setWhOpen] = useState(false);
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
        <LayoutDashboard className="icon" size={18} /> Сводка
      </NavLink>
      <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Package className="icon" size={18} /> Товары
      </NavLink>
      <NavLink to="/sold" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <ShoppingBag className="icon" size={18} /> Проданное
      </NavLink>

      {/* Expandable Склады */}
      <button onClick={() => setWhOpen(!whOpen)} className="nav-item" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Warehouse className="icon" size={18} /> Склады
        </span>
        {whOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {whOpen && WAREHOUSES.map(w => (
        <NavLink key={w} to={`/warehouse/${encodeURIComponent(w)}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ paddingLeft: '38px', fontSize: '13px' }}>
          {w}
        </NavLink>
      ))}

      <NavLink to="/movements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <ArrowRightLeft className="icon" size={18} /> Движение
      </NavLink>
      <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Users className="icon" size={18} /> Поставщики
      </NavLink>
      <NavLink to="/audit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <ClipboardList className="icon" size={18} /> Журнал
      </NavLink>
    </div>
  );
};

const Header = () => (
  <div className="header">
    <span style={{ fontSize: '14px', fontWeight: 400 }}>СКЛАД</span>
    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
      <Bell size={18} />
    </button>
  </div>
);

const Dashboard = () => {
  const [products, setProducts] = useState<any[]>([]);
  const load = () => { fetch('/api/products').then(r => r.json()).then(d => { if (Array.isArray(d)) setProducts(d); }).catch(() => {}); };
  useEffect(() => { load(); socket.on('products:updated', load); return () => { socket.off('products:updated', load); }; }, []);

  const active = products.filter(p => p.status === 'Активен');
  const sold = products.filter(p => p.status === 'Продано');
  const totalValue = active.reduce((s, p) => s + p.price, 0);
  const soldValue = sold.reduce((s, p) => s + p.price, 0);

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '18px' }}>Сводка</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        <div className="card"><div className="caption">Всего товаров</div><div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px' }}>{products.length}</div></div>
        <div className="card"><div className="caption">Активных</div><div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px', color: 'var(--system-green)' }}>{active.length}</div></div>
        <div className="card"><div className="caption">Продано</div><div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px', color: 'var(--system-red)' }}>{sold.length}</div></div>
        <div className="card"><div className="caption">Брак</div><div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px', color: 'var(--system-orange)' }}>{products.filter(p => p.status === 'Брак').length}</div></div>
      </div>
      <h2 style={{ marginTop: '28px', marginBottom: '14px' }}>Финансы</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="card"><div className="caption">Стоимость на складе</div><div style={{ fontSize: '22px', fontWeight: 500, marginTop: '6px' }}>{totalValue.toLocaleString('ru-RU')} P</div></div>
        <div className="card"><div className="caption">Сумма продаж</div><div style={{ fontSize: '22px', fontWeight: 500, marginTop: '6px', color: 'var(--system-green)' }}>{soldValue.toLocaleString('ru-RU')} P</div></div>
      </div>
      <h2 style={{ marginTop: '28px', marginBottom: '14px' }}>По складам</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {WAREHOUSES.map(w => {
          const count = active.filter(p => p.warehouse === w).length;
          const val = active.filter(p => p.warehouse === w).reduce((s, p) => s + p.price, 0);
          return (
            <div className="card" key={w}>
              <div className="caption">{w}</div>
              <div style={{ fontSize: '22px', fontWeight: 500, marginTop: '6px' }}>{count} шт</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{val.toLocaleString('ru-RU')} P</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Movements = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const load = () => { fetch('/api/movements').then(r => r.json()).then(d => { if (Array.isArray(d)) setMovements(d); }).catch(() => {}); };
  useEffect(() => { load(); socket.on('products:updated', load); return () => { socket.off('products:updated', load); }; }, []);
  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '18px' }}>Движение товаров</h1>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Товар</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Куда</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Комментарий</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дата</th>
          </tr></thead>
          <tbody>
            {movements.length === 0 ? <tr><td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет записей</td></tr> :
              movements.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 400 }}>{m.productName || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>{m.destination}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{m.comment || '-'}</td>
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
  <div className="app-container"><Sidebar /><div className="main-content"><Header />{children}</div></div>
);

export default function App() {
  useEffect(() => { socket.on('connect', () => console.log('WS ok')); return () => { socket.off('connect'); }; }, []);
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sold" element={<Sold />} />
          <Route path="/warehouse/:name" element={<WarehouseView />} />
          <Route path="/movements" element={<Movements />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/audit" element={<AuditLog />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
