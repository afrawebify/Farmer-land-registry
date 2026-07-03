const express = require('express');
const Farmer = require('../models/Farmer');

const router = express.Router();

function isValidPoint(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isValidPolygon(plot) {
  if (!plot || plot.type !== 'Polygon' || !Array.isArray(plot.coordinates)) {
    return false;
  }

  const ring = plot.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    return false;
  }

  const [firstLng, firstLat] = ring[0];
  const [lastLng, lastLat] = ring[ring.length - 1];
  return firstLng === lastLng && firstLat === lastLat;
}

router.get('/', async (req, res, next) => {
  try {
    const farmers = await Farmer.find({}).sort({ registeredAt: -1 });
    res.json(farmers);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, cropType, plotSize, plot, location } = req.body;

    if (!name || !phone || !cropType || plotSize === undefined) {
      return res.status(400).json({ message: 'Name, phone, crop type, and plot size are required.' });
    }

    if (!isValidPolygon(plot)) {
      return res.status(400).json({ message: 'Draw a valid closed plot boundary before saving.' });
    }

    const [lng, lat] = location?.coordinates || [];
    if (!isValidPoint(lat, lng)) {
      return res.status(400).json({ message: 'Plot center must be a valid GeoJSON point.' });
    }

    const farmer = await Farmer.create(req.body);
    res.status(201).json(farmer);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const updates = {
      ...req.body,
      updatedAt: new Date()
    };
    const farmer = await Farmer.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }

    res.json(farmer);
  } catch (error) {
    next(error);
  }
});

router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, km = 5 } = req.query;
    const radiusKm = Number(km);

    if (!isValidPoint(lat, lng) || !Number.isFinite(radiusKm) || radiusKm <= 0) {
      return res.status(400).json({ message: 'Provide valid lat, lng, and km query values.' });
    }

    const farmers = await Farmer.find({
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: radiusKm * 1000
        }
      }
    });

    res.json(farmers);
  } catch (error) {
    next(error);
  }
});

router.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

module.exports = router;
