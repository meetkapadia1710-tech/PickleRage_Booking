import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';

import SplashScreen from './pages/SplashScreen';
import PhoneLogin from './pages/PhoneLogin';
import CompleteProfile from './pages/CompleteProfile';
import Profile from './pages/Profile';
import Home from './pages/Home';
import VenueDetail from './pages/VenueDetail';
import TimeSlots from './pages/TimeSlots';
import PaymentSuccess from './pages/PaymentSuccess';
import MyBookings from './pages/MyBookings';
import Leaderboard from './pages/Leaderboard';
import Friends from './pages/Friends';
import SplitPayment from './pages/SplitPayment';
import BottomNav from './components/BottomNav';
import { AuthProvider, useAuth } from './context/AuthContext';

// Admin console is heavy and only admins open it — keep it out of the main
// bundle so regular app startup parses less JS.
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <span className="material-symbols-outlined animate-spin text-[48px] text-primary">sync</span>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, profileComplete } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!profileComplete) return <Navigate to="/complete-profile" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, profileComplete } = useAuth();
  if (loading) return <LoadingScreen />;
  if (currentUser) return <Navigate to={profileComplete ? '/home' : '/complete-profile'} replace />;
  return <>{children}</>;
}

// Accessible only when signed-in but profile is incomplete
function CompleteProfileRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, profileComplete } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (profileComplete) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/login" element={<PublicRoute><PhoneLogin /></PublicRoute>} />
        <Route path="/complete-profile" element={<CompleteProfileRoute><CompleteProfile /></CompleteProfileRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/venue/:id" element={<ProtectedRoute><VenueDetail /></ProtectedRoute>} />
        <Route path="/venue/:id/court/:courtId/book" element={<ProtectedRoute><TimeSlots /></ProtectedRoute>} />
        <Route path="/payment-success/:bookingId" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <React.Suspense fallback={<LoadingScreen />}>
                <AdminDashboard />
              </React.Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
        <Route path="/split/:token" element={<ProtectedRoute><SplitPayment /></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  );
}

// APK only: makes the Android back gesture/button navigate instead of
// closing the app. The website never loads the native module.
function NativeBackHandler() {
  const navigate = useNavigate();
  const navigateRef = React.useRef(navigate);
  React.useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let dispose: (() => void) | undefined;
    import('./native/androidBack').then(async (m) => {
      const d = await m.registerAndroidBackButton(
        () => navigateRef.current(-1),
        () => navigateRef.current('/home', { replace: true }),
      );
      if (disposed) d();
      else dispose = d;
    });
    return () => {
      disposed = true;
      dispose?.();
    };
  }, []);

  return null;
}

import { initPushNotifications } from './lib/notifications';

function PushInit() {
  const { currentUser } = useAuth();
  React.useEffect(() => {
    if (currentUser) {
      initPushNotifications();
    }
  }, [currentUser]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NativeBackHandler />
        <PushInit />
        <AnimatedRoutes />
        <BottomNav />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
