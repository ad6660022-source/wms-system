const express = require('express');
const fs = require('fs');
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

loadEnvFile(path.join(__dirname, '.env'));

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const FALLBACK_JWT_SECRET = 'sklad-default-insecure-secret-change-me';
const FALLBACK_FIRST_ADMIN_PASSWORD = 'admin12345';
const config = getRuntimeConfig();
const STATUS_IN_STOCK = 'Склад';
const STATUS_SOLD = 'Продан';
const STATUS_DEFECT = 'Брак';
const STATUS_ARCHIVE = 'Архив';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Environment variable ${name} is required. Set it in the shell or .env file.`);
  }
  return value;
}

function getRuntimeConfig() {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    console.warn('[config] JWT_SECRET is not set. Using insecure fallback secret. Set JWT_SECRET in .env or the deployment environment.');
  }
  return {
    jwtSecret: jwtSecret || FALLBACK_JWT_SECRET,
    firstAdminPassword: process.env.FIRST_ADMIN_PASSWORD || '',
  };
}

function normalizeRequiredText(value, fieldName) {
  const normalized = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!normalized) {
    throw createValidationError(`${fieldName} обязательно`);
  }
  return normalized;
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function normalizeImei(value) {
  if (value === undefined || value === null || value === '') return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 20) {
    throw createValidationError('IMEI должен содержать от 8 до 20 цифр');
  }
  return digits;
}

function normalizePrice(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createValidationError('Цена обязательна');
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createValidationError('Цена должна быть числом не меньше 0');
  }
  return parsed;
}

function createValidationError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getErrorStatus(error) {
  return Number.isInteger(error?.status) ? error.status : 500;
}

function getErrorMessage(error, fallback = 'Внутренняя ошибка сервера') {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function ensureUniqueImei(imei, excludeId) {
  if (!imei) return;
  const existing = await prisma.product.findFirst({
    where: {
      imei,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, name: true },
  });
  if (existing) {
    throw createValidationError(`IMEI уже используется у товара "${existing.name}"`, 409);
  }
}

async function ensureWarehouseExists(name) {
  const warehouse = await prisma.warehouse.findUnique({ where: { name } });
  if (!warehouse) throw createValidationError('Выбранный склад не найден');
}

async function ensureCategoryExists(name) {
  const category = await prisma.category.findUnique({ where: { name } });
  if (!category) throw createValidationError('Выбранная категория не найдена');
}

async function findCaseInsensitiveWarehouse(name) {
  const warehouses = await prisma.warehouse.findMany({ select: { id: true, name: true } });
  return warehouses.find(item => item.name.toLowerCase() === name.toLowerCase()) || null;
}

async function findCaseInsensitiveCategory(name) {
  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  return categories.find(item => item.name.toLowerCase() === name.toLowerCase()) || null;
}

async function parseProductInput(body, { partial = false } = {}) {
  body = body || {};
  const data = {};

  if (!partial || body.name !== undefined) {
    data.name = normalizeRequiredText(body.name, 'Название');
  }

  if (!partial || body.price !== undefined) {
    data.price = normalizePrice(body.price, { required: !partial });
  }

  if (!partial || body.salePrice !== undefined) {
    data.salePrice = normalizePrice(body.salePrice);
  }

  if (!partial || body.imei !== undefined) {
    data.imei = normalizeImei(body.imei);
  }

  if (!partial || body.supplier !== undefined) {
    data.supplier = normalizeOptionalText(body.supplier);
  }

  if (!partial || body.warehouse !== undefined) {
    data.warehouse = normalizeRequiredText(body.warehouse ?? 'Василий', 'Склад');
    await ensureWarehouseExists(data.warehouse);
  }

  if (!partial || body.category !== undefined) {
    data.category = normalizeRequiredText(body.category ?? 'Без категории', 'Категория');
    await ensureCategoryExists(data.category);
  }

  return data;
}

function isSoldStatus(status) {
  return status === STATUS_SOLD || status === 'Продано';
}

function isStockStatus(status) {
  return status === STATUS_IN_STOCK || status === 'Активен';
}

function getProductSaleAmount(product) {
  return Number(product.salePrice ?? product.price ?? 0);
}

function getProductCostAmount(product) {
  return Number(product.price ?? 0);
}

function getSoldDate(product) {
  return product.soldAt ? new Date(product.soldAt) : new Date(product.updatedAt);
}

function getMovementStatus(destination) {
  if (typeof destination === 'string' && destination.startsWith('Продан')) return STATUS_SOLD;
  if (destination === STATUS_DEFECT) return STATUS_DEFECT;
  return STATUS_ARCHIVE;
}

function getDatePeriodStats(products, startDate) {
  const filtered = products.filter(product => getSoldDate(product) >= startDate);
  return {
    count: filtered.length,
    revenue: filtered.reduce((sum, product) => sum + getProductSaleAmount(product), 0),
  };
}

// ====== AUTH MIDDLEWARE ======
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  try {
    jwt.verify(token, config.jwtSecret);
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
  await prisma.product.updateMany({ where: { status: 'Активен' }, data: { status: STATUS_IN_STOCK } });
  await prisma.product.updateMany({ where: { status: 'Продано' }, data: { status: STATUS_SOLD } });
  // First admin password via env
  const existing = await prisma.setting.findUnique({ where: { key: 'password' } });
  if (!existing && config.firstAdminPassword.trim()) {
    if (config.firstAdminPassword.trim().length < 8) {
      throw new Error('FIRST_ADMIN_PASSWORD must be at least 8 characters long');
    }
    const hashed = await bcrypt.hash(config.firstAdminPassword.trim(), 10);
    await prisma.setting.create({ data: { key: 'password', value: hashed } });
    console.log('Admin password initialized from FIRST_ADMIN_PASSWORD');
  }
  if (!existing && !config.firstAdminPassword.trim()) {
    const hashed = await bcrypt.hash(FALLBACK_FIRST_ADMIN_PASSWORD, 10);
    await prisma.setting.create({ data: { key: 'password', value: hashed } });
    console.warn(`Admin password was auto-initialized with insecure fallback password: ${FALLBACK_FIRST_ADMIN_PASSWORD}`);
  }
}

// ====== AUTH ======
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  const setting = await prisma.setting.findUnique({ where: { key: 'password' } });
  if (!setting) return res.status(503).json({ error: 'Вход ещё не настроен. Укажите FIRST_ADMIN_PASSWORD в .env и перезапустите сервер.' });
  const ok = await bcrypt.compare(password, setting.value);
  if (!ok) return res.status(401).json({ error: 'Неверный пароль' });
  const token = jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: '30d' });
  res.json({ token });
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { newPassword } = req.body;
  const normalizedPassword = typeof newPassword === 'string' ? newPassword.trim() : '';
  if (normalizedPassword.length < 8) return res.status(400).json({ error: 'Минимум 8 символов' });
  const hashed = await bcrypt.hash(normalizedPassword, 10);
  await prisma.setting.update({ where: { key: 'password' }, data: { value: hashed } });
  await prisma.auditLog.create({ data: { action: 'Смена пароля', details: 'Пароль обновлён' } });
  res.json({ ok: true });
});

// ====== WAREHOUSES & CATEGORIES (public for settings page) ======
app.get('/api/warehouses', authMiddleware, async (req, res) => {
  res.json(await prisma.warehouse.findMany({ orderBy: { name: 'asc' } }));
});
app.post('/api/warehouses', authMiddleware, async (req, res) => {
  try {
    const name = normalizeRequiredText(req.body?.name, 'Название склада');
    const duplicate = await findCaseInsensitiveWarehouse(name);
    if (duplicate) return res.status(409).json({ error: 'Склад с таким названием уже существует' });
    const w = await prisma.warehouse.create({ data: { name } });
    await prisma.auditLog.create({ data: { action: 'Добавлен склад', details: name } });
    io.emit('settings:updated');
    res.status(201).json(w);
  } catch (error) {
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error) });
  }
});
app.delete('/api/warehouses/:id', authMiddleware, async (req, res) => {
  const current = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: 'Не найден' });
  const usedCount = await prisma.product.count({ where: { warehouse: current.name } });
  if (usedCount > 0) {
    return res.status(409).json({ error: `Нельзя удалить склад "${current.name}": он используется в ${usedCount} товар(ах)` });
  }
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
  try {
    const name = normalizeRequiredText(req.body?.name, 'Название категории');
    const duplicate = await findCaseInsensitiveCategory(name);
    if (duplicate) return res.status(409).json({ error: 'Категория с таким названием уже существует' });
    const c = await prisma.category.create({ data: { name } });
    await prisma.auditLog.create({ data: { action: 'Добавлена категория', details: name } });
    io.emit('settings:updated');
    res.status(201).json(c);
  } catch (error) {
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error) });
  }
});
app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  const current = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: 'Не найден' });
  const usedCount = await prisma.product.count({ where: { category: current.name } });
  if (usedCount > 0) {
    return res.status(409).json({ error: `Нельзя удалить категорию "${current.name}": она используется в ${usedCount} товар(ах)` });
  }
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
  try {
    const data = await parseProductInput(req.body);
    await ensureUniqueImei(data.imei);
    const product = await prisma.product.create({
      data: { ...data, status: STATUS_IN_STOCK }
    });
    await prisma.auditLog.create({ data: { action: 'Добавлен товар', details: `${product.name} (${product.warehouse})` } });
    io.emit('products:updated');
    res.status(201).json(product);
  } catch (error) {
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error) });
  }
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Не найден' });
    const data = await parseProductInput(req.body, { partial: true });
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }
    await ensureUniqueImei(data.imei, req.params.id);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data
    });
    await prisma.auditLog.create({ data: { action: 'Отредактирован', details: product.name } });
    io.emit('products:updated');
    res.json(product);
  } catch (error) {
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error) });
  }
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
  const { destination, comment, date, orderNumber, salePrice } = req.body;
  if (!destination || typeof destination !== 'string') {
    return res.status(400).json({ error: 'Укажите направление перемещения' });
  }
  const status = getMovementStatus(destination);
  const normalizedOrderNumber = typeof orderNumber === 'string' ? orderNumber.trim() : '';
  const normalizedSalePrice = normalizePrice(salePrice);
  if (status === STATUS_SOLD && !normalizedOrderNumber) {
    return res.status(400).json({ error: 'Номер заказа обязателен для продажи' });
  }
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Не найден' });
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      status,
      orderNumber: status === STATUS_SOLD ? normalizedOrderNumber : null,
      salePrice: status === STATUS_SOLD ? (normalizedSalePrice ?? existing.salePrice ?? existing.price) : existing.salePrice,
      soldAt: status === STATUS_SOLD ? (date ? new Date(date) : new Date()) : existing.soldAt,
    }
  }).catch(() => null);
  if (!product) return res.status(404).json({ error: 'Не найден' });
  await prisma.movement.create({
    data: {
      productId: product.id,
      productName: product.name,
      orderNumber: status === STATUS_SOLD ? normalizedOrderNumber : null,
      destination,
      comment: comment || null,
      date: date ? new Date(date) : new Date()
    }
  });
  await prisma.auditLog.create({
    data: {
      action: 'Движение',
      details: `${product.name} -> ${destination}${status === STATUS_SOLD ? ` (Заказ №${normalizedOrderNumber})` : ''}`
    }
  });
  io.emit('products:updated');
  res.json({ product });
});

app.post('/api/products/bulk-move', authMiddleware, async (req, res) => {
  const { ids, destination, comment, date, orderNumber, salePrice } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Нет товаров' });
  if (!destination || typeof destination !== 'string') return res.status(400).json({ error: 'Укажите направление перемещения' });
  const status = getMovementStatus(destination);
  const normalizedOrderNumber = typeof orderNumber === 'string' ? orderNumber.trim() : '';
  const normalizedSalePrice = normalizePrice(salePrice);
  if (status === STATUS_SOLD && !normalizedOrderNumber) {
    return res.status(400).json({ error: 'Номер заказа обязателен для продажи' });
  }
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  for (const p of products) {
    await prisma.product.update({
      where: { id: p.id },
      data: {
        status,
        orderNumber: status === STATUS_SOLD ? normalizedOrderNumber : null,
        salePrice: status === STATUS_SOLD ? (normalizedSalePrice ?? p.salePrice ?? p.price) : p.salePrice,
        soldAt: status === STATUS_SOLD ? (date ? new Date(date) : new Date()) : p.soldAt,
      }
    });
    await prisma.movement.create({
      data: {
        productId: p.id,
        productName: p.name,
        orderNumber: status === STATUS_SOLD ? normalizedOrderNumber : null,
        destination,
        comment: comment || null,
        date: date ? new Date(date) : new Date()
      }
    });
  }
  await prisma.auditLog.create({
    data: {
      action: 'Массовое движение',
      details: `${products.length} товаров -> ${destination}${status === STATUS_SOLD ? ` (Заказ №${normalizedOrderNumber})` : ''}`
    }
  });
  io.emit('products:updated');
  res.json({ count: products.length });
});

app.post('/api/products/:id/return', authMiddleware, async (req, res) => {
  const old = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!old) return res.status(404).json({ error: 'Не найден' });
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { status: STATUS_IN_STOCK, orderNumber: null, soldAt: null } });
  await prisma.movement.create({
    data: {
      productId: product.id,
      productName: product.name,
      orderNumber: old.orderNumber,
      destination: 'Возврат на склад',
      comment: `Был: ${old.status}${old.orderNumber ? `, заказ №${old.orderNumber}` : ''}`
    }
  });
  await prisma.auditLog.create({
    data: {
      action: 'Возврат',
      details: `${product.name} (${old.status} -> ${STATUS_IN_STOCK}${old.orderNumber ? `, заказ №${old.orderNumber}` : ''})`
    }
  });
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
    return {
      name: w.name,
      active: all.filter(p => isStockStatus(p.status)).length,
      sold: all.filter(p => isSoldStatus(p.status)).length,
      defect: all.filter(p => p.status === STATUS_DEFECT).length,
      total: all.length
    };
  }));
  res.json(stats);
});

// ====== STATISTICS ======
app.get('/api/statistics', authMiddleware, async (req, res) => {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(dayStart);
  monthStart.setDate(1);

  const allProducts = await prisma.product.findMany({ orderBy: { updatedAt: 'desc' } });
  const soldProducts = allProducts.filter(p => isSoldStatus(p.status));
  const stockProducts = allProducts.filter(p => isStockStatus(p.status));
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
  const warehouseStats = await Promise.all(warehouses.map(async w => {
    const all = allProducts.filter(product => product.warehouse === w.name);
    return {
      name: w.name,
      active: all.filter(p => isStockStatus(p.status)).length,
      sold: all.filter(p => isSoldStatus(p.status)).length,
      defect: all.filter(p => p.status === STATUS_DEFECT).length,
      totalValue: all.filter(p => isStockStatus(p.status)).reduce((s, p) => s + getProductCostAmount(p), 0),
      products: all.map(p => ({
        name: p.name,
        imei: p.imei,
        purchasePrice: p.price,
        salePrice: p.salePrice,
        status: p.status,
        category: p.category,
        supplier: p.supplier,
        daysOnStock: isStockStatus(p.status) ? Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000) : null,
        daysToSell: isSoldStatus(p.status) ? Math.floor((getSoldDate(p).getTime() - new Date(p.createdAt).getTime()) / 86400000) : null,
      })),
    };
  }));

  const trend = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(dayStart);
    date.setDate(dayStart.getDate() - (13 - index));
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    const productsForDay = soldProducts.filter(product => {
      const soldAt = getSoldDate(product);
      return soldAt >= date && soldAt < nextDate;
    });
    return {
      label: date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      count: productsForDay.length,
      revenue: productsForDay.reduce((sum, product) => sum + getProductSaleAmount(product), 0),
    };
  });

  res.json({
    warehouseStats,
    totalProducts: allProducts.length,
    inventory: {
      count: stockProducts.length,
      value: stockProducts.reduce((sum, product) => sum + getProductCostAmount(product), 0),
      soldCount: soldProducts.length,
      soldRevenue: soldProducts.reduce((sum, product) => sum + getProductSaleAmount(product), 0),
      defectCount: allProducts.filter(product => product.status === STATUS_DEFECT).length,
    },
    sales: {
      day: getDatePeriodStats(soldProducts, dayStart),
      week: getDatePeriodStats(soldProducts, weekStart),
      month: getDatePeriodStats(soldProducts, monthStart),
      all: {
        count: soldProducts.length,
        revenue: soldProducts.reduce((sum, product) => sum + getProductSaleAmount(product), 0),
      }
    },
    trend,
  });
});

// ====== EXCEL EXPORT ======
app.post('/api/export/excel', authMiddleware, async (req, res) => {
  const { ids } = req.body;
  const where = Array.isArray(ids) && ids.length > 0 ? { id: { in: ids } } : {};
  const data = await prisma.product.findMany({ where });
  const rows = data.map(p => ({
    'Название': p.name,
    'IMEI': p.imei || '',
    'Номер заказа': p.orderNumber || '',
    'Цена закупки': p.price,
    'Цена продажи': p.salePrice ?? '',
    'Поставщик': p.supplier || '',
    'Склад': p.warehouse,
    'Категория': p.category,
    'Статус': p.status,
    'Дата создания': new Date(p.createdAt).toLocaleDateString('ru-RU'),
    'Дата изменения': new Date(p.updatedAt).toLocaleDateString('ru-RU')
  }));
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
  const rows = data.map(p => ({
    'Название': p.name,
    'IMEI': p.imei || '',
    'Номер заказа': p.orderNumber || '',
    'Цена закупки': p.price,
    'Цена продажи': p.salePrice ?? '',
    'Склад': p.warehouse,
    'Категория': p.category,
    'Статус': p.status,
    'Дней на складе': isStockStatus(p.status) ? Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000) : '-',
    'Дней до продажи': isSoldStatus(p.status) ? Math.floor((getSoldDate(p).getTime() - new Date(p.createdAt).getTime()) / 86400000) : '-',
    'Дата добавления': new Date(p.createdAt).toLocaleDateString('ru-RU')
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Статистика');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=statistics.xlsx');
  res.send(buf);
});

app.get('/api/export/import-template', authMiddleware, async (req, res) => {
  const rows = [
    {
      'Название': 'iPhone 15',
      'IMEI': '123456789012345',
      'Цена закупки': 70000,
      'Цена продажи': 79990,
      'Поставщик': 'ООО Поставка',
      'Склад': 'Василий',
      'Категория': 'Телефоны',
    }
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Шаблон');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.xlsx');
  res.send(buf);
});

app.post('/api/import/excel', authMiddleware, async (req, res) => {
  try {
    const { fileData } = req.body || {};
    if (!Array.isArray(fileData) || fileData.length === 0) {
      return res.status(400).json({ error: 'Файл Excel не передан' });
    }
    const buffer = Buffer.from(fileData);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return res.status(400).json({ error: 'В файле нет листов' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Файл пустой' });
    }

    let importedCount = 0;
    const errors = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      try {
        const data = await parseProductInput({
          name: row['Название'],
          imei: row['IMEI'],
          price: row['Цена закупки'] ?? row['Цена'],
          salePrice: row['Цена продажи'],
          supplier: row['Поставщик'],
          warehouse: row['Склад'],
          category: row['Категория'],
        });
        await ensureUniqueImei(data.imei);
        await prisma.product.create({ data: { ...data, status: STATUS_IN_STOCK } });
        importedCount += 1;
      } catch (error) {
        errors.push(`Строка ${index + 2}: ${getErrorMessage(error)}`);
      }
    }

    if (importedCount > 0) {
      await prisma.auditLog.create({ data: { action: 'Импорт Excel', details: `Импортировано товаров: ${importedCount}` } });
      io.emit('products:updated');
    }

    res.json({ importedCount, errors });
  } catch (error) {
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error) });
  }
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
