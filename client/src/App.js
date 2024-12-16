import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Admin from './components/Admin';
import Receptionist from './components/Receptionist';
import Section from './components/Section';
import QueueDashboard from './components/QueueDashboard';
import LandingPage from './components/LandingPage';
import StFloorQueue from './components/stFloorQueue';
import NdFloor from './components/NdFloorQueue';

const App = () => (
  <Router>
    <Routes>
      <Route path="" element={<LandingPage />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/receptionist" element={<Receptionist />} />
      <Route path="/section/:section" element={<Section />} />
      <Route path="/dashboard" element={<QueueDashboard />} />
      <Route path="/stfloorqueue" element={<StFloorQueue />} />
      <Route path="/ndfloor" element={<NdFloor />} />
    </Routes>
  </Router>
);

export default App;
