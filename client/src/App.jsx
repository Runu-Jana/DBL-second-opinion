import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import { RouteSeo } from './components/Seo.jsx';
import AuthModal from './components/AuthModal.jsx';
import UploadModal from './components/UploadModal.jsx';
import ChatWidget from './components/ChatWidget.jsx';

// Route pages are code-split — each becomes its own chunk loaded on demand, so a first-time
// visitor to a public page doesn't download the admin/doctor/portal code too.
const Home = lazy(() => import('./pages/Home.jsx'));
const Oncologists = lazy(() => import('./pages/Oncologists.jsx'));
const DoctorDetail = lazy(() => import('./pages/DoctorDetail.jsx'));
const Services = lazy(() => import('./pages/Services.jsx'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail.jsx'));
const AIFeatures = lazy(() => import('./pages/AIFeatures.jsx'));
const HowItWorks = lazy(() => import('./pages/HowItWorks.jsx'));
const UploadReports = lazy(() => import('./pages/UploadReports.jsx'));
const JoinNetwork = lazy(() => import('./pages/JoinNetwork.jsx'));
const Pricing = lazy(() => import('./pages/Pricing.jsx'));
const ContactUs = lazy(() => import('./pages/ContactUs.jsx'));
const Resources = lazy(() => import('./pages/Resources.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Report = lazy(() => import('./pages/Report.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const MyCases = lazy(() => import('./pages/MyCases.jsx'));
const CaseDetail = lazy(() => import('./pages/CaseDetail.jsx'));
const PortalUpload = lazy(() => import('./pages/PortalUpload.jsx'));
const Appointments = lazy(() => import('./pages/Appointments.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Documents = lazy(() => import('./pages/Documents.jsx'));
const Messages = lazy(() => import('./pages/Messages.jsx'));
const Payments = lazy(() => import('./pages/Payments.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const HelpCenter = lazy(() => import('./pages/HelpCenter.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const DoctorPortal = lazy(() => import('./pages/DoctorPortal.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const TermsConditions = lazy(() => import('./pages/TermsConditions.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));

const RouteFallback = () => (
  <div className="route-loading" role="status" aria-label="Loading"><span className="route-spinner" /></div>
);

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <RouteSeo />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/oncologists" element={<Oncologists />} />
        <Route path="/oncologists/:id" element={<DoctorDetail />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/ai-features" element={<AIFeatures />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/upload-reports" element={<UploadReports />} />
        <Route path="/for-patients" element={<UploadReports />} />
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
        <Route path="/doctor" element={<DoctorPortal />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Home />} />
      </Routes>
      </Suspense>
      <AuthModal />
      <UploadModal />
      <ChatWidget />
    </AuthProvider>
  );
}
