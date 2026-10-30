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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RefreshIcon from "@mui/icons-material/Refresh";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import BranchSelect from "../BranchSelect";
import { money } from "./DenominationCounter";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportMoney, reportFilters, reportPeriod, reportDateTime } from "../common/reportFormat";

const STATUS = {
  PENDIENTE: { label: "Pendiente", color: "warning" },
  APROBADO: { label: "Aprobado", color: "success" },
  RECHAZADO: { label: "Rechazado", color: "error" },
  REEMPLAZADO: { label: "Reemplazado", color: "default" },
};

const usd = (v) => `US$ ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dayOf = (v) => String(v || "").slice(0, 10);

const diffColor = (v) => (Number(v) < 0 ? "error.main" : Number(v) > 0 ? "warning.main" : "text.primary");

const StatusChip = ({ status }) => {
  const s = STATUS[status] || { label: status, color: "default" };
  return <Chip size="small" color={s.color} label={s.label} />;
};

// Filas del desglose de una moneda: [{ value, qty, subtotal }], mayor a menor.
const denominationRows = (counts = {}) =>
  Object.entries(counts)
    .map(([value, qty]) => ({ value: Number(value), qty: Number(qty), subtotal: Number(value) * Number(qty) }))
    .filter((r) => r.qty > 0)
    .sort((a, b) => b.value - a.value);

const buildDetailReport = (close) => {
  const section = (concept) => ({ section: true, concept });
  const rows = [section("Resumen")];
  rows.push({ concept: "Esperado en córdobas", amount: Number(close.expected_nio) });
  rows.push({ concept: "Contado en córdobas", amount: Number(close.counted_nio) });
  rows.push({ concept: "Diferencia en córdobas", amount: Number(close.difference_nio) });
  if (Number(close.expected_usd) || Number(close.counted_usd)) {
    rows.push({ concept: "Esperado en dólares (US$)", amount: Number(close.expected_usd) });
    rows.push({ concept: "Contado en dólares (US$)", amount: Number(close.counted_usd) });
    rows.push({ concept: "Diferencia en dólares (US$)", amount: Number(close.difference_usd) });
  }
  rows.push(section("Conteo por denominación (C$)"));
  denominationRows(close.denominations?.NIO).forEach((r) =>
    rows.push({ concept: `C$ ${r.value} × ${r.qty}`, amount: r.subtotal }));
  const usdRows = denominationRows(close.denominations?.USD);
  if (usdRows.length) {
    rows.push(section("Conteo por denominación (US$)"));
    usdRows.forEach((r) => rows.push({ concept: `US$ ${r.value} × ${r.qty}`, amount: r.subtotal }));
  }
  rows.push(section("Pagos del día"));
  (close.payments || []).forEach((p) =>
    rows.push({ concept: p.customer_name || "", reference: p.credit_code, time: p.time, status: p.forma_pago_name, amount: Number(p.amount) }));
  return {
    title: "Cierre del día del cobrador",
    subtitle: `${close.collector_name || ""} · ${close.branch_name || ""} · ${STATUS[close.status]?.label || close.status}`,
    period: `Día ${dayOf(close.close_date)}`,
    fileName: `cierre_cobrador_${close.id}_${dayOf(close.close_date)}`,
    sheetName: "Cierre del día",
    columns: [
      { field: "concept", label: "Concepto" },
      { field: "reference", label: "Crédito" },
      { field: "time", label: "Hora" },
      { field: "status", label: "Forma de pago" },
      { label: "Monto", value: (r) => r.amount, numeric: true, format: (v) => (v === null || v === undefined ? "" : reportMoney(v)) },
    ],
    rows,
  };
};

// Revisión de los cierres del día que los cobradores hacen en la app contando
// el efectivo por denominación. La oficina ve el desglose y los pagos del día y
// aprueba o rechaza (con motivo). No genera asientos: el efectivo se liquida
// con el Arqueo de Cobradores.
export default function CollectorDayCloses() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canReview = role === 1 || permissions.includes("caja.arqueos.registrar");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({ status: "PENDIENTE", branch_id: "", date_from: "", date_to: "" });
  const [detail, setDetail] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await API.get("/api/caja/day-closes", { params });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron cargar los cierres de cobradores");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id) => {
    try {
      const res = await API.get(`/api/caja/day-closes/${id}`);
      setDetail(res.data?.data || null);
      setReviewNotes("");
      setReviewError("");
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cargar el cierre");
    }
  };

  const review = async (decision) => {
    setReviewError("");
    if (decision === "reject" && !reviewNotes.trim()) {
      setReviewError("Indique el motivo del rechazo.");
      return;
    }
    setReviewing(true);
    try {
      await API.put(`/api/caja/day-closes/${detail.id}/${decision}`, { notes: reviewNotes.trim() });
      setNotice(`Cierre #${detail.id} ${decision === "approve" ? "aprobado" : "rechazado"}.`);
      setDetail(null);
      load();
    } catch (err) {
      setReviewError(err.response?.data?.message || "No se pudo registrar la revisión");
    } finally {
      setReviewing(false);
    }
  };

  const columns = [
    { field: "close_date", headerName: "Día", width: 110, valueFormatter: ({ value }) => dayOf(value) },
    { field: "collector_name", headerName: "Cobrador", flex: 1, minWidth: 170 },
    { field: "branch_name", headerName: "Sucursal", flex: 1, minWidth: 150 },
    { field: "status", headerName: "Estado", width: 120, renderCell: ({ value }) => <StatusChip status={value} /> },
    { field: "expected_nio", headerName: "Esperado C$", width: 130, align: "right", headerAlign: "right", valueFormatter: ({ value }) => money(value) },
    { field: "counted_nio", headerName: "Contado C$", width: 130, align: "right", headerAlign: "right", valueFormatter: ({ value }) => money(value) },
    {
      field: "difference_nio",
      headerName: "Diferencia C$",
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <Typography variant="body2" color={diffColor(value)}>{money(value)}</Typography>,
    },
    {
      field: "usd",
      headerName: "US$ contado / esperado",
      width: 190,
      align: "right",
      headerAlign: "right",
      valueGetter: ({ row }) => (Number(row.expected_usd) || Number(row.counted_usd) ? `${usd(row.counted_usd)} / ${usd(row.expected_usd)}` : "—"),
    },
    { field: "submitted_by_name", headerName: "Enviado por", width: 160 },
    { field: "reviewed_by_name", headerName: "Revisado por", width: 160, valueFormatter: ({ value }) => value || "—" },
  ];

  const pendingCount = rows.filter((r) => r.status === "PENDIENTE").length;

  const buildReport = () => {
    const sum = (get) => rows.reduce((acc, r) => acc + Number(get(r) || 0), 0);
    const total = (raw) => ({ value: reportMoney(raw), raw, numeric: true });
    const branchName = filters.branch_id ? rows[0]?.branch_name || "" : "";
    return {
      title: "Cierres del día de cobradores",
      subtitle: reportFilters([
        ["Estado", STATUS[filters.status]?.label || ""],
        ["Sucursal", branchName],
      ]),
      period: reportPeriod(filters.date_from, filters.date_to),
      orientation: "landscape",
      fileName: `cierres_cobradores_${filters.date_from || ""}_${filters.date_to || ""}`,
      sheetName: "Cierres de cobradores",
      columns: [
        { field: "close_date", label: "Día", format: dayOf },
        { field: "collector_name", label: "Cobrador" },
        { field: "branch_name", label: "Sucursal" },
        { field: "status", label: "Estado", format: (v) => STATUS[v]?.label || v },
        { label: "Esperado C$", value: (r) => Number(r.expected_nio || 0), numeric: true, format: reportMoney },
        { label: "Contado C$", value: (r) => Number(r.counted_nio || 0), numeric: true, format: reportMoney },
        { label: "Diferencia C$", value: (r) => Number(r.difference_nio || 0), numeric: true, format: reportMoney },
        { label: "Esperado US$", value: (r) => Number(r.expected_usd || 0), numeric: true, format: reportMoney },
        { label: "Contado US$", value: (r) => Number(r.counted_usd || 0), numeric: true, format: reportMoney },
        { field: "submitted_by_name", label: "Enviado por" },
        { field: "reviewed_by_name", label: "Revisado por", format: (v) => v || "" },
      ],
      rows,
      totals: [
        { value: `Total (${rows.length} cierres)`, colspan: 4 },
        total(sum((r) => r.expected_nio)),
        total(sum((r) => r.counted_nio)),
        total(sum((r) => r.difference_nio)),
        total(sum((r) => r.expected_usd)),
        total(sum((r) => r.counted_usd)),
        { value: "", colspan: 2 },
      ],
    };
  };

  const denomTable = (symbol, counts) => {
    const list = denominationRows(counts);
    if (!list.length) return <Typography variant="body2" color="text.secondary">Sin billetes ni monedas.</Typography>;
    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Denominación</TableCell>
            <TableCell align="right">Cantidad</TableCell>
            <TableCell align="right">Subtotal</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map((r) => (
            <TableRow key={r.value}>
              <TableCell>{symbol} {r.value}</TableCell>
              <TableCell align="right">{r.qty}</TableCell>
              <TableCell align="right">{reportMoney(r.subtotal)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const hasUsd = detail && (Number(detail.expected_usd) || Number(detail.counted_usd));

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <FactCheckIcon color="primary" />
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Cierres de cobradores</Typography>
        <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Actualizar</Button>
        <ReportExportButtons report={buildReport} disabled={!rows.length} />
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="Estado" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <MenuItem value="">Todos (sin reemplazados)</MenuItem>
              <MenuItem value="PENDIENTE">Pendientes</MenuItem>
              <MenuItem value="APROBADO">Aprobados</MenuItem>
              <MenuItem value="RECHAZADO">Rechazados</MenuItem>
              <MenuItem value="REEMPLAZADO">Reemplazados</MenuItem>
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
      {pendingCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {pendingCount} cierre(s) pendiente(s) de revisión. Abra uno para ver el conteo por denominación y aprobarlo o rechazarlo.
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
          localeText={{ noRowsLabel: "No hay cierres de cobradores con ese filtro" }}
        />
      </Paper>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        {detail && (
          <>
            <DialogTitle>
              Cierre #{detail.id} — {detail.collector_name} · {dayOf(detail.close_date)} <StatusChip status={detail.status} />
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {detail.branch_name} · enviado por {detail.submitted_by_name || "—"} el {reportDateTime(detail.created_at)} ·{" "}
                {detail.payments_count} pago(s) en el día
                {Number(detail.non_cash_total) > 0 ? ` · fuera de efectivo ${money(detail.non_cash_total)}` : ""}
              </Typography>

              {detail.notes && <Alert severity="info" sx={{ mb: 2 }}>Nota del cobrador: {detail.notes}</Alert>}
              {detail.status !== "PENDIENTE" && detail.reviewed_by_name && (
                <Alert severity={detail.status === "APROBADO" ? "success" : "error"} sx={{ mb: 2 }}>
                  {detail.status === "APROBADO" ? "Aprobado" : detail.status === "RECHAZADO" ? "Rechazado" : "Revisado"} por {detail.reviewed_by_name} el{" "}
                  {reportDateTime(detail.reviewed_at)}.{detail.review_notes ? ` ${detail.review_notes}` : ""}
                </Alert>
              )}
              {detail.status === "REEMPLAZADO" && (
                <Alert severity="warning" sx={{ mb: 2 }}>El cobrador volvió a cerrar este día; este cierre quedó reemplazado.</Alert>
              )}

              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Moneda</TableCell>
                    <TableCell align="right">Esperado</TableCell>
                    <TableCell align="right">Contado</TableCell>
                    <TableCell align="right">Diferencia</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Córdobas (C$)</TableCell>
                    <TableCell align="right">{money(detail.expected_nio)}</TableCell>
                    <TableCell align="right">{money(detail.counted_nio)}</TableCell>
                    <TableCell align="right"><Typography variant="body2" color={diffColor(detail.difference_nio)}>{Number(detail.difference_nio) > 0 ? "Sobrante " : ""}{money(detail.difference_nio)}</Typography></TableCell>
                  </TableRow>
                  {hasUsd ? (
                    <TableRow>
                      <TableCell>Dólares (US$)</TableCell>
                      <TableCell align="right">{usd(detail.expected_usd)}</TableCell>
                      <TableCell align="right">{usd(detail.counted_usd)}</TableCell>
                      <TableCell align="right"><Typography variant="body2" color={diffColor(detail.difference_usd)}>{Number(detail.difference_usd) > 0 ? "Sobrante " : ""}{usd(detail.difference_usd)}</Typography></TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>

              <Grid container spacing={3}>
                <Grid item xs={12} md={hasUsd ? 6 : 12}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Conteo en córdobas</Typography>
                  {denomTable("C$", detail.denominations?.NIO)}
                </Grid>
                {hasUsd ? (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Conteo en dólares</Typography>
                    {denomTable("US$", detail.denominations?.USD)}
                  </Grid>
                ) : null}
              </Grid>

              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Pagos del día ({(detail.payments || []).length})</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Hora</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Crédito</TableCell>
                    <TableCell>Forma de pago</TableCell>
                    <TableCell align="right">Monto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detail.payments || []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.time}</TableCell>
                      <TableCell>{p.customer_name}</TableCell>
                      <TableCell>{p.credit_code}</TableCell>
                      <TableCell>{p.forma_pago_name}{p.foreign_amount != null ? ` (${usd(p.foreign_amount)})` : ""}</TableCell>
                      <TableCell align="right">{money(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {!(detail.payments || []).length && (
                    <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">No hubo pagos ese día.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              {detail.status === "PENDIENTE" && canReview && (
                <Box sx={{ mt: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    label="Nota de la revisión (obligatoria si rechaza)"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    inputProps={{ maxLength: 500 }}
                  />
                  {reviewError && <Alert severity="error" sx={{ mt: 1 }}>{reviewError}</Alert>}
                </Box>
              )}
              {detail.status === "PENDIENTE" && !canReview && (
                <Alert severity="info" sx={{ mt: 3 }}>No tiene permiso para aprobar o rechazar cierres (caja.arqueos.registrar).</Alert>
              )}
            </DialogContent>
            <DialogActions>
              <ReportExportButtons report={() => buildDetailReport(detail)} />
              {detail.status === "PENDIENTE" && canReview && (
                <>
                  <Button color="error" disabled={reviewing} onClick={() => review("reject")}>Rechazar</Button>
                  <Button variant="contained" color="success" disabled={reviewing} onClick={() => review("approve")}>Aprobar</Button>
                </>
              )}
              <Button onClick={() => setDetail(null)}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
