import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { applyLeafletIconFix } from './leafletIconFix';

function esc(s = '') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export default function SearchView() {
  const [region, setRegion] = useState('');
  const [resources, setResources] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [user, setUser] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState({ username: '', password: '' });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newResource, setNewResource] = useState({ name: '', category: '', country: '', region: '', description: '' });
  const [clickedLatLon, setClickedLatLon] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);
  const myLocationMarkerRef = useRef(null); // << NEW: track "my location" marker

  // expose a global handler used by popup buttons
  useEffect(() => {
    window.submitReview = async (resourceId) => {
      const ta = document.getElementById(`review-${resourceId}`);
      const review = (ta?.value ?? '').trim();
      if (!review) { alert('Review cannot be empty.'); return; }

      try {
        const res = await fetch(`http://localhost:3000/api/resources/${resourceId}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ review })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add review.');

        // refresh resources & markers for current region
        if (region.trim()) {
          const refetch = await fetch(`http://localhost:3000/api/resources?region=${encodeURIComponent(region)}`, { credentials: 'include' });
          const list = await refetch.json();
          if (refetch.ok) {
            setResources(list);
            rebuildMarkers(list);
            setMessage('Review added successfully.');
          }
        }
      } catch (e) {
        alert(e.message || 'Unexpected error submitting review.');
      }
    };
    return () => { delete window.submitReview; };
  }, [region, user]);

  // On mount: fix markers + check session
  useEffect(() => {
    applyLeafletIconFix();
    (async () => {
      try {
        const res = await fetch('http://localhost:3000/api/user', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.username) {
          setUser(data.username);
          setMessage(`Welcome back, ${data.username}!`);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Map init
  useEffect(() => {
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, { center: [53.4808, -2.2426], zoom: 11 }); // Manchester
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
      layerRef.current = L.layerGroup().addTo(mapInstanceRef.current);

      mapInstanceRef.current.on('click', (e) => {
        if (!user) { setError('Please log in to add a resource.'); return; }
        L.popup().setLatLng(e.latlng)
          .setContent(`Selected: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`)
          .openOn(mapInstanceRef.current);
        setClickedLatLon([e.latlng.lat, e.latlng.lng]);
        setShowAddForm(true);
        setMessage(''); setError('');
      });
    }
    return () => {
      // << UPDATED CLEANUP: also remove my location marker and clear layers
      if (myLocationMarkerRef.current) {
        myLocationMarkerRef.current.remove();
        myLocationMarkerRef.current = null;
      }
      if (layerRef.current) {
        layerRef.current.clearLayers();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [user]);

  function rebuildMarkers(list) {
    if (!layerRef.current || !mapInstanceRef.current) return;
    layerRef.current.clearLayers();

    const pts = [];
    list.forEach(r => {
      if (typeof r.lat !== 'number' || typeof r.lon !== 'number') return;

      const reviewsArr = Array.isArray(r.reviews) ? r.reviews : [];
      const reviewsList = reviewsArr.length
        ? `<h4>Reviews</h4><ul>${reviewsArr.map(rr => `<li>${esc(rr)}</li>`).join('')}</ul>`
        : `<p>No reviews yet.</p>`;

      const reviewForm = user
        ? `
          <div style="margin-top:8px">
            <textarea id="review-${r.id}" rows="2" style="width:100%;" placeholder="Write your review"></textarea>
            <button style="margin-top:6px" onclick="submitReview(${r.id})">Submit Review</button>
          </div>
        `
        : `<p><em>Log in to add a review.</em></p>`;

      const popupHtml = `
        <b>${esc(r.name)}</b><br/>
        ${esc(r.description)}<br/>
        ${reviewsList}
        ${reviewForm}
      `;

      L.marker([r.lat, r.lon]).bindPopup(popupHtml).addTo(layerRef.current);
      pts.push([r.lat, r.lon]);
    });

    if (pts.length > 1) mapInstanceRef.current.fitBounds(pts, { padding: [30, 30] });
    else if (pts.length === 1) mapInstanceRef.current.setView(pts[0], 12);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!region.trim()) { setError('Region is required.'); return; }
    setError(''); setMessage(''); setBusy(true);
    try {
      const res = await fetch(`http://localhost:3000/api/resources?region=${encodeURIComponent(region)}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch resources.');

      const normalized = data.map(r => ({ ...r, reviews: Array.isArray(r.reviews) ? r.reviews : [] }));
      setResources(normalized);
      rebuildMarkers(normalized);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRecommend(id) {
    setError(''); setMessage('');
    try {
      const res = await fetch(`http://localhost:3000/api/resources/${id}/recommend`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to recommend resource.');
      setResources(prev => prev.map(r => r.id === id ? { ...r, recommendations: (r.recommendations || 0) + 1 } : r));
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
    setError(''); setMessage('');
    if (!clickedLatLon || !newResource.name.trim() || !newResource.category.trim() || !newResource.country.trim() ||
        !newResource.region.trim() || !newResource.description.trim()) {
      setError('All fields are required.');
      return;
    }
    try {
      const res = await fetch('http://localhost:3000/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...newResource, lat: clickedLatLon[0], lon: clickedLatLon[1] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add resource.');
      setMessage(`Resource added with ID ${data.id}`);

      // drop a marker immediately
      L.marker([clickedLatLon[0], clickedLatLon[1]])
        .bindPopup(`<b>${esc(newResource.name)}</b><br>${esc(newResource.description)}<br><p>No reviews yet.</p>`)
        .addTo(layerRef.current);

      if (region.trim()) {
        const refetch = await fetch(`http://localhost:3000/api/resources?region=${encodeURIComponent(region)}`, { credentials: 'include' });
        const list = await refetch.json();
        if (refetch.ok) {
          const normalized = list.map(r => ({ ...r, reviews: Array.isArray(r.reviews) ? r.reviews : [] }));
          setResources(normalized);
          rebuildMarkers(normalized);
        }
      }

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

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError(''); setMessage('');
    if (!loginForm.username.trim() || !loginForm.password.trim()) return setError('Username and password are required.');
    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log in.');
      setUser(data.username);
      setMessage(`Login successful! Welcome, ${data.username}!`);
      setLoginForm({ username: '', password: '' });
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    setError(''); setMessage('');
    if (!signupForm.username.trim() || !signupForm.password.trim()) return setError('Username and password are required.');
    try {
      const res = await fetch('http://localhost:3000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(signupForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sign up.');
      setMessage(`Signup successful! Please log in as ${signupForm.username}.`);
      setSignupForm({ username: '', password: '' });
      setShowLoginForm(true);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    }
  }

  async function handleLogout() {
    setError(''); setMessage('');
    try {
      const res = await fetch('http://localhost:3000/api/logout', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log out.');
      setUser(null);
      setShowLoginForm(true);
      setMessage('Logout successful!');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    }
  }

  // << NEW: Use my location handler
  function handleUseMyLocation() {
    setError('');
    setMessage('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        if (!mapInstanceRef.current) {
          setError('Map not ready yet.');
          return;
        }

        // remove previous “my location” marker if any
        if (myLocationMarkerRef.current) {
          myLocationMarkerRef.current.remove();
          myLocationMarkerRef.current = null;
        }

        // add a small marker at current location
        myLocationMarkerRef.current = L.circleMarker([latitude, longitude], {
          radius: 8
        }).addTo(mapInstanceRef.current).bindPopup('You are here').openPopup();

        // center/zoom on me
        mapInstanceRef.current.setView([latitude, longitude], 13);

        // optional UX: open Add form at my coords if logged in
        if (user) {
          setClickedLatLon([latitude, longitude]);
          setShowAddForm(true);
          setMessage('Centered on your location. You can add a resource here.');
        } else {
          setMessage('Centered on your location.');
        }
      },
      () => {
        setError('Unable to get your location (permission denied or unavailable).');
      }
    );
  }

  return (
    <div>
      <h2>Search Healthcare Resources</h2>
      <Link to="/add">Add Resource (Form)</Link>

      {user ? (
        <div style={{ margin: '16px 0' }}>
          Logged in as <b>{user}</b>
          <button onClick={handleLogout} style={{ marginLeft: 12 }}>Logout</button>
        </div>
      ) : (
        <div style={{ margin: '16px 0' }}>
          {showLoginForm ? (
            <>
              <h3>Login</h3>
              <form onSubmit={handleLoginSubmit} style={{ marginBottom: 12 }}>
                <input
                  name="username" placeholder="Username"
                  value={loginForm.username}
                  onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                />
                <input
                  name="password" placeholder="Password" type="password" style={{ marginLeft: 8 }}
                  value={loginForm.password}
                  onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                />
                <button type="submit" style={{ marginLeft: 8 }}>Login</button>
              </form>
              <button onClick={() => setShowLoginForm(false)}>Need an account? Sign Up</button>
            </>
          ) : (
            <>
              <h3>Sign Up</h3>
              <form onSubmit={handleSignupSubmit} style={{ marginBottom: 12 }}>
                <input
                  name="username" placeholder="Username"
                  value={signupForm.username}
                  onChange={e => setSignupForm(prev => ({ ...prev, username: e.target.value }))}
                />
                <input
                  name="password" placeholder="Password" type="password" style={{ marginLeft: 8 }}
                  value={signupForm.password}
                  onChange={e => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                />
                <button type="submit" style={{ marginLeft: 8 }}>Sign Up</button>
              </form>
              <button onClick={() => setShowLoginForm(true)}>Already have an account? Login</button>
            </>
          )}
        </div>
      )}

      {/* SINGLE search form (with Use my location) */}
      <form onSubmit={handleSearch} style={{ margin: '16px 0' }}>
        <input
          value={region}
          onChange={e => setRegion(e.target.value)}
          placeholder="Enter region (e.g., London)"
        />
        <button type="submit" disabled={busy} style={{ marginLeft: 8 }}>
          {busy ? 'Searching…' : 'Search'}
        </button>
        <button type="button" onClick={handleUseMyLocation} style={{ marginLeft: 8 }}>
          Use my location
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      <div>
        {resources.map(r => (
          <div key={r.id} style={{ marginBottom: 12, border: '1px solid #ccc', padding: 8 }}>
            <h3>{r.name}</h3>
            <p>Category: {r.category}</p>
            <p>Description: {r.description}</p>
            <p>Recommendations: {r.recommendations}</p>

            {(r.reviews?.length ?? 0) > 0 && (
              <>
                <h4>Reviews</h4>
                <ul>{(r.reviews ?? []).map((rv, i) => <li key={i}>{rv}</li>)}</ul>
              </>
            )}

            <button onClick={() => handleRecommend(r.id)}>Recommend</button>
          </div>
        ))}
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ height: 400, marginTop: 16 }} />

      {/* Add via map */}
      {showAddForm && clickedLatLon && (
        <div style={{ marginTop: 16, border: '1px solid #ccc', padding: 16 }}>
          <h3>Add Resource at ({clickedLatLon[0].toFixed(4)}, {clickedLatLon[1].toFixed(4)})</h3>
          <form onSubmit={handleAddSubmit}>
            <div style={{ marginBottom: 8 }}>
              <input name="name" value={newResource.name} onChange={handleAddChange} placeholder="Name" />
            </div>
            <div style={{ marginBottom: 8 }}>
              <input name="category" value={newResource.category} onChange={handleAddChange} placeholder="Category" />
            </div>
            <div style={{ marginBottom: 8 }}>
              <input name="country" value={newResource.country} onChange={handleAddChange} placeholder="Country" />
            </div>
            <div style={{ marginBottom: 8 }}>
              <input name="region" value={newResource.region} onChange={handleAddChange} placeholder="Region" />
            </div>
            <div style={{ marginBottom: 8 }}>
              <textarea name="description" value={newResource.description} onChange={handleAddChange} placeholder="Description" rows="3" />
            </div>
            <button type="submit">Add Resource</button>
            <button type="button" onClick={handleAddCancel} style={{ marginLeft: 8 }}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}
