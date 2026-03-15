import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ParentForm from './components/ParentForm';
import StaffPanel from './components/StaffPanel';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Parent registration — tablet at reception */}
        <Route path="/" element={<ParentForm />} />
        <Route path="/register" element={<ParentForm />} />

        {/* Staff panel — separate device */}
        <Route path="/staff/*" element={<StaffPanel />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
