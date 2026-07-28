import React, { useContext, useEffect, useMemo, useState } from "react";
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
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
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
import ShieldIcon from "@mui/icons-material/Shield";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import TableChartIcon from "@mui/icons-material/TableChart";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import KpiCard from "../../components/dashboard/KpiCard";
import { UserContext } from "../../contexts/UserContext";
import {
  getDashboardCatalogs,
  getBalancesFastSummary,
  getBalancesFastPortfolioByMonth,
  getBalancesFastAging,
  getBalancesDetail,
} from "../../api/dashboardBalances";

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
              bgcolor: "#EEF3FB",
              color: "#0F4C81",
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

export default function BalancesDashboardPro() {
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
  const [portfolioByMonth, setPortfolioByMonth] = useState([]);
  const [aging, setAging] = useState([]);

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

      const [summaryRes, monthRes, agingRes] = await Promise.all([
        getBalancesFastSummary(params),
        getBalancesFastPortfolioByMonth(params),
        getBalancesFastAging(params),
      ]);

      setSummary(summaryRes?.data || null);
      setPortfolioByMonth(monthRes?.data || []);
      setAging(agingRes?.data || []);
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

  const currentPortfolio = Math.max(
    0,
    Number(summary?.total_portfolio || 0) - Number(summary?.overdue_portfolio || 0),
  );

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
          background: "linear-gradient(120deg, #0B1F3A 0%, #0F4C81 100%)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
        >
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Dashboard de Saldos
            </Typography>
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
                value={summary?.overdue_portfolio}
                icon={WarningAmberIcon}
                color="error"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="% Mora"
                value={summary?.overdue_rate}
                type="percent"
                icon={PercentIcon}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Capital"
                value={summary?.total_capital}
                icon={PaymentsIcon}
                color="info"
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
                  <LineChart data={portfolioByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="total_portfolio"
                      name="Cartera"
                      stroke="#1565c0"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="overdue_portfolio"
                      name="Mora"
                      stroke="#c62828"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="provision"
                      name="Provisión"
                      stroke="#ef6c00"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, borderRadius: 3, height: 400 }}>
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
                          fill={AGING_COLORS[entry.bucket] || "#1565c0"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
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
                  ? `Filtro aging activo: ${detailBucket} · ${detailTotal} registros`
                  : `Sin filtro de aging · ${detailTotal} registros`
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
