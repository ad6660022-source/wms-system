import { useEffect, useState } from 'react';

export default function AuditLog() {
  const [log, setLog] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/audit').then(r => r.json()).then(d => { if (Array.isArray(d)) setLog(d); }).catch(() => {});
  }, []);

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '16px' }}>Журнал действий</h1>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Действие</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Детали</th>
            <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дата и время</th>
          </tr></thead>
          <tbody>
            {log.length === 0 ? <tr><td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет записей</td></tr> :
              log.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 400 }}>{entry.action}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{entry.details}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(entry.date).toLocaleString('ru-RU')}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
