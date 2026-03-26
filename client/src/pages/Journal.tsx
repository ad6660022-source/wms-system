import { useEffect, useState } from 'react';
import { api } from '../App';

const TABS = ['Перемещения', 'Действия'];

export default function Journal() {
  const [tab, setTab] = useState(0);
  const [movements, setMovements] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadMovements = () => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    api(`/api/movements?${params}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setMovements(d); }).catch(() => {});
  };
  const loadAudit = () => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    api(`/api/audit?${params}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setAudit(d); }).catch(() => {});
  };
  useEffect(() => { loadMovements(); loadAudit(); }, [from, to]);

  const thStyle = { padding: '10px 14px', fontWeight: 400 as const };
  const tdStyle = { padding: '10px 14px' };

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '4px' }}>Журнал</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '18px', fontSize: '13px' }}>История перемещений и действий, включая номера заказов по проданным товарам.</p>

      {/* Date filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>С</label>
          <input className="input-field" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>По</label>
          <input className="input-field" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px' }} />
        </div>
        {(from || to) && <button className="btn btn-secondary" onClick={() => { setFrom(''); setTo(''); }} style={{ padding: '6px 10px', fontSize: '12px' }}>Сбросить</button>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', width: 'fit-content', border: '1px solid var(--border-color)' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{ padding: '6px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: 400, background: tab === i ? 'var(--accent)' : 'transparent', color: tab === i ? '#fff' : 'var(--text-secondary)', transition: 'all 0.18s' }}>
            {t} <span style={{ fontSize: '11px', opacity: 0.8 }}>({i === 0 ? movements.length : audit.length})</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {tab === 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={thStyle}>Товар</th>
                <th style={thStyle}>№ заказа</th>
                <th style={thStyle}>Куда</th>
                <th style={thStyle}>Комментарий</th>
                <th style={thStyle}>Дата</th>
              </tr></thead>
              <tbody>
                {movements.length === 0 ? <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет записей</td></tr> :
                  movements.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ ...tdStyle, fontWeight: 400 }}>{m.productName || '-'}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{m.orderNumber ? `№${m.orderNumber}` : '-'}</td>
                      <td style={tdStyle}>{m.destination}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{m.comment || '-'}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(m.date).toLocaleDateString('ru-RU')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={thStyle}>Действие</th>
                <th style={thStyle}>Детали</th>
                <th style={thStyle}>Дата</th>
              </tr></thead>
              <tbody>
                {audit.length === 0 ? <tr><td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет записей</td></tr> :
                  audit.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ ...tdStyle, fontWeight: 400 }}>{a.action}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{a.details}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(a.date).toLocaleString('ru-RU')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
