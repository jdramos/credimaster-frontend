import React, { lazy, Suspense, useState, useMemo, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  Box,
  CircularProgress,
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

// Layout/auth chrome se necesita en cada render sin importar la ruta, así
// que se queda como import normal (lazy-cargarlo solo agregaría un
// parpadeo de carga sin ahorrar nada, porque siempre se monta de todas
// formas). Login/Forgot/Reset también se dejan eager: son livianas y es
// literalmente la primera pantalla que ve cualquier visita sin sesión.
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AppLayoutMenu from "./components/AppLayoutMenu";
import IdleSessionHandler from "./components/IdleSessionHandler";
import SuperAdminLayout from "./components/SuperAdminLayout";

// Todo lo demás es contenido de una sola ruta -- se carga bajo demanda
// (React.lazy) para que el bundle inicial no incluya los ~90 módulos de
// contabilidad/RRHH/bancos/caja/cumplimiento/presupuesto/superadmin que la
// mayoría de una sesión nunca visita.
const Home = lazy(() => import("./pages/Home"));
const LoanList = lazy(() => import("./components/LoanList"));
const LoanDisbursementRemittancesList = lazy(() =>
  import("./components/Loan/LoanDisbursementRemittancesList"),
);
const Branches = lazy(() => import("./pages/Branches"));
const Risks = lazy(() => import("./pages/Risks"));
const ProvincesList = lazy(() => import("./components/ProvincesList"));
const RiskAdd = lazy(() => import("./components/RiskAdd"));
const RiskEdit = lazy(() => import("./components/RiskEdit"));
const ProvinceAdd = lazy(() => import("./components/ProvinceAdd"));
const ProvinceEdit = lazy(() => import("./components/ProvinceEdit"));
const BranchAdd = lazy(() => import("./components/BranchAdd"));
const BranchEdit = lazy(() => import("./components/BranchEdit"));
const CollectorList = lazy(() => import("./components/CollectorList"));
const CollectorAdd = lazy(() => import("./components/CollectorAdd"));
const CollectorEdit = lazy(() => import("./components/CollectorEdit"));
const PromoterList = lazy(() => import("./components/PromoterList"));
const PromoterAdd = lazy(() => import("./components/PromoterAdd"));
const PromoterEdit = lazy(() => import("./components/PromoterEdit"));
const CustomerList = lazy(() => import("./components/Customer/CustomerList"));
const UserAdd = lazy(() => import("./components/UserAdd"));
const AddApproverForm = lazy(() => import("./components/ApproverAddForm"));
const ApproverList = lazy(() => import("./components/ApproverList"));
const UsersList = lazy(() => import("./components/UserList"));
const RolePermissionManager = lazy(() => import("./components/RolePermissionManager"));
const PermissionList = lazy(() => import("./components/PermissionList"));
const PaymentList = lazy(() => import("./components/PaymentList"));
const GenerateBalances = lazy(() => import("./components/GenerateBalances"));
const BusinessDayPanel = lazy(() => import("./components/BusinessDayPanel"));
const CreditPolicyManager = lazy(() => import("./components/CreditPolicyManager"));
const BalanceSummary = lazy(() => import("./components/Balances"));
const ProvissionViewer = lazy(() => import("./components/ProvissionViewer"));
const SinRiesgoReport = lazy(() => import("./components/Sinriesgo"));
const WrittenOffLoansList = lazy(() => import("./components/WrittenOffLoansList"));
const EconomicActivitiesPage = lazy(() => import("./pages/EconomicActivitiesPage"));
const GenrePage = lazy(() => import("./pages/GenrePage"));
const MaritalStatusPage = lazy(() => import("./pages/MaritalStatusPage"));
const CustomerAddGpt = lazy(() => import("./components/Customer/CustomerForm"));
const LoanAdd = lazy(() => import("./components/Loan/LoanAddGpt"));
const LoanAddWizard = lazy(() => import("./components/Loan/LoanAddWizard"));
const ApprovalInbox = lazy(() => import("./components/ApprovalInbox"));
const CustomerClaimsList = lazy(() => import("./components/Claims/CustomerClaimsList"));
const BalancesDashboard = lazy(() => import("./components/dashboard/BalancesDashboard"));
const CreditFileTemplatePage = lazy(() => import("./components/credit-files/CreditFileTemplatePage"));
const ConamiDefaultsManager = lazy(() => import("./components/conami/ConamiDefaultsManager"));
const AccountsList = lazy(() => import("./components/accounting/AccountsList"));
const JournalList = lazy(() => import("./components/accounting/JournalList"));
const LedgerList = lazy(() => import("./components/accounting/LedgerList"));
const TrialBalance = lazy(() => import("./components/accounting/TrialBalance"));
const IncomeStatement = lazy(() => import("./components/accounting/IncomeStatement"));
const BalanceSheet = lazy(() => import("./components/accounting/BalanceSheet"));
const EquityChanges = lazy(() => import("./components/accounting/EquityChanges"));
const CashFlowStatement = lazy(() => import("./components/accounting/CashFlowStatement"));
const GuaranteesReport = lazy(() => import("./components/GuaranteesReport"));
const AmlRiskCriteriaConfig = lazy(() => import("./components/Compliance/AmlRiskCriteriaConfig"));
const PicReviewReminders = lazy(() => import("./components/Compliance/PicReviewReminders"));
const WatchlistManagement = lazy(() => import("./components/Compliance/WatchlistManagement"));
const AmlAlertsInbox = lazy(() => import("./components/Compliance/AmlAlertsInbox"));
const RosCasesList = lazy(() => import("./components/Compliance/RosCasesList"));
const AmlMonthlyReport = lazy(() => import("./components/Compliance/AmlMonthlyReport"));
const ComplianceOfficerHistory = lazy(() => import("./components/Compliance/ComplianceOfficerHistory"));
const AssetAdjudicationsList = lazy(() => import("./components/AssetAdjudicationsList"));
const FinancialStatementNotes = lazy(() => import("./components/accounting/FinancialStatementNotes"));
const YearEndClosing = lazy(() => import("./components/accounting/YearEndClosing"));
const FixedAssetsList = lazy(() => import("./components/accounting/FixedAssetsList"));
const FixedAssetDepreciation = lazy(() => import("./components/accounting/FixedAssetDepreciation"));
const BankAccountsList = lazy(() => import("./components/banks/BankAccountsList"));
const BankMovementsList = lazy(() => import("./components/banks/BankMovementsList"));
const BankReconciliation = lazy(() => import("./components/banks/BankReconciliation"));
const FinanciadoresList = lazy(() => import("./components/obligations/FinanciadoresList"));
const LineasCreditoList = lazy(() => import("./components/obligations/LineasCreditoList"));
const ObligacionesList = lazy(() => import("./components/obligations/ObligacionesList"));
const InsuranceProvidersList = lazy(() => import("./components/insurance/InsuranceProvidersList"));
const InsuranceProductsList = lazy(() => import("./components/insurance/InsuranceProductsList"));
const CustomerInsurancesList = lazy(() => import("./components/insurance/CustomerInsurancesList"));
const BudgetsList = lazy(() => import("./components/budget/BudgetsList"));
const BudgetAccountLinesEditor = lazy(() => import("./components/budget/BudgetAccountLinesEditor"));
const BudgetPlacementGoalsEditor = lazy(() => import("./components/budget/BudgetPlacementGoalsEditor"));
const BudgetTrackingDashboard = lazy(() => import("./components/budget/BudgetTrackingDashboard"));
const BudgetAlertsInbox = lazy(() => import("./components/budget/BudgetAlertsInbox"));
const DepartmentsConfig = lazy(() => import("./components/budget/DepartmentsConfig"));
const BudgetConceptsConfig = lazy(() => import("./components/budget/BudgetConceptsConfig"));
const DepartmentBudgetEditor = lazy(() => import("./components/budget/DepartmentBudgetEditor"));
const DepartmentBudgetApprovalInbox = lazy(() => import("./components/budget/DepartmentBudgetApprovalInbox"));
const CashRegistersList = lazy(() => import("./components/caja/CashRegistersList"));
const CashMovementsList = lazy(() => import("./components/caja/CashMovementsList"));
const CollectorArqueosList = lazy(() => import("./components/caja/CollectorArqueosList"));
const EmployeesList = lazy(() => import("./components/hr/EmployeesList"));
const HrConfigPanel = lazy(() => import("./components/hr/HrConfigPanel"));
const EmployeeRecurringItemsList = lazy(() => import("./components/hr/EmployeeRecurringItemsList"));
const PayrollRunsList = lazy(() => import("./components/hr/PayrollRunsList"));
const PayrollApproversConfig = lazy(() => import("./components/hr/PayrollApproversConfig"));
const PayrollApprovalInbox = lazy(() => import("./components/hr/PayrollApprovalInbox"));
const MyVacations = lazy(() => import("./components/hr/MyVacations"));
const VacationApprovalInbox = lazy(() => import("./components/hr/VacationApprovalInbox"));
const IncidentsList = lazy(() => import("./components/hr/IncidentsList"));
const LiquidationsList = lazy(() => import("./components/hr/LiquidationsList"));
const HrReports = lazy(() => import("./components/hr/HrReports"));
const PostingRuns = lazy(() => import("./components/accounting/PostingRuns"));
const AccountMappingsManager = lazy(() => import("./components/accounting/AccountMappingsManager"));
const PendingItemsAging = lazy(() => import("./components/accounting/PendingItemsAging"));
const AccountReconciliation = lazy(() => import("./components/accounting/AccountReconciliation"));
const IccReportPage = lazy(() => import("./pages/reports/conami/IccReportPage"));
const IccGenerator = lazy(() => import("./pages/reports/conami/icc/IccGenerator"));
const IscGenerator = lazy(() => import("./pages/reports/conami/isc/IscGenerator"));
const CustomReportsPage = lazy(() => import("./pages/customReports/CustomReportsPage"));
const Studio = lazy(() => import("./reports/studio/Studio"));
const AuditLog = lazy(() => import("./components/AuditLog"));
const BranchCalendarManager = lazy(() => import("./components/BranchCalendarManager"));
const TenantsPage = lazy(() => import("./pages/superadmin/TenantsPage"));
const TenantMigrationPanel = lazy(() => import("./pages/superadmin/TenantMigrationPanel"));

function RouteLoadingFallback() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "50vh",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

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
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<TenantsPage />} />
          <Route path="/tenants/:id/migration" element={<TenantMigrationPanel />} />
        </Routes>
      </Suspense>
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
        <Suspense fallback={<RouteLoadingFallback />}>
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
            path="/creditos/remesas"
            element={
              <PageContainer>
                <LoanDisbursementRemittancesList />
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
            path="/creditos/agregar-v2"
            element={
              <PageContainer>
                <LoanAddWizard />
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
          <Route path="/seguros/aseguradoras" element={<InsuranceProvidersList />} />
          <Route path="/seguros/tipos" element={<InsuranceProductsList />} />
          <Route path="/seguros" element={<CustomerInsurancesList />} />
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
          <Route path="/rrhh/aprobadores-planilla" element={<PayrollApproversConfig />} />
          <Route path="/rrhh/aprobar-planillas" element={<PayrollApprovalInbox />} />
          <Route path="/rrhh/deducciones" element={<EmployeeRecurringItemsList kind="DEDUCCION" />} />
          <Route path="/rrhh/ingresos" element={<EmployeeRecurringItemsList kind="INGRESO" />} />
          <Route path="/rrhh/configuracion" element={<HrConfigPanel />} />
          <Route path="/rrhh/mis-vacaciones" element={<MyVacations />} />
          <Route path="/rrhh/aprobar-vacaciones" element={<VacationApprovalInbox />} />
          <Route path="/rrhh/incidencias" element={<IncidentsList />} />
          <Route path="/rrhh/liquidaciones" element={<LiquidationsList />} />
          <Route path="/rrhh/reportes" element={<HrReports />} />
          <Route path="/contabilidad/contabilizar" element={<PostingRuns />} />
          <Route path="/contabilidad/mapeos" element={<AccountMappingsManager />} />
          <Route path="/contabilidad/partidas-pendientes" element={<PendingItemsAging />} />
          <Route path="/contabilidad/conciliacion" element={<AccountReconciliation />} />
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
        </Suspense>
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
