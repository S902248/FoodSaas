import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SuperAdminAuthProvider, SuperAdminAuthContext } from './context/SuperAdminAuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import CustomerMenu from './pages/CustomerMenu';
import QRManagement from './pages/QRManagement';
import QRScanTracker from './pages/QRScanTracker';
import LiveOrderTracking from './pages/LiveOrderTracking';
import ComingSoon from './pages/ComingSoon';
import TableManagement from './pages/TableManagement';
import TablePOS from './pages/TablePOS';

// Super Admin Pages
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';

const ProtectedRoute = ({ children }) => {
  const { restaurant, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!restaurant) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const SuperAdminProtectedRoute = ({ children }) => {
  const { admin, adminLoading } = useContext(SuperAdminAuthContext);

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium text-sm">Loading Administrative Session...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/superadmin/login" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Dashboard routes with shared layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="menu" element={<Menu />} />
        <Route path="orders" element={<LiveOrderTracking />} />
        <Route path="qr-codes" element={<QRManagement />} />
        <Route path="tables" element={<TableManagement />} />
        <Route path="tables/:id" element={<TablePOS />} />
        <Route path="customers" element={<ComingSoon title="Customer Management" />} />
        <Route path="billing" element={<ComingSoon title="Billing & Invoicing" />} />
        <Route path="reports" element={<ComingSoon title="Advanced Reports" />} />
        <Route path="settings" element={<ComingSoon title="Restaurant Settings" />} />
      </Route>

      <Route 
        path="/r/:restaurantId/table/:tableNo" 
        element={<CustomerMenu />} 
      />
      <Route 
        path="/scan/:qrId" 
        element={<QRScanTracker />} 
      />

      {/* Super Admin Routes */}
      <Route path="/superadmin/login" element={<SuperAdminLogin />} />
      <Route 
        path="/superadmin" 
        element={
          <SuperAdminProtectedRoute>
            <SuperAdminDashboard />
          </SuperAdminProtectedRoute>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <SuperAdminAuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SuperAdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
