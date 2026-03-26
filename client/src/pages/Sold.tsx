import { useEffect, useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { io } from 'socket.io-client';
import { api } from '../App';
import { useToast } from '../components/Toast';

const socket = io('/', { transports: ['websocket'] });

export default function Sold() {
  const { show: toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const load = () => {
    api('/api/products').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setProducts(d.filter((p: any) => p.status === 'Продано'));
    }).catch(() => {});
  };
  useEffect(() => { load(); socket.on('products:updated', load); return () => { socket.off('products:updated', load); }; }, []);

  const handleReturn = async (id: string) => {
    if (!confirm('Вернуть товар на склад?')) return;
    const res = await api(`/api/products/${id}/return`, { method: 'POST' });
    if (res.ok) toast('Товар возвращен на склад', 'info');
    else toast('Ошибка возврата', 'error');
    load();
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.imei && p.imei.toLowerCase().includes(q)) || (p.orderNumber && p.orderNumber.toLowerCase().includes(q));
  });

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '4px' }}>Проданные товары</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '13px' }}>Здесь хранится история продаж с привязкой к номеру заказа.</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '8px 10px' }}>
          <Search size={16} color="var(--system-gray)" />
          <input type="text" placeholder="Поиск по товару, IMEI или номеру заказа..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', fontWeight: 300 }} />
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Название</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>№ заказа</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>IMEI</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Цена</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Склад</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Статус</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дата</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}></th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет проданных товаров</td></tr> :
              filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 400 }}>{p.name}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.orderNumber ? `№${p.orderNumber}` : '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>{p.imei || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>{Number(p.price).toLocaleString('ru-RU')} ₽</td>
                  <td style={{ padding: '10px 14px' }}>{p.warehouse}</td>
                  <td style={{ padding: '10px 14px' }}><span style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30', padding: '3px 8px', borderRadius: '5px', fontSize: '12px' }}>Продано</span></td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(p.updatedAt).toLocaleDateString('ru-RU')}</td>
                  <td style={{ padding: '10px 14px' }}><button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleReturn(p.id)}><RotateCcw size={12} /> Вернуть</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
