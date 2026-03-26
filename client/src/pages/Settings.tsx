import { useState, useEffect } from 'react';
import { Plus, Trash2, X, KeyRound, Warehouse, Tag } from 'lucide-react';
import { useToast } from '../components/Toast';

const token = () => localStorage.getItem('sklToken') || '';
const api = (url: string, opts: RequestInit = {}) => fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...((opts as any).headers || {}) } });
const readApiError = async (res: Response, fallback: string) => {
  try {
    const data = await res.json();
    return typeof data?.error === 'string' ? data.error : fallback;
  } catch {
    return fallback;
  }
};

export default function Settings() {
  const { show: toast } = useToast();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [whName, setWhName] = useState('');
  const [catName, setCatName] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const loadWarehouses = () => api('/api/warehouses').then(r => r.json()).then(d => { if (Array.isArray(d)) setWarehouses(d); });
  const loadCategories = () => api('/api/categories').then(r => r.json()).then(d => { if (Array.isArray(d)) setCategories(d); });
  useEffect(() => { loadWarehouses(); loadCategories(); }, []);

  const addWarehouse = async () => {
    if (!whName.trim()) return;
    const res = await api('/api/warehouses', { method: 'POST', body: JSON.stringify({ name: whName }) });
    if (res.ok) { toast('Склад добавлен'); setWhName(''); loadWarehouses(); } else toast(await readApiError(res, 'Ошибка'), 'error');
  };
  const delWarehouse = async (id: string) => {
    const res = await api(`/api/warehouses/${id}`, { method: 'DELETE' });
    if (res.ok) { toast('Склад удалён', 'info'); loadWarehouses(); } else toast(await readApiError(res, 'Нельзя удалить склад'), 'error');
  };
  const addCategory = async () => {
    if (!catName.trim()) return;
    const res = await api('/api/categories', { method: 'POST', body: JSON.stringify({ name: catName }) });
    if (res.ok) { toast('Категория добавлена'); setCatName(''); loadCategories(); } else toast(await readApiError(res, 'Ошибка'), 'error');
  };
  const delCategory = async (id: string) => {
    const res = await api(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) { toast('Категория удалена', 'info'); loadCategories(); } else toast(await readApiError(res, 'Ошибка'), 'error');
  };
  const changePassword = async () => {
    if (newPwd !== confirmPwd) { toast('Пароли не совпадают', 'error'); return; }
    if (newPwd.trim().length < 8) { toast('Минимум 8 символов', 'error'); return; }
    const res = await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ newPassword: newPwd }) });
    if (res.ok) { toast('Пароль изменён'); setNewPwd(''); setConfirmPwd(''); } else toast(await readApiError(res, 'Ошибка'), 'error');
  };

  const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="card" style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '20px' }}>Настройки</h1>

      <Section icon={<Warehouse size={18} />} title="Склады">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input className="input-field" placeholder="Название склада" value={whName} onChange={e => setWhName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWarehouse()} style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={addWarehouse}><Plus size={14} /> Добавить</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {warehouses.map(w => (
            <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '13px' }}>
              <span>{w.name}</span>
              <button onClick={() => delWarehouse(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--system-red)' }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<Tag size={18} />} title="Категории">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input className="input-field" placeholder="Название категории" value={catName} onChange={e => setCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={addCategory}><Plus size={14} /> Добавить</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {categories.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: 'var(--bg-primary)', borderRadius: '20px', fontSize: '12px', border: '1px solid var(--border-color)' }}>
              <span>{c.name}</span>
              <button onClick={() => delCategory(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--system-red)', lineHeight: 1, padding: 0 }}><X size={12} /></button>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<KeyRound size={18} />} title="Смена пароля">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '13px' }}>Используй пароль не короче 8 символов.</p>
        <div className="input-group"><label className="input-label">Новый пароль</label><input className="input-field" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} /></div>
        <div className="input-group"><label className="input-label">Подтверждение</label><input className="input-field" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} /></div>
        <button className="btn btn-primary" onClick={changePassword}>Сохранить пароль</button>
      </Section>
    </div>
  );
}
