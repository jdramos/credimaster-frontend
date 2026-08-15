import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import RefreshIcon from "@mui/icons-material/Refresh";
import API from "../../api";
import ReportBranchFilter from "../accounting/ReportBranchFilter";

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateStr = (v) => (v ? String(v).slice(0, 10) : "");

export default function PromisesTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const notify = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchPromises = async () => {
    setLoading(true);
    try {
      const params = {};
      if (branchId) params.branch_id = branchId;
      // El backend ya evalúa las promesas (cumplidas/rotas) al consultar.
      const res = await API.get("/api/collections/promises", { params });
      setRows(res.data?.data || []);
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando promesas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evaluate = async () => {
    try {
      await API.post("/api/collections/promises/evaluate", {});
      notify("Promesas actualizadas contra los pagos");
      fetchPromises();
    } catch (e) {
      notify(e.response?.data?.message || "Error evaluando promesas", "error");
    }
  };

  const mark = async (id, status) => {
    try {
      await API.put(`/api/collections/actions/${id}/promise`, { promise_status: status });
      fetchPromises();
    } catch (e) {
      notify(e.response?.data?.message || "Error actualizando promesa", "error");
    }
  };

  const columns = useMemo(
    () => [
      { field: "credit_code", headerName: "Crédito", width: 120 },
      { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 180 },
      { field: "branch_name", headerName: "Sucursal", width: 130 },
      { field: "collector_name", headerName: "Gestor", width: 140 },
      { field: "promised_amount", headerName: "Monto", width: 130, type: "number", valueFormatter: (p) => money(p.value) },
      {
        field: "promised_date",
        headerName: "Fecha prometida",
        width: 160,
        renderCell: (p) => (
          <Chip
            size="small"
            color={Number(p.row.is_overdue) ? "error" : "info"}
            label={`${Number(p.row.is_overdue) ? "Vencida " : ""}${dateStr(p.value)}`}
          />
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 200,
        sortable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" color="success" onClick={() => mark(p.row.id, "KEPT")}>Cumplida</Button>
            <Button size="small" color="error" onClick={() => mark(p.row.id, "BROKEN")}>Rota</Button>
          </Stack>
        ),
      },
    ],
    [],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
        <ReportBranchFilter value={branchId} onChange={(id) => setBranchId(id)} />
        <Button variant="outlined" onClick={fetchPromises} sx={{ textTransform: "none" }}>Buscar</Button>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={evaluate}
          sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>
          Actualizar contra pagos
        </Button>
        <Box sx={{ flex: 1 }} />
        <Chip color="info" label={`Promesas abiertas: ${rows.length}`} />
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Las promesas se marcan solas como <strong>Cumplidas</strong> si el cliente paga el monto prometido a tiempo, o <strong>Rotas</strong> si pasa la fecha sin pagar. También puedes marcarlas manualmente.
      </Alert>

      <Box sx={{ height: 560 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(r) => r.id}
          density="compact"
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      <Snackbar open={alert.open} autoHideDuration={4000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
