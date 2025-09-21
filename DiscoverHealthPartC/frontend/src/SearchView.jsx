import { useState } from 'react';


//   SearchView lets users search for resources by region.
//   It displays results and allows each to be recommended.
 
export default function SearchView() {
  const [region, setRegion] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    setResults([]);
    setError('');
    if (!region.trim()) return;

    try {
      const res = await fetch(`http://localhost:3000/api/resources?region=${encodeURIComponent(region.trim())}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || `Error ${res.status}`);
        return;
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    }
  }

  async function handleRecommend(id, index) {
    try {
      const res = await fetch(`http://localhost:3000/api/resources/${id}/recommend`, { method: 'POST' });
      if (res.ok) {
        setResults(old =>
          old.map((r, i) => i === index ? { ...r, recommendations: r.recommendations + 1 } : r)
        );
      } else {
        alert('Failed to recommend.');
      }
    } catch (err) {
      console.error(err);
      alert('Error recommending.');
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch}>
        <label>
          Region:
          <input
            type="text"
            value={region}
            onChange={e => setRegion(e.target.value)}
            placeholder="e.g., London"
            style={{ marginLeft: '8px' }}
          />
        </label>
        <button type="submit" style={{ marginLeft: '8px' }}>Search</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {results.length > 0 && (
        <div>
          <h2>Results:</h2>
          {results.map((r, index) => (
            <div key={r.id} style={{ marginBottom: '16px' }}>
              <h3>{r.name} <small>({r.category})</small></h3>
              <p>{r.description}</p>
              <p>Recommendations: {r.recommendations}</p>
              <button onClick={() => handleRecommend(r.id, index)}>Recommend</button>
              <hr />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
