const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// ====== IN-MEMORY STORAGE ======
const products = [];
const movements = [];
const suppliers = [
  { id: uuidv4(), name: 'Поставщик 1', phone: '', note: '' },
];
const auditLog = [];
const notifications = [];

function addAudit(action, details) {
  auditLog.unshift({ id: uuidv4(), action, details, date: new Date().toISOString() });
  if (auditLog.length > 500) auditLog.pop();
}

function addNotification(text) {
  notifications.unshift({ id: uuidv4(), text, date: new Date().toISOString(), read: false });
  io.emit('notification', { text });
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
  addAudit('Отредактирован товар', p.name);
  io.emit('products:updated');
  res.json(p);
});

app.delete('/api/products/:id', (req, res) => {
  const idx = products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Не найден' });
  const removed = products.splice(idx, 1)[0];
  addAudit('Удален товар', removed.name);
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
  addAudit('Движение товара', `${product.name} -> ${destination}`);
  io.emit('products:updated');
  res.json({ product });
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
  addAudit('Возврат товара', `${product.name} (${oldStatus} -> Активен)`);
  addNotification(`Товар "${product.name}" возвращен на склад`);
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

// ====== NOTIFICATIONS ======
app.get('/api/notifications', (req, res) => res.json(notifications));

// ====== EXPORT CSV ======
app.get('/api/export/products', (req, res) => {
  const header = 'Название,IMEI,Цена,Поставщик,Склад,Категория,Статус,Дата\n';
  const rows = products.map(p =>
    `"${p.name}","${p.imei || ''}",${p.price},"${p.supplier || ''}","${p.warehouse}","${p.category}","${p.status}","${new Date(p.updatedAt).toLocaleDateString('ru-RU')}"`
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
  res.send('\uFEFF' + header + rows);
});

// ====== HEALTH ======
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ====== SOCKET ======
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// ====== SERVE FRONTEND ======
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
