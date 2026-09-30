import React, { useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
import { Alert, Box, Button, Paper, Stack, ToggleButton, ToggleButtonGroup, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { printAccountingReport } from "./printAccountingReport";
import ReportBranchFilter from "./ReportBranchFilter";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const EMPTY_TOTALS = { interest_accrual: 0, default_interest: 0, fee_income: 0, insurance: 0, total: 0 };

export default function DailyInterestIncome() {
  const [view, setView] = useState("date"); // "date" | "customer"
  const [filters, setFilters] = useState({ start_date: daysAgo(30), end_date: today(), branch_id: "" });
  const [branchName, setBranchName] = useState("Todas");
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [missingAmount, setMissingAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    try {
      setLoading(true);
      setError("");
      const params = view === "customer" ? { ...filters, group_by: "customer" } : filters;
      const response = await API.get("/api/accounting/reports/daily-interest-income", { params });
      setRows(response.data?.data || []);
      setTotals({ ...EMPTY_TOTALS, ...(response.data?.totals || {}) });
      setMissingAmount(response.data?.missing_amount || 0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (_e, next) => {
    if (!next) return;
    setView(next);
    setRows([]);
    setTotals(EMPTY_TOTALS);
    setMissingAmount(0);
  };

  const gridRows = useMemo(
    () => (view === "customer"
      ? rows.map((r, index) => ({ id: `${r.customer_id ?? "s"}-${r.loan_id ?? index}`, ...r }))
      : rows.map((r) => ({ id: r.entry_date, ...r }))),
    [rows, view],
  );

  const chartData = useMemo(() => {
    if (view === "customer") {
      return rows.slice(0, 15).map((r) => ({
        name: r.credit_code || r.customer_name?.slice(0, 18) || `Cliente ${r.customer_id ?? ""}`,
        "Devengo normal": r.interest_accrual,
        "Interés moratorio": r.default_interest,
        "Comisiones": r.fee_income,
      }));
    }
    return rows.map((r) => ({
      name: r.entry_date.slice(5),
      "Devengo normal": r.interest_accrual,
      "Interés moratorio": r.default_interest,
      "Comisiones": r.fee_income,
    }));
  }, [rows, view]);

  const dateColumns = useMemo(() => [
    { field: "entry_date", headerName: "Fecha", width: 130 },
    {
      field: "interest_accrual", headerName: "Devengo normal", width: 160, type: "number",
      valueFormatter: (p) => money(p.value),
    },
    {
      field: "default_interest", headerName: "Interés moratorio", width: 160, type: "number",
      valueFormatter: (p) => money(p.value),
    },
    {
      field: "fee_income", headerName: "Comisiones", width: 150, type: "number",
      valueFormatter: (p) => money(p.value),
    },
    {
      field: "total", headerName: "Total ingresos", width: 160, type: "number",
      renderCell: (p) => <span style={{ fontWeight: 700 }}>{money(p.value)}</span>,
    },
    {
      field: "insurance", headerName: "Seguros (no es ingreso)", width: 190, type: "number",
      valueFormatter: (p) => money(p.value),
    },
  ], []);

  const customerColumns = useMemo(() => [
    { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 220 },
    { field: "credit_code", headerName: "Crédito", width: 120 },
    {
      field: "interest_accrual", headerName: "Devengo normal", width: 160, type: "number",
      valueFormatter: (p) => money(p.value),
    },
    {
      field: "default_interest", headerName: "Interés moratorio", width: 160, type: "number",
      valueFormatter: (p) => money(p.value),
    },
    {
      field: "fee_income", headerName: "Comisiones", width: 150, type: "number",
      valueFormatter: (p) => money(p.value),
    },
    {
      field: "total", headerName: "Total", width: 160, type: "number",
      renderCell: (p) => <span style={{ fontWeight: 700 }}>{money(p.value)}</span>,
    },
  ], []);

  const columns = view === "customer" ? customerColumns : dateColumns;

  const printReport = () => printAccountingReport({
    title: view === "customer" ? "Ingresos por Intereses y Comisiones por Cliente" : "Ingresos Diarios por Intereses, Comisiones y Seguros",
    subtitle: `${view === "customer" ? "Detalle por cliente" : "Devengo diario"} contabilizado · Sucursal: ${branchName || "Todas"}`,
    period: `Del ${filters.start_date} al ${filters.end_date}`,
    columns: view === "customer" ? [
      { field: "customer_name", label: "Cliente" },
      { field: "credit_code", label: "Crédito" },
      { field: "interest_accrual", label: "Devengo normal", numeric: true, format: money },
      { field: "default_interest", label: "Interés moratorio", numeric: true, format: money },
      { field: "fee_income", label: "Comisiones", numeric: true, format: money },
      { field: "total", label: "Total", numeric: true, format: money },
    ] : [
      { field: "entry_date", label: "Fecha" },
      { field: "interest_accrual", label: "Devengo normal", numeric: true, format: money },
      { field: "default_interest", label: "Interés moratorio", numeric: true, format: money },
      { field: "fee_income", label: "Comisiones", numeric: true, format: money },
      { field: "total", label: "Total ingresos", numeric: true, format: money },
      { field: "insurance", label: "Seguros (no es ingreso)", numeric: true, format: money },
    ],
    rows,
    totals: view === "customer" ? [
      { value: "Totales", colspan: 2 },
      { value: money(totals.interest_accrual), numeric: true },
      { value: money(totals.default_interest), numeric: true },
      { value: money(totals.fee_income), numeric: true },
      { value: money(totals.total), numeric: true },
    ] : [
      { value: "Totales" },
      { value: money(totals.interest_accrual), numeric: true },
      { value: money(totals.default_interest), numeric: true },
      { value: money(totals.fee_income), numeric: true },
      { value: money(totals.total), numeric: true },
      { value: money(totals.insurance), numeric: true },
    ],
  });

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, border: "1px solid #E5E7EB", borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <MonetizationOnIcon color="primary" />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>Ingresos por Intereses, Comisiones y Seguros</Typography>
              <HelpButton screenKey="contabilidad.ingresos-diarios" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Ingreso contabilizado: devengo de interés, interés moratorio y comisión de apertura. El seguro se muestra aparte porque es una prima cobrada por cuenta de la aseguradora, no ingreso propio.
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }} alignItems={{ md: "center" }}>
          <ToggleButtonGroup size="small" exclusive value={view} onChange={handleViewChange}>
            <ToggleButton value="date">Resumen diario</ToggleButton>
            <ToggleButton value="customer">Detalle por cliente</ToggleButton>
          </ToggleButtonGroup>
          <TextField size="small" type="date" label="Desde" value={filters.start_date} InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((p) => ({ ...p, start_date: e.target.value }))} />
          <TextField size="small" type="date" label="Hasta" value={filters.end_date} InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((p) => ({ ...p, end_date: e.target.value }))} />
          <ReportBranchFilter value={filters.branch_id} onChange={(id, name) => { setFilters((p) => ({ ...p, branch_id: id })); setBranchName(name); }} />
          <Button variant="contained" onClick={generate} disabled={loading}>Generar</Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={printReport} disabled={!rows.length}>Imprimir</Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {view === "customer" && missingAmount > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Hay C$ {money(missingAmount)} de ingreso contabilizado en el período que no tiene desglose por crédito disponible
            (asientos antiguos o cargados antes de que existiera la auditoría por crédito). El total del resumen diario sí lo incluye.
          </Alert>
        )}

        {rows.length > 0 && (
          <Stack direction="row" spacing={3} sx={{ mb: 2 }} flexWrap="wrap">
            <Typography variant="body2"><b>Devengo normal:</b> C$ {money(totals.interest_accrual)}</Typography>
            <Typography variant="body2"><b>Interés moratorio:</b> C$ {money(totals.default_interest)}</Typography>
            <Typography variant="body2"><b>Comisiones:</b> C$ {money(totals.fee_income)}</Typography>
            <Typography variant="body2"><b>Total ingresos:</b> C$ {money(totals.total)}</Typography>
            {view === "date" && (
              <Typography variant="body2" color="text.secondary"><b>Seguros cobrados (no es ingreso):</b> C$ {money(totals.insurance)}</Typography>
            )}
          </Stack>
        )}

        {chartData.length > 0 && (
          <Box sx={{ height: 280, mb: 3 }}>
            {view === "customer" && (
              <Typography variant="caption" color="text.secondary">Top {chartData.length} créditos del período</Typography>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={view === "customer" ? -30 : 0} textAnchor={view === "customer" ? "end" : "middle"} height={view === "customer" ? 60 : 30} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip formatter={(value) => `C$ ${money(value)}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Devengo normal" stackId="a" fill="#1565c0" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Interés moratorio" stackId="a" fill="#c62828" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Comisiones" stackId="a" fill="#2e7d32" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}

        <Box sx={{ height: 480 }}>
          <DataGrid
            rows={gridRows}
            columns={columns}
            loading={loading}
            hideFooter={view === "date"}
            pageSizeOptions={view === "customer" ? [25, 50, 100] : undefined}
            initialState={view === "customer" ? { pagination: { paginationModel: { pageSize: 25 } } } : undefined}
            disableRowSelectionOnClick
            sx={{ border: "1px solid #E5E7EB", borderRadius: 2 }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
