import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SelectionProvider } from './contexts/SelectionContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { Rollup } from './pages/Rollup';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollToTop } from './components/ScrollToTop';

/** Shown only while restoring a session from a stored token on first load —
 * without this, a signed-in user reloading the page sees a flash of the Login
 * screen before AuthContext's /me check resolves. */
const SplashScreen = () => (
  <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50">
    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-900 rounded-full animate-spin" />
  </div>
);

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SplashScreen />;

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // One shared SelectionContext for every authenticated page. Dashboard, Admin,
  // and Rollup used to each mount their own private SelectionProvider — so
  // picking a client or platform in the Sidebar while on Admin/Rollup silently
  // updated a copy of the selection nobody else could see, and never actually
  // navigated anywhere. Mounting it once here, above all three routes, means
  // the selection (and wherever the Sidebar navigates you to) is shared.
  return (
    <SelectionProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rollup"
          element={
            <ProtectedRoute>
              <Rollup />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </SelectionProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ScrollToTop />
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
