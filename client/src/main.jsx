import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet-draw';
import {
  Circle,
  Crosshair,
  LogOut,
  MapPin,
  RefreshCw,
  Save,
  Search,
  Sprout,
  UserRound
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const DEFAULT_CENTER = [10.5276, 76.2711];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function polygonCenter(latLngs) {
  const points = latLngs[0] || latLngs;
  const total = points.reduce(
    (sum, point) => ({
      lat: sum.lat + point.lat,
      lng: sum.lng + point.lng
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length
  };
}

function latLngsToGeoJsonPolygon(latLngs) {
  const points = latLngs[0] || latLngs;
  const ring = points.map((point) => [point.lng, point.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }

  return {
    type: 'Polygon',
    coordinates: [ring]
  };
}

function geoJsonPolygonToLatLngs(plot) {
  return plot.coordinates[0].map(([lng, lat]) => [lat, lng]);
}

function LoginPage({ onLogin }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    onLogin({ name: name.trim(), phone: phone.trim() });
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark">
          <Sprout size={28} />
        </div>
        <h1>Farmer Land Registry</h1>
        <p>Sign in to register plot boundaries, crop details, and search nearby farms.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Farmer name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Rajan Nair" />
          </label>
          <label>
            Phone number
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="9876543210" />
          </label>
          <button type="submit">
            <UserRound size={18} />
            Login
          </button>
        </form>
      </section>
    </main>
  );
}

function PlotMap({ farmers, selectedFarmerIds, onPlotDrawn, searchPoint, onSearchPoint, radiusKm }) {
  const mapRef = useRef(null);
  const mapNodeRef = useRef(null);
  const drawnLayerRef = useRef(null);
  const farmersLayerRef = useRef(null);
  const searchLayerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(mapNodeRef.current).setView(DEFAULT_CENTER, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    drawnItems.addTo(map);
    drawnLayerRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#2f855a', weight: 3 }
        },
        rectangle: {
          shapeOptions: { color: '#2f855a', weight: 3 }
        },
        marker: false,
        circle: false,
        circlemarker: false,
        polyline: false
      },
      edit: { featureGroup: drawnItems, remove: true }
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (event) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(event.layer);
      const latLngs = event.layer.getLatLngs();
      const center = polygonCenter(latLngs);
      onPlotDrawn({
        plot: latLngsToGeoJsonPolygon(latLngs),
        location: { type: 'Point', coordinates: [center.lng, center.lat] }
      });
    });

    map.on('click', (event) => {
      onSearchPoint({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    farmersLayerRef.current = L.layerGroup().addTo(map);
    searchLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onPlotDrawn, onSearchPoint]);

  useEffect(() => {
    if (!farmersLayerRef.current) return;
    farmersLayerRef.current.clearLayers();

    farmers.forEach((farmer) => {
      const isSelected = selectedFarmerIds.has(farmer._id);
      const polygon = L.polygon(geoJsonPolygonToLatLngs(farmer.plot), {
        color: isSelected ? '#c2410c' : '#2f855a',
        fillColor: isSelected ? '#fdba74' : '#86efac',
        fillOpacity: isSelected ? 0.42 : 0.24,
        weight: isSelected ? 4 : 2
      }).bindPopup(`
        <strong>${farmer.name}</strong><br/>
        Crop: ${farmer.cropType}<br/>
        Size: ${farmer.plotSize} acres<br/>
        Phone: ${farmer.phone}
      `);
      polygon.addTo(farmersLayerRef.current);

      const [lng, lat] = farmer.location.coordinates;
      L.marker([lat, lng])
        .bindPopup(`<strong>${farmer.name}</strong><br/>${farmer.cropType}`)
        .addTo(farmersLayerRef.current);
    });
  }, [farmers, selectedFarmerIds]);

  useEffect(() => {
    if (!searchLayerRef.current) return;
    searchLayerRef.current.clearLayers();

    if (searchPoint) {
      L.marker([searchPoint.lat, searchPoint.lng]).addTo(searchLayerRef.current);
      L.circle([searchPoint.lat, searchPoint.lng], {
        radius: Number(radiusKm) * 1000,
        color: '#0f766e',
        fillColor: '#5eead4',
        fillOpacity: 0.18
      }).addTo(searchLayerRef.current);
    }
  }, [radiusKm, searchPoint]);

  return <div ref={mapNodeRef} className="map" aria-label="Farm plot map" />;
}

function DetailForm({ farmer, draftPlot, currentUser, onSave }) {
  const [form, setForm] = useState({
    name: currentUser.name,
    phone: currentUser.phone,
    cropType: '',
    plotSize: '',
    village: '',
    district: '',
    notes: ''
  });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      ...form,
      plotSize: Number(form.plotSize),
      ...draftPlot
    });
  }

  return (
    <form className="detail-form" onSubmit={handleSubmit}>
      <div className="panel-header">
        <h2>Plot details</h2>
        <span>{draftPlot ? 'Boundary ready' : 'Draw a boundary'}</span>
      </div>
      <label>
        Farmer name
        <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
      </label>
      <label>
        Phone
        <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} required />
      </label>
      <label>
        Crop type
        <input value={form.cropType} onChange={(event) => updateField('cropType', event.target.value)} placeholder="Paddy" required />
      </label>
      <label>
        Plot size in acres
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.plotSize}
          onChange={(event) => updateField('plotSize', event.target.value)}
          required
        />
      </label>
      <div className="split-fields">
        <label>
          Village
          <input value={form.village} onChange={(event) => updateField('village', event.target.value)} />
        </label>
        <label>
          District
          <input value={form.district} onChange={(event) => updateField('district', event.target.value)} />
        </label>
      </div>
      <label>
        Notes
        <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} rows="3" />
      </label>
      <button type="submit" disabled={!draftPlot}>
        <Save size={17} />
        Save plot
      </button>
      {farmer && <p className="form-note">Last saved plot: {farmer.name}</p>}
    </form>
  );
}

function FarmerList({ farmers, nearbyIds, onRefresh }) {
  return (
    <section className="side-panel">
      <div className="panel-header">
        <h2>Registered plots</h2>
        <button className="icon-button" onClick={onRefresh} aria-label="Refresh plots" title="Refresh plots">
          <RefreshCw size={17} />
        </button>
      </div>
      <div className="plot-list">
        {farmers.length === 0 && <p className="empty-state">No plots registered yet.</p>}
        {farmers.map((farmer) => (
          <article className={nearbyIds.has(farmer._id) ? 'plot-card highlighted' : 'plot-card'} key={farmer._id}>
            <div>
              <strong>{farmer.name}</strong>
              <span>{farmer.cropType}</span>
            </div>
            <p>{farmer.plotSize} acres · {farmer.village || 'Village not set'}</p>
            <small>{formatDate(farmer.registeredAt)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function RadiusSearch({ radiusKm, setRadiusKm, searchPoint, onSearch }) {
  return (
    <section className="search-panel">
      <div className="panel-header">
        <h2>Nearby search</h2>
        <Circle size={18} />
      </div>
      <p className="microcopy">
        Click a point on the map, choose a radius, then search registered plot centers.
      </p>
      <label>
        Radius in km
        <input
          type="number"
          min="0.1"
          step="0.1"
          value={radiusKm}
          onChange={(event) => setRadiusKm(event.target.value)}
        />
      </label>
      <div className="coordinate-box">
        <MapPin size={16} />
        {searchPoint ? `${searchPoint.lat.toFixed(5)}, ${searchPoint.lng.toFixed(5)}` : 'No point selected'}
      </div>
      <button onClick={onSearch} disabled={!searchPoint}>
        <Search size={17} />
        Search radius
      </button>
    </section>
  );
}

function Dashboard({ user, onLogout }) {
  const [farmers, setFarmers] = useState([]);
  const [draftPlot, setDraftPlot] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [searchPoint, setSearchPoint] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [nearby, setNearby] = useState([]);
  const [message, setMessage] = useState('');

  const nearbyIds = useMemo(() => new Set(nearby.map((farmer) => farmer._id)), [nearby]);

  async function loadFarmers() {
    const response = await fetch(`${API_URL}/farmers`);
    const data = await response.json();
    setFarmers(data);
  }

  useEffect(() => {
    loadFarmers().catch(() => setMessage('Could not load plots. Check the API server and MongoDB.'));
  }, []);

  async function savePlot(payload) {
    try {
      const response = await fetch(`${API_URL}/farmers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Save failed');
      }

      const saved = await response.json();
      setLastSaved(saved);
      setDraftPlot(null);
      setMessage('Plot saved successfully.');
      await loadFarmers();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function searchNearby() {
    try {
      const params = new URLSearchParams({
        lat: searchPoint.lat,
        lng: searchPoint.lng,
        km: radiusKm
      });
      const response = await fetch(`${API_URL}/farmers/nearby?${params}`);
      const data = await response.json();
      setNearby(data);
      setMessage(`${data.length} plot${data.length === 1 ? '' : 's'} found within ${radiusKm} km.`);
    } catch {
      setMessage('Nearby search failed. Check the API server and MongoDB.');
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-title">
          <Sprout size={26} />
          <div>
            <h1>Farmer Land Registry</h1>
            <p>{user.name} · {user.phone}</p>
          </div>
        </div>
        <button className="logout-button" onClick={onLogout}>
          <LogOut size={17} />
          Logout
        </button>
      </header>

      {message && <div className="notice">{message}</div>}

      <section className="workspace">
        <aside className="left-column">
          <DetailForm farmer={lastSaved} draftPlot={draftPlot} currentUser={user} onSave={savePlot} />
          <RadiusSearch
            radiusKm={radiusKm}
            setRadiusKm={setRadiusKm}
            searchPoint={searchPoint}
            onSearch={searchNearby}
          />
        </aside>

        <section className="map-column">
          <div className="map-toolbar">
            <span><Crosshair size={16} /> Draw a polygon or rectangle for the farmer plot.</span>
            <span>{farmers.length} total plots</span>
          </div>
          <PlotMap
            farmers={farmers}
            selectedFarmerIds={nearbyIds}
            onPlotDrawn={setDraftPlot}
            searchPoint={searchPoint}
            onSearchPoint={setSearchPoint}
            radiusKm={radiusKm}
          />
        </section>

        <FarmerList farmers={farmers} nearbyIds={nearbyIds} onRefresh={loadFarmers} />
      </section>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('farmerRegistryUser');
    return saved ? JSON.parse(saved) : null;
  });

  function login(nextUser) {
    localStorage.setItem('farmerRegistryUser', JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem('farmerRegistryUser');
    setUser(null);
  }

  return user ? <Dashboard user={user} onLogout={logout} /> : <LoginPage onLogin={login} />;
}

createRoot(document.getElementById('root')).render(<App />);
