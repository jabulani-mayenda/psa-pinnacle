import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import MarketingPage from './components/MarketingPage';

import CustomerActivationPage from './pages/CustomerActivationPage';

import PayrollPage from './components/PayrollPage';

// Layouts
import ClientLayout from './layouts/ClientLayout';
import AdminLayout from './layouts/AdminLayout';

// Client views
import ClientHome from './components/ClientHome';
import ClientLoans from './components/ClientLoans';
import ClientBusiness from './components/ClientBusiness';
import ClientMessages from './components/ClientMessages';
import ClientProfile from './components/ClientProfile';
import ClientLoanCalculator from './components/ClientLoanCalculator';
import DocumentUpload from './components/DocumentUpload';
import NotificationSettings from './components/NotificationSettings';
import ContactPinnacle from './components/ContactPinnacle';
import ClientAIAdvisor from './components/ClientAIAdvisor';

// Admin views
import AdminOverview from './components/AdminOverview';
import AdminCustomers from './components/AdminCustomers';
import AdminReports from './components/AdminReports';
import AdminReview from './components/AdminReview';
import AdminIntelligence from './components/AdminIntelligence';
import AdminAnalytics from './components/AdminAnalytics';
import AdminSMEPortfolio from './components/AdminSMEPortfolio';
import AdminStaffManagement from './components/AdminStaffManagement';

// Providers
import { ClientDataProvider, useClientData } from './context/ClientContext';
import { AdminDataProvider, useAdminData } from './context/AdminContext';

// ── Protected route guards ────────────────────────────────────────────────────
function RequireAuth({ role, children }: { role?: 'client' | 'staff'; children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcf8f2] dark:bg-[#121212]">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!session) {
    const loginPath = role === 'staff' ? '/staff/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  const isCustomer = session.role === 'customer';
  const isStaff = ['loan_officer', 'manager', 'executive', 'admin'].includes(session.role);

  if (role === 'client' && !isCustomer) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role === 'staff' && !isStaff) {
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// ── Staff login page (same component, different path hint) ─────────────────
function StaffLoginPage() {
  return <LoginPage />;
}

// ── Client portal with state management ──────────────────────────────────────
function ClientPortal() {
  const { logout } = useAuth();
  const {
    applications,
    repayments,
    chats,
    alerts,
    toast,
    triggerToast,
    handlePayInstallment,
    handleSubmitApplication,
    handleClearUnread,
  } = useClientData();
  const navigate = useNavigate();

  return (
    <>
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-top-4">
          <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-bold ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-300'
              : 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-300'
          }`}>
            ✓ {toast.message}
          </div>
        </div>
      )}
      <Routes>
        <Route path="home" element={<ClientHome onQuickAction={(action) => {
          if (action === 'apply_loan' || action === 'view_loan_repayments') navigate('/client/calculator');
          if (action === 'view_loan') navigate('/client/loans');
          if (action === 'upload_docs') navigate('/client/documents');
          if (action === 'contact') navigate('/client/contact');
          if (action === 'advisor') navigate('/client/advisor');
        }} />} />
        <Route path="loans" element={
          <ClientLoans
            applications={applications}
            repayments={repayments}
            onPayInstallment={handlePayInstallment}
            onRequestFinancing={() => navigate('/client/calculator')}
          />
        } />
        <Route path="business" element={
          <ClientBusiness onApplyOpportunity={() => navigate('/client/calculator')} />
        } />
        <Route path="messages" element={
          <ClientMessages
            chats={chats}
            alerts={alerts}
            onPayInstallment={handlePayInstallment}
            onClearUnread={handleClearUnread}
          />
        } />
        <Route path="profile" element={
          <ClientProfile
            onLogout={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            onEditDetail={(field) => {
              if (field === 'notifications') navigate('/client/notifications');
              if (field === 'contact') navigate('/client/contact');
              triggerToast(`Navigated to: ${field}`, 'info');
            }}
          />
        } />
        <Route path="calculator" element={
          <ClientLoanCalculator
            onBack={() => navigate('/client/home')}
            onSubmitApplication={handleSubmitApplication}
          />
        } />
        <Route path="documents" element={<DocumentUpload onBack={() => navigate('/client/home')} />} />
        <Route path="notifications" element={<NotificationSettings onBack={() => navigate('/client/profile')} />} />
        <Route path="contact" element={<ContactPinnacle onBack={() => navigate('/client/home')} />} />
        <Route path="advisor" element={<ClientAIAdvisor onBack={() => navigate('/client/home')} />} />
        <Route index element={<Navigate to="home" replace />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Routes>
    </>
  );
}

// ── Admin portal with state management ───────────────────────────────────────
function AdminPortal() {
  const {
    applications,
    customers,
    dashboardSummary,
    selectedAppId,
    setSelectedAppId,
    handleDecision,
    handleAddCustomer,
    refreshData,
  } = useAdminData();
  const navigate = useNavigate();

  const selected = selectedAppId ? applications.find(a => a.id === selectedAppId) || null : null;

  return (
    <Routes>
      <Route path="overview" element={
        selected ? (
          <AdminReview
            application={selected}
            onBack={() => setSelectedAppId(null)}
            onUpdateStatus={handleDecision}
          />
        ) : (
          <AdminOverview
            applications={applications}
            onSelectApplication={(app) => setSelectedAppId(app.id)}
            onNavigateToTab={(tab) => navigate(`/staff/${tab}`)}
            dashboardSummary={dashboardSummary}
          />
        )
      } />
      <Route path="customers" element={
        <AdminCustomers customers={customers} onAddCustomer={handleAddCustomer} />
      } />
      <Route path="reports" element={<AdminReports dashboardSummary={dashboardSummary} onSyncSummary={refreshData} />} />
      <Route path="sme" element={<AdminSMEPortfolio />} />
      <Route path="intelligence" element={<AdminIntelligence />} />
      <Route path="analytics" element={<AdminAnalytics />} />
      <Route path="payroll" element={<PayrollPage />} />
      <Route path="team" element={<AdminStaffManagement />} />
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="*" element={<Navigate to="overview" replace />} />
    </Routes>
  );
}

// ── Root app ──────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { session, isLoading } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcf8f2] dark:bg-[#121212]">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        session ? <Navigate to={session.role !== 'customer' ? '/staff' : '/client'} replace /> : <LoginPage />
      } />
      <Route path="/register" element={
        session ? <Navigate to="/client" replace /> : <RegisterPage />
      } />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/activate" element={<CustomerActivationPage />} />

      {/* Staff login (separate URL) */}
      <Route path="/staff/login" element={
        session && session.role !== 'customer' ? <Navigate to="/staff" replace /> : <LoginPage />
      } />

      {/* Client portal (protected) */}
      <Route path="/client" element={
        <RequireAuth role="client">
          <ClientDataProvider>
            <ClientLayout />
          </ClientDataProvider>
        </RequireAuth>
      }>
        <Route path="*" element={<ClientPortal />} />
        <Route index element={<Navigate to="home" replace />} />
      </Route>

      {/* Staff/Admin portal (protected, separate URL) */}
      <Route path="/staff" element={
        <RequireAuth role="staff">
          <AdminDataProvider>
            <AdminLayout />
          </AdminDataProvider>
        </RequireAuth>
      }>
        <Route path="*" element={<AdminPortal />} />
        <Route index element={<Navigate to="overview" replace />} />
      </Route>

      {/* Root — marketing landing for guests, redirect for authenticated users */}
      <Route path="/" element={
        session
          ? <Navigate to={session.role !== 'customer' ? '/staff' : '/client'} replace />
          : <MarketingPage onEnterApp={() => window.location.href = '/login'} />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
