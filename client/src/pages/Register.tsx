import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageOpen, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useToast } from '../components/Toast';
import { readApiError } from '../lib/api';
import type { AuthSuccessPayload } from '../types/auth';

type RegisterProps = {
  onRegister: (payload: AuthSuccessPayload) => void;
};

export default function Register({ onRegister }: RegisterProps) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    login: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { show: toast } = useToast();

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.login.trim() || !form.email.trim()) {
      toast('Заполни обязательные поля', 'error');
      return;
    }
    if (form.password.length < 6) {
      toast('Пароль должен быть не короче 6 символов', 'error');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast('Пароли не совпадают', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          login: form.login,
          email: form.email,
          password: form.password,
        }),
      });
      if (!res.ok) {
        toast(await readApiError(res, 'Не удалось создать аккаунт'), 'error');
        setLoading(false);
        return;
      }
      const data = await res.json();
      onRegister({ token: data.token, user: data.user, rememberMe: true });
      toast('Аккаунт создан');
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
            <h1 style={{ marginBottom: '6px', fontSize: '26px' }}>Регистрация</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Создай личный кабинет для работы в системе склада.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Имя</label>
              <input className="input-field" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} autoFocus />
            </div>
            <div className="input-group">
              <label className="input-label">Фамилия</label>
              <input className="input-field" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Логин</label>
            <input className="input-field" value={form.login} onChange={e => handleChange('login', e.target.value)} />
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input-field" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} />
          </div>

          <div className="input-group">
            <label className="input-label">Пароль</label>
            <div className="password-field">
              <input className="input-field" type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => handleChange('password', e.target.value)} style={{ paddingRight: '44px' }} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(value => !value)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Подтверждение пароля</label>
            <div className="password-field">
              <input className="input-field" type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={e => handleChange('confirmPassword', e.target.value)} style={{ paddingRight: '44px' }} />
              <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(value => !value)}>
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '8px', opacity: loading ? 0.7 : 1 }}>
            <UserPlus size={16} />
            {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-switch">
          Уже есть аккаунт?
          <Link to="/login"> Войти</Link>
        </div>
      </div>
    </div>
  );
}
