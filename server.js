const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// ====== IN-MEMORY STORAGE ======
const products = [];
const movements = [];
const suppliers = [];
const auditLog = [];

function addAudit(action, details) {
  auditLog.unshift({ id: uuidv4(), action, details, date: new Date().toISOString() });
  if (auditLog.length > 500) auditLog.pop();
}

// ====== PRODUCTS ======
app.get('/api/products', (req, res) => res.json(products));

app.post('/api/products', (req, res) => {
  const { name, imei, price, supplier, warehouse, category } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  const product = {
    id: uuidv4(), name, imei: imei || null, price: Number(price) || 0,
    supplier: supplier || null, warehouse: warehouse || 'Василий',
    category: category || 'Без категории', status: 'Активен',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  products.push(product);
  addAudit('Добавлен товар', `${product.name} (${product.warehouse})`);
  io.emit('products:updated');
  res.status(201).json(product);
});

app.put('/api/products/:id', (req, res) => {
  const p = products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Не найден' });
  const { name, imei, price, supplier, warehouse, category } = req.body;
  if (name !== undefined) p.name = name;
  if (imei !== undefined) p.imei = imei;
  if (price !== undefined) p.price = Number(price);
  if (supplier !== undefined) p.supplier = supplier;
  if (warehouse !== undefined) p.warehouse = warehouse;
  if (category !== undefined) p.category = category;
  p.updatedAt = new Date().toISOString();
  addAudit('Отредактирован', p.name);
  io.emit('products:updated');
  res.json(p);
});

app.delete('/api/products/:id', (req, res) => {
  const idx = products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Не найден' });
  const removed = products.splice(idx, 1)[0];
  addAudit('Удален', removed.name);
  io.emit('products:updated');
  res.json({ ok: true });
});

app.post('/api/products/:id/move', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Не найден' });
  const { destination, comment, date } = req.body;
  let newStatus = 'Архив';
  if (destination.startsWith('Продан')) newStatus = 'Продано';
  if (destination === 'Брак') newStatus = 'Брак';
  product.status = newStatus;
  product.updatedAt = new Date().toISOString();
  movements.push({
    id: uuidv4(), productId: product.id, productName: product.name,
    destination, comment: comment || null,
    date: date || new Date().toISOString(), createdAt: new Date().toISOString(),
  });
  addAudit('Движение', `${product.name} -> ${destination}`);
  io.emit('products:updated');
  res.json({ product });
});

// BULK MOVE — multiple products at once
app.post('/api/products/bulk-move', (req, res) => {
  const { ids, destination, comment, date } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Нет товаров' });
  let newStatus = 'Архив';
  if (destination.startsWith('Продан')) newStatus = 'Продано';
  if (destination === 'Брак') newStatus = 'Брак';
  const moved = [];
  ids.forEach(id => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    product.status = newStatus;
    product.updatedAt = new Date().toISOString();
    movements.push({
      id: uuidv4(), productId: product.id, productName: product.name,
      destination, comment: comment || null,
      date: date || new Date().toISOString(), createdAt: new Date().toISOString(),
    });
    moved.push(product.name);
  });
  addAudit('Массовое движение', `${moved.length} товаров -> ${destination}`);
  io.emit('products:updated');
  res.json({ count: moved.length });
});

app.post('/api/products/:id/return', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Не найден' });
  const oldStatus = product.status;
  product.status = 'Активен';
  product.updatedAt = new Date().toISOString();
  movements.push({
    id: uuidv4(), productId: product.id, productName: product.name,
    destination: 'Возврат на склад', comment: `Был: ${oldStatus}`,
    date: new Date().toISOString(), createdAt: new Date().toISOString(),
  });
  addAudit('Возврат', `${product.name} (${oldStatus} -> Активен)`);
  io.emit('products:updated');
  res.json({ product });
});

// ====== MOVEMENTS ======
app.get('/api/movements', (req, res) => {
  res.json(movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// ====== SUPPLIERS ======
app.get('/api/suppliers', (req, res) => res.json(suppliers));
app.post('/api/suppliers', (req, res) => {
  const { name, phone, note } = req.body;
  if (!name) return res.status(400).json({ error: 'Имя обязательно' });
  const s = { id: uuidv4(), name, phone: phone || '', note: note || '' };
  suppliers.push(s);
  addAudit('Добавлен поставщик', s.name);
  io.emit('suppliers:updated');
  res.status(201).json(s);
});
app.delete('/api/suppliers/:id', (req, res) => {
  const idx = suppliers.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Не найден' });
  const removed = suppliers.splice(idx, 1)[0];
  addAudit('Удален поставщик', removed.name);
  io.emit('suppliers:updated');
  res.json({ ok: true });
});

// ====== AUDIT LOG ======
app.get('/api/audit', (req, res) => res.json(auditLog));

// ====== WAREHOUSE STATS ======
app.get('/api/warehouse-stats', (req, res) => {
  const warehouses = ['Василий', 'Анна'];
  const stats = warehouses.map(w => {
    const all = products.filter(p => p.warehouse === w);
    return {
      name: w,
      active: all.filter(p => p.status === 'Активен').length,
      sold: all.filter(p => p.status === 'Продано').length,
      defect: all.filter(p => p.status === 'Брак').length,
      total: all.length,
    };
  });
  res.json(stats);
});

// ====== STATISTICS ======
app.get('/api/statistics', (req, res) => {
  const warehouses = ['Василий', 'Анна'];
  const warehouseStats = warehouses.map(w => {
    const all = products.filter(p => p.warehouse === w);
    return {
      name: w,
      active: all.filter(p => p.status === 'Активен').length,
      sold: all.filter(p => p.status === 'Продано').length,
      defect: all.filter(p => p.status === 'Брак').length,
      totalValue: all.filter(p => p.status === 'Активен').reduce((s, p) => s + p.price, 0),
      products: all.map(p => ({
        name: p.name, imei: p.imei, price: p.price, status: p.status,
        category: p.category, supplier: p.supplier,
        createdAt: p.createdAt, updatedAt: p.updatedAt,
        daysOnStock: p.status === 'Активен'
          ? Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000)
          : null,
        daysToSell: p.status === 'Продано'
          ? Math.floor((new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()) / 86400000)
          : null,
      })),
    };
  });
  res.json({ warehouseStats, totalProducts: products.length });
});

// ====== EXCEL EXPORT ======
app.post('/api/export/excel', (req, res) => {
  const { ids } = req.body; // if ids provided, export only those; else export all
  let data = products;
  if (Array.isArray(ids) && ids.length > 0) {
    data = products.filter(p => ids.includes(p.id));
  }
  const rows = data.map(p => ({
    'Название': p.name,
    'IMEI': p.imei || '',
    'Цена': p.price,
    'Поставщик': p.supplier || '',
    'Склад': p.warehouse,
    'Категория': p.category,
    'Статус': p.status,
    'Дата создания': new Date(p.createdAt).toLocaleDateString('ru-RU'),
    'Дата изменения': new Date(p.updatedAt).toLocaleDateString('ru-RU'),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Товары');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');
  res.send(buf);
});

app.post('/api/export/statistics', (req, res) => {
  const rows = products.map(p => ({
    'Название': p.name,
    'IMEI': p.imei || '',
    'Цена': p.price,
    'Склад': p.warehouse,
    'Категория': p.category,
    'Статус': p.status,
    'Дней на складе': p.status === 'Активен'
      ? Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000)
      : '-',
    'Дней до продажи': p.status === 'Продано'
      ? Math.floor((new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()) / 86400000)
      : '-',
    'Дата добавления': new Date(p.createdAt).toLocaleDateString('ru-RU'),
  }));
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
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Disconnected:', socket.id));
});

// ====== SERVE FRONTEND ======
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
