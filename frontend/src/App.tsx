import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RoomPage from './pages/RoomPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sync" element={<LandingPage />} />
        <Route path="/sync/" element={<LandingPage />} />
        <Route path="/sync/room/:roomId" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/sync" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
