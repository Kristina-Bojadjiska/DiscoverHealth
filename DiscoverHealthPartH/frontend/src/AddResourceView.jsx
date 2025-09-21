import { useState } from 'react';


// AddResourceView lets users submit a new healthcare resource.
// It POSTs to /api/resources and displays either a success message or an error.

export default function AddResourceView() {
  const [form, setForm] = useState({
    name: '', category: '', country: '', region: '',
    lat: '', lon: '', description: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validate all fields
    for (const key of Object.keys(form)) {
      if (!form[key].trim()) {
        setError('All fields are required.');
        return;
      }
    }

    try {
      const res = await fetch('http://localhost:3000/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lat: parseFloat(form.lat),
          lon: parseFloat(form.lon)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Resource added with ID ${data.id}`);
        setForm({
          name: '', category: '', country: '', region: '',
          lat: '', lon: '', description: ''
        });
      } else {
        setError(data.error || 'Failed to add resource.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    }
  }

  return (
    <div>
      <h2>Add a New Resource</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <form onSubmit={handleSubmit}>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" /><br />
        <input name="category" value={form.category} onChange={handleChange} placeholder="Category" /><br />
        <input name="country" value={form.country} onChange={handleChange} placeholder="Country" /><br />
        <input name="region" value={form.region} onChange={handleChange} placeholder="Region" /><br />
        <input name="lat" value={form.lat} onChange={handleChange} placeholder="Latitude" type="number" step="0.0001" /><br />
        <input name="lon" value={form.lon} onChange={handleChange} placeholder="Longitude" type="number" step="0.0001" /><br />
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" rows="3" /><br />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
