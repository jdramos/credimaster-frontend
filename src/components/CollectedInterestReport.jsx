import React, { useMemo, useState } from "react";
import { Alert, Box, Button, Paper, Stack, ToggleButton, ToggleButtonGroup, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import PaidIcon from "@mui/icons-material/Paid";
import API from "../api";
import ReportExportButtons from "./common/ReportExportButtons";
import ReportBranchFilter from "./accounting/ReportBranchFilter";
import { reportMoney as money, reportInteger, reportPeriod } from "./common/reportFormat";

// Intereses cobrados según los pagos registrados (no asientos): sirve a las
// empresas sin contabilidad (paquete Cartera y Cobranza), que reconocen el
// interés al cobrarlo. Ver api/reports/collectedInterestController.js.

const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => localDate(new Date());
const monthStart = () => {
  const d = new Date();
  return localDate(new Date(d.getFullYear(), d.getMonth(), 1));
};

const EMPTY_TOTALS = {
  payments_count: 0, interest: 0, default_interest: 0, fee: 0, other_charges: 0,
  income_total: 0, insurance: 0, principal: 0, collected_total: 0,
};

const AMOUNT_COLUMNS = [
  { field: "interest", label: "Interés corriente" },
  { field: "default_interest", label: "Interés moratorio" },
  { field: "fee", label: "Comisión" },
  { field: "other_charges", label: "Otros cargos" },
  { field: "income_total", label: "Total ingresos", bold: true },
  { field: "insurance", label: "Seguro (no es ingreso)" },
  { field: "principal", label: "Capital" },
  { field: "collected_total", label: "Total cobrado" },
];

export default function CollectedInterestReport() {
  const [view, setView] = useState("day"); // "day" | "loan"
  const [filters, setFilters] = useState({ start_date: monthStart(), end_date: today(), branch_id: "" });
  const [branchName, setBranchName] = useState("Todas");
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/api/reports/collected-interest", { params: { ...filters, group_by: view } });
      setRows(response.data?.data || []);
      setTotals({ ...EMPTY_TOTALS, ...(response.data?.totals || {}) });
      setGenerated(true);
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
    setGenerated(false);
  };

  const gridRows = useMemo(
    () => (view === "loan"
      ? rows.map((r, index) => ({ id: `${r.customer_id ?? "s"}-${r.loan_id ?? index}`, ...r }))
      : rows.map((r) => ({ id: r.payment_date, ...r }))),
    [rows, view],
  );

  const leadColumns = view === "loan"
    ? [
      { field: "customer_name", label: "Cliente", width: 220 },
      { field: "customer_identification", label: "Identificación", width: 150 },
      { field: "credit_code", label: "Crédito", width: 100 },
      { field: "payments_count", label: "Pagos", width: 80, integer: true },
    ]
    : [
      { field: "payment_date", label: "Fecha", width: 120 },
      { field: "payments_count", label: "Pagos", width: 80, integer: true },
    ];

  const columns = useMemo(() => [
    ...leadColumns.map((c) => ({
      field: c.field,
      headerName: c.label,
      ...(c.field === "customer_name" ? { flex: 1, minWidth: c.width } : { width: c.width }),
      ...(c.integer ? { type: "number" } : {}),
    })),
    ...AMOUNT_COLUMNS.map((c) => ({
      field: c.field,
      headerName: c.label,
      width: 150,
      type: "number",
      ...(c.bold
        ? { renderCell: (p) => <span style={{ fontWeight: 700 }}>{money(p.value)}</span> }
        : { valueFormatter: (p) => money(p.value) }),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [view]);

  const buildReport = () => ({
    title: view === "loan" ? "Intereses Cobrados por Cliente" : "Intereses Cobrados por Día",
    subtitle: `Según pagos registrados (sin anulados) · Sucursal: ${branchName || "Todas"}`,
    period: reportPeriod(filters.start_date, filters.end_date),
    orientation: "landscape",
    fileName: `intereses_cobrados_${view === "loan" ? "por_cliente" : "por_dia"}_${filters.start_date}_${filters.end_date}`,
    columns: [
      ...leadColumns.map((c) => (c.integer
        ? { field: c.field, label: c.label, numeric: true, format: reportInteger }
        : { field: c.field, label: c.label })),
      ...AMOUNT_COLUMNS.map((c) => ({ field: c.field, label: c.label, numeric: true, format: money })),
    ],
    rows,
    totals: [
      { value: "Totales", colspan: leadColumns.length - 1 },
      { value: reportInteger(totals.payments_count), raw: totals.payments_count, numeric: true },
      ...AMOUNT_COLUMNS.map((c) => ({ value: money(totals[c.field]), raw: totals[c.field], numeric: true })),
    ],
  });

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, border: "1px solid #E5E7EB", borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <PaidIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700}>Intereses cobrados</Typography>
            <Typography variant="body2" color="text.secondary">
              Interés corriente, interés moratorio, comisión y otros cargos efectivamente cobrados en los pagos del período (por fecha de pago; los pagos anulados no se incluyen). El seguro se muestra aparte porque se cobra por cuenta de la aseguradora.
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }} alignItems={{ md: "center" }}>
          <ToggleButtonGroup size="small" exclusive value={view} onChange={handleViewChange}>
            <ToggleButton value="day">Resumen diario</ToggleButton>
            <ToggleButton value="loan">Detalle por cliente</ToggleButton>
          </ToggleButtonGroup>
          <TextField size="small" type="date" label="Desde" value={filters.start_date} InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((p) => ({ ...p, start_date: e.target.value }))} />
          <TextField size="small" type="date" label="Hasta" value={filters.end_date} InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((p) => ({ ...p, end_date: e.target.value }))} />
          <ReportBranchFilter value={filters.branch_id} onChange={(id, name) => { setFilters((p) => ({ ...p, branch_id: id })); setBranchName(name); }} />
          <Button variant="contained" onClick={generate} disabled={loading}>Generar</Button>
          <ReportExportButtons report={buildReport} disabled={!rows.length} />
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {generated && !rows.length && !error && (
          <Alert severity="info" sx={{ mb: 2 }}>No hay pagos registrados en el período.</Alert>
        )}

        {rows.length > 0 && (
          <Stack direction="row" spacing={3} sx={{ mb: 2 }} flexWrap="wrap" data-testid="collected-interest-totals">
            <Typography variant="body2"><b>Interés corriente:</b> C$ {money(totals.interest)}</Typography>
            <Typography variant="body2"><b>Interés moratorio:</b> C$ {money(totals.default_interest)}</Typography>
            <Typography variant="body2"><b>Comisión:</b> C$ {money(totals.fee)}</Typography>
            <Typography variant="body2"><b>Otros cargos:</b> C$ {money(totals.other_charges)}</Typography>
            <Typography variant="body2"><b>Total ingresos:</b> C$ {money(totals.income_total)}</Typography>
            <Typography variant="body2" color="text.secondary"><b>Seguro (no es ingreso):</b> C$ {money(totals.insurance)}</Typography>
          </Stack>
        )}

        <Box sx={{ height: 480 }}>
          <DataGrid
            rows={gridRows}
            columns={columns}
            loading={loading}
            rowsPerPageOptions={[25, 50, 100]}
            initialState={{ pagination: { pageSize: 50 } }}
            disableSelectionOnClick
            sx={{ border: "1px solid #E5E7EB", borderRadius: 2 }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
