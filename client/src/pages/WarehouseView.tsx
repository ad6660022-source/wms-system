import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io('/', { transports: ['websocket'] });

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Активен': { bg: 'rgba(52,199,89,0.1)', text: '#34C759' },
  'Архив': { bg: 'rgba(142,142,147,0.1)', text: '#8E8E93' },
  'Брак': { bg: 'rgba(255,59,48,0.1)', text: '#FF3B30' },
  'Продано': { bg: 'rgba(255,59,48,0.1)', text: '#FF3B30' },
};

export default function WarehouseView() {
  const { name } = useParams<{ name: string }>();
  const warehouseName = decodeURIComponent(name || '');
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const load = () => {
    fetch('/api/products').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setProducts(d.filter((p: any) => p.warehouse === warehouseName));
    }).catch(() => {});
  };
  useEffect(() => { load(); socket.on('products:updated', load); return () => { socket.off('products:updated', load); }; }, [warehouseName]);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.imei && p.imei.toLowerCase().includes(q));
  });

  const totalValue = filtered.filter((p: any) => p.status === 'Активен').reduce((s: number, p: any) => s + p.price, 0);

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '4px' }}>Склад: {warehouseName}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '13px' }}>
        Товаров: {filtered.length} | Стоимость активных: {totalValue.toLocaleString('ru-RU')} P
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '8px 10px' }}>
          <Search size={16} color="var(--system-gray)" />
          <input type="text" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', fontWeight: 300 }} />
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Название</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>IMEI</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Цена</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Категория</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Статус</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дата</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет товаров на этом складе</td></tr> :
              filtered.map(p => {
                const c = STATUS_COLORS[p.status] || STATUS_COLORS['Активен'];
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 400 }}>{p.name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>{p.imei || '-'}</td>
                    <td style={{ padding: '10px 14px' }}>{Number(p.price).toLocaleString('ru-RU')} P</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.category}</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ background: c.bg, color: c.text, padding: '3px 8px', borderRadius: '5px', fontSize: '12px' }}>{p.status}</span></td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(p.updatedAt).toLocaleDateString('ru-RU')}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
