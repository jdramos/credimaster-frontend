import React, { useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
import { Alert, Box, Button, Chip, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import API from "../../api";
import PrintIcon from "@mui/icons-material/Print";
import { printAccountingReport } from "./printAccountingReport";
import ReportExportButtons from "../common/ReportExportButtons";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportSignaturesDialog from "./ReportSignaturesDialog";
import { buildMucFormC } from "./mucReportModels";
import MucFormTable from "./MucFormTable";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function EquityChanges() {
  const year = new Date().getFullYear();
  const [filters, setFilters] = useState({ start_date: `${year}-01-01`, end_date: `${year}-12-31`, branch_id: "" });
  const [branchName, setBranchName] = useState("Todas");
  const [rows, setRows] = useState([]);
  const [previousRows, setPreviousRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Vista principal: Forma C del MUC (igual que el reporte impreso).
  const [view, setView] = useState("form");
  const [generatedYear, setGeneratedYear] = useState("");

  const generate = async () => {
    try {
      setLoading(true);
      setError("");
      const previousFilters = {
        start_date: `${Number(filters.start_date.slice(0, 4)) - 1}${filters.start_date.slice(4)}`,
        end_date: `${Number(filters.end_date.slice(0, 4)) - 1}${filters.end_date.slice(4)}`,
        ...(filters.branch_id ? { branch_id: filters.branch_id } : {}),
      };
      const [response, previousResponse] = await Promise.all([
        API.get("/api/accounting/reports/equity-changes", { params: filters }),
        API.get("/api/accounting/reports/equity-changes", { params: previousFilters }),
      ]);
      setGeneratedYear(filters.end_date.slice(0, 4));
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

  // Mismas columnas y filas en pantalla y en el reporte impreso.
  const formColumns = [
    { field: "label", label: "(*)" },
    { field: "capital", label: "Capital social o Aporte", numeric: true, format: money },
    { field: "additional", label: "Capital o Aporte adicional", numeric: true, format: money },
    { field: "adjustments", label: "Ajustes al patrimonio", numeric: true, format: money },
    { field: "reserves", label: "Reservas", numeric: true, format: money },
    { field: "results", label: "Resultados acumulados", numeric: true, format: money },
    { field: "total", label: "Total", numeric: true, format: money },
  ];
  const formRows = useMemo(
    () => (rows.length ? buildMucFormC(rows, previousRows, generatedYear) : []),
    [rows, previousRows, generatedYear],
  );

  const buildReport = () => ({
    title: "Estado de Cambios en el Patrimonio",
    fileName: `cambios_patrimonio_${filters.start_date}_${filters.end_date}`,
    subtitle: `Forma C - Manual Único de Cuentas CONAMI · Sucursal: ${branchName || "Todas"}`,
    period: `Del ${filters.start_date} al ${filters.end_date}`,
    columns: formColumns,
    rows: formRows,
  });

  const printReport = () => printAccountingReport(buildReport());

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, border: "1px solid var(--cm-border, #E5E7EB)", borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TrendingUpIcon color="primary" />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>Estado de Cambios en el Patrimonio</Typography>
              <HelpButton screenKey="contabilidad.patrimonio" />
            </Box>
            <Typography variant="body2" color="text.secondary">Forma C del Manual Único de Cuentas CONAMI</Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" type="date" label="Desde" value={filters.start_date} InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((p) => ({ ...p, start_date: e.target.value }))} />
          <TextField size="small" type="date" label="Hasta" value={filters.end_date} InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((p) => ({ ...p, end_date: e.target.value }))} />
          <ReportBranchFilter value={filters.branch_id} onChange={(id, name) => { setFilters((p) => ({ ...p, branch_id: id })); setBranchName(name); }} />
          <Button variant="contained" onClick={generate} disabled={loading}>Generar</Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={printReport} disabled={!rows.length}>Imprimir</Button>
          <ReportExportButtons print={false} report={buildReport} disabled={!rows.length} />
          <ReportSignaturesDialog />
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Chip label={`Saldo inicial: C$ ${money(totals.opening_balance)}`} />
          <Chip color="success" label={`Aumentos: C$ ${money(totals.period_credit)}`} />
          <Chip color="warning" label={`Disminuciones: C$ ${money(totals.period_debit)}`} />
          <Chip color="primary" label={`Saldo final: C$ ${money(totals.closing_balance)}`} />
        </Stack>
        <Tabs value={view} onChange={(_e, v) => setView(v)} sx={{ mb: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Tab value="form" label="Forma C (modelo CONAMI)" sx={{ textTransform: "none", fontWeight: 700 }} />
          <Tab value="detail" label="Detalle por cuenta" sx={{ textTransform: "none", fontWeight: 700 }} />
        </Tabs>
        {view === "form" ? (
          <MucFormTable
            caption="Estado de Cambios en el Patrimonio - Forma C"
            columns={formColumns}
            rows={formRows}
            emptyText={loading ? "Generando…" : "Elija el período y presione Generar."}
          />
        ) : (
          <Box sx={{ height: 620 }}>
            <DataGrid rows={rows} columns={columns} loading={loading} getRowId={(row) => row.account_id} rowsPerPageOptions={[10, 25, 50]} disableSelectionOnClick />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
