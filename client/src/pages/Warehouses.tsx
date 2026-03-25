import { useEffect, useState } from 'react';
import { Plus, Building2, MapPin } from 'lucide-react';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/warehouses')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setWarehouses(data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="page-container" style={{ paddingTop: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Склады</h1>
        <button className="btn btn-primary">
          <Plus size={18} /> Добавить склад
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {warehouses.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Нет складов. Создайте первый склад для учета.</p>
        ) : (
          warehouses.map(w => (
            <div key={w.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(0, 122, 255, 0.1)', color: 'var(--system-blue)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{w.name}</h3>
                </div>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} />
                {w.address || 'Адрес не указан'}
              </div>
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <span className="caption">Локаций: {w.locations?.length || 0}</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--system-blue)', fontWeight: 500, cursor: 'pointer', fontSize: '14px' }}>Настроить</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
