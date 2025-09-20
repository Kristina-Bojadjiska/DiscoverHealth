import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import SearchView from './SearchView';
import AddResourceView from './AddResourceView';

export default function App() {
  return (
    <Router>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>DiscoverHealth</h1>
        <nav>
          <Link to="/" style={{ marginRight: '10px' }}>Search Resources</Link>
          <Link to="/add">Add Resource</Link>
        </nav>
        <hr />
        <Routes>
          <Route path="/" element={<SearchView />} />
          <Route path="/add" element={<AddResourceView />} />
        </Routes>
      </div>
    </Router>
  );
}
