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
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UserAdd from "./components/UserAdd";
import AddApproverForm from "./components/ApproverAddForm";
import ApproverList from "./components/ApproverList";
import UsersList from "./components/UserList";
import RolePermissionManager from "./components/RolePermissionManager";
import PermissionList from "./components/PermissionList";
import PaymentList from "./components/PaymentList";
import GenerateBalances from "./components/GenerateBalances";
import BusinessDayPanel from "./components/BusinessDayPanel";
import CreditPolicyManager from "./components/CreditPolicyManager";
import BalanceSummary from "./components/Balances";
import ProvissionViewer from "./components/ProvissionViewer";
import SinRiesgoReport from "./components/Sinriesgo";
import WrittenOffLoansList from "./components/WrittenOffLoansList";
import EconomicActivitiesPage from "./pages/EconomicActivitiesPage";
import GenrePage from "./pages/GenrePage";
import MaritalStatusPage from "./pages/MaritalStatusPage";
import CustomerAddGpt from "./components/Customer/CustomerForm";
import LoanAdd from "./components/Loan/LoanAddGpt";
import ApprovalInbox from "./components/ApprovalInbox";
import CustomerClaimsList from "./components/Claims/CustomerClaimsList";
import BalancesDashboard from "./components/dashboard/BalancesDashboard";
import CreditFileTemplatePage from "./components/credit-files/CreditFileTemplatePage";
import ConamiDefaultsManager from "./components/conami/ConamiDefaultsManager";
import AppLayoutMenu from "./components/AppLayoutMenu";
import AccountsList from "./components/accounting/AccountsList";
import JournalList from "./components/accounting/JournalList";
import LedgerList from "./components/accounting/LedgerList";
import TrialBalance from "./components/accounting/TrialBalance";
import IncomeStatement from "./components/accounting/IncomeStatement";
import BalanceSheet from "./components/accounting/BalanceSheet";
import EquityChanges from "./components/accounting/EquityChanges";
import CashFlowStatement from "./components/accounting/CashFlowStatement";
import GuaranteesReport from "./components/GuaranteesReport";
import AmlRiskCriteriaConfig from "./components/Compliance/AmlRiskCriteriaConfig";
import PicReviewReminders from "./components/Compliance/PicReviewReminders";
import WatchlistManagement from "./components/Compliance/WatchlistManagement";
import AmlAlertsInbox from "./components/Compliance/AmlAlertsInbox";
import RosCasesList from "./components/Compliance/RosCasesList";
import AmlMonthlyReport from "./components/Compliance/AmlMonthlyReport";
import ComplianceOfficerHistory from "./components/Compliance/ComplianceOfficerHistory";
import AssetAdjudicationsList from "./components/AssetAdjudicationsList";
import FinancialStatementNotes from "./components/accounting/FinancialStatementNotes";
import YearEndClosing from "./components/accounting/YearEndClosing";
import FixedAssetsList from "./components/accounting/FixedAssetsList";
import FixedAssetDepreciation from "./components/accounting/FixedAssetDepreciation";
import BankAccountsList from "./components/banks/BankAccountsList";
import BankMovementsList from "./components/banks/BankMovementsList";
import BankReconciliation from "./components/banks/BankReconciliation";
import FinanciadoresList from "./components/obligations/FinanciadoresList";
import LineasCreditoList from "./components/obligations/LineasCreditoList";
import ObligacionesList from "./components/obligations/ObligacionesList";
import BudgetsList from "./components/budget/BudgetsList";
import BudgetAccountLinesEditor from "./components/budget/BudgetAccountLinesEditor";
import BudgetPlacementGoalsEditor from "./components/budget/BudgetPlacementGoalsEditor";
import BudgetTrackingDashboard from "./components/budget/BudgetTrackingDashboard";
import BudgetAlertsInbox from "./components/budget/BudgetAlertsInbox";
import DepartmentsConfig from "./components/budget/DepartmentsConfig";
import BudgetConceptsConfig from "./components/budget/BudgetConceptsConfig";
import DepartmentBudgetEditor from "./components/budget/DepartmentBudgetEditor";
import DepartmentBudgetApprovalInbox from "./components/budget/DepartmentBudgetApprovalInbox";
import CashRegistersList from "./components/caja/CashRegistersList";
import CashMovementsList from "./components/caja/CashMovementsList";
import CollectorArqueosList from "./components/caja/CollectorArqueosList";
import EmployeesList from "./components/hr/EmployeesList";
import HrConfigPanel from "./components/hr/HrConfigPanel";
import EmployeeLoansList from "./components/hr/EmployeeLoansList";
import PayrollRunsList from "./components/hr/PayrollRunsList";
import MyVacations from "./components/hr/MyVacations";
import VacationApprovalInbox from "./components/hr/VacationApprovalInbox";
import IncidentsList from "./components/hr/IncidentsList";
import LiquidationsList from "./components/hr/LiquidationsList";
import HrReports from "./components/hr/HrReports";
import PostingRuns from "./components/accounting/PostingRuns";
import AccountMappingsManager from "./components/accounting/AccountMappingsManager";
import PendingItemsAging from "./components/accounting/PendingItemsAging";
import IccReportPage from "./pages/reports/conami/IccReportPage";
import IccGenerator from "./pages/reports/conami/icc/IccGenerator";
import IscGenerator from "./pages/reports/conami/isc/IscGenerator";
import IdleSessionHandler from "./components/IdleSessionHandler";
import CustomReportsPage from "./pages/customReports/CustomReportsPage";
import CustomReportDesigner from "./reports/custom/CustomReportDesigner";
import Studio from "./reports/studio/Studio";
import AuditLog from "./components/AuditLog";
import BranchCalendarManager from "./components/BranchCalendarManager";
import SuperAdminLayout from "./components/SuperAdminLayout";
import TenantsPage from "./pages/superadmin/TenantsPage";
import TenantMigrationPanel from "./pages/superadmin/TenantMigrationPanel";

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

function SuperAdminRoutes() {
  const { isAuthenticated, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Una sesión de tenant normal no tiene permiso para este módulo — se
  // manda a su propio dashboard en vez de dejarla ver una pantalla que de
  // todas formas le devolvería 403 en cada llamada.
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <SuperAdminLayout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<TenantsPage />} />
        <Route path="/tenants/:id/migration" element={<TenantMigrationPanel />} />
      </Routes>
    </SuperAdminLayout>
  );
}

function AppRoutes({ themeMode, setThemeMode }) {
  const { isAuthenticated, isSuperAdmin, logout, tenant } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Una sesión de superadmin no tiene database_name — cualquier llamada
  // tenant-scoped desde estas pantallas normales devolvería 403 de
  // tenantDb. Se manda directo a su propio shell en vez de intentarlo.
  if (isSuperAdmin) {
    return <Navigate to="/superadmin" replace />;
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
      <AppLayoutMenu
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        onLogout={handleLogout}
        appName="CrediMaster"
        tenantName={tenant?.commercial_name || tenant?.legal_name}
      >
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
            path="/cierre-del-dia"
            element={
              <PageContainer>
                <BusinessDayPanel />
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
            path="/conami/tablas"
            element={
              <PageContainer>
                <ConamiDefaultsManager />
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
            path="/cartera-saneada"
            element={
              <PageContainer>
                <WrittenOffLoansList />
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
          {/* CONTABILIDAD */}
          <Route path="/contabilidad/cuentas" element={<AccountsList />} />
          <Route path="/contabilidad/libro-diario" element={<JournalList />} />
          <Route path="/contabilidad/mayor" element={<LedgerList />} />
          <Route
            path="/contabilidad/balance-comprobacion"
            element={<TrialBalance />}
          />
          <Route
            path="/contabilidad/estado-resultados"
            element={<IncomeStatement />}
          />
          <Route
            path="/contabilidad/balance-general"
            element={<BalanceSheet />}
          />
          <Route path="/contabilidad/cambios-patrimonio" element={<EquityChanges />} />
          <Route path="/contabilidad/flujo-efectivo" element={<CashFlowStatement />} />
          <Route path="/garantias/reporte" element={<GuaranteesReport />} />
          <Route path="/cumplimiento/matriz-riesgo" element={<AmlRiskCriteriaConfig />} />
          <Route path="/cumplimiento/pic" element={<PicReviewReminders />} />
          <Route path="/cumplimiento/listas" element={<WatchlistManagement />} />
          <Route path="/cumplimiento/alertas" element={<AmlAlertsInbox />} />
          <Route path="/cumplimiento/ros" element={<RosCasesList />} />
          <Route path="/cumplimiento/informe-mensual" element={<AmlMonthlyReport />} />
          <Route path="/cumplimiento/oficial-cumplimiento" element={<ComplianceOfficerHistory />} />
          <Route path="/adjudicaciones" element={<AssetAdjudicationsList />} />
          <Route path="/contabilidad/notas-eeff" element={<FinancialStatementNotes />} />
          <Route path="/contabilidad/cierre-ejercicio" element={<YearEndClosing />} />
          <Route path="/contabilidad/activo-fijo" element={<FixedAssetsList />} />
          <Route path="/contabilidad/activo-fijo/depreciacion" element={<FixedAssetDepreciation />} />
          <Route path="/obligaciones/financiadores" element={<FinanciadoresList />} />
          <Route path="/obligaciones/lineas-credito" element={<LineasCreditoList />} />
          <Route path="/obligaciones" element={<ObligacionesList />} />
          <Route path="/presupuesto" element={<BudgetsList />} />
          <Route path="/presupuesto/:id/cuentas" element={<BudgetAccountLinesEditor />} />
          <Route path="/presupuesto/:id/metas-colocacion" element={<BudgetPlacementGoalsEditor />} />
          <Route path="/presupuesto/:id/seguimiento" element={<BudgetTrackingDashboard />} />
          <Route path="/presupuesto/alertas" element={<BudgetAlertsInbox />} />
          <Route path="/presupuesto/departamentos" element={<DepartmentsConfig />} />
          <Route path="/presupuesto/conceptos" element={<BudgetConceptsConfig />} />
          <Route path="/presupuesto/mi-departamento" element={<DepartmentBudgetEditor />} />
          <Route path="/presupuesto/aprobacion-departamentos" element={<DepartmentBudgetApprovalInbox />} />
          <Route path="/bancos/cuentas" element={<BankAccountsList />} />
          <Route path="/bancos/movimientos" element={<BankMovementsList />} />
          <Route path="/bancos/conciliacion" element={<BankReconciliation />} />
          <Route path="/caja/cajas" element={<CashRegistersList />} />
          <Route path="/caja/movimientos" element={<CashMovementsList />} />
          <Route path="/caja/arqueos" element={<CollectorArqueosList />} />
          <Route path="/rrhh/empleados" element={<EmployeesList />} />
          <Route path="/rrhh/planillas" element={<PayrollRunsList />} />
          <Route path="/rrhh/prestamos" element={<EmployeeLoansList />} />
          <Route path="/rrhh/configuracion" element={<HrConfigPanel />} />
          <Route path="/rrhh/mis-vacaciones" element={<MyVacations />} />
          <Route path="/rrhh/aprobar-vacaciones" element={<VacationApprovalInbox />} />
          <Route path="/rrhh/incidencias" element={<IncidentsList />} />
          <Route path="/rrhh/liquidaciones" element={<LiquidationsList />} />
          <Route path="/rrhh/reportes" element={<HrReports />} />
          <Route path="/contabilidad/contabilizar" element={<PostingRuns />} />
          <Route path="/contabilidad/mapeos" element={<AccountMappingsManager />} />
          <Route path="/contabilidad/partidas-pendientes" element={<PendingItemsAging />} />
          <Route path="/conami/icc" element={<IccGenerator />} />
          <Route path="/conami/isc" element={<IscGenerator />} />
          <Route path="/reports/conami/icc" element={<IccReportPage />} />

          <Route path="/custom-reports" element={<CustomReportsPage />} />

          <Route path="/reports/studio" element={<Studio />} />
          <Route path="/auditoria" element={<PageContainer><AuditLog /></PageContainer>} />
          <Route path="/configuracion/calendarios" element={<PageContainer><BranchCalendarManager /></PageContainer>} />

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
      </AppLayoutMenu>
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
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/recuperar-password" element={<ForgotPasswordPage />} />
              <Route path="/restablecer-password" element={<ResetPasswordPage />} />
              <Route
                path="/superadmin/*"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoutes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <IdleSessionHandler />
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
