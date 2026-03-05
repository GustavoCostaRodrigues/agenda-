import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './screens/Login'
import Register from './screens/Register'
import EnterSalonCode from './screens/EnterSalonCode'
import DevDashboard from './screens/DevDashboard'
import Agenda from './screens/Agenda'
import Stock from './screens/Stock'
import MainLayout from './components/MainLayout'
import OwnerDashboard from './screens/OwnerDashboard'
import Profile from './screens/Profile'
import Settings from './screens/Settings'
import CashFlow from './screens/CashFlow'
import PublicBooking from './screens/PublicBooking'
import Plans from './screens/Plans'
import './App.css'

const AppContent = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="glass-pill">Carregando...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/agendar/:slug" element={<PublicBooking />} />

      {/* Auth Routes */}
      {!isAuthenticated ? (
        <>
          <Route path="/login" element={<Login onRegister={() => navigate('/register')} />} />
          <Route path="/register" element={<Register onBack={() => navigate('/login')} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          {/* DEV Route */}
          {user?.role === 'DEV' ? (
            <Route path="*" element={<DevDashboard />} />
          ) : !user?.salon_id ? (
            <Route path="*" element={<EnterSalonCode />} />
          ) : (
            <Route path="*" element={
              <MainLayout>
                {(activeTab) => {
                  switch (activeTab) {
                    case 'agenda': return <Agenda />;
                    case 'estoque': return <Stock />;
                    case 'equipe': return <OwnerDashboard section="equipe" />;
                    case 'caixa': return <CashFlow />;
                    case 'ajustes': return <Settings />;
                    case 'perfil': return <Profile />;
                    case 'planos': return <Plans />;
                    default: return <Agenda />;
                  }
                }}
              </MainLayout>
            } />
          )}
        </>
      )}
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
