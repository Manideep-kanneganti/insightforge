import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <div className="app-background-image" aria-hidden="true" />
      <div className="app-background-overlay" aria-hidden="true" />
      <div className="app-content">
        <Dashboard />
      </div>
    </div>
  );
}
