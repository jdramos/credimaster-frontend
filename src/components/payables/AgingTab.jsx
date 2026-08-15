import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Snackbar, Stack } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { printAccountingReport } from "../accounting/printAccountingReport";

const money = (v) => Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AgingTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "error", message: "" });

  const fetchAging = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/payables/aging");
      setRows(res.data?.data || []);
    } catch (e) {
      setAlert({ open: true, severity: "error", message: e.response?.data?.message || "Error cargando antigüedad" });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAging(); }, []);

  const totals = useMemo(() => rows.reduce((a, r) => {
    a.current += Number(r.bucket_current || 0);
    a.b1 += Number(r.bucket_1_30 || 0);
    a.b2 += Number(r.bucket_31_60 || 0);
    a.b3 += Number(r.bucket_61_90 || 0);
    a.b4 += Number(r.bucket_over_90 || 0);
    a.balance += Number(r.balance || 0);
    return a;
  }, { current: 0, b1: 0, b2: 0, b3: 0, b4: 0, balance: 0 }), [rows]);

  const columns = useMemo(() => [
    { field: "provider_name", headerName: "Proveedor", flex: 1, minWidth: 200 },
    { field: "ruc", headerName: "RUC", width: 150, valueGetter: (p) => p.value || "—" },
    { field: "bucket_current", headerName: "Corriente", width: 120, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "bucket_1_30", headerName: "1–30", width: 110, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "bucket_31_60", headerName: "31–60", width: 110, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "bucket_61_90", headerName: "61–90", width: 110, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "bucket_over_90", headerName: "> 90", width: 110, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "balance", headerName: "Total", width: 130, type: "number", valueFormatter: (p) => money(p.value) },
  ], []);

  const printReport = () => printAccountingReport({
    title: "Antigüedad de Saldos — Cuentas por Pagar",
    subtitle: `Al ${new Date().toISOString().slice(0, 10)}`,
    period: "",
    columns: [
      { field: "provider_name", label: "Proveedor" },
      { field: "ruc", label: "RUC" },
      { field: "bucket_current", label: "Corriente", numeric: true, format: money },
      { field: "bucket_1_30", label: "1-30", numeric: true, format: money },
      { field: "bucket_31_60", label: "31-60", numeric: true, format: money },
      { field: "bucket_61_90", label: "61-90", numeric: true, format: money },
      { field: "bucket_over_90", label: ">90", numeric: true, format: money },
      { field: "balance", label: "Total", numeric: true, format: money },
    ],
    rows,
    totals: [
      { value: "Totales", colspan: 2 },
      { value: money(totals.current), numeric: true },
      { value: money(totals.b1), numeric: true },
      { value: money(totals.b2), numeric: true },
      { value: money(totals.b3), numeric: true },
      { value: money(totals.b4), numeric: true },
      { value: money(totals.balance), numeric: true },
    ],
  });

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
        <Button variant="outlined" onClick={fetchAging} sx={{ textTransform: "none" }}>Actualizar</Button>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={printReport} disabled={!rows.length}
          sx={{ textTransform: "none" }}>Imprimir</Button>
        <Box sx={{ flex: 1 }} />
        <Chip label={`Corriente: ${money(totals.current)}`} />
        <Chip color="warning" label={`1–30: ${money(totals.b1)}`} />
        <Chip color="warning" label={`31–60: ${money(totals.b2)}`} />
        <Chip color="error" label={`61–90: ${money(totals.b3)}`} />
        <Chip color="error" label={`>90: ${money(totals.b4)}`} />
        <Chip color="primary" label={`Total: C$ ${money(totals.balance)}`} />
      </Stack>

      <Box sx={{ height: 560 }}>
        <DataGrid rows={rows} columns={columns} loading={loading} getRowId={(r) => r.provider_id}
          density="compact" pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 50 } } }} disableRowSelectionOnClick />
      </Box>

      <Snackbar open={alert.open} autoHideDuration={4000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
