import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ConvertPage from './pages/ConvertPage.jsx';
import DatasetPage from './pages/DatasetPage.jsx';
import JobsPage from './pages/JobsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"        element={<ConvertPage />} />
        <Route path="/dataset" element={<DatasetPage />} />
        <Route path="/jobs"    element={<JobsPage />} />
        <Route path="*"        element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
