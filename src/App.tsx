import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import SplashScreen from './pages/SplashScreen';
import PhoneLogin from './pages/PhoneLogin';
import Profile from './pages/Profile';
import Home from './pages/Home';
import VenueDetail from './pages/VenueDetail';
import TimeSlots from './pages/TimeSlots';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/login" element={<PhoneLogin />} />
        <Route path="/home" element={<Home />} />
        <Route path="/venue/:id" element={<VenueDetail />} />
        <Route path="/venue/:id/court/:courtId/book" element={<TimeSlots />} />
        <Route path="/profile" element={<Profile />} />
        {/* other routes will be added in subsequent phases */}
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
