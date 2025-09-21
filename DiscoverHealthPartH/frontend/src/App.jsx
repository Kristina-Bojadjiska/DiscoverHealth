import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import SearchView from "./SearchView.jsx";
import AddResourceView from "./AddResourceView.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 16 }}>
        <nav style={{ marginBottom: 16 }}>
          <Link to="/" style={{ marginRight: 16 }}>Search</Link>
          <Link to="/add">Add Resource</Link>
        </nav>
        <Routes>
          <Route path="/" element={<SearchView />} />
          <Route path="/add" element={<AddResourceView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
