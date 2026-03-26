import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Plus, Search, ArrowUpDown, X, Pencil, Trash2, Download } from 'lucide-react';
import { io } from 'socket.io-client';
import { useToast } from '../components/Toast';
import { api, readApiError } from '../lib/api';
import { STATUS_COLORS } from '../lib/status';

const socket = io('/', { transports: ['websocket'] });

type Product = {
  id: string;
  name: string;
  imei: string | null;
  price: number;
  salePrice?: number | null;
  supplier: string | null;
  warehouse: string;
  category: string;
  status: string;
  orderNumber?: string | null;
  createdAt?: string;
  updatedAt: string;
};

const DESTINATIONS = ['Продан', 'Продан на МВИДЕО', 'Потеря', 'Брак'];
const isSoldDestination = (destination: string) => destination.startsWith('Продан');
const isSoldStatus = (status: string) => status === 'Продан' || status === 'Продано';
const formatCurrency = (value: number | string | null | undefined) => `${Number(value || 0).toLocaleString('ru-RU')} ₽`;

export default function Inventory() {
  const { show: toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>(['Василий', 'Анна']);
  const [categories, setCategories] = useState<string[]>(['Без категории', 'Телефоны', 'Аксессуары', 'Ноутбуки', 'Планшеты', 'Другое']);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [filterWh, setFilterWh] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [addForm, setAddForm] = useState({ name: '', imei: '', price: '', salePrice: '', supplier: '', warehouse: '', category: '' });
  const [editForm, setEditForm] = useState({ name: '', imei: '', price: '', salePrice: '', supplier: '', warehouse: '', category: '' });
  const [moveForm, setMoveForm] = useState({ destination: DESTINATIONS[0], orderNumber: '', salePrice: '', comment: '', date: new Date().toISOString().split('T')[0] });

  const load = () => {
    api('/api/products').then(r => r.json()).then(d => { if (Array.isArray(d)) setProducts(d.filter((p: Product) => !isSoldStatus(p.status))); }).catch(() => {});
    api('/api/suppliers').then(r => r.json()).then(d => { if (Array.isArray(d)) setSuppliers(d); }).catch(() => {});
    api('/api/warehouses').then(r => r.json()).then(d => { if (Array.isArray(d)) { const ws = d.map((w:any)=>w.name); setWarehouses(ws); if(!addForm.warehouse) setAddForm(f=>({...f, warehouse: ws[0]||''})); } }).catch(() => {});
    api('/api/categories').then(r => r.json()).then(d => { if (Array.isArray(d)) { const cs = d.map((c:any)=>c.name); setCategories(cs); if(!addForm.category) setAddForm(f=>({...f, category: cs[0]||''})); } }).catch(() => {});
  };
  useEffect(() => { load(); socket.on('products:updated', load); socket.on('settings:updated', load); return () => { socket.off('products:updated', load); socket.off('settings:updated', load); }; }, []);

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || [
        p.name,
        p.imei,
        p.status,
        p.supplier,
        p.warehouse,
        p.category,
        String(p.price ?? ''),
        String(p.salePrice ?? ''),
        new Date(p.updatedAt).toLocaleDateString('ru-RU'),
        p.updatedAt,
      ].some(value => value && String(value).toLowerCase().includes(q));
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

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const hasSelection = selectedIds.size > 0;
  const totalSelectedValue = Array.from(selectedIds).reduce((sum, id) => { const p = products.find(x => x.id === id); return sum + (p ? p.price : 0); }, 0);

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    const res = await api('/api/products', { method: 'POST', body: JSON.stringify(addForm) });
    if (res.ok) { toast('Товар добавлен'); setAddForm({ ...addForm, name: '', imei: '', price: '', salePrice: '' }); setShowAdd(false); load(); } else toast(await readApiError(res, 'Ошибка'), 'error');
  };

  const handleEdit = async () => {
    const id = Array.from(selectedIds)[0];
    if (!id) return;
    const res = await api(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(editForm) });
    if (res.ok) { toast('Товар сохранён'); setShowEdit(false); setSelectedIds(new Set()); load(); } else toast(await readApiError(res, 'Ошибка'), 'error');
  };

  const handleDelete = async () => {
    if (!hasSelection || !confirm(`Удалить ${selectedIds.size} товар(ов)?`)) return;
    for (const id of selectedIds) {
      const res = await api(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast(await readApiError(res, 'Ошибка удаления'), 'error');
        load();
        return;
      }
    }
    toast(`Удалено ${selectedIds.size} шт`, 'info');
    setSelectedIds(new Set()); load();
  };

  const handleMove = async () => {
    if (!hasSelection) return;
    if (isSoldDestination(moveForm.destination) && !moveForm.orderNumber.trim()) {
      toast('Укажите номер заказа', 'error');
      return;
    }
    const res = await api('/api/products/bulk-move', {
      method: 'POST', body: JSON.stringify({ ids: Array.from(selectedIds), ...moveForm })
    });
    if (res.ok) { toast('Статус изменён'); setMoveForm({ destination: DESTINATIONS[0], orderNumber: '', salePrice: '', comment: '', date: new Date().toISOString().split('T')[0] }); setShowMove(false); setSelectedIds(new Set()); load(); } else toast(await readApiError(res, 'Ошибка'), 'error');
  };

  const openEdit = () => {
    const id = Array.from(selectedIds)[0];
    const p = products.find(x => x.id === id);
    if (!p) return;
    setEditForm({ name: p.name, imei: p.imei || '', price: String(p.price), salePrice: p.salePrice !== null && p.salePrice !== undefined ? String(p.salePrice) : '', supplier: p.supplier || '', warehouse: p.warehouse, category: p.category });
    setShowEdit(true);
  };

  const openMove = () => {
    if (!hasSelection) return;
    const firstProduct = products.find(product => product.id === Array.from(selectedIds)[0]);
    setMoveForm({
      destination: DESTINATIONS[0],
      orderNumber: '',
      salePrice: firstProduct?.salePrice !== null && firstProduct?.salePrice !== undefined ? String(firstProduct.salePrice) : '',
      comment: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowMove(true);
  };

  const exportExcel = async (onlySelected: boolean) => {
    const ids = onlySelected ? Array.from(selectedIds) : [];
    const res = await api('/api/export/excel', { method: 'POST', body: JSON.stringify({ ids }) });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'products.xlsx'; a.click();
      URL.revokeObjectURL(url);
      toast('Excel выгружен');
    } else toast('Ошибка выгрузки', 'error');
  };

  const downloadTemplate = async () => {
    const res = await api('/api/export/import-template');
    if (!res.ok) {
      toast(await readApiError(res, 'Ошибка шаблона'), 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    toast('Шаблон выгружен');
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });

    const res = await api('/api/import/excel', { method: 'POST', body: JSON.stringify({ fileBase64 }) });
    if (!res.ok) {
      toast(await readApiError(res, 'Ошибка импорта'), 'error');
      event.target.value = '';
      return;
    }
    const data = await res.json();
    const errors = Array.isArray(data?.errors) ? data.errors : [];
    toast(
      errors.length
        ? `Импортировано: ${data?.importedCount || 0}. Ошибок: ${errors.length}. ${errors[0]}`
        : `Импортировано: ${data?.importedCount || 0}${data?.skippedCount ? `, пропущено: ${data.skippedCount}` : ''}`,
      errors.length ? 'info' : 'success'
    );
    if (errors.length) {
      console.warn('Excel import errors', errors);
    }
    load();
    event.target.value = '';
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ margin: 0 }}>Товары {hasSelection && <span style={{ fontSize: '14px', fontWeight: 300, color: 'var(--text-secondary)' }}>({selectedIds.size} выбрано — {totalSelectedValue.toLocaleString('ru-RU')} ₽)</span>}</h1>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} style={{ display: 'none' }} />
          <button className="btn btn-secondary" onClick={downloadTemplate}><Download size={14} /> Шаблон</button>
          <button className="btn btn-secondary" onClick={handleImportClick}><Download size={14} /> Импорт Excel</button>
          <button className="btn btn-secondary" onClick={() => exportExcel(false)}><Download size={14} /> Все Excel</button>
          {hasSelection && <button className="btn btn-secondary" onClick={() => exportExcel(true)}><Download size={14} /> Выбранные</button>}
          {selectedIds.size === 1 && <button className="btn btn-secondary" onClick={openEdit}><Pencil size={14} /> Редактировать</button>}
          {hasSelection && <button className="btn" style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--system-red)' }} onClick={handleDelete}><Trash2 size={14} /> Удалить</button>}
          <button className="btn" disabled={!hasSelection} onClick={openMove} style={{ background: hasSelection ? 'var(--system-orange)' : 'var(--system-gray-5)', color: hasSelection ? '#fff' : 'var(--system-gray)', cursor: hasSelection ? 'pointer' : 'not-allowed', opacity: hasSelection ? 1 : 0.5 }}>
            Изменить статус
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Добавить</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '8px 10px' }}>
          <Search size={16} color="var(--system-gray)" />
          <input type="text" placeholder="Поиск: название, IMEI, цена, поставщик, склад, статус, дата..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', fontWeight: 300 }} />
        </div>
        <select className="input-field" value={filterWh} onChange={e => setFilterWh(e.target.value)} style={{ padding: '8px 10px', fontSize: '13px', minWidth: '120px' }}>
          <option value="">Все склады</option>
          {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <select className="input-field" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: '8px 10px', fontSize: '13px', minWidth: '140px' }}>
          <option value="">Все категории</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-secondary" onClick={() => setSortOpen(!sortOpen)}><ArrowUpDown size={14} /> Сорт.</button>
          {sortOpen && (
            <div style={{ position: 'absolute', right: 0, top: '40px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', boxShadow: 'var(--shadow-lg)', zIndex: 200, minWidth: '150px', overflow: 'hidden' }}>
              {[{ key: 'name', label: 'Название' }, { key: 'status', label: 'Статус' }, { key: 'updatedAt', label: 'Дата' }, { key: 'price', label: 'Закупка' }].map(opt => (
                <button key={opt.key} onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: sortBy === opt.key ? 'var(--accent)' : 'transparent', color: sortBy === opt.key ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 400, fontFamily: 'Outfit, sans-serif' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '10px 14px', fontWeight: 400, width: '36px' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }} />
              </th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Название</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>IMEI</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Закупка</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Продажа</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Поставщик</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Склад</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Категория</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Статус</th>
              <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дата</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>Товары не найдены</td></tr> :
                filtered.map(p => {
                  const c = STATUS_COLORS[p.status] || STATUS_COLORS['Склад'];
                  const isSel = selectedIds.has(p.id);
                  return (
                    <tr key={p.id} onClick={() => toggleSelect(p.id)} style={{ borderBottom: '1px solid var(--border-color)', background: isSel ? 'rgba(52,199,89,0.05)' : 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}>
                      <td style={{ padding: '10px 14px' }}><input type="checkbox" checked={isSel} readOnly style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }} /></td>
                      <td style={{ padding: '10px 14px', fontWeight: 400 }}>{p.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>{p.imei || '-'}</td>
                      <td style={{ padding: '10px 14px' }}>{formatCurrency(p.price)}</td>
                      <td style={{ padding: '10px 14px' }}>{p.salePrice !== null && p.salePrice !== undefined ? formatCurrency(p.salePrice) : '-'}</td>
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

      {showAdd && <Modal title="Добавить товар" onClose={() => setShowAdd(false)}>
        <FormFields form={addForm} setForm={setAddForm} suppliers={suppliers} warehouses={warehouses} categories={categories} />
        <ModalButtons onCancel={() => setShowAdd(false)} onConfirm={handleAdd} confirmLabel="Добавить" />
      </Modal>}

      {showEdit && <Modal title="Редактировать товар" onClose={() => setShowEdit(false)}>
        <FormFields form={editForm} setForm={setEditForm} suppliers={suppliers} warehouses={warehouses} categories={categories} />
        <ModalButtons onCancel={() => setShowEdit(false)} onConfirm={handleEdit} confirmLabel="Сохранить" />
      </Modal>}

      {showMove && hasSelection && <Modal title={`Изменить статус (${selectedIds.size} шт)`} onClose={() => setShowMove(false)}>
        <div className="input-group"><label className="input-label">Дата</label><input className="input-field" type="date" value={moveForm.date} onChange={e => setMoveForm({ ...moveForm, date: e.target.value })} /></div>
        <div className="input-group"><label className="input-label">Куда</label><select className="input-field" value={moveForm.destination} onChange={e => setMoveForm({ ...moveForm, destination: e.target.value })}>{DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
        {isSoldDestination(moveForm.destination) && (
          <div className="input-group">
            <label className="input-label">Номер заказа</label>
            <input className="input-field" value={moveForm.orderNumber} onChange={e => setMoveForm({ ...moveForm, orderNumber: e.target.value })} placeholder="Например, 12345" />
          </div>
        )}
        {isSoldDestination(moveForm.destination) && (
          <div className="input-group">
            <label className="input-label">Цена продажи</label>
            <input className="input-field" type="number" value={moveForm.salePrice} onChange={e => setMoveForm({ ...moveForm, salePrice: e.target.value })} placeholder="Например, 79990" />
          </div>
        )}
        <div className="input-group"><label className="input-label">Комментарий</label><textarea className="input-field" rows={2} value={moveForm.comment} onChange={e => setMoveForm({ ...moveForm, comment: e.target.value })} style={{ resize: 'vertical', fontFamily: 'Outfit, sans-serif' }} /></div>
        <ModalButtons onCancel={() => setShowMove(false)} onConfirm={handleMove} confirmLabel="Подтвердить" />
      </Modal>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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

function FormFields({ form, setForm, suppliers, warehouses, categories }: { form: any; setForm: (f: any) => void; suppliers: any[]; warehouses: string[]; categories: string[] }) {
  return <>
    <div className="input-group"><label className="input-label">Название</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
    <div className="input-group"><label className="input-label">IMEI</label><input className="input-field" value={form.imei} onChange={e => setForm({ ...form, imei: e.target.value })} /></div>
    <div className="input-group"><label className="input-label">Цена закупки</label><input className="input-field" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
    <div className="input-group"><label className="input-label">Цена продажи</label><input className="input-field" type="number" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: e.target.value })} /></div>
    <div className="input-group"><label className="input-label">Поставщик</label>
      <select className="input-field" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}>
        <option value="">-- выбрать --</option>
        {suppliers.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
      </select>
    </div>
    <div className="input-group"><label className="input-label">Склад</label><select className="input-field" value={form.warehouse} onChange={e => setForm({ ...form, warehouse: e.target.value })}>{warehouses.map(w => <option key={w} value={w}>{w}</option>)}</select></div>
    <div className="input-group"><label className="input-label">Категория</label><select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
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
