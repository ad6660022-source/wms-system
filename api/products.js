const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all products + aggregate stocks
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        stocks: {
          include: { warehouse: true }
        }
      }
    });

    // Calculate total stock for each product
    const enhanced = products.map(p => {
      const totalAvailable = p.stocks.reduce((acc, s) => acc + (s.quantity - s.reserved), 0);
      const totalReserved = p.stocks.reduce((acc, s) => acc + s.reserved, 0);
      return { ...p, totalAvailable, totalReserved };
    });

    res.json(enhanced);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products: ' + error.message });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const { sku, barcode, name, category, purchasePrice, retailPrice, unit, minStock } = req.body;
    const product = await prisma.product.create({
      data: {
        sku, 
        barcode, 
        name, 
        category,
        unit: unit || 'шт',
        minStock: Number(minStock) || 0,
        purchasePrice: Number(purchasePrice) || 0, 
        retailPrice: Number(retailPrice) || 0
      }
    });
    
    // Broadcast via socket
    const io = req.app.get('socketio');
    if (io) io.emit('product:created', product);

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
