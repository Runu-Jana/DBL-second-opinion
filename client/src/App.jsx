import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AuthModal from './components/AuthModal.jsx';
import UploadModal from './components/UploadModal.jsx';
import Home from './pages/Home.jsx';
import Oncologists from './pages/Oncologists.jsx';
import DoctorDetail from './pages/DoctorDetail.jsx';
import ServiceDetail from './pages/ServiceDetail.jsx';
import AIFeatures from './pages/AIFeatures.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import UploadReports from './pages/UploadReports.jsx';
import JoinNetwork from './pages/JoinNetwork.jsx';
import Pricing from './pages/Pricing.jsx';
import ContactUs from './pages/ContactUs.jsx';
import Resources from './pages/Resources.jsx';
import About from './pages/About.jsx';
import Report from './pages/Report.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MyCases from './pages/MyCases.jsx';
import CaseDetail from './pages/CaseDetail.jsx';
import PortalUpload from './pages/PortalUpload.jsx';
import Appointments from './pages/Appointments.jsx';
import Notifications from './pages/Notifications.jsx';
import Documents from './pages/Documents.jsx';
import Messages from './pages/Messages.jsx';
import Payments from './pages/Payments.jsx';
import Profile from './pages/Profile.jsx';
import HelpCenter from './pages/HelpCenter.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/oncologists" element={<Oncologists />} />
        <Route path="/oncologists/:id" element={<DoctorDetail />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/ai-features" element={<AIFeatures />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/upload-reports" element={<UploadReports />} />
        <Route path="/join-network" element={<JoinNetwork />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/about" element={<About />} />
        <Route path="/report" element={<Report />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/cases" element={<MyCases />} />
        <Route path="/dashboard/cases/:id" element={<CaseDetail />} />
        <Route path="/dashboard/upload" element={<PortalUpload />} />
        <Route path="/dashboard/appointments" element={<Appointments />} />
        <Route path="/dashboard/notifications" element={<Notifications />} />
        <Route path="/dashboard/documents" element={<Documents />} />
        <Route path="/dashboard/messages" element={<Messages />} />
        <Route path="/dashboard/payments" element={<Payments />} />
        <Route path="/dashboard/profile" element={<Profile />} />
        <Route path="/dashboard/help" element={<HelpCenter />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <AuthModal />
      <UploadModal />
    </AuthProvider>
  );
}
