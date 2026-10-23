import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { UserContext } from "../../contexts/UserContext";
import BranchSelect from "../BranchSelect";
import { money } from "./DenominationCounter";
import CashSessionSummary from "./CashSessionSummary";
import CloseCashSessionDialog from "./CloseCashSessionDialog";
import { printCashSessionReport } from "../../reports/cashSessionReport";

const today = () => new Date().toISOString().slice(0, 10);

// Supervisión de turnos de caja: cajas abiertas y cerradas por sucursal, con
// el detalle de cada arqueo y el cierre de turnos de otros cajeros.
export default function CashSessionsList() {
  const { tenant } = useAuth() || {};
  const { permissions = [], role } = useContext(UserContext) || {};
  const canSupervise = role === 1 || permissions.includes("caja.turnos.supervisar");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", branch_id: "", date_from: today(), date_to: today() });
  const [detail, setDetail] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await API.get("/api/caja/sessions", { params });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron cargar los turnos de caja");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id) => {
    try {
      const res = await API.get(`/api/caja/sessions/${id}`);
      setDetail(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cargar el turno");
    }
  };

  const print = (session) =>
    printCashSessionReport({ company: tenant, user: JSON.parse(localStorage.getItem("user") || "{}"), session });

  const columns = [
    { field: "id", headerName: "Turno", width: 80 },
    { field: "branch_name", headerName: "Sucursal", flex: 1, minWidth: 140 },
    { field: "register_name", headerName: "Caja", flex: 1, minWidth: 160 },
    { field: "user_name", headerName: "Cajero", flex: 1, minWidth: 140 },
    { field: "business_date", headerName: "Día", width: 110 },
    {
      field: "status",
      headerName: "Estado",
      width: 110,
      renderCell: ({ value }) => <Chip size="small" color={value === "ABIERTA" ? "success" : "default"} label={value === "ABIERTA" ? "Abierta" : "Cerrada"} />,
    },
    { field: "opening_amount", headerName: "Fondo", width: 130, align: "right", headerAlign: "right", valueFormatter: ({ value }) => money(value) },
    {
      field: "payments_total",
      headerName: "Cobros",
      width: 130,
      align: "right",
      headerAlign: "right",
      valueGetter: ({ row }) => row.totals?.payments_total,
      valueFormatter: ({ value }) => money(value),
    },
    {
      field: "expected",
      headerName: "Esperado",
      width: 140,
      align: "right",
      headerAlign: "right",
      valueGetter: ({ row }) => row.totals?.expected_amount,
      valueFormatter: ({ value }) => money(value),
    },
    {
      field: "counted_amount",
      headerName: "Contado",
      width: 140,
      align: "right",
      headerAlign: "right",
      valueFormatter: ({ value }) => (value == null ? "—" : money(value)),
    },
    {
      field: "difference",
      headerName: "Diferencia",
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => {
        if (value == null) return "—";
        const v = Number(value);
        return <Typography variant="body2" color={v < 0 ? "error.main" : v > 0 ? "warning.main" : "text.primary"}>{money(v)}</Typography>;
      },
    },
  ];

  const openCount = rows.filter((r) => r.status === "ABIERTA").length;

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <FactCheckIcon color="primary" />
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Turnos de caja</Typography>
        <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Actualizar</Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="Estado" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ABIERTA">Abiertas</MenuItem>
              <MenuItem value="CERRADA">Cerradas</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <BranchSelect value={filters.branch_id} label="Sucursal (todas)" onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField type="date" fullWidth size="small" label="Desde" InputLabelProps={{ shrink: true }} value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField type="date" fullWidth size="small" label="Hasta" InputLabelProps={{ shrink: true }} value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}
      {openCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {openCount} caja(s) abierta(s). El cierre del día de la sucursal no se puede hacer mientras haya cajas abiertas.
        </Alert>
      )}

      <Paper sx={{ height: 520 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          density="compact"
          disableSelectionOnClick
          onRowClick={({ row }) => openDetail(row.id)}
          localeText={{ noRowsLabel: "No hay turnos de caja en el período" }}
        />
      </Paper>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="lg" fullWidth>
        {detail && (
          <>
            <DialogTitle>
              {detail.register_name} — turno #{detail.id} · {detail.user_name} · {detail.business_date}{" "}
              <Chip size="small" color={detail.status === "ABIERTA" ? "success" : "default"} label={detail.status === "ABIERTA" ? "Abierta" : "Cerrada"} />
            </DialogTitle>
            <DialogContent dividers>
              {detail.closing_notes && <Alert severity="info" sx={{ mb: 2 }}>Nota de cierre: {detail.closing_notes}</Alert>}
              {detail.transfer_type && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Traslado de {money(detail.transfer_amount)} a{" "}
                  {detail.transfer_type === "BOVEDA" ? detail.transfer_register_name : `${detail.transfer_bank_name} ${detail.transfer_bank_account_number}`}.
                </Alert>
              )}
              <CashSessionSummary session={detail} />
            </DialogContent>
            <DialogActions>
              <Button startIcon={<PrintIcon />} onClick={() => print(detail)}>Comprobante</Button>
              {detail.status === "ABIERTA" && canSupervise && (
                <Button variant="contained" onClick={() => setCloseTarget(detail)}>Cerrar caja</Button>
              )}
              <Button onClick={() => setDetail(null)}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <CloseCashSessionDialog
        open={!!closeTarget}
        session={closeTarget}
        onClose={() => setCloseTarget(null)}
        onClosed={(closed) => {
          setCloseTarget(null);
          setDetail(closed || null);
          setNotice(`Turno #${closed?.id} cerrado.`);
          load();
        }}
      />
    </Box>
  );
}
