import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, ArrowUpDown, X, Pencil, Trash2, Download } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io('/', { transports: ['websocket'] });

type Product = { id: string; name: string; imei: string | null; price: number; supplier: string | null; warehouse: string; category: string; status: string; updatedAt: string; };

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Активен': { bg: 'rgba(52,199,89,0.1)', text: '#34C759' },
  'Архив': { bg: 'rgba(142,142,147,0.1)', text: '#8E8E93' },
  'Брак': { bg: 'rgba(255,59,48,0.1)', text: '#FF3B30' },
  'Продано': { bg: 'rgba(255,59,48,0.1)', text: '#FF3B30' },
};
const DESTINATIONS = ['Продан на МВИДЕО', 'Потеря', 'Брак', 'Продан Василию'];
const CATEGORIES = ['Без категории', 'Телефоны', 'Аксессуары', 'Ноутбуки', 'Планшеты', 'Другое'];

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [filterWh, setFilterWh] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [addForm, setAddForm] = useState({ name: '', imei: '', price: '', supplier: '', warehouse: 'Василий', category: 'Без категории' });
  const [editForm, setEditForm] = useState({ name: '', imei: '', price: '', supplier: '', warehouse: 'Василий', category: 'Без категории' });
  const [moveForm, setMoveForm] = useState({ destination: DESTINATIONS[0], comment: '', date: new Date().toISOString().split('T')[0] });

  const load = () => {
    fetch('/api/products').then(r => r.json()).then(d => { if (Array.isArray(d)) setProducts(d.filter((p: Product) => p.status !== 'Продано')); }).catch(() => {});
    fetch('/api/suppliers').then(r => r.json()).then(d => { if (Array.isArray(d)) setSuppliers(d); }).catch(() => {});
  };
  useEffect(() => { load(); socket.on('products:updated', load); return () => { socket.off('products:updated', load); }; }, []);

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.imei && p.imei.toLowerCase().includes(q)) || p.status.toLowerCase().includes(q);
      const matchWh = !filterWh || p.warehouse === filterWh;
      const matchCat = !filterCat || p.category === filterCat;
      return matchSearch && matchWh && matchCat;
    });
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      if (sortBy === 'price') return b.price - a.price;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [products, search, sortBy, filterWh, filterCat]);

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) });
    setAddForm({ name: '', imei: '', price: '', supplier: '', warehouse: 'Василий', category: 'Без категории' });
    setShowAdd(false); load();
  };

  const handleEdit = async () => {
    if (!selectedId) return;
    await fetch(`/api/products/${selectedId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
    setShowEdit(false); setSelectedId(null); load();
  };

  const handleDelete = async () => {
    if (!selectedId || !confirm('Удалить товар?')) return;
    await fetch(`/api/products/${selectedId}`, { method: 'DELETE' });
    setSelectedId(null); load();
  };

  const handleMove = async () => {
    if (!selectedId) return;
    await fetch(`/api/products/${selectedId}/move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(moveForm) });
    setMoveForm({ destination: DESTINATIONS[0], comment: '', date: new Date().toISOString().split('T')[0] });
    setShowMove(false); setSelectedId(null); load();
  };

  const openEdit = () => {
    const p = products.find(x => x.id === selectedId);
    if (!p) return;
    setEditForm({ name: p.name, imei: p.imei || '', price: String(p.price), supplier: p.supplier || '', warehouse: p.warehouse, category: p.category });
    setShowEdit(true);
  };

  const exportCSV = () => { window.open('/api/export/products', '_blank'); };

  const sel = selectedId ? products.find(p => p.id === selectedId) : null;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ margin: 0 }}>Товары</h1>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={exportCSV}><Download size={14} /> Экспорт</button>
          {selectedId && <button className="btn btn-secondary" onClick={openEdit}><Pencil size={14} /> Редактировать</button>}
          {selectedId && <button className="btn" style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--system-red)' }} onClick={handleDelete}><Trash2 size={14} /> Удалить</button>}
          <button className="btn" disabled={!selectedId} onClick={() => setShowMove(true)} style={{ background: selectedId ? 'var(--system-orange)' : 'var(--system-gray-5)', color: selectedId ? '#fff' : 'var(--system-gray)', cursor: selectedId ? 'pointer' : 'not-allowed', opacity: selectedId ? 1 : 0.5 }}>
            Изменить статус
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Добавить</button>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '8px 10px' }}>
          <Search size={16} color="var(--system-gray)" />
          <input type="text" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', fontWeight: 300 }} />
        </div>
        <select className="input-field" value={filterWh} onChange={e => setFilterWh(e.target.value)} style={{ padding: '8px 10px', fontSize: '13px', minWidth: '120px' }}>
          <option value="">Все склады</option>
          <option value="Василий">Василий</option>
          <option value="Анна">Анна</option>
        </select>
        <select className="input-field" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: '8px 10px', fontSize: '13px', minWidth: '140px' }}>
          <option value="">Все категории</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-secondary" onClick={() => setSortOpen(!sortOpen)}><ArrowUpDown size={14} /> Сорт.</button>
          {sortOpen && (
            <div style={{ position: 'absolute', right: 0, top: '40px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', boxShadow: 'var(--shadow-lg)', zIndex: 200, minWidth: '150px', overflow: 'hidden' }}>
              {[{ key: 'name', label: 'Название' }, { key: 'status', label: 'Статус' }, { key: 'updatedAt', label: 'Дата' }, { key: 'price', label: 'Цена' }].map(opt => (
                <button key={opt.key} onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: sortBy === opt.key ? 'var(--accent)' : 'transparent', color: sortBy === opt.key ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 400, fontFamily: 'Outfit, sans-serif' }}>
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
            <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '10px 14px', fontWeight: 400, width: '36px' }}></th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Название</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>IMEI</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Цена</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Поставщик</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Склад</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Категория</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Статус</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дата</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>Товары не найдены</td></tr> :
                filtered.map(p => {
                  const c = STATUS_COLORS[p.status] || STATUS_COLORS['Активен'];
                  const isSel = selectedId === p.id;
                  return (
                    <tr key={p.id} onClick={() => setSelectedId(isSel ? null : p.id)} style={{ borderBottom: '1px solid var(--border-color)', background: isSel ? 'rgba(52,199,89,0.05)' : 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}>
                      <td style={{ padding: '10px 14px' }}><input type="checkbox" checked={isSel} readOnly style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }} /></td>
                      <td style={{ padding: '10px 14px', fontWeight: 400 }}>{p.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>{p.imei || '-'}</td>
                      <td style={{ padding: '10px 14px' }}>{Number(p.price).toLocaleString('ru-RU')} P</td>
                      <td style={{ padding: '10px 14px' }}>{p.supplier || '-'}</td>
                      <td style={{ padding: '10px 14px' }}>{p.warehouse}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.category}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ background: c.bg, color: c.text, padding: '3px 8px', borderRadius: '5px', fontWeight: 400, fontSize: '12px' }}>{p.status}</span></td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(p.updatedAt).toLocaleDateString('ru-RU')}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add */}
      {showAdd && <Modal title="Добавить товар" onClose={() => setShowAdd(false)}>
        <FormFields form={addForm} setForm={setAddForm} suppliers={suppliers} />
        <ModalButtons onCancel={() => setShowAdd(false)} onConfirm={handleAdd} confirmLabel="Добавить" />
      </Modal>}

      {/* Modal: Edit */}
      {showEdit && <Modal title="Редактировать товар" onClose={() => setShowEdit(false)}>
        <FormFields form={editForm} setForm={setEditForm} suppliers={suppliers} />
        <ModalButtons onCancel={() => setShowEdit(false)} onConfirm={handleEdit} confirmLabel="Сохранить" />
      </Modal>}

      {/* Modal: Move */}
      {showMove && selectedId && <Modal title="Изменить статус" onClose={() => setShowMove(false)}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>{sel?.name}</p>
        <div className="input-group"><label className="input-label">Дата</label><input className="input-field" type="date" value={moveForm.date} onChange={e => setMoveForm({ ...moveForm, date: e.target.value })} /></div>
        <div className="input-group"><label className="input-label">Куда</label><select className="input-field" value={moveForm.destination} onChange={e => setMoveForm({ ...moveForm, destination: e.target.value })}>{DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
        <div className="input-group"><label className="input-label">Комментарий</label><textarea className="input-field" rows={2} value={moveForm.comment} onChange={e => setMoveForm({ ...moveForm, comment: e.target.value })} style={{ resize: 'vertical', fontFamily: 'Outfit, sans-serif' }} /></div>
        <ModalButtons onCancel={() => setShowMove(false)} onConfirm={handleMove} confirmLabel="Подтвердить" />
      </Modal>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
        <h2 style={{ margin: '0 0 16px' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function FormFields({ form, setForm, suppliers }: { form: any; setForm: (f: any) => void; suppliers: any[] }) {
  return <>
    <div className="input-group"><label className="input-label">Название</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
    <div className="input-group"><label className="input-label">IMEI</label><input className="input-field" value={form.imei} onChange={e => setForm({ ...form, imei: e.target.value })} /></div>
    <div className="input-group"><label className="input-label">Цена</label><input className="input-field" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
    <div className="input-group"><label className="input-label">Поставщик</label>
      <select className="input-field" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}>
        <option value="">-- выбрать --</option>
        {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
      </select>
    </div>
    <div className="input-group"><label className="input-label">Склад</label><select className="input-field" value={form.warehouse} onChange={e => setForm({ ...form, warehouse: e.target.value })}><option value="Василий">Василий</option><option value="Анна">Анна</option></select></div>
    <div className="input-group"><label className="input-label">Категория</label><select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{['Без категории', 'Телефоны', 'Аксессуары', 'Ноутбуки', 'Планшеты', 'Другое'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
  </>;
}

function ModalButtons({ onCancel, onConfirm, confirmLabel }: { onCancel: () => void; onConfirm: () => void; confirmLabel: string }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
      <button className="btn" onClick={onCancel} style={{ flex: 1, background: 'rgba(255,59,48,0.08)', color: 'var(--system-red)' }}>Отмена</button>
      <button className="btn" onClick={onConfirm} style={{ flex: 1, background: 'var(--accent)', color: '#fff' }}>{confirmLabel}</button>
    </div>
  );
}
