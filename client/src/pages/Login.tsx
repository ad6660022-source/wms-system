import { useState } from 'react';
import { PackageOpen, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const { show: toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!res.ok) { toast('Неверный пароль', 'error'); setLoading(false); return; }
      const { token } = await res.json();
      localStorage.setItem('sklToken', token);
      onLogin(token);
    } catch {
      toast('Ошибка подключения', 'error');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '340px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PackageOpen size={26} />
          </div>
        </div>
        <h1 style={{ marginBottom: '4px', fontSize: '22px' }}>СКЛАД</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '13px' }}>Введите пароль для входа</p>
        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <input
              className="input-field"
              type={show ? 'text' : 'password'}
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', paddingRight: '40px' }}
              autoFocus
            />
            <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-secondary)' }}>По умолчанию: admin123</p>
      </div>
    </div>
  );
}
