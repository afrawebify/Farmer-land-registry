require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const farmerRoutes = require('../server/routes/farmers');

const app = express();

let mongoPromise;

async function connectDb(req, res, next) {
  try {
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ message: 'MONGODB_URI is not configured.' });
    }

    if (!mongoPromise) {
      mongoPromise = mongoose.connect(process.env.MONGODB_URI);
    }

    await mongoPromise;
    next();
  } catch (error) {
    next(error);
  }
}

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'farmer-land-registry' });
});

app.use(connectDb);
app.use('/api/farmers', farmerRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

module.exports = app;
