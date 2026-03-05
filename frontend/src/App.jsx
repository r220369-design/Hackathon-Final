import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BellRing, Home, Activity, Users, FileText, LogOut, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from './api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import OfficerPatientDetails from './pages/OfficerPatientDetails';
import OfficerStatsDetails from './pages/OfficerStatsDetails';
import SymptomInput from './pages/SymptomInput';
import Results from './pages/Results';
import FamilyGroup from './pages/FamilyGroup';
import FamilyMemberDetails from './pages/FamilyMemberDetails';

import Landing from './pages/Landing';
import Reminders from './pages/Reminders';
import Alerts from './pages/Alerts';
import ReportUploadPage from './pages/ReportUploadPage';
import MedicalReports from './pages/MedicalReports';
import NearbyHospitals from './pages/NearbyHospitals';

// Simulated Auth Protect Component
const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) return <Navigate to="/login" />;

  const user = JSON.parse(userStr);
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'officer' ? '/officer' : '/dashboard'} />;
  }
  return children;
};

/* ── Bottom Navigation Bar (Mobile-first) ── */
const BottomNav = ({ unreadAlerts }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOfficer = currentUser.role === 'officer';

  const navItems = isOfficer
    ? [
        { path: '/officer', icon: Home, label: 'Home' },
        { path: '/reports', icon: FileText, label: 'Reports' },
      ]
    : [
        { path: '/dashboard', icon: Home, label: 'Home' },
        { path: '/symptoms', icon: Activity, label: 'Check' },
        { path: '/family', icon: Users, label: 'Family' },
        { path: '/alerts', icon: BellRing, label: 'Alerts', badge: unreadAlerts },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200/80 shadow-bottom-nav lg:hidden">
      <div className="flex items-center justify-around px-2 pt-1.5 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path === '/dashboard' && location.pathname === '/dashboard') ||
            (item.path === '/officer' && location.pathname.startsWith('/officer'));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 min-w-[60px] ${
                isActive
                  ? 'text-primary-700 bg-primary-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-primary-700' : 'text-gray-500'}`}>
                {item.label}
              </span>
              {item.badge > 0 && (
                <span className="absolute -top-0.5 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const AppRoutes = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isPublicPage = ['/', '/login', '/register'].includes(location.pathname);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isTelugu = String(currentUser.language || '').toLowerCase().startsWith('te');
  const [unreadAlerts, setUnreadAlerts] = React.useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const preferredLanguage = String(currentUser.language || '').toLowerCase().startsWith('te') ? 'te' : 'en';
    if (!isPublicPage && preferredLanguage && i18n.language !== preferredLanguage) {
      i18n.changeLanguage(preferredLanguage);
    }
  }, [currentUser.language, i18n, isPublicPage]);

  React.useEffect(() => {
    const loadUnreadAlerts = async () => {
      if (isPublicPage || currentUser.role === 'officer') {
        setUnreadAlerts(0);
        return;
      }

      try {
        const response = await api.get('/alerts/me');
        setUnreadAlerts(Number(response.data?.unreadCount) || 0);
      } catch {
        setUnreadAlerts(0);
      }
    };

    loadUnreadAlerts();
  }, [isPublicPage, location.pathname, currentUser.role]);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh] bg-gray-50/80 flex flex-col font-sans">
      {/* Top header bar */}
      {!isPublicPage && (
        <header className="sticky top-0 z-40 bg-primary-800 text-white shadow-md">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/95 border border-white/20 flex items-center justify-center shrink-0">
                <img
                  src="/ayushseva-icon.svg"
                  alt="Ayushseva AI logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[15px] font-bold tracking-tight truncate">Ayushseva AI</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Notification bell - only for non-officers on desktop */}
              {currentUser.role !== 'officer' && (
                <button
                  className="hidden lg:flex p-2 rounded-xl border border-white/20 hover:bg-white/10 transition relative"
                  onClick={() => navigate('/alerts')}
                  title={isTelugu ? 'నోటిఫికేషన్లు' : 'Notifications'}
                >
                  <BellRing size={16} />
                  {unreadAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadAlerts > 99 ? '99+' : unreadAlerts}
                    </span>
                  )}
                </button>
              )}

              {/* Logout button - desktop */}
              <button
                className="hidden lg:flex items-center gap-1.5 text-xs font-semibold border border-white/20 px-3 py-1.5 rounded-xl hover:bg-white/10 transition"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
              >
                <LogOut size={14} />
                {isTelugu ? 'లాగ్ అవుట్' : 'Logout'}
              </button>

              {/* Mobile menu toggle */}
              <button
                className="lg:hidden p-2 rounded-xl border border-white/20 hover:bg-white/10 transition"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-primary-900/95 backdrop-blur-lg border-t border-white/10 px-4 py-3 animate-fade-in">
              <div className="flex flex-col gap-1">
                <p className="text-primary-200 text-xs font-medium mb-2 px-2">
                  {currentUser.name || currentUser.phone || ''}
                </p>
                <button
                  onClick={() => navigate('/reminders')}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 transition"
                >
                  <BellRing size={16} /> {isTelugu ? 'రిమైండర్లు' : 'Reminders'}
                </button>
                <button
                  onClick={() => navigate('/reports')}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 transition"
                >
                  <FileText size={16} /> {isTelugu ? 'రిపోర్ట్ అప్‌లోడ్' : 'Upload Report'}
                </button>
                <button
                  onClick={() => navigate('/medical-reports')}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 transition"
                >
                  <FileText size={16} /> {isTelugu ? 'వైద్య రిపోర్టులు' : 'Medical Reports'}
                </button>
                <button
                  onClick={() => navigate('/nearby-hospitals')}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 transition"
                >
                  <Activity size={16} /> {isTelugu ? 'సమీప ఆసుపత్రులు' : 'Nearby Hospitals'}
                </button>
                <div className="border-t border-white/10 mt-1 pt-2">
                  <button
                    onClick={() => {
                      localStorage.clear();
                      window.location.href = '/login';
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-900/30 transition w-full"
                  >
                    <LogOut size={16} /> {isTelugu ? 'లాగ్ అవుట్' : 'Logout'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>
      )}

      <main
        className={
          isPublicPage
            ? 'flex-1 w-full'
            : 'flex-1 w-full bg-gray-50/80 relative pb-20 lg:pb-4'
        }
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/officer" element={<ProtectedRoute role="officer"><OfficerDashboard /></ProtectedRoute>} />
          <Route path="/officer/patient/:patientId" element={<ProtectedRoute role="officer"><OfficerPatientDetails /></ProtectedRoute>} />
          <Route path="/officer/stats/:statType" element={<ProtectedRoute role="officer"><OfficerStatsDetails /></ProtectedRoute>} />
          <Route path="/symptoms" element={<ProtectedRoute><SymptomInput /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/family" element={<ProtectedRoute><FamilyGroup /></ProtectedRoute>} />
          <Route path="/family/member/:memberId" element={<ProtectedRoute><FamilyMemberDetails /></ProtectedRoute>} />

          <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportUploadPage /></ProtectedRoute>} />
          <Route path="/medical-reports" element={<ProtectedRoute><MedicalReports /></ProtectedRoute>} />
          <Route path="/nearby-hospitals" element={<ProtectedRoute><NearbyHospitals /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Bottom Navigation - Mobile */}
      {!isPublicPage && <BottomNav unreadAlerts={unreadAlerts} />}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
