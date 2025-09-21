import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { applyLeafletIconFix } from './leafletIconFix';

// escape helper for popup content
function esc(s = '') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/**
 * SearchView:
 * - Task 8: shows search results on a Leaflet map with popups (name+description)
 * - Task 9: click the map to open a form, POST to API, add marker on success
 */
export default function SearchView() {
  const [region, setRegion] = useState('');
  const [resources, setResources] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newResource, setNewResource] = useState({
    name: '', category: '', country: '', region: '', description: ''
  });
  const [clickedLatLon, setClickedLatLon] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    applyLeafletIconFix();

    if (!mapInstanceRef.current) {
      // Manchester by default (small tweak vs class)
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [53.4808, -2.2426],
        zoom: 11
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);

      layerRef.current = L.layerGroup().addTo(mapInstanceRef.current);

      // Task 9: map click -> open add form with coords
      mapInstanceRef.current.on('click', (e) => {
        setClickedLatLon([e.latlng.lat, e.latlng.lng]);
        setShowAddForm(true);
        setMessage('');
        setError('');
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');

    if (!region.trim()) {
      setError('Region is required.');
      setBusy(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/resources?region=${encodeURIComponent(region)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch resources.');
      setResources(data);

      // Task 8: draw markers
      layerRef.current.clearLayers();
      const pts = [];
      data.forEach(r => {
        if (typeof r.lat === 'number' && typeof r.lon === 'number') {
          L.marker([r.lat, r.lon])
            .bindPopup(`<b>${esc(r.name)}</b><br>${esc(r.description)}`)
            .addTo(layerRef.current);
          pts.push([r.lat, r.lon]);
        }
      });
      if (pts.length > 1) mapInstanceRef.current.fitBounds(pts, { padding: [30, 30] });
      else if (pts.length === 1) mapInstanceRef.current.setView(pts[0], 12);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRecommend(id) {
    setError('');
    setMessage('');
    try {
      const res = await fetch(`http://localhost:3000/api/resources/${id}/recommend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to recommend resource.');
      setResources(prev =>
        prev.map(r => (r.id === id ? { ...r, recommendations: (r.recommendations || 0) + 1 } : r))
      );
      setMessage('Recommendation added.');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    }
  }

  function handleAddChange(e) {
    const { name, value } = e.target;
    setNewResource(prev => ({ ...prev, [name]: value }));
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!newResource.name.trim() || !newResource.category.trim() || !newResource.country.trim() ||
        !newResource.region.trim() || !newResource.description.trim() || !clickedLatLon) {
      setError('All fields are required.');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newResource,
          lat: clickedLatLon[0],
          lon: clickedLatLon[1]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add resource.');

      setMessage(`Resource added with ID ${data.id}`);

      // add marker after server confirms
      L.marker([clickedLatLon[0], clickedLatLon[1]])
        .bindPopup(`<b>${esc(newResource.name)}</b><br>${esc(newResource.description)}`)
        .addTo(layerRef.current);

      // refresh list if region is set
      if (region.trim()) {
        const refetch = await fetch(`http://localhost:3000/api/resources?region=${encodeURIComponent(region)}`);
        if (refetch.ok) setResources(await refetch.json());
      }

      // reset form
      setNewResource({ name: '', category: '', country: '', region: '', description: '' });
      setClickedLatLon(null);
      setShowAddForm(false);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    }
  }

  function handleAddCancel() {
    setShowAddForm(false);
    setNewResource({ name: '', category: '', country: '', region: '', description: '' });
    setClickedLatLon(null);
  }

  return (
    <div>
      <h2>Search Healthcare Resources</h2>
      <Link to="/add">Add Resource (Form)</Link>
      <form onSubmit={handleSearch} style={{ margin: '16px 0' }}>
        <input
          value={region}
          onChange={e => setRegion(e.target.value)}
          placeholder="Enter region (e.g., London)"
        />
        <button type="submit" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      <div>
        {resources.map(resource => (
          <div key={resource.id} style={{ marginBottom: '16px', border: '1px solid #ccc', padding: '8px' }}>
            <h3>{resource.name}</h3>
            <p>Category: {resource.category}</p>
            <p>Description: {resource.description}</p>
            <p>Recommendations: {resource.recommendations}</p>
            <button onClick={() => handleRecommend(resource.id)}>Recommend</button>
          </div>
        ))}
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ height: '400px', marginTop: '16px' }} />

      {/* Click-to-add form */}
      {showAddForm && clickedLatLon && (
        <div style={{ marginTop: '16px', border: '1px solid #ccc', padding: '16px' }}>
          <h3>Add Resource at ({clickedLatLon[0].toFixed(4)}, {clickedLatLon[1].toFixed(4)})</h3>
          <form onSubmit={handleAddSubmit}>
            <div style={{ marginBottom: '8px' }}>
              <input name="name" value={newResource.name} onChange={handleAddChange} placeholder="Name" />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <input name="category" value={newResource.category} onChange={handleAddChange} placeholder="Category" />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <input name="country" value={newResource.country} onChange={handleAddChange} placeholder="Country" />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <input name="region" value={newResource.region} onChange={handleAddChange} placeholder="Region" />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <textarea name="description" value={newResource.description} onChange={handleAddChange} placeholder="Description" rows="3" />
            </div>
            <button type="submit">Add Resource</button>
            <button type="button" onClick={handleAddCancel} style={{ marginLeft: '8px' }}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}
