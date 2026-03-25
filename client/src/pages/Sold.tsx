import { useEffect, useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io('/', { transports: ['websocket'] });

type Product = {
  id: string;
  name: string;
  imei: string | null;
  price: number;
  supplier: string | null;
  warehouse: string;
  status: string;
  updatedAt: string;
};

export default function Sold() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOpen, setSortOpen] = useState(false);

  const load = () => {
    fetch('/api/products').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setProducts(d.filter((p: Product) => p.status === 'Продано'));
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    socket.on('products:updated', load);
    return () => { socket.off('products:updated', load); };
  }, []);

  const filtered = (() => {
    let list = products.filter(p => {
      const q = search.toLowerCase();
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.imei && p.imei.toLowerCase().includes(q));
    });
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return b.price - a.price;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  })();

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '16px' }}>Проданное</h1>

      {/* Search + Sort */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '8px 10px' }}>
          <Search size={16} color="var(--system-gray)" />
          <input
            type="text" placeholder="Поиск по названию или IMEI..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-secondary" onClick={() => setSortOpen(!sortOpen)}>
            <ArrowUpDown size={14} /> Сортировка
          </button>
          {sortOpen && (
            <div style={{ position: 'absolute', right: 0, top: '40px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', boxShadow: 'var(--shadow-lg)', zIndex: 200, minWidth: '160px', overflow: 'hidden' }}>
              {[
                { key: 'name', label: 'По названию' },
                { key: 'updatedAt', label: 'По дате' },
                { key: 'price', label: 'По цене' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: sortBy === opt.key ? 'var(--accent)' : 'transparent', color: sortBy === opt.key ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 400, fontFamily: 'Outfit, sans-serif', transition: 'background 0.15s' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px', fontWeight: 400 }}>Название</th>
                <th style={{ padding: '10px 14px', fontWeight: 400 }}>IMEI</th>
                <th style={{ padding: '10px 14px', fontWeight: 400 }}>Цена</th>
                <th style={{ padding: '10px 14px', fontWeight: 400 }}>Поставщик</th>
                <th style={{ padding: '10px 14px', fontWeight: 400 }}>Склад</th>
                <th style={{ padding: '10px 14px', fontWeight: 400 }}>Статус</th>
                <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дата</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '36px 14px', textAlign: 'center', color: 'var(--text-secondary)' }}>Проданных товаров нет</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 400 }}>{p.name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>{p.imei || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 400 }}>{Number(p.price).toLocaleString('ru-RU')} ₽</td>
                    <td style={{ padding: '10px 14px' }}>{p.supplier || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{p.warehouse}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', padding: '3px 8px', borderRadius: '5px', fontWeight: 400, fontSize: '12px' }}>Продано</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(p.updatedAt).toLocaleDateString('ru-RU')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
