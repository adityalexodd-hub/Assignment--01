import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute, RoleRoute } from './routes/RouteGuards';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { RequestListPage } from './pages/employee/RequestListPage';
import { NewRequestPage } from './pages/employee/NewRequestPage';
import { RequestDetailPage } from './pages/employee/RequestDetailPage';
import { NotificationsPage } from './pages/employee/NotificationsPage';
import { ProfilePage } from './pages/employee/ProfilePage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { AuditTrailPage } from './pages/admin/AuditTrailPage';
import { LoadingState } from './components/common/FeedbackStates';

export const App = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState message="Initializing IAM Security Portal..." />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Main Dashboard (Routes automatically by role or gives role switch) */}
          <Route
            path="/dashboard"
            element={
              user?.role === 'admin' ? (
                <AdminDashboard />
              ) : user?.role === 'manager' ? (
                <ManagerDashboard />
              ) : (
                <EmployeeDashboard />
              )
            }
          />

          {/* Access Requests */}
          <Route path="/requests" element={<RequestListPage />} />
          <Route path="/requests/new" element={<NewRequestPage />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} />

          {/* Notifications & Profile */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Manager Specific Routes */}
          <Route element={<RoleRoute allowedRoles={['manager', 'admin']} />}>
            <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            <Route path="/manager/requests" element={<RequestListPage managerMode={true} />} />
            <Route path="/manager/requests/:id" element={<RequestDetailPage />} />
          </Route>

          {/* Admin Specific Routes */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/requests" element={<RequestListPage adminMode={true} />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/audit" element={<AuditTrailPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback Redirect */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

export default App;
