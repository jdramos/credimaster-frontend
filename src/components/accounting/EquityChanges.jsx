import React, { useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import API from "../../api";
import PrintIcon from "@mui/icons-material/Print";
import { printAccountingReport } from "./printAccountingReport";
import ReportSignaturesDialog from "./ReportSignaturesDialog";
import { buildMucFormC } from "./mucReportModels";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function EquityChanges() {
  const year = new Date().getFullYear();
  const [filters, setFilters] = useState({ start_date: `${year}-01-01`, end_date: `${year}-12-31` });
  const [rows, setRows] = useState([]);
  const [previousRows, setPreviousRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    try {
      setLoading(true);
      setError("");
      const previousFilters = {
        start_date: `${Number(filters.start_date.slice(0, 4)) - 1}${filters.start_date.slice(4)}`,
        end_date: `${Number(filters.end_date.slice(0, 4)) - 1}${filters.end_date.slice(4)}`,
      };
      const [response, previousResponse] = await Promise.all([
        API.get("/api/accounting/reports/equity-changes", { params: filters }),
        API.get("/api/accounting/reports/equity-changes", { params: previousFilters }),
      ]);
      setRows(response.data?.data || []);
      setPreviousRows(previousResponse.data?.data || []);
      setTotals(response.data?.totals || {});
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => [
    { field: "muc_code", headerName: "Código MUC", width: 150 },
    { field: "account_name", headerName: "Cuenta patrimonial", flex: 1, minWidth: 300 },
    { field: "opening_balance", headerName: "Saldo inicial", width: 155, valueFormatter: (p) => money(p.value) },
    { field: "period_credit", headerName: "Aumentos", width: 145, valueFormatter: (p) => money(p.value) },
    { field: "period_debit", headerName: "Disminuciones", width: 145, valueFormatter: (p) => money(p.value) },
    { field: "closing_balance", headerName: "Saldo final", width: 155, valueFormatter: (p) => money(p.value) },
  ], []);

  const printReport = () => printAccountingReport({
    title: "Estado de Cambios en el Patrimonio",
    subtitle: "Forma C - Manual Único de Cuentas CONAMI",
    period: `Del ${filters.start_date} al ${filters.end_date}`,
    columns: [
      { field: "label", label: "(*)" },
      { field: "capital", label: "Capital social o Aporte", numeric: true, format: money },
      { field: "additional", label: "Capital o Aporte adicional", numeric: true, format: money },
      { field: "adjustments", label: "Ajustes al patrimonio", numeric: true, format: money },
      { field: "reserves", label: "Reservas", numeric: true, format: money },
      { field: "results", label: "Resultados acumulados", numeric: true, format: money },
      { field: "total", label: "Total", numeric: true, format: money },
    ], rows: buildMucFormC(rows, previousRows, filters.end_date.slice(0, 4)),
  });

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, border: "1px solid #E5E7EB", borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TrendingUpIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700}>Estado de Cambios en el Patrimonio</Typography>
            <Typography variant="body2" color="text.secondary">Forma C del Manual Único de Cuentas CONAMI</Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" type="date" label="Desde" value={filters.start_date} InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((p) => ({ ...p, start_date: e.target.value }))} />
          <TextField size="small" type="date" label="Hasta" value={filters.end_date} InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((p) => ({ ...p, end_date: e.target.value }))} />
          <Button variant="contained" onClick={generate} disabled={loading}>Generar</Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={printReport} disabled={!rows.length}>Imprimir</Button>
          <ReportSignaturesDialog />
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Chip label={`Saldo inicial: C$ ${money(totals.opening_balance)}`} />
          <Chip color="success" label={`Aumentos: C$ ${money(totals.period_credit)}`} />
          <Chip color="warning" label={`Disminuciones: C$ ${money(totals.period_debit)}`} />
          <Chip color="primary" label={`Saldo final: C$ ${money(totals.closing_balance)}`} />
        </Stack>
        <Box sx={{ height: 620 }}>
          <DataGrid rows={rows} columns={columns} loading={loading} getRowId={(row) => row.account_id} pageSizeOptions={[10, 25, 50]} disableRowSelectionOnClick />
        </Box>
      </Paper>
    </Box>
  );
}
