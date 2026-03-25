import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io('/', { transports: ['websocket'] });

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Активен': { bg: 'rgba(52,199,89,0.1)', text: '#34C759' },
  'Архив': { bg: 'rgba(142,142,147,0.1)', text: '#8E8E93' },
  'Брак': { bg: 'rgba(255,59,48,0.1)', text: '#FF3B30' },
  'Продано': { bg: 'rgba(255,59,48,0.1)', text: '#FF3B30' },
};

export default function Statistics() {
  const [stats, setStats] = useState<any>(null);

  const load = () => {
    fetch('/api/statistics').then(r => r.json()).then(d => setStats(d)).catch(() => {});
  };
  useEffect(() => { load(); socket.on('products:updated', load); return () => { socket.off('products:updated', load); }; }, []);

  const exportExcel = async () => {
    const res = await fetch('/api/export/statistics', { method: 'POST' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'statistics.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!stats) return <div className="page-container"><p>Загрузка...</p></div>;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h1 style={{ margin: 0 }}>Статистика</h1>
        <button className="btn btn-primary" onClick={exportExcel}>
          <Download size={14} /> Выгрузить Excel
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <div className="card">
          <div className="caption">Всего товаров</div>
          <div style={{ fontSize: '26px', fontWeight: 500, marginTop: '6px' }}>{stats.totalProducts}</div>
        </div>
        {stats.warehouseStats.map((w: any) => (
          <div className="card" key={w.name}>
            <div className="caption">Склад: {w.name}</div>
            <div style={{ fontSize: '22px', fontWeight: 500, marginTop: '6px' }}>{w.active + w.sold + w.defect} шт</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px' }}>
              <span style={{ color: '#34C759' }}>Акт: {w.active}</span>
              <span style={{ color: '#FF3B30' }}>Прод: {w.sold}</span>
              <span style={{ color: '#FF9500' }}>Брак: {w.defect}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Стоимость: {w.totalValue.toLocaleString('ru-RU')} P
            </div>
          </div>
        ))}
      </div>

      {stats.warehouseStats.map((w: any) => (
        <div key={w.name} style={{ marginBottom: '28px' }}>
          <h2 style={{ marginBottom: '14px' }}>Склад: {w.name}</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead><tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Название</th>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>IMEI</th>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Цена</th>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Категория</th>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Статус</th>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дней на складе</th>
                  <th style={{ padding: '10px 14px', fontWeight: 400 }}>Дней до продажи</th>
                </tr></thead>
                <tbody>
                  {w.products.length === 0 ? <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Нет товаров</td></tr> :
                    w.products.map((p: any, i: number) => {
                      const c = STATUS_COLORS[p.status] || STATUS_COLORS['Активен'];
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 400 }}>{p.name}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>{p.imei || '-'}</td>
                          <td style={{ padding: '10px 14px' }}>{Number(p.price).toLocaleString('ru-RU')} P</td>
                          <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.category}</td>
                          <td style={{ padding: '10px 14px' }}><span style={{ background: c.bg, color: c.text, padding: '3px 8px', borderRadius: '5px', fontSize: '12px' }}>{p.status}</span></td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {p.daysOnStock !== null ? (
                              <span style={{ fontWeight: 500, color: p.daysOnStock > 30 ? 'var(--system-orange)' : 'var(--text-primary)' }}>
                                {p.daysOnStock}д
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {p.daysToSell !== null ? (
                              <span style={{ fontWeight: 500, color: 'var(--system-green)' }}>{p.daysToSell}д</span>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
