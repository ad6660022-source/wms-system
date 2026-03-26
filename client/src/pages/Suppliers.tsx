import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';

const socket = io('/', { transports: ['websocket'] });

export default function Suppliers() {
  const { show: toast } = useToast();
  const [list, setList] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', note: '' });

  const load = () => { api('/api/suppliers').then(r => r.json()).then(d => { if (Array.isArray(d)) setList(d); }).catch(() => {}); };
  useEffect(() => { load(); socket.on('suppliers:updated', load); return () => { socket.off('suppliers:updated', load); }; }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const res = await api('/api/suppliers', { method: 'POST', body: JSON.stringify(form) });
    if (res.ok) { toast('Поставщик добавлен'); setForm({ name: '', phone: '', note: '' }); setShowAdd(false); load(); }
    else toast('Ошибка', 'error');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить поставщика?')) return;
    const res = await api(`/api/suppliers/${id}`, { method: 'DELETE' });
    if (res.ok) toast('Поставщик удален', 'info');
    else toast('Ошибка', 'error');
    load();
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0 }}>Поставщики</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Добавить</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Имя</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Телефон</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Заметка</th>
            <th style={{ padding: '10px 14px', fontWeight: 400, width: '60px' }}></th>
          </tr></thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет поставщиков</td></tr> :
              list.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 400 }}>{s.name}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{s.phone || '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{s.note || '-'}</td>
                  <td style={{ padding: '10px 14px' }}><button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--system-red)' }}><Trash2 size={14} /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '380px', position: 'relative' }}>
            <button onClick={() => setShowAdd(false)} style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            <h2 style={{ margin: '0 0 16px' }}>Новый поставщик</h2>
            <div className="input-group"><label className="input-label">Имя</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="input-group"><label className="input-label">Телефон</label><input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="input-group"><label className="input-label">Заметка</label><input className="input-field" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button className="btn" onClick={() => setShowAdd(false)} style={{ flex: 1, background: 'rgba(255,59,48,0.08)', color: 'var(--system-red)' }}>Отмена</button>
              <button className="btn" onClick={handleAdd} style={{ flex: 1, background: 'var(--accent)', color: '#fff' }}>Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
