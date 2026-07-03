# Farmer Land Registry

A React, Leaflet, Express, and MongoDB project where farmers can sign in, draw their plot boundary, register crop and land details, view all plots, and find plots within a radius from a selected point.

## Run the Project

1. Install dependencies:

   ```bash
   npm install
   ```

   On Windows PowerShell, use `npm.cmd install` if script execution is blocked.

2. Copy `.env.example` to `.env` and update `MONGODB_URI` if needed.

3. Start MongoDB locally, or use a MongoDB Atlas connection string.

4. Run both frontend and backend:

   ```bash
   npm run dev
   ```

   On Windows PowerShell, use `npm.cmd run dev` if needed.

5. Open the React app:

   ```text
   http://127.0.0.1:5173
   ```

## Main Features

- Farmer login using phone number.
- Draw plot boundaries directly on a Leaflet map.
- Register farmer details, crop type, plot size, phone, village, district, and notes.
- Store plot boundaries as GeoJSON polygons.
- Store a GeoJSON center point with a `2dsphere` index for nearby-radius search.
- Show all registered plots and click plots to inspect details.
- Select a map point and search for plots within a radius.

## API Endpoints

- `GET /health`
- `GET /farmers`
- `POST /farmers`
- `PUT /farmers/:id`
- `GET /farmers/nearby?lat=10.52&lng=76.21&km=5`

## Coordinate Note

Leaflet works with `[latitude, longitude]`, but GeoJSON and MongoDB store coordinates as `[longitude, latitude]`. The app converts between both formats before saving and displaying plot data.
