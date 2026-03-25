const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const { name, imei, price, supplier, warehouse } = req.body;
    const product = await prisma.product.create({
      data: {
        name,
        imei: imei || null,
        price: Number(price) || 0,
        supplier: supplier || null,
        warehouse: warehouse || 'Василий',
        status: 'Активен'
      }
    });

    const io = req.app.get('socketio');
    if (io) io.emit('products:updated');

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product status + create movement
router.post('/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { destination, comment, date } = req.body;

    // Determine new status based on destination
    let newStatus = 'Архив';
    if (destination === 'Брак') newStatus = 'Брак';
    if (destination === 'Потеря') newStatus = 'Архив';

    // Create movement record
    const movement = await prisma.movement.create({
      data: {
        productId: id,
        destination,
        comment: comment || null,
        date: date ? new Date(date) : new Date()
      }
    });

    // Update product status
    const product = await prisma.product.update({
      where: { id },
      data: { status: newStatus }
    });

    const io = req.app.get('socketio');
    if (io) io.emit('products:updated');

    res.json({ product, movement });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
