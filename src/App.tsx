import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import RegistrationPage from './components/RegistrationPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ForgotPasswordConfirmation from './components/ForgotPasswordConfirmation';
import ResetPasswordPage from './components/ResetPasswordPage';
import Dashboard from './components/Dashboard';
import DepartmentManagementPage from './components/DepartmentManagementPage';
import ProjectProposalForm from './components/ProjectProposalForm';
import MyProposalsPage from './components/MyProposalsPage';
import ProposalReviewDashboard from './components/ProposalReviewDashboard';
import TaskAssignmentPage from './components/TaskAssignmentPage';
import CompletionReviewPage from './components/CompletionReviewPage';
import CompletionManagementPage from './components/CompletionManagementPage';
import ReportsPage from './components/ReportsPage';
import ChatInterface from './components/ChatInterface';
import AdvancedCalendar from './components/AdvancedCalendar';
import AdminDashboardPage from './components/AdminDashboardPage';
import UserManagementPage from './components/UserManagementPage';
import ProtectedRoute from './components/ProtectedRoute';
import { initializeStorage } from './utils/storage';
import { useAuth } from './contexts/AuthContext';

type View = 'login' | 'register' | 'forgot-password' | 'forgot-password-confirmation' | 'reset-password' | 'dashboard' | 'departments' | 'proposals-new' | 'proposals-my' | 'proposals-review' | 'assignments' | 'completions-review' | 'completions' | 'reports' | 'chat' | 'advanced-calendar' | 'admin-dashboard' | 'user-management' | 'department-management';

function AppContent() {
  const { isLoggedIn } = useAuth();
  const [currentView, setCurrentView] = useState<View>('login');
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    initializeStorage();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('login');
    }
  }, [isLoggedIn]);

  const handleLogin = () => {
    setCurrentView('dashboard');
  };

  const handleUnauthorized = () => {
    setCurrentView('login');
  };

  const handleShowRegister = () => {
    setCurrentView('register');
  };

  const handleShowLogin = () => {
    setCurrentView('login');
  };

  const handleShowForgotPassword = () => {
    setCurrentView('forgot-password');
  };

  const handleEmailSent = (email: string) => {
    setResetEmail(email);
    setCurrentView('forgot-password-confirmation');
  };

  const handlePasswordReset = () => {
    setCurrentView('login');
  };

  const handleShowDepartments = () => {
    setCurrentView('departments');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleShowNewProposal = () => {
    setCurrentView('proposals-new');
  };

  const handleShowMyProposals = () => {
    setCurrentView('proposals-my');
  };

  const handleShowProposalReview = () => {
    setCurrentView('proposals-review');
  };

  const handleShowAssignments = () => {
    setCurrentView('assignments');
  };

  const handleShowCompletionsReview = () => {
    setCurrentView('completions-review');
  };

  const handleShowChat = () => {
    setCurrentView('chat');
  };

  const handleShowAdvancedCalendar = () => {
    setCurrentView('advanced-calendar');
  };

  const handleShowAdminDashboard = () => {
    setCurrentView('admin-dashboard');
  };

  const handleShowCompletions = () => {
    setCurrentView('completions');
  };

  const handleShowReports = () => {
    setCurrentView('reports');
  };

  const handleCreateReport = (planId: string) => {
    setCurrentView('reports');
  };

  const handleShowUserManagement = () => {
    setCurrentView('user-management');
  };

  const handleShowDepartmentManagement = () => {
    setCurrentView('department-management');
  };

  if (currentView === 'register') {
    return <RegistrationPage onLoginClick={handleShowLogin} />;
  }

  if (currentView === 'forgot-password') {
    return <ForgotPasswordPage onBackToLogin={handleShowLogin} onEmailSent={handleEmailSent} />;
  }

  if (currentView === 'forgot-password-confirmation') {
    return <ForgotPasswordConfirmation email={resetEmail} onBackToLogin={handleShowLogin} />;
  }

  if (currentView === 'reset-password') {
    return <ResetPasswordPage onPasswordReset={handlePasswordReset} />;
  }

  if (currentView === 'login') {
    return <Login onLogin={handleLogin} onRegisterClick={handleShowRegister} onForgotPasswordClick={handleShowForgotPassword} />;
  }

  if (currentView === 'departments') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <DepartmentManagementPage onBack={handleBackToDashboard} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'proposals-new') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <ProjectProposalForm onBack={handleBackToDashboard} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'proposals-my') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <MyProposalsPage onBack={handleBackToDashboard} onNewProposal={handleShowNewProposal} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'proposals-review') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <ProposalReviewDashboard onBack={handleBackToDashboard} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'assignments') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <TaskAssignmentPage onBack={handleBackToDashboard} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'completions-review') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <CompletionReviewPage onBack={handleBackToDashboard} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'chat') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <ChatInterface onBack={handleBackToDashboard} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'advanced-calendar') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <AdvancedCalendar onBack={handleBackToDashboard} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'admin-dashboard') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <AdminDashboardPage onBack={handleBackToDashboard} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'completions') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <CompletionManagementPage onBack={handleBackToDashboard} onCreateReport={handleCreateReport} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'reports') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <ReportsPage onBack={handleBackToDashboard} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'user-management') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <UserManagementPage onBack={handleBackToDashboard} />
      </ProtectedRoute>
    );
  }

  if (currentView === 'department-management') {
    return (
      <ProtectedRoute onUnauthorized={handleUnauthorized}>
        <DepartmentManagementPage onBack={handleBackToDashboard} />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute onUnauthorized={handleUnauthorized}>
      <Dashboard
        onLogout={handleShowLogin}
        onDepartmentsClick={handleShowDepartments}
        onNewProposalClick={handleShowNewProposal}
        onMyProposalsClick={handleShowMyProposals}
        onProposalReviewClick={handleShowProposalReview}
        onAssignmentsClick={handleShowAssignments}
        onCompletionsReviewClick={handleShowCompletionsReview}
        onCompletionsClick={handleShowCompletions}
        onReportsClick={handleShowReports}
        onChatClick={handleShowChat}
        onAdvancedCalendarClick={handleShowAdvancedCalendar}
        onAdminDashboardClick={handleShowAdminDashboard}
        onUserManagementClick={handleShowUserManagement}
        onDepartmentManagementClick={handleShowDepartmentManagement}
      />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
