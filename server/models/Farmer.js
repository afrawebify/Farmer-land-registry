const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return (
            value.length === 2 &&
            value.every((number) => Number.isFinite(number)) &&
            value[0] >= -180 &&
            value[0] <= 180 &&
            value[1] >= -90 &&
            value[1] <= 90
          );
        },
        message: 'Coordinates must be [longitude, latitude].'
      }
    }
  },
  { _id: false }
);

const polygonSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true
    },
    coordinates: {
      type: [[[Number]]],
      required: true
    }
  },
  { _id: false }
);

const farmerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  cropType: { type: String, required: true, trim: true },
  plotSize: { type: Number, required: true, min: 0 },
  village: { type: String, trim: true, default: '' },
  district: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  plot: { type: polygonSchema, required: true },
  location: { type: pointSchema, required: true },
  registeredAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

farmerSchema.index({ location: '2dsphere' });

farmerSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Farmer', farmerSchema);
