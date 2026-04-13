import React, { useEffect, useMemo, useState } from "react";
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import dayjs from "dayjs";
import KpiCard from "../../components/dashboard/KpiCard";
import {
  getDashboardCatalogs,
  getBalancesFastSummary,
  getBalancesFastPortfolioByMonth,
  getBalancesFastAging,
  getBalancesDetail,
} from "../../api/dashboardBalances";

const COLORS = [
  "#1565c0",
  "#2e7d32",
  "#ef6c00",
  "#c62828",
  "#6a1b9a",
  "#00838f",
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

export default function BalancesDashboardPro() {
  const [loading, setLoading] = useState(false);
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
    loadCatalogs();
  }, []);

  useEffect(() => {
    loadDashboard();
    loadDetail({
      page: 0,
      pageSize: detailPageSize,
      overdue_bucket: detailBucket,
    });
  }, []);

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

  const handleAgingClick = async (_, index) => {
    const bucket = aging[index]?.bucket;

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

  return (
    <Box p={2}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Dashboard Pro de Saldos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Resumen rápido desde tabla resumida + detalle operativo desde balances
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
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
            <Button variant="contained" onClick={handleApplyFilters}>
              Aplicar filtros
            </Button>

            <Button variant="outlined" onClick={exportToExcel}>
              Exportar Excel
            </Button>

            <Button
              variant="text"
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
        </Grid>
      </Paper>

      {loading ? (
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={3}>
              <KpiCard title="Cartera total" value={summary?.total_portfolio} />
            </Grid>
            <Grid item xs={12} md={3}>
              <KpiCard title="Capital" value={summary?.total_capital} />
            </Grid>
            <Grid item xs={12} md={3}>
              <KpiCard title="Mora" value={summary?.overdue_portfolio} />
            </Grid>
            <Grid item xs={12} md={3}>
              <KpiCard
                title="% Mora"
                value={summary?.overdue_rate}
                type="percent"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 2, borderRadius: 3, height: 380 }}>
                <Typography variant="h6" mb={2}>
                  Evolución de cartera
                </Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={portfolioByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total_portfolio"
                      name="Cartera"
                      stroke="#1565c0"
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="overdue_portfolio"
                      name="Mora"
                      stroke="#c62828"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="provision"
                      name="Provisión"
                      stroke="#ef6c00"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, borderRadius: 3, height: 380 }}>
                <Typography variant="h6" mb={2}>
                  Aging de cartera
                </Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={aging}
                      dataKey="total_balance"
                      nameKey="bucket"
                      outerRadius={110}
                      label
                      onClick={handleAgingClick}
                    >
                      {aging.map((entry, index) => (
                        <Cell
                          key={entry.bucket}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Box>
                <Typography variant="h6">
                  Detalle operativo de saldos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {detailBucket
                    ? `Filtro aging activo: ${detailBucket}`
                    : "Sin filtro de aging"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Registros: {detailTotal}
                </Typography>
              </Box>
            </Box>

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
