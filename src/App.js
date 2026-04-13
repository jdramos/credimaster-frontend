import React, { useState, useMemo, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Paper,
  Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import "./App.scss";
import "bootstrap/scss/bootstrap.scss";
import "react-toastify/dist/ReactToastify.css";

import Home from "./pages/Home";
import Loans from "./pages/Loans";
import LoanList from "./components/LoanList";
import Branches from "./pages/Branches";
import Risks from "./pages/Risks";
import ProvincesList from "./components/ProvincesList";
import RiskAdd from "./components/RiskAdd";
import RiskEdit from "./components/RiskEdit";
import ProvinceAdd from "./components/ProvinceAdd";
import ProvinceEdit from "./components/ProvinceEdit";
import BranchAdd from "./components/BranchAdd";
import BranchEdit from "./components/BranchEdit";
import CollectorList from "./components/CollectorList";
import CollectorAdd from "./components/CollectorAdd";
import CollectorEdit from "./components/CollectorEdit";
import PromoterList from "./components/PromoterList";
import PromoterAdd from "./components/PromoterAdd";
import PromoterEdit from "./components/PromoterEdit";
import CustomerList from "./components/Customer/CustomerList";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import UserAdd from "./components/UserAdd";
import AddApproverForm from "./components/ApproverAddForm";
import ApproverList from "./components/ApproverList";
import UsersList from "./components/UserList";
import RolePermissionManager from "./components/RolePermissionManager";
import PermissionList from "./components/PermissionList";
import PaymentList from "./components/PaymentList";
import GenerateBalances from "./components/GenerateBalances";
import CreditPolicyManager from "./components/CreditPolicyManager";
import BalanceSummary from "./components/Balances";
import ProvissionViewer from "./components/ProvissionViewer";
import SinRiesgoReport from "./components/Sinriesgo";
import EconomicActivitiesPage from "./pages/EconomicActivitiesPage";
import GenrePage from "./pages/GenrePage";
import MaritalStatusPage from "./pages/MaritalStatusPage";
import CustomerAddGpt from "./components/Customer/CustomerAddGpt";
import LoanAdd from "./components/Loan/LoanAddGpt";
import RibbonMenu from "./components/RibbonMenu";
import ApprovalInbox from "./components/ApprovalInbox";
import CustomerClaimsList from "./components/Claims/CustomerClaimsList";
import BalancesDashboard from "./components/dashboard/BalancesDashboard";
import CreditFileTemplatePage from "./components/credit-files/CreditFileTemplatePage";

function PageContainer({ children }) {
  return (
    <Box
      sx={{
        px: { xs: 1, sm: 1.5, md: 2 },
        py: 1.5,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1, sm: 1.5, md: 2 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          background: (theme) =>
            theme.palette.mode === "light"
              ? "linear-gradient(180deg, #FFFFFF 0%, #FBFCFE 100%)"
              : "linear-gradient(180deg, #151B22 0%, #12181F 100%)",
          minHeight: "calc(100vh - 150px)",
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}

function AppRoutes({ themeMode, setThemeMode }) {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: (theme) =>
          theme.palette.mode === "light"
            ? "linear-gradient(180deg, #F4F7FB 0%, #EEF3F9 100%)"
            : "linear-gradient(180deg, #0F141A 0%, #111821 100%)",
      }}
    >
      <RibbonMenu
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        onLogout={handleLogout}
        appName="CrediMaster"
      />

      <Routes>
        <Route
          path="/"
          element={
            <PageContainer>
              <Home />
            </PageContainer>
          }
        />

        <Route
          path="/aprobadores/agregar"
          element={
            <PageContainer>
              <AddApproverForm />
            </PageContainer>
          }
        />

        <Route
          path="/aprobadores"
          element={
            <PageContainer>
              <ApproverList />
            </PageContainer>
          }
        />

        <Route
          path="/saldos"
          element={
            <PageContainer>
              <BalanceSummary />
            </PageContainer>
          }
        />

        <Route
          path="/colectores"
          element={
            <PageContainer>
              <CollectorList />
            </PageContainer>
          }
        />

        <Route
          path="/colectores/agregar"
          element={
            <PageContainer>
              <CollectorAdd />
            </PageContainer>
          }
        />

        <Route
          path="/colectores/editar/:colectorId"
          element={
            <PageContainer>
              <CollectorEdit />
            </PageContainer>
          }
        />

        <Route
          path="/conami/actividad-economica"
          element={
            <PageContainer>
              <EconomicActivitiesPage />
            </PageContainer>
          }
        />

        <Route
          path="/conami/estado-civil"
          element={
            <PageContainer>
              <MaritalStatusPage />
            </PageContainer>
          }
        />

        <Route
          path="/clientes"
          element={
            <PageContainer>
              <CustomerList />
            </PageContainer>
          }
        />

        <Route
          path="/clientes/agregar"
          element={
            <PageContainer>
              <CustomerAddGpt />
            </PageContainer>
          }
        />

        <Route
          path="/clientes/editar/:customerId"
          element={
            <PageContainer>
              <CustomerAddGpt />
            </PageContainer>
          }
        />

        <Route
          path="/clientes/ver/:customerId"
          element={
            <PageContainer>
              <CustomerAddGpt />
            </PageContainer>
          }
        />

        <Route
          path="/crear-saldos"
          element={
            <PageContainer>
              <GenerateBalances />
            </PageContainer>
          }
        />

        <Route
          path="/creditos"
          element={
            <PageContainer>
              <LoanList />
            </PageContainer>
          }
        />

        <Route
          path="/creditos/archivos"
          element={
            <PageContainer>
              <CreditFileTemplatePage />
            </PageContainer>
          }
        />

        <Route
          path="/creditos/agregar"
          element={
            <PageContainer>
              <LoanAdd />
            </PageContainer>
          }
        />

        <Route
          path="/creditos/politicas"
          element={
            <PageContainer>
              <CreditPolicyManager />
            </PageContainer>
          }
        />

        <Route
          path="/departamentos"
          element={
            <PageContainer>
              <ProvincesList />
            </PageContainer>
          }
        />

        <Route
          path="/departamentos/agregar"
          element={
            <PageContainer>
              <ProvinceAdd />
            </PageContainer>
          }
        />

        <Route
          path="/departamentos/editar/:provinceId"
          element={
            <PageContainer>
              <ProvinceEdit />
            </PageContainer>
          }
        />

        <Route
          path="/generos"
          element={
            <PageContainer>
              <GenrePage />
            </PageContainer>
          }
        />

        <Route
          path="/pagos"
          element={
            <PageContainer>
              <PaymentList />
            </PageContainer>
          }
        />

        <Route
          path="/permisos"
          element={
            <PageContainer>
              <PermissionList />
            </PageContainer>
          }
        />

        <Route
          path="/promotores"
          element={
            <PageContainer>
              <PromoterList />
            </PageContainer>
          }
        />

        <Route
          path="/promotores/agregar"
          element={
            <PageContainer>
              <PromoterAdd />
            </PageContainer>
          }
        />

        <Route
          path="/promotores/editar/:promoterId"
          element={
            <PageContainer>
              <PromoterEdit />
            </PageContainer>
          }
        />

        <Route
          path="/provisiones"
          element={
            <PageContainer>
              <ProvissionViewer />
            </PageContainer>
          }
        />

        <Route
          path="/riesgos"
          element={
            <PageContainer>
              <Risks />
            </PageContainer>
          }
        />

        <Route
          path="/riesgos/agregar"
          element={
            <PageContainer>
              <RiskAdd />
            </PageContainer>
          }
        />

        <Route
          path="/riesgos/editar/:riskId"
          element={
            <PageContainer>
              <RiskEdit />
            </PageContainer>
          }
        />

        <Route
          path="/roles"
          element={
            <PageContainer>
              <RolePermissionManager />
            </PageContainer>
          }
        />

        <Route
          path="/sucursales"
          element={
            <PageContainer>
              <Branches />
            </PageContainer>
          }
        />

        <Route
          path="/sucursales/agregar"
          element={
            <PageContainer>
              <BranchAdd />
            </PageContainer>
          }
        />

        <Route
          path="/sucursales/editar/:branchId"
          element={
            <PageContainer>
              <BranchEdit />
            </PageContainer>
          }
        />

        <Route
          path="/sinriesgos"
          element={
            <PageContainer>
              <SinRiesgoReport />
            </PageContainer>
          }
        />

        <Route
          path="/usuarios"
          element={
            <PageContainer>
              <UsersList />
            </PageContainer>
          }
        />

        <Route
          path="/usuarios/agregar"
          element={
            <PageContainer>
              <UserAdd />
            </PageContainer>
          }
        />

        <Route
          path="/bandeja-de-aprobacion"
          element={
            <PageContainer>
              <ApprovalInbox />
            </PageContainer>
          }
        />

        <Route
          path="/reclamos"
          element={
            <PageContainer>
              <CustomerClaimsList />
            </PageContainer>
          }
        />

        <Route path="/dashboard/saldos" element={<BalancesDashboard />} />

        <Route
          path="*"
          element={
            <PageContainer>
              <Typography variant="h6" fontWeight={800}>
                Página no encontrada
              </Typography>
            </PageContainer>
          }
        />
      </Routes>
    </Box>
  );
}

function App() {
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem("themeMode");
    return (
      saved ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    );
  });

  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
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
          primary: {
            main: themeMode === "light" ? "#005EB8" : "#90caf9",
          },
          secondary: {
            main: themeMode === "light" ? "#00A3E0" : "#66d9ff",
          },
          text: {
            primary: themeMode === "light" ? "#0B1220" : "#FFFFFF",
            secondary: themeMode === "light" ? "#56657A" : "#B8C0CC",
          },
          divider: themeMode === "light" ? "#E6EAF0" : "#2A3441",
        },
        shape: {
          borderRadius: 14,
        },
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
                border: `1px solid ${
                  themeMode === "light" ? "#E6EAF0" : "#2A3441"
                }`,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                border: `1px solid ${
                  themeMode === "light" ? "#E6EAF0" : "#2A3441"
                }`,
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
            defaultProps: {
              disableElevation: true,
            },
          },
        },
      }),
    [themeMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppRoutes
                      themeMode={themeMode}
                      setThemeMode={setThemeMode}
                    />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
