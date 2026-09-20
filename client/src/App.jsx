import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { getPatientToken } from './api.js';
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
// Hidden for now (page files kept on disk): AI Features and Join Our Network.
// To restore: uncomment the import + its <Route>, re-add the Header/Footer links, and put
// the paths back into STATIC_PAGES (server/server.js) and SEO_MAP (components/Seo.jsx).
// const AIFeatures = lazy(() => import('./pages/AIFeatures.jsx'));
const HowItWorks = lazy(() => import('./pages/HowItWorks.jsx'));
const UploadReports = lazy(() => import('./pages/UploadReports.jsx'));
// const JoinNetwork = lazy(() => import('./pages/JoinNetwork.jsx'));
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
const DoctorSetPassword = lazy(() => import('./pages/DoctorSetPassword.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const TermsConditions = lazy(() => import('./pages/TermsConditions.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

const RouteFallback = () => (
  <div className="route-loading" role="status" aria-label="Loading"><span className="route-spinner" /></div>
);

// "/" is two different pages depending on who is asking. A visitor gets the marketing home;
// someone already signed in gets their dashboard, the same way they land there after logging
// in. Without this they arrived back on the sales pitch every visit and had to go looking for
// their own records.
function HomeOrDashboard() {
  const { session, loading } = useAuth();
  // Only wait when there is actually a session to restore. With no stored token there is
  // nothing to load, and the public page must not flash a spinner at a first-time visitor.
  if (loading && getPatientToken()) return <RouteFallback />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Home />;
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <RouteSeo />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomeOrDashboard />} />
        <Route path="/oncologists" element={<Oncologists />} />
        <Route path="/oncologists/:id" element={<DoctorDetail />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        {/* <Route path="/ai-features" element={<AIFeatures />} /> */}
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/upload-reports" element={<UploadReports />} />
        <Route path="/for-patients" element={<UploadReports />} />
        {/* <Route path="/join-network" element={<JoinNetwork />} /> */}
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
        <Route path="/doctor/set-password" element={<DoctorSetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      <AuthModal />
      <UploadModal />
      <ChatWidget />
    </AuthProvider>
  );
}
