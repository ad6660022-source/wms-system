const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { locations: true }
    });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, address } = req.body;
    const warehouse = await prisma.warehouse.create({
      data: { name, address }
    });
    
    const io = req.app.get('socketio');
    if (io) io.emit('warehouse:created', warehouse);
    
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
