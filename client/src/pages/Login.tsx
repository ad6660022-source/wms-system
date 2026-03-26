import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageOpen, Eye, EyeOff, LogIn } from 'lucide-react';
import { useToast } from '../components/Toast';
import { readApiError } from '../lib/api';
import type { AuthSuccessPayload } from '../types/auth';

type LoginProps = {
  onLogin: (payload: AuthSuccessPayload) => void;
};

export default function Login({ onLogin }: LoginProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { show: toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!login.trim() || !password) {
      toast('Укажи логин и пароль', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password, rememberMe }),
      });
      if (!res.ok) {
        toast(await readApiError(res, 'Ошибка входа'), 'error');
        setLoading(false);
        return;
      }
      const data = await res.json();
      onLogin({ token: data.token, user: data.user, rememberMe });
      toast('Вход выполнен');
    } catch {
      toast('Ошибка подключения', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <PackageOpen size={26} />
          </div>
          <div>
            <h1 style={{ marginBottom: '6px', fontSize: '26px' }}>Вход в систему</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Используй свой логин и пароль для входа в личный кабинет.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Логин или email</label>
            <input className="input-field" value={login} onChange={e => setLogin(e.target.value)} autoFocus />
          </div>

          <div className="input-group">
            <label className="input-label">Пароль</label>
            <div className="password-field">
              <input className="input-field" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: '44px' }} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(value => !value)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', cursor: 'pointer' }}>
            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
            Запомнить меня
          </label>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
            <LogIn size={16} />
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>

        <div className="auth-switch">
          Нет аккаунта?
          <Link to="/register"> Зарегистрироваться</Link>
        </div>
      </div>
    </div>
  );
}
