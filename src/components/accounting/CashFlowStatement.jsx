import React, { useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography, Tooltip } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import WavesIcon from "@mui/icons-material/Waves";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { printAccountingReport } from "./printAccountingReport";
import ReportSignaturesDialog from "./ReportSignaturesDialog";
import { buildMucFormD, getCashFlowDiagnostics } from "./mucReportModels";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function CashFlowStatement() {
  const year = new Date().getFullYear();
  const [filters, setFilters] = useState({ start_date: `${year}-01-01`, end_date: `${year}-12-31` });
  const [currentRows, setCurrentRows] = useState([]);
  const [previousRows, setPreviousRows] = useState([]);
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
        API.get("/api/accounting/reports/cash-flow", { params: filters }),
        API.get("/api/accounting/reports/cash-flow", { params: previousFilters }),
      ]);
      setCurrentRows(response.data?.data || []);
      setPreviousRows(previousResponse.data?.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const currentYear = filters.end_date.slice(0, 4);
  const reportRows = useMemo(
    () => buildMucFormD(currentRows, previousRows, currentYear),
    [currentRows, previousRows, currentYear],
  );
  const diagnostics = useMemo(() => getCashFlowDiagnostics(currentRows), [currentRows]);
  const isReconciled = Math.abs(diagnostics.computedNetChange - diagnostics.actualCashMovement) < 0.01;

  const gridRows = useMemo(
    () => reportRows.map((r, index) => ({ id: index, ...r })),
    [reportRows],
  );

  const columns = useMemo(() => [
    {
      field: "label", headerName: "Concepto", flex: 1, minWidth: 380,
      renderCell: (p) => (
        <span style={{ fontWeight: p.row.section || p.row.total ? 700 : 400 }}>{p.value}</span>
      ),
    },
    {
      field: "current", headerName: currentYear, width: 170, valueFormatter: (p) => (typeof p.value === "number" ? money(p.value) : ""),
    },
    {
      field: "previous", headerName: String(Number(currentYear) - 1), width: 170, valueFormatter: (p) => (typeof p.value === "number" ? money(p.value) : ""),
    },
  ], [currentYear]);

  const printReport = () => printAccountingReport({
    title: "Estado de Flujos de Efectivo",
    subtitle: "Forma D - Manual Único de Cuentas CONAMI (método indirecto)",
    period: `Del ${filters.start_date} al ${filters.end_date}`,
    columns: [
      { field: "label", label: "Concepto" },
      { field: "current", label: currentYear, numeric: true, format: (v) => typeof v === "number" ? money(v) : v },
      { field: "previous", label: String(Number(currentYear) - 1), numeric: true, format: (v) => typeof v === "number" ? money(v) : v },
    ],
    rows: reportRows,
  });

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, border: "1px solid #E5E7EB", borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <WavesIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700}>Estado de Flujos de Efectivo</Typography>
            <Typography variant="body2" color="text.secondary">Forma D del Manual Único de Cuentas CONAMI — método indirecto</Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" type="date" label="Desde" value={filters.start_date} InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((p) => ({ ...p, start_date: e.target.value }))} />
          <TextField size="small" type="date" label="Hasta" value={filters.end_date} InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((p) => ({ ...p, end_date: e.target.value }))} />
          <Button variant="contained" onClick={generate} disabled={loading}>Generar</Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={printReport} disabled={!currentRows.length}>Imprimir</Button>
          <ReportSignaturesDialog />
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {currentRows.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
            <Tooltip title="Suma de las actividades de operación, inversión y financiamiento vs. la variación real de Fondos Disponibles (1101-1105). Debe coincidir; si no, hay cuentas sin clasificar.">
              <Chip
                color={isReconciled ? "success" : "error"}
                label={isReconciled ? "Reconciliado con Fondos Disponibles" : `Descuadre: ${money(diagnostics.computedNetChange - diagnostics.actualCashMovement)}`}
              />
            </Tooltip>
            {diagnostics.unclassifiedAccounts.length > 0 && (
              <Chip color="warning" label={`Cuentas sin clasificar: ${diagnostics.unclassifiedAccounts.join(", ")}`} />
            )}
          </Stack>
        )}

        <Box sx={{ height: 620 }}>
          <DataGrid
            rows={gridRows}
            columns={columns}
            loading={loading}
            hideFooter
            disableRowSelectionOnClick
            getRowClassName={(p) => (p.row.total ? "cf-total-row" : "")}
            sx={{
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              "& .cf-total-row": { backgroundColor: "#F8FAFC" },
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
