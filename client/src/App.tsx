import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Building2, ArrowRightLeft, FileText, Bell } from 'lucide-react';
import { io } from 'socket.io-client';
import Inventory from './pages/Inventory';
import Warehouses from './pages/Warehouses';

const socket = io('/', { transports: ['websocket'] });

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div style={{ padding: '0 12px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--system-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          W
        </div>
        <h3 style={{ fontSize: '18px', margin: 0 }}>WMS Pro</h3>
      </div>
      
      <div className="sidebar-title">Main</div>
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <LayoutDashboard className="icon" />
        Dashboard
      </NavLink>
      <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Package className="icon" />
        Товары
      </NavLink>
      <NavLink to="/warehouses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Building2 className="icon" />
        Склады
      </NavLink>
      <NavLink to="/movements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <ArrowRightLeft className="icon" />
        Движение
      </NavLink>
      <NavLink to="/documents" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <FileText className="icon" />
        Документы
      </NavLink>
    </div>
  );
};

const Header = () => {
  return (
    <div className="header">
      <h2 style={{ fontSize: '17px', margin: 0, fontWeight: 600 }}>Обзор</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
          <Bell size={20} />
        </button>
        <div style={{ width: '36px', height: '36px', borderRadius: '18px', background: 'var(--system-gray-5)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <img src="https://ui-avatars.com/api/?name=Admin+User&background=random" alt="User" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );
};

// Placeholder Pages
const Dashboard = () => (
  <div className="page-container">
    <h1 style={{ marginBottom: '24px' }}>Сводка</h1>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
      <div className="card">
        <div className="caption">Всего товаров</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px' }}>12,450</div>
      </div>
      <div className="card">
        <div className="caption">Ожидают приемки</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px', color: 'var(--system-orange)' }}>85</div>
      </div>
      <div className="card">
        <div className="caption">Складов</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px' }}>4</div>
      </div>
    </div>
  </div>
);

const Movements = () => <div className="page-container" style={{ paddingTop: '100px' }}><h1>Движение</h1></div>;
const Documents = () => <div className="page-container" style={{ paddingTop: '100px' }}><h1>Документы</h1></div>;

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
          <Route path="/warehouses" element={<Warehouses />} />
          <Route path="/movements" element={<Movements />} />
          <Route path="/documents" element={<Documents />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
