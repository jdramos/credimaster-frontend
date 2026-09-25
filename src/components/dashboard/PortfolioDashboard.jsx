import React, { useContext, useEffect, useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Divider,
  Chip,
  Stack,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import dayjs from "dayjs";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PercentIcon from "@mui/icons-material/Percent";
import PaymentsIcon from "@mui/icons-material/Payments";
import PaidIcon from "@mui/icons-material/Paid";
import ShieldIcon from "@mui/icons-material/Shield";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import PieChartIcon from "@mui/icons-material/PieChartOutline";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import GppMaybeIcon from "@mui/icons-material/GppMaybe";
import TableChartIcon from "@mui/icons-material/TableChart";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import KpiCard from "./KpiCard";
import BAC from "../../styles/bac";
import { UserContext } from "../../contexts/UserContext";
import {
  getDashboardCatalogs,
  getBalancesFastSummary,
  getBalancesFastPortfolioByMonth,
  getBalancesFastAging,
  getBalancesFastPortfolioByBranch,
  getBalancesFastRiskBreakdown,
  getBalancesDetail,
} from "../../api/dashboardBalances";

// Paleta validada con el skill dataviz (scripts/validate_palette.js) contra
// ceguera al color -- no son los mismos tonos rojo/verde de KpiCard.jsx
// (esos fallan la separación CVD deuteranope, ΔE 4.2) sino el par
// azul/rojo recomendado por la guía para oposición "bien/mal" (ΔE 22.9+).
const VIGENTE_COLOR = BAC.primary;
const MORA_COLOR = "#C62828";

// Igual criterio: un ramp verde-ámbar-rojo de 3 pasos (no 5, uno por letra)
// pasa la validación CVD/contraste; agrupa A-B (sana), C (vigilancia) y
// D-E (deteriorada) -- agrupación estándar de riesgo crediticio, además de
// ser más legible que 5 tonos casi indistinguibles entre sí.
const RISK_TIERS = {
  sana: { label: "Cartera Sana (A-B)", color: "#0ca30c" },
  vigilancia: { label: "Vigilancia Especial (C)", color: "#eda100" },
  deteriorada: { label: "Cartera Deteriorada (D-E)", color: "#d03b3b" },
  sin_clasificar: { label: "Sin Clasificar", color: BAC.muted },
};

const classifyRiskTier = (code) => {
  const c = String(code || "").toUpperCase();
  if (c.startsWith("A") || c.startsWith("B")) return "sana";
  if (c.startsWith("C")) return "vigilancia";
  if (c.startsWith("D") || c.startsWith("E")) return "deteriorada";
  return "sin_clasificar";
};

const AGING_COLORS = {
  "Al día": "#2E7D32",
  "1-15": "#8BC34A",
  "16-30": "#FBC02D",
  "31-60": "#EF6C00",
  "61-90": "#E53935",
  "90+": "#B71C1C",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const calcGrowth = (curr, prev) => {
  const c = Number(curr || 0);
  const p = Number(prev || 0);
  if (!p) return c > 0 ? 100 : 0;
  return ((c - p) / p) * 100;
};

const getPreviousPeriodRange = (dateFrom, dateTo) => {
  const from = dayjs(dateFrom);
  const to = dayjs(dateTo);
  const spanDays = Math.max(1, to.diff(from, "day") + 1);
  const prevTo = from.subtract(1, "day");
  const prevFrom = prevTo.subtract(spanDays - 1, "day");
  return {
    date_from: prevFrom.format("YYYY-MM-DD"),
    date_to: prevTo.format("YYYY-MM-DD"),
  };
};

function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      mb={2}
      flexWrap="wrap"
      gap={1}
    >
      <Stack direction="row" spacing={1.2} alignItems="center">
        {Icon && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: BAC.soft,
              color: BAC.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon sx={{ fontSize: 18 }} />
          </Box>
        )}
        <Box>
          <Typography variant="h6" fontWeight={800} fontSize={16}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      {action}
    </Box>
  );
}

export default function PortfolioDashboard() {
  const { role, permissions = [] } = useContext(UserContext) || {};
  const canView = role === 1 || permissions.includes("balances.ver");

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [catalogs, setCatalogs] = useState({
    branches: [],
    promoters: [],
    vendors: [],
    collectors: [],
  });

  const [filters, setFilters] = useState({
    date_from: dayjs().startOf("month").format("YYYY-MM-DD"),
    date_to: dayjs().format("YYYY-MM-DD"),
    balance_type: "FINAL",
    branch_id: "",
    promoter_id: "",
    vendor_id: "",
    collector_id: "",
  });

  const [summary, setSummary] = useState(null);
  const [previousSummary, setPreviousSummary] = useState(null);
  const [portfolioByMonth, setPortfolioByMonth] = useState([]);
  const [aging, setAging] = useState([]);
  const [branchBreakdown, setBranchBreakdown] = useState([]);
  const [riskBreakdown, setRiskBreakdown] = useState([]);

  const [detailRows, setDetailRows] = useState([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailPage, setDetailPage] = useState(0);
  const [detailPageSize, setDetailPageSize] = useState(25);
  const [detailBucket, setDetailBucket] = useState("");

  const params = useMemo(
    () => ({
      ...filters,
      branch_id: filters.branch_id || undefined,
      promoter_id: filters.promoter_id || undefined,
      vendor_id: filters.vendor_id || undefined,
      collector_id: filters.collector_id || undefined,
    }),
    [filters],
  );

  const previousParams = useMemo(() => {
    const prevRange = getPreviousPeriodRange(filters.date_from, filters.date_to);
    return { ...params, ...prevRange };
  }, [params, filters.date_from, filters.date_to]);

  const riskTierData = useMemo(() => {
    const totals = {};
    riskBreakdown.forEach((row) => {
      const tier = classifyRiskTier(row.risk_code);
      totals[tier] = (totals[tier] || 0) + Number(row.total_portfolio || 0);
    });
    return Object.entries(totals)
      .filter(([, value]) => value > 0)
      .map(([tier, value]) => ({
        tier,
        name: RISK_TIERS[tier]?.label || tier,
        value,
        color: RISK_TIERS[tier]?.color || BAC.muted,
      }));
  }, [riskBreakdown]);

  const loadCatalogs = async () => {
    try {
      const res = await getDashboardCatalogs();
      setCatalogs(res?.data || {});
    } catch (error) {
      console.error(error);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [summaryRes, previousRes, monthRes, agingRes, branchRes, riskRes] =
        await Promise.all([
          getBalancesFastSummary(params),
          getBalancesFastSummary(previousParams),
          getBalancesFastPortfolioByMonth(params),
          getBalancesFastAging(params),
          getBalancesFastPortfolioByBranch(params),
          getBalancesFastRiskBreakdown(params),
        ]);

      setSummary(summaryRes?.data || null);
      setPreviousSummary(previousRes?.data || null);
      setPortfolioByMonth(monthRes?.data || []);
      setAging(agingRes?.data || []);
      setBranchBreakdown(branchRes?.data || []);
      setRiskBreakdown(riskRes?.data || []);
      setLastUpdated(dayjs());
    } catch (error) {
      console.error("loadDashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async ({
    page = detailPage,
    pageSize = detailPageSize,
    overdue_bucket = detailBucket,
  } = {}) => {
    try {
      const res = await getBalancesDetail({
        ...params,
        overdue_bucket: overdue_bucket || undefined,
        latest_only: true,
        page: page + 1,
        pageSize,
      });

      setDetailRows(res?.data || []);
      setDetailTotal(res?.total || 0);
    } catch (error) {
      console.error("loadDetail error:", error);
    }
  };

  useEffect(() => {
    if (!canView) return;
    loadCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    loadDashboard();
    loadDetail({
      page: 0,
      pageSize: detailPageSize,
      overdue_bucket: detailBucket,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  if (!canView) {
    return (
      <Box p={3}>
        <Alert severity="warning" icon={<LockOutlinedIcon />} sx={{ borderRadius: 2 }}>
          No tienes permiso para ver el Dashboard de Saldos. Contacta a tu administrador
          si necesitas acceso (permiso <strong>balances.ver</strong>).
        </Alert>
      </Box>
    );
  }

  const handleFilterChange = (field) => (event) => {
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleApplyFilters = async () => {
    setDetailPage(0);
    await loadDashboard();
    await loadDetail({
      page: 0,
      pageSize: detailPageSize,
      overdue_bucket: detailBucket,
    });
  };

  const handleAgingClick = async (data) => {
    const bucket = data?.bucket;

    const map = {
      "Al día": "current",
      "1-15": "1-15",
      "16-30": "16-30",
      "31-60": "31-60",
      "61-90": "61-90",
      "90+": "90+",
    };

    const selected = map[bucket] || "";
    setDetailBucket(selected);
    setDetailPage(0);
    await loadDetail({
      page: 0,
      pageSize: detailPageSize,
      overdue_bucket: selected,
    });
  };

  const exportToExcel = () => {
    const exportRows = detailRows.map((row) => ({
      Fecha: row.date,
      Crédito: row.loan_id,
      Cliente: row.customer_identification,
      Sucursal: row.branch_name,
      Promotor: row.promoter_name,
      Vendedor: row.vendor_name,
      Cobrador: row.collector_name,
      Cuota: row.payment_number,
      Capital: Number(row.capital_balance || 0),
      Interés: Number(row.interest_balance || 0),
      Seguro: Number(row.insurance_balance || 0),
      Comisión: Number(row.fee_balance || 0),
      Otros: Number(row.other_charges_balance || 0),
      SaldoTotal: Number(row.total_balance || 0),
      DiasMora: Number(row.defaulted_days || 0),
      CapitalVencido: Number(row.defaulted_capital || 0),
      InteresVencido: Number(row.defaulted_interest || 0),
      Riesgo: row.provission_code,
      ProvisionPorcentaje: Number(row.provission_percentage || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Saldos");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `balances_detail_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
  };

  const columns = [
    { field: "date", headerName: "Fecha", width: 110 },
    { field: "loan_id", headerName: "Crédito", width: 100 },
    { field: "customer_identification", headerName: "Cliente", width: 160 },
    { field: "branch_name", headerName: "Sucursal", width: 140 },
    { field: "promoter_name", headerName: "Promotor", width: 140 },
    { field: "vendor_name", headerName: "Vendedor", width: 140 },
    { field: "collector_name", headerName: "Cobrador", width: 140 },
    {
      field: "capital_balance",
      headerName: "Capital",
      width: 130,
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "interest_balance",
      headerName: "Interés",
      width: 130,
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "total_balance",
      headerName: "Saldo Total",
      width: 150,
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    { field: "defaulted_days", headerName: "Días Mora", width: 110 },
    { field: "provission_code", headerName: "Riesgo", width: 90 },
    {
      field: "provission_percentage",
      headerName: "% Prov.",
      width: 110,
      valueFormatter: ({ value }) => `${Number(value || 0).toFixed(2)}%`,
    },
  ];

  // "Mora" es el monto REALMENTE atrasado (capital+interés vencidos), no el
  // saldo completo de cualquier crédito con una cuota atrasada -- ese
  // saldo-completo es lo que ya muestra "Aging de cartera" (una
  // clasificación de cartera vencida distinta, donde sí corresponde mover
  // el saldo completo al bucket de mora). overdue_portfolio (del backend)
  // sigue existiendo y sigue siendo correcto para el aging, pero para el KPI
  // "Mora" mostraría hasta el 100% de la cartera con que un solo crédito
  // tenga 1 día de atraso, que es justo lo que se reportó como confuso.
  const overdueAmount = (s) => Number(s?.overdue_capital || 0) + Number(s?.overdue_interest || 0);
  const moraAmount = overdueAmount(summary);
  const previousMoraAmount = overdueAmount(previousSummary);
  const moraRate =
    Number(summary?.total_portfolio || 0) > 0 ? (moraAmount / Number(summary.total_portfolio)) * 100 : 0;
  const previousMoraRate =
    Number(previousSummary?.total_portfolio || 0) > 0
      ? (previousMoraAmount / Number(previousSummary.total_portfolio)) * 100
      : 0;

  const currentPortfolio = Math.max(0, Number(summary?.total_portfolio || 0) - moraAmount);

  // Mismo criterio que arriba para la serie "Mora" de la tendencia mensual:
  // monto realmente vencido por mes, no el saldo completo de cada crédito
  // con alguna cuota atrasada ese mes.
  const portfolioByMonthWithMora = portfolioByMonth.map((row) => ({
    ...row,
    mora_amount: overdueAmount(row),
  }));

  const vigenteMoraData = [
    { name: "Vigente", value: currentPortfolio, color: VIGENTE_COLOR },
    { name: "Mora", value: moraAmount, color: MORA_COLOR },
  ].filter((d) => d.value > 0);

  const activeFilterChips = [
    filters.balance_type && `Tipo: ${filters.balance_type}`,
    filters.branch_id &&
      `Sucursal: ${catalogs.branches.find((b) => b.id === filters.branch_id)?.name || filters.branch_id}`,
    filters.promoter_id &&
      `Promotor: ${catalogs.promoters.find((p) => p.id === filters.promoter_id)?.name || filters.promoter_id}`,
    filters.vendor_id &&
      `Vendedor: ${catalogs.vendors.find((v) => v.id === filters.vendor_id)?.name || filters.vendor_id}`,
    filters.collector_id &&
      `Cobrador: ${catalogs.collectors.find((c) => c.id === filters.collector_id)?.name || filters.collector_id}`,
  ].filter(Boolean);

  return (
    <Box p={{ xs: 1.5, md: 2 }}>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          color: "#fff",
          background: `linear-gradient(120deg, ${BAC.text} 0%, ${BAC.primary} 100%)`,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h5" fontWeight={800}>
                Dashboard de Saldos
              </Typography>
              <HelpButton screenKey="dashboard.saldos" sx={{ color: "white" }} />
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Cartera, mora y provisión — {dayjs(filters.date_from).format("DD/MM/YYYY")} al{" "}
              {dayjs(filters.date_to).format("DD/MM/YYYY")}
            </Typography>
          </Box>

          {lastUpdated && (
            <Chip
              size="small"
              label={`Actualizado ${lastUpdated.format("HH:mm:ss")}`}
              sx={{ bgcolor: "rgba(255,255,255,.14)", color: "#fff", fontWeight: 700 }}
            />
          )}
        </Stack>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <SectionHeader icon={FilterAltIcon} title="Filtros" />

        <Grid container spacing={2}>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Desde"
              value={filters.date_from}
              onChange={handleFilterChange("date_from")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Hasta"
              value={filters.date_to}
              onChange={handleFilterChange("date_to")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Tipo"
              value={filters.balance_type}
              onChange={handleFilterChange("balance_type")}
            >
              <MenuItem value="INITIAL">INITIAL</MenuItem>
              <MenuItem value="FINAL">FINAL</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sucursal"
              value={filters.branch_id}
              onChange={handleFilterChange("branch_id")}
            >
              <MenuItem value="">Todas</MenuItem>
              {catalogs.branches.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Promotor"
              value={filters.promoter_id}
              onChange={handleFilterChange("promoter_id")}
            >
              <MenuItem value="">Todos</MenuItem>
              {catalogs.promoters.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Vendedor"
              value={filters.vendor_id}
              onChange={handleFilterChange("vendor_id")}
            >
              <MenuItem value="">Todos</MenuItem>
              {catalogs.vendors.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Cobrador"
              value={filters.collector_id}
              onChange={handleFilterChange("collector_id")}
            >
              <MenuItem value="">Todos</MenuItem>
              {catalogs.collectors.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid
            item
            xs={12}
            md={10}
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            gap={1}
          >
            <Button variant="contained" onClick={handleApplyFilters} startIcon={<FilterAltIcon />}>
              Aplicar filtros
            </Button>

            <Button variant="outlined" onClick={exportToExcel} startIcon={<DownloadIcon />}>
              Exportar Excel
            </Button>

            <Button
              variant="text"
              startIcon={<RestartAltIcon />}
              onClick={async () => {
                setDetailBucket("");
                setDetailPage(0);
                await loadDetail({
                  page: 0,
                  pageSize: detailPageSize,
                  overdue_bucket: "",
                });
              }}
            >
              Limpiar drill-down
            </Button>
          </Grid>

          {activeFilterChips.length > 0 && (
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {activeFilterChips.map((label) => (
                  <Chip key={label} size="small" label={label} variant="outlined" />
                ))}
              </Stack>
            </Grid>
          )}
        </Grid>
      </Paper>

      {loading ? (
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Cartera Total"
                value={summary?.total_portfolio}
                growth={calcGrowth(summary?.total_portfolio, previousSummary?.total_portfolio)}
                subtitle="vs. período anterior"
                icon={AccountBalanceIcon}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Cartera Vigente"
                value={currentPortfolio}
                icon={CheckCircleOutlineIcon}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Mora"
                value={moraAmount}
                growth={calcGrowth(moraAmount, previousMoraAmount)}
                invertGrowth
                subtitle="Capital + interés realmente vencidos"
                icon={WarningAmberIcon}
                color="error"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="% Mora"
                value={moraRate}
                type="percent"
                growth={calcGrowth(moraRate, previousMoraRate)}
                invertGrowth
                subtitle="vs. período anterior"
                icon={PercentIcon}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Capital"
                value={summary?.total_capital}
                growth={calcGrowth(summary?.total_capital, previousSummary?.total_capital)}
                subtitle="vs. período anterior"
                icon={PaymentsIcon}
                color="info"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Interés"
                value={summary?.total_interest}
                growth={calcGrowth(summary?.total_interest, previousSummary?.total_interest)}
                subtitle="vs. período anterior"
                icon={PaidIcon}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Provisión Estimada"
                value={summary?.estimated_provision}
                icon={ShieldIcon}
                color="purple"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Clientes"
                value={summary?.total_customers}
                type="number"
                growth={calcGrowth(summary?.total_customers, previousSummary?.total_customers)}
                subtitle="vs. período anterior"
                icon={PeopleAltIcon}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Créditos Activos"
                value={summary?.total_loans}
                type="number"
                icon={AssignmentTurnedInIcon}
                color="info"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 2, borderRadius: 3, height: 400 }}>
                <SectionHeader
                  icon={ShowChartIcon}
                  title="Evolución de cartera"
                  subtitle="Cartera total, mora y provisión por mes"
                />
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={portfolioByMonthWithMora}>
                    <defs>
                      <linearGradient id="gradCartera" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BAC.primary} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={BAC.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradMora" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={MORA_COLOR} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={MORA_COLOR} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradProvision" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6A1B9A" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6A1B9A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="total_portfolio"
                      name="Cartera"
                      stroke={BAC.primary}
                      strokeWidth={2.5}
                      fill="url(#gradCartera)"
                      dot={{ r: 3 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mora_amount"
                      name="Mora"
                      stroke={MORA_COLOR}
                      strokeWidth={2}
                      fill="url(#gradMora)"
                      dot={{ r: 3 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="provision"
                      name="Provisión"
                      stroke="#6A1B9A"
                      strokeWidth={2}
                      fill="url(#gradProvision)"
                      dot={{ r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, borderRadius: 3, height: 400 }}>
                <SectionHeader
                  icon={PieChartIcon}
                  title="Cartera vigente vs. mora"
                  subtitle="Distribución de la cartera actual"
                />
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={vigenteMoraData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {vigenteMoraData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, borderRadius: 3, height: 380 }}>
                <SectionHeader
                  icon={DonutLargeIcon}
                  title="Aging de cartera"
                  subtitle="Clic en una barra para ver el detalle"
                />
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={aging} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="bucket" tick={{ fontSize: 12 }} width={70} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar
                      dataKey="total_balance"
                      name="Saldo"
                      radius={[0, 6, 6, 0]}
                      cursor="pointer"
                      onClick={handleAgingClick}
                    >
                      {aging.map((entry) => (
                        <Cell
                          key={entry.bucket}
                          fill={AGING_COLORS[entry.bucket] || BAC.primary}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, borderRadius: 3, height: 380 }}>
                <SectionHeader
                  icon={AccountTreeIcon}
                  title="Cartera por sucursal"
                  subtitle="Saldo total al corte, por sucursal"
                />
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={branchBreakdown} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
                    <XAxis
                      dataKey="branch_name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="total_portfolio" name="Cartera" fill={BAC.primary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, borderRadius: 3, height: 380 }}>
                <SectionHeader
                  icon={GppMaybeIcon}
                  title="Cartera por clasificación de riesgo"
                  subtitle="Agrupación CONAMI: A-B / C / D-E"
                />
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={riskTierData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="45%"
                      outerRadius="80%"
                      paddingAngle={2}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {riskTierData.map((entry) => (
                        <Cell key={entry.tier} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <SectionHeader
              icon={TableChartIcon}
              title="Detalle operativo de saldos"
              subtitle={
                detailBucket
                  ? `1 fila por crédito (saldo más reciente) · Filtro aging: ${detailBucket} · ${detailTotal} registros`
                  : `1 fila por crédito (saldo más reciente) · ${detailTotal} registros`
              }
            />

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ height: 550, width: "100%" }}>
              <DataGrid
                rows={detailRows}
                columns={columns}
                getRowId={(row) => row.id}
                paginationMode="server"
                rowCount={detailTotal}
                page={detailPage}
                pageSize={detailPageSize}
                onPageChange={(newPage) => {
                  setDetailPage(newPage);
                  loadDetail({
                    page: newPage,
                    pageSize: detailPageSize,
                    overdue_bucket: detailBucket,
                  });
                }}
                onPageSizeChange={(newPageSize) => {
                  setDetailPageSize(newPageSize);
                  setDetailPage(0);
                  loadDetail({
                    page: 0,
                    pageSize: newPageSize,
                    overdue_bucket: detailBucket,
                  });
                }}
                rowsPerPageOptions={[25, 50, 100]}
                disableSelectionOnClick
              />
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
