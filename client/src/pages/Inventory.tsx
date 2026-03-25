import { useEffect, useState } from 'react';
import { Search, Plus, Archive, Image as ImageIcon } from 'lucide-react';

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="page-container" style={{ paddingTop: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Товары</h1>
        <button className="btn btn-primary">
          <Plus size={18} /> Добавить
        </button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
          <div className="input-group" style={{ margin: 0, flex: 1, flexDirection: 'row', alignItems: 'center', background: 'var(--system-gray-6)', padding: '8px 12px', borderRadius: 'var(--border-radius-md)' }}>
            <Search size={18} color="var(--system-gray)" />
            <input 
              type="text" 
              placeholder="Поиск по названию, SKU или штрихкоду" 
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '15px', color: 'var(--text-primary)' }} 
            />
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Фото</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Название</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>SKU</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Доступно</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Цена (Розница)</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Archive size={40} style={{ opacity: 0.5, marginBottom: '12px', display: 'inline-block' }} />
                    <p>Товары не найдены</p>
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ width: '40px', height: '40px', background: 'var(--system-gray-5)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={20} color="var(--system-gray)" />
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{p.sku}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: p.totalAvailable > p.minStock ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)', color: p.totalAvailable > p.minStock ? 'var(--system-green)' : 'var(--system-red)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}>
                        {p.totalAvailable || 0} {p.unit}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {p.retailPrice.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
