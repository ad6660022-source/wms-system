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

// ====== PRODUCTS API ======
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const { name, imei, price, supplier, warehouse } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });

  const product = {
    id: uuidv4(),
    name,
    imei: imei || null,
    price: Number(price) || 0,
    supplier: supplier || null,
    warehouse: warehouse || 'Василий',
    status: 'Активен',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  products.push(product);
  io.emit('products:updated');
  res.status(201).json(product);
});

app.post('/api/products/:id/move', (req, res) => {
  const { id } = req.params;
  const { destination, comment, date } = req.body;

  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Товар не найден' });

  let newStatus = 'Архив';
  if (destination === 'Брак') newStatus = 'Брак';

  product.status = newStatus;
  product.updatedAt = new Date().toISOString();

  const movement = {
    id: uuidv4(),
    productId: id,
    productName: product.name,
    destination,
    comment: comment || null,
    date: date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  movements.push(movement);
  io.emit('products:updated');
  res.json({ product, movement });
});

// ====== MOVEMENTS API ======
app.get('/api/movements', (req, res) => {
  res.json(movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
