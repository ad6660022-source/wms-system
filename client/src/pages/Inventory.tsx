import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, ArrowUpDown, X } from 'lucide-react';
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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Активен': { bg: 'rgba(52, 199, 89, 0.12)', text: '#34C759' },
  'Архив': { bg: 'rgba(142, 142, 147, 0.12)', text: '#8E8E93' },
  'Брак': { bg: 'rgba(255, 59, 48, 0.12)', text: '#FF3B30' },
};

const DESTINATIONS = [
  'Продан на МВИДЕО',
  'Потеря',
  'Брак',
  'Продан Василию',
];

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMove, setShowMove] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({ name: '', imei: '', price: '', supplier: '', warehouse: 'Василий' });

  // Move form state
  const [moveForm, setMoveForm] = useState({ destination: DESTINATIONS[0], comment: '', date: new Date().toISOString().split('T')[0] });

  const loadProducts = () => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setProducts(d); })
      .catch(console.error);
  };

  useEffect(() => {
    loadProducts();
    socket.on('products:updated', loadProducts);
    return () => { socket.off('products:updated', loadProducts); };
  }, []);

  // Filter + Sort
  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.imei && p.imei.toLowerCase().includes(q)) ||
        p.status.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      if (sortBy === 'price') return b.price - a.price;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return list;
  }, [products, search, sortBy]);

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm)
    });
    setAddForm({ name: '', imei: '', price: '', supplier: '', warehouse: 'Василий' });
    setShowAdd(false);
    loadProducts();
  };

  const handleMove = async () => {
    if (!selectedId) return;
    await fetch(`/api/products/${selectedId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moveForm)
    });
    setMoveForm({ destination: DESTINATIONS[0], comment: '', date: new Date().toISOString().split('T')[0] });
    setShowMove(false);
    setSelectedId(null);
    loadProducts();
  };

  return (
    <div className="page-container" style={{ paddingTop: '100px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0 }}>Товары</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn"
            disabled={!selectedId}
            onClick={() => { setShowMove(true); }}
            style={{
              background: selectedId ? 'var(--system-red)' : 'var(--system-gray-5)',
              color: selectedId ? '#fff' : 'var(--system-gray)',
              cursor: selectedId ? 'pointer' : 'not-allowed',
              opacity: selectedId ? 1 : 0.6,
            }}
          >
            ✏️ Изменить
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={18} /> Добавить товар
          </button>
        </div>
      </div>

      {/* Search + Sort Row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '10px 14px' }}>
          <Search size={18} color="var(--system-gray)" />
          <input
            type="text"
            placeholder="Поиск по названию, IMEI или статусу..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '15px', color: 'var(--text-primary)' }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-secondary" onClick={() => setSortOpen(!sortOpen)}>
            <ArrowUpDown size={16} /> Сортировка
          </button>
          {sortOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '48px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 200, minWidth: '180px', overflow: 'hidden'
            }}>
              {[
                { key: 'name', label: 'По названию' },
                { key: 'status', label: 'По статусу' },
                { key: 'updatedAt', label: 'По дате изменения' },
                { key: 'price', label: 'По цене' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none',
                    background: sortBy === opt.key ? 'var(--system-blue)' : 'transparent',
                    color: sortBy === opt.key ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer', fontSize: '14px', fontWeight: 500,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 500, width: '40px' }}></th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Название</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>IMEI</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Цена</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Поставщик</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Склад</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Статус</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Дата изменения</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Товары не найдены
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const colors = STATUS_COLORS[p.status] || STATUS_COLORS['Активен'];
                  const isSelected = selectedId === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(isSelected ? null : p.id)}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(0, 122, 255, 0.06)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => setSelectedId(isSelected ? null : p.id)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--system-blue)', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '14px', fontFamily: 'monospace' }}>{p.imei || '—'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{Number(p.price).toLocaleString('ru-RU')} ₽</td>
                      <td style={{ padding: '12px 16px' }}>{p.supplier || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>{p.warehouse}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: colors.bg, color: colors.text,
                          padding: '4px 10px', borderRadius: '6px', fontWeight: 600, fontSize: '13px'
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {new Date(p.updatedAt).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL: Add Product ===== */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', position: 'relative' }}>
            <button onClick={() => setShowAdd(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
            <h2 style={{ margin: '0 0 24px' }}>Добавить товар</h2>

            <div className="input-group">
              <label className="input-label">Название *</label>
              <input className="input-field" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="iPhone 15 Pro Max" />
            </div>
            <div className="input-group">
              <label className="input-label">IMEI</label>
              <input className="input-field" value={addForm.imei} onChange={e => setAddForm({ ...addForm, imei: e.target.value })} placeholder="356938035643809" />
            </div>
            <div className="input-group">
              <label className="input-label">Цена</label>
              <input className="input-field" type="number" value={addForm.price} onChange={e => setAddForm({ ...addForm, price: e.target.value })} placeholder="0" />
            </div>
            <div className="input-group">
              <label className="input-label">Поставщик</label>
              <input className="input-field" value={addForm.supplier} onChange={e => setAddForm({ ...addForm, supplier: e.target.value })} placeholder="ООО Рога и Копыта" />
            </div>
            <div className="input-group">
              <label className="input-label">Склад (чей)</label>
              <select className="input-field" value={addForm.warehouse} onChange={e => setAddForm({ ...addForm, warehouse: e.target.value })}>
                <option value="Василий">Василий</option>
                <option value="Анна">Анна</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn" onClick={() => setShowAdd(false)} style={{ flex: 1, background: 'rgba(255,59,48,0.1)', color: 'var(--system-red)' }}>
                ❌ Отмена
              </button>
              <button className="btn" onClick={handleAdd} style={{ flex: 1, background: 'var(--system-green)', color: '#fff' }}>
                ✅ Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Move / Change Status ===== */}
      {showMove && selectedId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', position: 'relative' }}>
            <button onClick={() => setShowMove(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
            <h2 style={{ margin: '0 0 8px' }}>Изменить товар</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              {products.find(p => p.id === selectedId)?.name}
            </p>

            <div className="input-group">
              <label className="input-label">Дата ухода товара</label>
              <input className="input-field" type="date" value={moveForm.date} onChange={e => setMoveForm({ ...moveForm, date: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Куда ушел товар</label>
              <select className="input-field" value={moveForm.destination} onChange={e => setMoveForm({ ...moveForm, destination: e.target.value })}>
                {DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Комментарий (необязательно)</label>
              <textarea
                className="input-field"
                rows={3}
                value={moveForm.comment}
                onChange={e => setMoveForm({ ...moveForm, comment: e.target.value })}
                placeholder="Дополнительная информация..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn" onClick={() => setShowMove(false)} style={{ flex: 1, background: 'rgba(255,59,48,0.1)', color: 'var(--system-red)' }}>
                ❌ Отмена
              </button>
              <button className="btn" onClick={handleMove} style={{ flex: 1, background: 'var(--system-green)', color: '#fff' }}>
                ✅ Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
