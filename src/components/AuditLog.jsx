import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import API from "../api";

const initialFilters = { search: "", action: "", entity: "", date_from: "", date_to: "" };
const formatDate = (value) => value ? new Intl.DateTimeFormat("es-NI", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(String(value).replace(" ", "T"))) : "—";
const detailAfter = (details, key) => details?.[key]?.after ?? details?.after?.[key] ?? details?.[key];
const formatMoney = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? `C$ ${Number(value).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
const describeEvent = (row) => {
  const loanId = detailAfter(row.details, "loan_id") || (String(row.action).includes("LOAN") ? row.entity_id : null);
  const amount = formatMoney(detailAfter(row.details, "payment_amount") ?? detailAfter(row.details, "amount") ?? detailAfter(row.details, "approved_amount"));
  const descriptions = {
    CREATE_LOAN: `Se aperturó el crédito No. ${loanId || row.entity_id}${amount ? ` por ${amount}` : ""}.`,
    DISBURSE_LOAN: `Se desembolsó el crédito No. ${loanId || row.entity_id}${amount ? ` por ${amount}` : ""}.`,
    CANCEL_LOAN: `Se anuló el crédito No. ${loanId || row.entity_id}.`,
    PAGO_REGISTRADO: `Se registró el pago No. ${row.entity_id}${amount ? ` por ${amount}` : ""} al crédito No. ${loanId || "no identificado"}.`,
    PAGO_ANULADO: `Se anuló el pago No. ${row.entity_id} del crédito No. ${loanId || "no identificado"}.`,
    APROBACION_FINAL: `${row.comment?.toLowerCase().includes("cambios") ? "Se aprobó con cambios" : "Se registró la aprobación de"} el crédito No. ${loanId || row.entity_id}.`,
    INTENTO_APROBACION_SIN_CUMPLIMIENTO: `Se intentó aprobar el crédito No. ${loanId || row.entity_id}, pero no cumplía los requisitos.`,
    INTENTO_APROBACION_EXCEDIDA: `Se intentó aprobar el crédito No. ${loanId || row.entity_id} excediendo el límite permitido.`,
    APPROVE_LOAN: `Se aprobó el crédito No. ${loanId || row.entity_id}.`,
    REJECT_LOAN: `Se rechazó el crédito No. ${loanId || row.entity_id}.`,
  };
  return descriptions[row.action] || row.comment || `${row.action} sobre ${row.entity || "registro"} No. ${row.entity_id || "N/D"}.`;
};

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ actions: [], entities: [] });
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await API.get("/api/audit", { params: { ...applied, page: page + 1, page_size: pageSize } });
      setRows(data.data || []);
      setTotal(data.pagination?.total || 0);
      setOptions(data.filters || { actions: [], entities: [] });
    } catch (err) {
      setError(err.response?.data?.message || "No fue posible cargar la auditoría.");
    } finally { setLoading(false); }
  }, [applied, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = (event) => { event.preventDefault(); setPage(0); setApplied(filters); };
  const clearFilters = () => { setFilters(initialFilters); setApplied(initialFilters); setPage(0); };

  return (
    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box><Typography variant="h5" fontWeight={900}>Auditoría</Typography><Typography color="text.secondary">Trazabilidad de acciones realizadas en el sistema</Typography></Box>
        <Button startIcon={<RefreshRoundedIcon />} onClick={load} disabled={loading}>Actualizar</Button>
      </Box>

      <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField size="small" label="Buscar" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} sx={{ minWidth: 220, flex: 1 }} />
          <TextField select size="small" label="Acción" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} sx={{ minWidth: 170 }}><MenuItem value="">Todas</MenuItem>{options.actions.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField>
          <TextField select size="small" label="Entidad" value={filters.entity} onChange={(e) => setFilters({ ...filters, entity: e.target.value })} sx={{ minWidth: 170 }}><MenuItem value="">Todas</MenuItem>{options.entities.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField>
          <TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }} value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
          <TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          <Button type="submit" variant="contained">Filtrar</Button><Button onClick={clearFilters}>Limpiar</Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Usuario</TableCell><TableCell>Acción</TableCell><TableCell>Descripción</TableCell><TableCell>IP</TableCell><TableCell align="center">Detalle</TableCell></TableRow></TableHead>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}>No hay eventos para los filtros seleccionados.</TableCell></TableRow> : rows.map((row) => (
              <TableRow key={row.id} hover><TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(row.created_at)}</TableCell><TableCell>{row.user_name}</TableCell><TableCell><Chip size="small" label={row.action} color="primary" variant="outlined" /></TableCell><TableCell sx={{ minWidth: 280 }}>{describeEvent(row)}</TableCell><TableCell>{row.ip_address || "—"}</TableCell><TableCell align="center"><Tooltip title="Ver detalle"><IconButton size="small" onClick={() => setSelected(row)}><VisibilityRoundedIcon fontSize="small" /></IconButton></Tooltip></TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} rowsPerPage={pageSize} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Filas por página" />
      </TableContainer>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="md"><DialogTitle>Detalle del evento</DialogTitle><DialogContent dividers><Stack spacing={2}><Typography><b>Usuario:</b> {selected?.user_name}</Typography><Typography><b>Comentario:</b> {selected?.comment || "Sin comentario"}</Typography><Typography><b>Agente:</b> {selected?.user_agent || "—"}</Typography><Box component="pre" sx={{ m: 0, p: 2, borderRadius: 2, bgcolor: "action.hover", overflow: "auto", whiteSpace: "pre-wrap", fontSize: 13 }}>{JSON.stringify(selected?.details ?? {}, null, 2)}</Box></Stack></DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Cerrar</Button></DialogActions></Dialog>
    </Stack>
  );
}
