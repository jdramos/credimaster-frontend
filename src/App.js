import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import './App.scss';
import 'bootstrap/scss/bootstrap.scss';
import 'react-toastify/dist/ReactToastify.css';
import ResponsiveSidebar from './components/ResponsiveSidebar';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Loans from './pages/Loans';
import LoanList from './components/LoanList';
import Branches from './pages/Branches';
import Risks from './pages/Risks';
import ProvincesList from './components/ProvincesList';
import RiskAdd from './components/RiskAdd';
import RiskEdit from './components/RiskEdit';
import ProvinceAdd from './components/ProvinceAdd';
import ProvinceEdit from './components/ProvinceEdit';
import BranchAdd from './components/BranchAdd';
import BranchEdit from './components/BranchEdit';
import CollectorList from './components/CollectorList';
import CollectorAdd from './components/CollectorAdd';
import CollectorEdit from './components/CollectorEdit';
import PromoterList from './components/PromoterList';
import PromoterAdd from './components/PromoterAdd';
import PromoterEdit from './components/PromoterEdit';
import CustomerList from './components/Customer/CustomerList';
import CustomerAdd from './components/Customer/CustomerAdd';
import CustomerEdit from './components/Customer/CustomerEdit';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import UserAdd from './components/UserAdd';
import RoleList from './components/RoleList';
import LoanAdd from './components/LoanAddGpt';
import LoanShow from './components/LoanShow';
import CustomerForm from './components/Customer/CustomerForm';
import AddApproverForm from './components/ApproverAddForm';
import ApproverList from './components/ApproverList';
import UsersList from './components/UserList';
import RolePermissionManager from './components/RolePermissionManager';
import PermissionList from './components/PermissionList';
import PaymentList from './components/PaymentList';
import GenerateBalances from './components/GenerateBalances';
import CreditPolicyManager from './components/CreditPolicyManager';
import BalanceSummary from './components/Balances';
import ProvissionViewer from './components/ProvissionViewer';
import SinRiesgoReport from './components/Sinriesgo';
import EconomicActivitiesPage from './pages/EconomicActivitiesPage';
import GenrePage from './pages/GenrePage';
import MaritalStatusPage from './pages/MaritalStatusPage';
import CustomerAddGpt from './components/Customer/CustomerAddGpt';
import RibbonMenu from './components/RibbonMenu';



function AppRoutes({ themeMode, setThemeMode }) {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <RibbonMenu themeMode={themeMode} setThemeMode={setThemeMode} />
      <Box sx={{ p: 2 }}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/aprobadores/agregar' element={<AddApproverForm />} />
          <Route path='/aprobadores' element={<ApproverList />} />
          <Route path='/saldos' element={<BalanceSummary />} />
          <Route path='/colectores' element={<CollectorList />} />
          <Route path='/colectores/agregar' element={<CollectorAdd />} />
          <Route path='/colectores/editar/:colectorId' element={<CollectorEdit />} />
          <Route path='/conami/actividad-economica' element={<EconomicActivitiesPage />} />
          <Route path='/conami/estado-civil' element={<MaritalStatusPage />} />
          <Route path='/clientes' element={<CustomerList />} />
          <Route path='/clientes/agregar' element={<CustomerAddGpt />} />
          <Route path='/clientes/editar/:customerId' element={<CustomerAddGpt />} />
          <Route path='/clientes/ver/:customerId' element={<CustomerAddGpt />} />
          <Route path='/crear-saldos' element={<GenerateBalances />} />
          <Route path='/creditos' element={<LoanList />} />
          <Route path='/creditos/agregar' element={<LoanAdd />} />
          <Route path='/creditos/politicas' element={<CreditPolicyManager />} />
          <Route path='/departamentos' element={<ProvincesList />} />
          <Route path='/departamentos/agregar' element={<ProvinceAdd />} />
          <Route path='/departamentos/editar/:provinceId' element={<ProvinceEdit />} />
          <Route path='/generos' element={<GenrePage />} />
          <Route path='/pagos' element={<PaymentList />} />
          <Route path='/permisos' element={<PermissionList />} />
          <Route path='/promotores' element={<PromoterList />} />
          <Route path='/promotores/agregar' element={<PromoterAdd />} />
          <Route path='/promotores/editar/:promoterId' element={<PromoterEdit />} />
          <Route path='/provisiones' element={<ProvissionViewer />} />
          <Route path='/riesgos' element={<Risks />} />
          <Route path='/riesgos/agregar' element={<RiskAdd />} />
          <Route path='/riesgos/editar/:riskId' element={<RiskEdit />} />
          <Route path='/roles' element={<RolePermissionManager />} />
          <Route path='/sucursales' element={<Branches />} />
          <Route path='/sucursales/agregar' element={<BranchAdd />} />
          <Route path='/sucursales/editar/:branchId' element={<BranchEdit />} />
          <Route path='/sinriesgos' element={<SinRiesgoReport />} />
          <Route path='/usuarios' element={<UsersList />} />
          <Route path='/usuarios/agregar' element={<UserAdd />} />
        </Routes>
      </Box>
    </>
    
  );
}

function App() {
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('themeMode');
    return saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

const theme = useMemo(
  () =>
    createTheme({
      palette: {
        mode: themeMode,
        background: {
          default: themeMode === "light" ? "#F5F7FB" : "#0F141A",
          paper: themeMode === "light" ? "#FFFFFF" : "#151B22",
        },
        primary: { main: themeMode === "light" ? "#005EB8" : "#90caf9" },
        secondary: { main: themeMode === "light" ? "#00A3E0" : "#66d9ff" },
        text: {
          primary: themeMode === "light" ? "#0B1220" : "#FFFFFF",
          secondary: themeMode === "light" ? "#56657A" : "#B8C0CC",
        },
        divider: themeMode === "light" ? "#E6EAF0" : "#2A3441",
      },
      shape: { borderRadius: 14 },
      typography: {
        fontFamily: ["Inter", "Roboto", "Arial", "sans-serif"].join(","),
        h6: { fontWeight: 900 },
        subtitle1: { fontWeight: 800 },
        button: { fontWeight: 800, textTransform: "none" },
      },
      components: {
        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: 18,
              border: `1px solid ${themeMode === "light" ? "#E6EAF0" : "#2A3441"}`,
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 16,
              border: `1px solid ${themeMode === "light" ? "#E6EAF0" : "#2A3441"}`,
            },
          },
        },
        MuiTableHead: {
          styleOverrides: {
            root: {
              backgroundColor: themeMode === "light" ? "#F1F4F9" : "#1B2430",
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: { fontWeight: 800 },
          },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
        },
      },
    }),
  [themeMode]
);

  return (
      
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path='/login' element={<LoginPage />} />
            <Route
              path='/*'
              element={
                <ProtectedRoute>
                  <AppRoutes themeMode={themeMode} setThemeMode={setThemeMode} />
                </ProtectedRoute>}
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
    
  );
}

export default App;
