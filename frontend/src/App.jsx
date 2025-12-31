import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateEvent from './pages/CreateEvent';
import EventDashboard from './pages/EventDashboard';
import EventsFeed from './pages/EventsFeed';
import EventDetails from './pages/EventDetails';
import TicketBooking from './pages/TicketBooking';
import Bookings from './pages/Bookings';
import EventTickets from './pages/EventTickets';
import AttendeeDashboard from './pages/AttendeeDashboard';
import MyEvents from './pages/MyEvents';
import SOSEmergency from './pages/SOSEmergency';
import Invoices from './pages/Invoices';
import EVoucher from './pages/EVoucher';
import LiveMap from './pages/LiveMap';
import ReportIncident from './pages/ReportIncident';
import IncidentDetails from './pages/IncidentDetails';
import IncidentHistory from './pages/IncidentHistory';
import VolunteersList from './pages/VolunteersList';
import SOSAlertsList from './pages/SOSAlertsList';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AssignedIncidents from './pages/AssignedIncidents';
import VolunteerStatus from './pages/VolunteerStatus';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import EventManagement from './pages/EventManagement';
import IncidentControlCenter from './pages/IncidentControlCenter';
import SOSMonitoringCenter from './pages/SOSMonitoringCenter';
import VolunteerManagement from './pages/VolunteerManagement';
import GlobalFinances from './pages/GlobalFinances';
import GlobalAuditLogs from './pages/GlobalAuditLogs';
import Notifications from './pages/Notifications';
import EditEvent from './pages/EditEvent';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import HomePage from './pages/HomePage';
import TicketScan from './pages/TicketScan';
import ProtectedRoute from './components/ProtectedRoute';
import LocationTracker from './components/LocationTracker';
import SafetyAlertListener from './components/SafetyAlertListener';
import { SafetySocketProvider } from './context/SafetySocketContext';

function App() {
  return (
    <SafetySocketProvider eventId="1">
      <Router>
        <LocationTracker />
        <SafetyAlertListener />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Attendee/User Routes */}
          <Route path="/events" element={<ProtectedRoute><EventsFeed /></ProtectedRoute>} />
          <Route path="/events/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
          <Route path="/events/:id/ticket" element={<ProtectedRoute><TicketBooking /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute allowedRoles={['attendee', 'volunteer', 'organizer', 'admin']}><Bookings /></ProtectedRoute>} />
          <Route path="/attendee/dashboard" element={<ProtectedRoute allowedRoles={['attendee']}><AttendeeDashboard /></ProtectedRoute>} />
          <Route path="/attendee/my-events" element={<ProtectedRoute allowedRoles={['attendee']}><MyEvents /></ProtectedRoute>} />
          <Route path="/attendee/sos" element={<ProtectedRoute allowedRoles={['attendee']}><SOSEmergency /></ProtectedRoute>} />
          <Route path="/event/:eventId/tickets" element={<ProtectedRoute allowedRoles={['attendee']}><EventTickets /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute allowedRoles={['attendee', 'organizer', 'admin']}><Invoices /></ProtectedRoute>} />
          <Route path="/bookings/e-voucher" element={<ProtectedRoute allowedRoles={['attendee']}><EVoucher /></ProtectedRoute>} />
          <Route path="/report-incident/:id?" element={<ProtectedRoute><ReportIncident /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/payment-cancel" element={<ProtectedRoute><PaymentCancel /></ProtectedRoute>} />

          {/* Organizer Specific Routes */}
          <Route path="/organizer/dashboard" element={<ProtectedRoute allowedRoles={['organizer']}><EventDashboard /></ProtectedRoute>} />
          <Route path="/organizer/live-map/:id?" element={<ProtectedRoute allowedRoles={['volunteer', 'organizer', 'admin']}><LiveMap /></ProtectedRoute>} />
          <Route path="/organizer/incident/:id" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><IncidentDetails /></ProtectedRoute>} />
          <Route path="/organizer/incidents" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><IncidentHistory /></ProtectedRoute>} />
          <Route path="/organizer/volunteers" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><VolunteersList /></ProtectedRoute>} />
          <Route path="/organizer/sos" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><SOSAlertsList /></ProtectedRoute>} />
          <Route path="/organizer/create-event" element={<ProtectedRoute allowedRoles={['organizer']}><CreateEvent /></ProtectedRoute>} />
          <Route path="/organizer/edit-event/:id" element={<ProtectedRoute allowedRoles={['organizer']}><EditEvent /></ProtectedRoute>} />
          <Route path="/organizer/scan" element={<ProtectedRoute allowedRoles={['organizer', 'volunteer', 'admin']}><TicketScan /></ProtectedRoute>} />
          
          {/* Volunteer Specific Routes */}
          <Route path="/volunteer/dashboard" element={<ProtectedRoute allowedRoles={['volunteer']}><VolunteerDashboard /></ProtectedRoute>} />
          <Route path="/volunteer/assigned" element={<ProtectedRoute allowedRoles={['volunteer']}><AssignedIncidents /></ProtectedRoute>} />
          <Route path="/volunteer/sos" element={<ProtectedRoute allowedRoles={['volunteer']}><SOSAlertsList /></ProtectedRoute>} />
          <Route path="/volunteer/status" element={<ProtectedRoute allowedRoles={['volunteer']}><VolunteerStatus /></ProtectedRoute>} />

          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute allowedRoles={['admin']}><EventManagement /></ProtectedRoute>} />
          <Route path="/admin/incidents" element={<ProtectedRoute allowedRoles={['admin']}><IncidentControlCenter /></ProtectedRoute>} />
          <Route path="/admin/sos" element={<ProtectedRoute allowedRoles={['admin']}><SOSMonitoringCenter /></ProtectedRoute>} />
          <Route path="/admin/volunteers" element={<ProtectedRoute allowedRoles={['admin']}><VolunteerManagement /></ProtectedRoute>} />
          <Route path="/admin/finances" element={<ProtectedRoute allowedRoles={['admin']}><GlobalFinances /></ProtectedRoute>} />
          <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={['admin']}><GlobalAuditLogs /></ProtectedRoute>} />

          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </SafetySocketProvider>
  );
}

export default App;
