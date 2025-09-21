import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import SearchView from "./SearchView.jsx";
import AddResourceView from "./AddResourceView.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
        <h1>DiscoverHealth</h1>
        <nav style={{ margin: "12px 0" }}>
          <Link to="/" style={{ marginRight: "10px" }}>Search Resources</Link>
          <Link to="/add">Add Resource</Link>
        </nav>
        <hr />
        <Routes>
          <Route path="/" element={<SearchView />} />
          <Route path="/add" element={<AddResourceView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
