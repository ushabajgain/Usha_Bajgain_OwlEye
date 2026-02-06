import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateEvent from "./pages/CreateEvent";
import MyTickets from "./pages/MyTickets";
import QRScanner from "./pages/QRScanner";
import EventHeatmap from "./pages/EventHeatmap";
import LiveEventMap from "./pages/LiveEventMap";
import Unauthorized from "./pages/Unauthorized";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Routes for Authenticated Users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Organizer Only Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ORGANIZER']} />}>
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/scan" element={<QRScanner />} />
            <Route path="/heatmap/:id" element={<EventHeatmap />} />
            <Route path="/live-map/:id" element={<LiveEventMap />} />
          </Route>

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
