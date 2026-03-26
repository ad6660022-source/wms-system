const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'skladsecret2025';

// ====== AUTH MIDDLEWARE ======
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Токен недействителен' });
  }
}

// ====== SEED DEFAULT DATA ======
async function seedDefaults() {
  // Default warehouses
  const wh = ['Василий', 'Анна'];
  for (const name of wh) {
    await prisma.warehouse.upsert({ where: { name }, update: {}, create: { name } });
  }
  // Default categories
  const cats = ['Без категории', 'Телефоны', 'Аксессуары', 'Ноутбуки', 'Планшеты', 'Другое'];
  for (const name of cats) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  // Default password (admin)
  const existing = await prisma.setting.findUnique({ where: { key: 'password' } });
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.setting.create({ data: { key: 'password', value: hashed } });
    console.log('Default password set: admin123');
  }
}

// ====== AUTH ======
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  const setting = await prisma.setting.findUnique({ where: { key: 'password' } });
  if (!setting) return res.status(500).json({ error: 'Пароль не настроен' });
  const ok = await bcrypt.compare(password, setting.value);
  if (!ok) return res.status(401).json({ error: 'Неверный пароль' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Минимум 4 символа' });
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.setting.update({ where: { key: 'password' }, data: { value: hashed } });
  await prisma.auditLog.create({ data: { action: 'Смена пароля', details: 'Пароль обновлён' } });
  res.json({ ok: true });
});

// ====== WAREHOUSES & CATEGORIES (public for settings page) ======
app.get('/api/warehouses', authMiddleware, async (req, res) => {
  res.json(await prisma.warehouse.findMany({ orderBy: { name: 'asc' } }));
});
app.post('/api/warehouses', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Имя обязательно' });
  const w = await prisma.warehouse.create({ data: { name } });
  await prisma.auditLog.create({ data: { action: 'Добавлен склад', details: name } });
  io.emit('settings:updated');
  res.status(201).json(w);
});
app.delete('/api/warehouses/:id', authMiddleware, async (req, res) => {
  const w = await prisma.warehouse.delete({ where: { id: req.params.id } }).catch(() => null);
  if (!w) return res.status(404).json({ error: 'Не найден' });
  await prisma.auditLog.create({ data: { action: 'Удалён склад', details: w.name } });
  io.emit('settings:updated');
  res.json({ ok: true });
});

app.get('/api/categories', authMiddleware, async (req, res) => {
  res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } }));
});
app.post('/api/categories', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Имя обязательно' });
  const c = await prisma.category.create({ data: { name } });
  await prisma.auditLog.create({ data: { action: 'Добавлена категория', details: name } });
  io.emit('settings:updated');
  res.status(201).json(c);
});
app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  const c = await prisma.category.delete({ where: { id: req.params.id } }).catch(() => null);
  if (!c) return res.status(404).json({ error: 'Не найден' });
  await prisma.auditLog.create({ data: { action: 'Удалена категория', details: c.name } });
  io.emit('settings:updated');
  res.json({ ok: true });
});

// ====== PRODUCTS ======
app.get('/api/products', authMiddleware, async (req, res) => {
  const products = await prisma.product.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json(products);
});

app.post('/api/products', authMiddleware, async (req, res) => {
  const { name, imei, price, supplier, warehouse, category } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  const product = await prisma.product.create({
    data: { name, imei: imei || null, price: Number(price) || 0, supplier: supplier || null, warehouse: warehouse || 'Василий', category: category || 'Без категории', status: 'Активен' }
  });
  await prisma.auditLog.create({ data: { action: 'Добавлен товар', details: `${product.name} (${product.warehouse})` } });
  io.emit('products:updated');
  res.status(201).json(product);
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
  const { name, imei, price, supplier, warehouse, category } = req.body;
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { ...(name !== undefined && { name }), ...(imei !== undefined && { imei }), ...(price !== undefined && { price: Number(price) }), ...(supplier !== undefined && { supplier }), ...(warehouse !== undefined && { warehouse }), ...(category !== undefined && { category }) }
  }).catch(() => null);
  if (!product) return res.status(404).json({ error: 'Не найден' });
  await prisma.auditLog.create({ data: { action: 'Отредактирован', details: product.name } });
  io.emit('products:updated');
  res.json(product);
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  // Delete related movements first
  await prisma.movement.deleteMany({ where: { productId: req.params.id } });
  const product = await prisma.product.delete({ where: { id: req.params.id } }).catch(() => null);
  if (!product) return res.status(404).json({ error: 'Не найден' });
  await prisma.auditLog.create({ data: { action: 'Удалён', details: product.name } });
  io.emit('products:updated');
  res.json({ ok: true });
});

app.post('/api/products/:id/move', authMiddleware, async (req, res) => {
  const { destination, comment, date } = req.body;
  let status = 'Архив';
  if (destination.startsWith('Продан')) status = 'Продано';
  if (destination === 'Брак') status = 'Брак';
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { status } }).catch(() => null);
  if (!product) return res.status(404).json({ error: 'Не найден' });
  await prisma.movement.create({ data: { productId: product.id, productName: product.name, destination, comment: comment || null, date: date ? new Date(date) : new Date() } });
  await prisma.auditLog.create({ data: { action: 'Движение', details: `${product.name} -> ${destination}` } });
  io.emit('products:updated');
  res.json({ product });
});

app.post('/api/products/bulk-move', authMiddleware, async (req, res) => {
  const { ids, destination, comment, date } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Нет товаров' });
  let status = 'Архив';
  if (destination.startsWith('Продан')) status = 'Продано';
  if (destination === 'Брак') status = 'Брак';
  await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status } });
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  for (const p of products) {
    await prisma.movement.create({ data: { productId: p.id, productName: p.name, destination, comment: comment || null, date: date ? new Date(date) : new Date() } });
  }
  await prisma.auditLog.create({ data: { action: 'Массовое движение', details: `${products.length} товаров -> ${destination}` } });
  io.emit('products:updated');
  res.json({ count: products.length });
});

app.post('/api/products/:id/return', authMiddleware, async (req, res) => {
  const old = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!old) return res.status(404).json({ error: 'Не найден' });
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { status: 'Активен' } });
  await prisma.movement.create({ data: { productId: product.id, productName: product.name, destination: 'Возврат на склад', comment: `Был: ${old.status}` } });
  await prisma.auditLog.create({ data: { action: 'Возврат', details: `${product.name} (${old.status} -> Активен)` } });
  io.emit('products:updated');
  res.json({ product });
});

// ====== MOVEMENTS ======
app.get('/api/movements', authMiddleware, async (req, res) => {
  const { from, to } = req.query;
  const where = {};
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to + 'T23:59:59');
  }
  const movements = await prisma.movement.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
  res.json(movements);
});

// ====== SUPPLIERS ======
app.get('/api/suppliers', authMiddleware, async (req, res) => res.json(await prisma.supplier.findMany()));
app.post('/api/suppliers', authMiddleware, async (req, res) => {
  const { name, phone, note } = req.body;
  if (!name) return res.status(400).json({ error: 'Имя обязательно' });
  const s = await prisma.supplier.create({ data: { name, phone: phone || '', note: note || '' } });
  await prisma.auditLog.create({ data: { action: 'Добавлен поставщик', details: s.name } });
  io.emit('suppliers:updated');
  res.status(201).json(s);
});
app.delete('/api/suppliers/:id', authMiddleware, async (req, res) => {
  const s = await prisma.supplier.delete({ where: { id: req.params.id } }).catch(() => null);
  if (!s) return res.status(404).json({ error: 'Не найден' });
  await prisma.auditLog.create({ data: { action: 'Удалён поставщик', details: s.name } });
  io.emit('suppliers:updated');
  res.json({ ok: true });
});

// ====== AUDIT LOG ======
app.get('/api/audit', authMiddleware, async (req, res) => {
  const { from, to } = req.query;
  const where = {};
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to + 'T23:59:59');
  }
  const log = await prisma.auditLog.findMany({ where, orderBy: { date: 'desc' }, take: 500 });
  res.json(log);
});

// ====== WAREHOUSE STATS ======
app.get('/api/warehouse-stats', authMiddleware, async (req, res) => {
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
  const stats = await Promise.all(warehouses.map(async w => {
    const all = await prisma.product.findMany({ where: { warehouse: w.name } });
    return { name: w.name, active: all.filter(p => p.status === 'Активен').length, sold: all.filter(p => p.status === 'Продано').length, defect: all.filter(p => p.status === 'Брак').length, total: all.length };
  }));
  res.json(stats);
});

// ====== STATISTICS ======
app.get('/api/statistics', authMiddleware, async (req, res) => {
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
  const warehouseStats = await Promise.all(warehouses.map(async w => {
    const all = await prisma.product.findMany({ where: { warehouse: w.name } });
    return {
      name: w.name,
      active: all.filter(p => p.status === 'Активен').length,
      sold: all.filter(p => p.status === 'Продано').length,
      defect: all.filter(p => p.status === 'Брак').length,
      totalValue: all.filter(p => p.status === 'Активен').reduce((s, p) => s + p.price, 0),
      products: all.map(p => ({
        name: p.name, imei: p.imei, price: p.price, status: p.status, category: p.category, supplier: p.supplier,
        daysOnStock: p.status === 'Активен' ? Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000) : null,
        daysToSell: p.status === 'Продано' ? Math.floor((new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()) / 86400000) : null,
      })),
    };
  }));
  res.json({ warehouseStats, totalProducts: await prisma.product.count() });
});

// ====== EXCEL EXPORT ======
app.post('/api/export/excel', authMiddleware, async (req, res) => {
  const { ids } = req.body;
  const where = Array.isArray(ids) && ids.length > 0 ? { id: { in: ids } } : {};
  const data = await prisma.product.findMany({ where });
  const rows = data.map(p => ({ 'Название': p.name, 'IMEI': p.imei || '', 'Цена': p.price, 'Поставщик': p.supplier || '', 'Склад': p.warehouse, 'Категория': p.category, 'Статус': p.status, 'Дата создания': new Date(p.createdAt).toLocaleDateString('ru-RU'), 'Дата изменения': new Date(p.updatedAt).toLocaleDateString('ru-RU') }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Товары');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');
  res.send(buf);
});

app.post('/api/export/statistics', authMiddleware, async (req, res) => {
  const data = await prisma.product.findMany();
  const rows = data.map(p => ({ 'Название': p.name, 'IMEI': p.imei || '', 'Цена': p.price, 'Склад': p.warehouse, 'Категория': p.category, 'Статус': p.status, 'Дней на складе': p.status === 'Активен' ? Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000) : '-', 'Дней до продажи': p.status === 'Продано' ? Math.floor((new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()) / 86400000) : '-', 'Дата добавления': new Date(p.createdAt).toLocaleDateString('ru-RU') }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Статистика');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=statistics.xlsx');
  res.send(buf);
});

// ====== HEALTH ======
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ====== SOCKET ======
io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Disconnected:', socket.id));
});

// ====== SERVE FRONTEND ======
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));

// ====== START ======
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedDefaults();
});
