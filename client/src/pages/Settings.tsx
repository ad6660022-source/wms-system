import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Plus, Trash2, X, KeyRound, Warehouse, Tag, UserRound, Users, Search, Pencil } from 'lucide-react';
import { useToast } from '../components/Toast';
import { api, readApiError } from '../lib/api';
import type { AuthUser } from '../types/auth';

const ACCOUNT_STATUSES = [
  { value: 'ACTIVE', label: 'Активен' },
  { value: 'BLOCKED', label: 'Заблокирован' },
];

const emptyUserForm = {
  firstName: '',
  lastName: '',
  login: '',
  email: '',
  phone: '',
  password: '',
  status: 'ACTIVE',
};

function Section({ icon, title, caption, children }: { icon: ReactNode; title: string; caption?: string; children: ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {caption ? <p style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '13px' }}>{caption}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return 'Не было';
  return new Date(value).toLocaleString('ru-RU');
}

function statusLabel(status: string) {
  return ACCOUNT_STATUSES.find(option => option.value === status)?.label || status;
}

type SettingsProps = {
  currentUser: AuthUser;
  onCurrentUserChange: (user: AuthUser) => void;
};

export default function Settings({ currentUser, onCurrentUserChange }: SettingsProps) {
  const { show: toast } = useToast();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [whName, setWhName] = useState('');
  const [catName, setCatName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [profileForm, setProfileForm] = useState({
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    login: currentUser.login,
    email: currentUser.email,
    phone: currentUser.phone || '',
  });
  const [userSearch, setUserSearch] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);

  const canManageUsers = currentUser.isAdmin;

  useEffect(() => {
    setProfileForm({
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      login: currentUser.login,
      email: currentUser.email,
      phone: currentUser.phone || '',
    });
  }, [currentUser]);

  const loadWarehouses = () => api('/api/warehouses').then(r => r.json()).then(d => { if (Array.isArray(d)) setWarehouses(d); });
  const loadCategories = () => api('/api/categories').then(r => r.json()).then(d => { if (Array.isArray(d)) setCategories(d); });

  const loadUsers = async () => {
    if (!canManageUsers) return;
    const params = new URLSearchParams();
    if (userSearch.trim()) params.set('search', userSearch.trim());
    if (userStatus) params.set('status', userStatus);
    const res = await api(`/api/users?${params.toString()}`);
    if (!res.ok) {
      toast(await readApiError(res, 'Не удалось загрузить пользователей'), 'error');
      return;
    }
    const data = await res.json();
    if (Array.isArray(data)) setUsers(data);
  };

  useEffect(() => {
    if (!canManageUsers) return;
    loadWarehouses();
    loadCategories();
  }, [canManageUsers]);

  useEffect(() => {
    if (!canManageUsers) return;
    loadUsers();
  }, [canManageUsers, userSearch, userStatus]);

  const saveProfile = async () => {
    const res = await api('/api/auth/profile', { method: 'PUT', body: JSON.stringify(profileForm) });
    if (!res.ok) {
      toast(await readApiError(res, 'Не удалось обновить профиль'), 'error');
      return;
    }
    const data = await res.json();
    onCurrentUserChange(data.user);
    toast('Профиль обновлён');
  };

  const changePassword = async () => {
    if (newPwd !== confirmPwd) {
      toast('Пароли не совпадают', 'error');
      return;
    }
    if (newPwd.trim().length < 6) {
      toast('Минимум 6 символов', 'error');
      return;
    }
    const res = await api('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword: newPwd }),
    });
    if (!res.ok) {
      toast(await readApiError(res, 'Не удалось обновить пароль'), 'error');
      return;
    }
    toast('Пароль изменён');
    setCurrentPassword('');
    setNewPwd('');
    setConfirmPwd('');
  };

  const addWarehouse = async () => {
    if (!whName.trim()) return;
    const res = await api('/api/warehouses', { method: 'POST', body: JSON.stringify({ name: whName }) });
    if (!res.ok) {
      toast(await readApiError(res, 'Не удалось добавить склад'), 'error');
      return;
    }
    toast('Склад добавлен');
    setWhName('');
    loadWarehouses();
  };

  const delWarehouse = async (id: string) => {
    const res = await api(`/api/warehouses/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast(await readApiError(res, 'Нельзя удалить склад'), 'error');
      return;
    }
    toast('Склад удалён', 'info');
    loadWarehouses();
  };

  const addCategory = async () => {
    if (!catName.trim()) return;
    const res = await api('/api/categories', { method: 'POST', body: JSON.stringify({ name: catName }) });
    if (!res.ok) {
      toast(await readApiError(res, 'Не удалось добавить категорию'), 'error');
      return;
    }
    toast('Категория добавлена');
    setCatName('');
    loadCategories();
  };

  const delCategory = async (id: string) => {
    const res = await api(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast(await readApiError(res, 'Не удалось удалить категорию'), 'error');
      return;
    }
    toast('Категория удалена', 'info');
    loadCategories();
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm(emptyUserForm);
    setShowUserModal(true);
  };

  const openEditUser = (user: AuthUser) => {
    setEditingUser(user);
    setUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      login: user.login,
      email: user.email,
      phone: user.phone || '',
      password: '',
      status: user.status,
    });
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm(emptyUserForm);
  };

  const submitUserForm = async () => {
    if (!userForm.firstName.trim() || !userForm.lastName.trim() || !userForm.login.trim() || !userForm.email.trim()) {
      toast('Заполни обязательные поля пользователя', 'error');
      return;
    }
    if (!editingUser && userForm.password.trim().length < 6) {
      toast('Для нового пользователя пароль должен быть не короче 6 символов', 'error');
      return;
    }

    const payload = {
      firstName: userForm.firstName,
      lastName: userForm.lastName,
      login: userForm.login,
      email: userForm.email,
      phone: userForm.phone,
      status: userForm.status,
      ...(userForm.password ? { password: userForm.password } : {}),
    };

    const res = await api(editingUser ? `/api/users/${editingUser.id}` : '/api/users', {
      method: editingUser ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast(await readApiError(res, editingUser ? 'Не удалось обновить пользователя' : 'Не удалось создать пользователя'), 'error');
      return;
    }
    toast(editingUser ? 'Пользователь обновлён' : 'Пользователь создан');
    closeUserModal();
    loadUsers();
  };

  const toggleUserStatus = async (user: AuthUser) => {
    const nextStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    const res = await api(`/api/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ status: nextStatus }) });
    if (!res.ok) {
      toast(await readApiError(res, 'Не удалось изменить статус'), 'error');
      return;
    }
    toast(nextStatus === 'ACTIVE' ? 'Аккаунт разблокирован' : 'Аккаунт заблокирован', 'info');
    loadUsers();
    if (user.id === currentUser.id && nextStatus === 'ACTIVE') {
      onCurrentUserChange({ ...currentUser, status: nextStatus });
    }
  };

  const deleteUser = async (user: AuthUser) => {
    if (!confirm(`Удалить пользователя @${user.login}?`)) return;
    const res = await api(`/api/users/${user.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast(await readApiError(res, 'Не удалось удалить пользователя'), 'error');
      return;
    }
    toast('Пользователь удалён', 'info');
    loadUsers();
  };

  const profileMeta = useMemo(() => ([
    { label: 'Статус', value: statusLabel(currentUser.status) },
    { label: 'Дата регистрации', value: formatDate(currentUser.createdAt) },
    { label: 'Последний вход', value: formatDate(currentUser.lastLoginAt) },
  ]), [currentUser]);

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '4px' }}>Личный кабинет</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '13px' }}>Здесь ты можешь управлять своим профилем, а администратор дополнительно получает доступ к пользователям и системным справочникам.</p>

      <Section icon={<UserRound size={18} />} title="Профиль" caption="Основные данные аккаунта и контактная информация">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          {profileMeta.map(item => (
            <div key={item.label} style={{ padding: '8px 12px', borderRadius: '999px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}: </span>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div className="input-group">
            <label className="input-label">Имя</label>
            <input className="input-field" value={profileForm.firstName} onChange={e => setProfileForm(current => ({ ...current, firstName: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">Фамилия</label>
            <input className="input-field" value={profileForm.lastName} onChange={e => setProfileForm(current => ({ ...current, lastName: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">Логин</label>
            <input className="input-field" value={profileForm.login} onChange={e => setProfileForm(current => ({ ...current, login: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input-field" type="email" value={profileForm.email} onChange={e => setProfileForm(current => ({ ...current, email: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">Телефон</label>
            <input className="input-field" value={profileForm.phone} onChange={e => setProfileForm(current => ({ ...current, phone: e.target.value }))} />
          </div>
        </div>

        <button className="btn btn-primary" onClick={saveProfile}>Сохранить профиль</button>
      </Section>

      <Section icon={<KeyRound size={18} />} title="Смена пароля" caption="Восстановления пароля пока нет, поэтому лучше сразу задать удобный и запоминаемый пароль">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div className="input-group">
            <label className="input-label">Текущий пароль</label>
            <input className="input-field" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Новый пароль</label>
            <input className="input-field" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Подтверждение</label>
            <input className="input-field" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={changePassword}>Сохранить пароль</button>
      </Section>

      {canManageUsers ? (
        <>
          <Section icon={<Users size={18} />} title="Пользователи" caption="Первый администратор создаётся из ADMIN_LOGIN, ADMIN_EMAIL и ADMIN_PASSWORD в .env, остальные аккаунты можно вести уже отсюда">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                <div style={{ minWidth: '260px', flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <Search size={16} color="var(--text-secondary)" />
                  <input
                    className="input-field"
                    style={{ border: 'none', background: 'transparent', boxShadow: 'none', paddingLeft: 0, paddingRight: 0 }}
                    placeholder="Поиск по имени, фамилии, логину, email или телефону"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                  />
                </div>
                <select className="input-field" style={{ width: '220px' }} value={userStatus} onChange={e => setUserStatus(e.target.value)}>
                  <option value="">Все статусы</option>
                  {ACCOUNT_STATUSES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" onClick={openCreateUser}><Plus size={14} /> Создать пользователя</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 400 }}>Пользователь</th>
                    <th style={{ padding: '10px 14px', fontWeight: 400 }}>Контакты</th>
                    <th style={{ padding: '10px 14px', fontWeight: 400 }}>Статус</th>
                    <th style={{ padding: '10px 14px', fontWeight: 400 }}>Регистрация</th>
                    <th style={{ padding: '10px 14px', fontWeight: 400 }}>Последний вход</th>
                    <th style={{ padding: '10px 14px', fontWeight: 400, width: '220px' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Пользователи не найдены</td>
                    </tr>
                  ) : users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 500 }}>{user.fullName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>@{user.login}{user.isAdmin ? ' • первый администратор' : ''}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                        <div>{user.email}</div>
                        <div style={{ fontSize: '12px' }}>{user.phone || 'Телефон не указан'}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', background: user.status === 'ACTIVE' ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)', color: user.status === 'ACTIVE' ? '#34C759' : '#FF3B30' }}>
                          {statusLabel(user.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{formatDate(user.createdAt)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{formatDate(user.lastLoginAt)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => openEditUser(user)}>
                            <Pencil size={13} />
                            Изменить
                          </button>
                          <button className="btn" style={{ padding: '6px 10px', background: user.status === 'ACTIVE' ? 'rgba(255,149,0,0.12)' : 'rgba(52,199,89,0.12)', color: user.status === 'ACTIVE' ? 'var(--system-orange)' : 'var(--system-green)' }} onClick={() => toggleUserStatus(user)}>
                            {user.status === 'ACTIVE' ? 'Заблокировать' : 'Разблокировать'}
                          </button>
                          {!user.isAdmin ? (
                            <button className="btn" style={{ padding: '6px 10px', background: 'rgba(255,59,48,0.1)', color: 'var(--system-red)' }} onClick={() => deleteUser(user)}>
                              <Trash2 size={13} />
                              Удалить
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

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
        </>
      ) : null}

      {showUserModal ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.34)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '560px', position: 'relative' }}>
            <button onClick={closeUserModal} style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            <h2 style={{ marginBottom: '6px' }}>{editingUser ? 'Редактирование пользователя' : 'Новый пользователь'}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '13px' }}>
              {editingUser ? 'Обнови данные, статус и при необходимости задай новый пароль.' : 'Создай аккаунт сотрудника вручную, если не хочешь ждать самостоятельную регистрацию.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              <div className="input-group">
                <label className="input-label">Имя</label>
                <input className="input-field" value={userForm.firstName} onChange={e => setUserForm(current => ({ ...current, firstName: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Фамилия</label>
                <input className="input-field" value={userForm.lastName} onChange={e => setUserForm(current => ({ ...current, lastName: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Логин</label>
                <input className="input-field" value={userForm.login} onChange={e => setUserForm(current => ({ ...current, login: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input-field" type="email" value={userForm.email} onChange={e => setUserForm(current => ({ ...current, email: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Телефон</label>
                <input className="input-field" value={userForm.phone} onChange={e => setUserForm(current => ({ ...current, phone: e.target.value }))} />
              </div>
              {editingUser ? (
                <div className="input-group">
                  <label className="input-label">Статус</label>
                  <select className="input-field" value={userForm.status} onChange={e => setUserForm(current => ({ ...current, status: e.target.value }))}>
                    {ACCOUNT_STATUSES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="input-group">
              <label className="input-label">{editingUser ? 'Новый пароль' : 'Пароль'}</label>
              <input className="input-field" type="password" placeholder={editingUser ? 'Оставь пустым, если пароль не нужно менять' : 'Минимум 6 символов'} value={userForm.password} onChange={e => setUserForm(current => ({ ...current, password: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button className="btn" onClick={closeUserModal} style={{ flex: 1, background: 'rgba(255,59,48,0.08)', color: 'var(--system-red)' }}>Отмена</button>
              <button className="btn btn-primary" onClick={submitUserForm} style={{ flex: 1 }}>{editingUser ? 'Сохранить' : 'Создать'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
