import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListSubheader,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import dayjs from "dayjs";
import API from "../api";
import { UserContext } from "../contexts/UserContext";
import HelpButton from "./help/HelpButton";
import ReportExportButtons from "./common/ReportExportButtons";
import { reportFilters, reportMoney, reportPeriod } from "./common/reportFormat";

// Notas de crédito y débito sobre créditos (api/loan/loanAdjustmentsController.js).
// Registro -> aprobación por OTRO usuario (se aplica) o rechazo -> anulación.

const money = (v) =>
  `C$ ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dmy = (v) => (v ? dayjs(String(v).slice(0, 10)).format("DD/MM/YYYY") : "—");

const STATUS = {
  PENDING: { label: "Pendiente", color: "warning" },
  APPLIED: { label: "Aplicada", color: "success" },
  REJECTED: { label: "Rechazada", color: "default" },
  VOID: { label: "Anulada", color: "default" },
};

const emptyForm = { credit: "", concept: "", amount: "", reason: "", support_reference: "" };

export default function LoanAdjustments() {
  const { permissions = [], role, user } = useContext(UserContext) || {};
  const canCreate = role === 1 || permissions.includes("creditos.ajustes.crear");
  const canApprove = role === 1 || permissions.includes("creditos.ajustes.aprobar");
  // UserContext.user es el id numérico del usuario de la sesión.
  const myId = (() => {
    if (Number(user)) return Number(user);
    try {
      return Number(JSON.parse(localStorage.getItem("user") || "{}")?.id) || null;
    } catch {
      return null;
    }
  })();

  const [concepts, setConcepts] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [from, setFrom] = useState(dayjs().subtract(3, "month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [message, setMessage] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loanInfo, setLoanInfo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [saving, setSaving] = useState(false);

  const [action, setAction] = useState(null); // { kind: 'approve'|'reject'|'void', row }
  const [actionText, setActionText] = useState("");

  const conceptMap = useMemo(() => Object.fromEntries(concepts.map((c) => [c.code, c])), [concepts]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/api/loan-adjustments", {
        params: { status: statusFilter || undefined, from, to },
      });
      setRows(data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudieron cargar las notas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    API.get("/api/loan-adjustments/concepts").then(({ data }) => setConcepts(data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, from, to]);

  // Datos del crédito al escribir su número.
  useEffect(() => {
    if (!createOpen) return undefined;
    const id = Number(form.credit);
    setLoanInfo(null);
    if (!id) return undefined;
    const t = setTimeout(() => {
      API.get(`/api/loans/${id}`)
        .then(({ data }) => setLoanInfo(data?.data || null))
        .catch(() => setLoanInfo({ notFound: true }));
    }, 400);
    return () => clearTimeout(t);
  }, [form.credit, createOpen]);

  // Vista previa: tope disponible, cuotas afectadas y monto con asiento.
  useEffect(() => {
    if (!createOpen) return undefined;
    setPreview(null);
    setPreviewError("");
    const amount = Number(form.amount);
    if (!Number(form.credit) || !form.concept || !(amount > 0)) return undefined;
    const t = setTimeout(() => {
      API.get("/api/loan-adjustments/preview", { params: { loan_id: Number(form.credit), concept: form.concept, amount } })
        .then(({ data }) => setPreview(data?.data || null))
        .catch((err) => setPreviewError(err?.response?.data?.message || "No se pudo calcular la nota."));
    }, 400);
    return () => clearTimeout(t);
  }, [form.credit, form.concept, form.amount, createOpen]);

  const submit = async () => {
    setSaving(true);
    try {
      await API.post("/api/loan-adjustments", {
        loan_id: Number(form.credit),
        concept: form.concept,
        amount: Number(form.amount),
        reason: form.reason,
        support_reference: form.support_reference,
      });
      setCreateOpen(false);
      setForm(emptyForm);
      setMessage({ type: "success", text: "Nota registrada. Queda pendiente de aprobación por otro usuario." });
      setStatusFilter("PENDING");
      await load();
    } catch (err) {
      setPreviewError(err?.response?.data?.message || "No se pudo registrar la nota.");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async () => {
    const { kind, row } = action;
    setSaving(true);
    try {
      if (kind === "approve") await API.post(`/api/loan-adjustments/${row.id}/approve`, { comment: actionText });
      if (kind === "reject") await API.post(`/api/loan-adjustments/${row.id}/reject`, { comment: actionText });
      if (kind === "void") await API.post(`/api/loan-adjustments/${row.id}/void`, { reason: actionText });
      setMessage({
        type: "success",
        text: { approve: "Nota aplicada.", reject: "Nota rechazada.", void: "Nota anulada: se revirtieron la tabla y el asiento." }[kind],
      });
      setAction(null);
      setActionText("");
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "No se pudo completar la acción." });
      setAction(null);
    } finally {
      setSaving(false);
    }
  };

  const buildReport = () => ({
    title: "Notas de crédito y débito",
    subtitle: reportFilters([["Estado", STATUS[statusFilter]?.label || "Todas"]]),
    period: reportPeriod(from, to),
    orientation: "landscape",
    fileName: `notas_credito_debito_${from}_${to}`,
    sheetName: "Notas",
    columns: [
      { label: "Fecha", value: (r) => dmy(r.applied_date || r.created_at) },
      { label: "Crédito", value: (r) => `#${r.credit_code || r.loan_id}` },
      { field: "customer_name", label: "Cliente" },
      { label: "Tipo", value: (r) => (r.adjustment_type === "CREDIT" ? "Crédito" : "Débito") },
      { field: "concept_label", label: "Concepto" },
      // Las notas de crédito restan (signo negativo), las de débito suman.
      {
        label: "Monto",
        value: (r) => (r.adjustment_type === "CREDIT" ? -1 : 1) * Number(r.total_amount || 0),
        numeric: true,
        format: reportMoney,
      },
      { label: "Asiento 5202.02", value: (r) => Number(r.booked_amount || 0), numeric: true, format: reportMoney },
      { field: "reason", label: "Motivo" },
      { field: "support_reference", label: "Soporte" },
      { field: "status", label: "Estado", format: (v) => STATUS[v]?.label || v },
      { field: "created_by_name", label: "Registró" },
      { label: "Aprobó", value: (r) => r.reviewed_by_name || (r.status === "PENDING" ? "por aprobar" : "") },
    ],
    rows,
    totals: [{ value: `${rows.length} nota(s)`, colspan: 12 }],
  });

  const selectedConcept = conceptMap[form.concept];
  const loanOk = loanInfo && !loanInfo.notFound;

  return (
    <Box className="bac-page">
      <Box className="bac-page-header">
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <Typography variant="h5" className="bac-page-title">
              Notas de crédito y débito
            </Typography>
            <HelpButton screenKey="creditos.notas_credito_debito" />
          </Box>
          <div className="bac-page-subtitle">
            Ajustes a lo que debe el cliente: condonaciones, correcciones y cargos adicionales. Cada nota la aprueba un
            usuario distinto al que la registra.
          </div>
        </Box>
        <Stack direction="row" spacing={1}>
          <ReportExportButtons report={buildReport} disabled={loading || !rows.length} />
          {canCreate ? (
            <Button variant="contained" startIcon={<AddIcon />} className="bac-btn-primary" onClick={() => setCreateOpen(true)}>
              Nueva nota
            </Button>
          ) : null}
        </Stack>
      </Box>

      {message ? (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      ) : null}

      <Box className="bac-filters">
        <Box className="bac-filters__body">
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField select size="small" label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="">Todas</MenuItem>
              {Object.entries(STATUS).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField type="date" size="small" label="Desde" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField type="date" size="small" label="Hasta" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
        </Box>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper variant="outlined" className="bac-table-card">
        <TableContainer>
          <Table size="small" className="bac-table">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Crédito</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Concepto</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Registró / Aprobó</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    No hay notas con esos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{dmy(r.applied_date || r.created_at)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>#{r.credit_code || r.loan_id}</TableCell>
                    <TableCell>{r.customer_name}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={r.adjustment_type === "CREDIT" ? "primary" : "secondary"}
                        label={r.adjustment_type === "CREDIT" ? "Crédito" : "Débito"}
                      />
                    </TableCell>
                    <TableCell>
                      {r.concept_label}
                      {Number(r.booked_amount) > 0 ? (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Asiento 5202.02 por {money(r.booked_amount)}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {r.adjustment_type === "CREDIT" ? "-" : "+"}
                      {money(r.total_amount)}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Tooltip title={[r.reason, r.support_reference && `Soporte: ${r.support_reference}`, r.review_comment && `Revisión: ${r.review_comment}`, r.void_reason && `Anulación: ${r.void_reason}`].filter(Boolean).join(" · ")}>
                        <Typography variant="body2" noWrap>
                          {r.reason}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={STATUS[r.status]?.color || "default"} label={STATUS[r.status]?.label || r.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">
                        {r.created_by_name || "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {r.reviewed_by_name || (r.status === "PENDING" ? "por aprobar" : "—")}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {canApprove && r.status === "PENDING" ? (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title={Number(r.created_by) === myId && role !== 1 ? "Usted la registró: debe aprobarla otro usuario" : ""}>
                            <span>
                              <Button
                                size="small"
                                variant="contained"
                                disabled={Number(r.created_by) === myId && role !== 1}
                                onClick={() => setAction({ kind: "approve", row: r })}
                              >
                                Aprobar
                              </Button>
                            </span>
                          </Tooltip>
                          <Button size="small" color="inherit" onClick={() => setAction({ kind: "reject", row: r })}>
                            Rechazar
                          </Button>
                        </Stack>
                      ) : null}
                      {canApprove && r.status === "APPLIED" ? (
                        <Button size="small" color="error" onClick={() => setAction({ kind: "void", row: r })}>
                          Anular
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Nueva nota */}
      <Dialog open={createOpen} onClose={saving ? undefined : () => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva nota de crédito o débito</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <TextField
              size="small"
              label="Número de crédito"
              value={form.credit}
              onChange={(e) => setForm((f) => ({ ...f, credit: e.target.value.replace(/\D/g, "") }))}
              helperText={
                loanInfo?.notFound
                  ? "Crédito no encontrado"
                  : loanOk
                    ? `${loanInfo.customer_name || ""} · ${loanInfo.status}`
                    : "Escriba el número del crédito"
              }
              error={!!loanInfo?.notFound}
            />
            <TextField select size="small" label="Concepto" value={form.concept} onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))}>
              <ListSubheader>Notas de crédito (bajan lo que debe el cliente)</ListSubheader>
              {concepts
                .filter((c) => c.type === "CREDIT")
                .map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.label}
                  </MenuItem>
                ))}
              <ListSubheader>Notas de débito (suben lo que debe el cliente)</ListSubheader>
              {concepts
                .filter((c) => c.type === "DEBIT")
                .map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.label}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              size="small"
              type="number"
              label="Monto (C$)"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              inputProps={{ min: 0, step: "0.01" }}
            />

            {previewError ? <Alert severity="error">{previewError}</Alert> : null}
            {preview && selectedConcept ? (
              <Alert severity="info" icon={false}>
                <Typography variant="body2" fontWeight={700}>
                  {selectedConcept.type === "CREDIT" ? "Se descuenta de" : "Se agrega a"}: {selectedConcept.component_label}
                </Typography>
                {preview.capacity != null ? (
                  <Typography variant="body2">Disponible para acreditar: {money(preview.capacity)}</Typography>
                ) : null}
                <Typography variant="body2">
                  {preview.lines[0]?.payment_number
                    ? `Cuota(s): ${preview.lines.map((l) => `#${l.payment_number} (${money(l.amount)})`).join(", ")}`
                    : "Se aplica al saldo de interés moratorio del crédito."}
                </Typography>
                <Typography variant="body2">
                  {preview.booked > 0
                    ? `Asiento al aprobar: Débito 5202.02 Saneamiento / Crédito 1406 por ${money(preview.booked)}.`
                    : "Sin asiento contable: el concepto se reconoce al cobrarse."}
                </Typography>
              </Alert>
            ) : null}

            <TextField
              size="small"
              label="Motivo"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              multiline
              minRows={2}
              placeholder="Ej.: acuerdo de pago aprobado por gerencia"
            />
            <TextField
              size="small"
              label="Documento de soporte (opcional)"
              value={form.support_reference}
              onChange={(e) => setForm((f) => ({ ...f, support_reference: e.target.value }))}
              placeholder="Ej.: Acta de comité #12, factura del abogado #345"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={submit} disabled={saving || !preview || !form.reason.trim()}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Aprobar / rechazar / anular */}
      <Dialog open={!!action} onClose={saving ? undefined : () => setAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {action?.kind === "approve" ? "Aprobar y aplicar nota" : action?.kind === "reject" ? "Rechazar nota" : "Anular nota"}
        </DialogTitle>
        <DialogContent dividers>
          {action ? (
            <Stack spacing={1.5}>
              <Typography variant="body2">
                {action.row.concept_label} por <b>{money(action.row.total_amount)}</b> en el crédito #{action.row.credit_code || action.row.loan_id} (
                {action.row.customer_name}).
              </Typography>
              {action.kind === "approve" ? (
                <Alert severity="info">Al aprobarla se aplica de inmediato a las cuotas y, si corresponde, se contabiliza.</Alert>
              ) : null}
              {action.kind === "void" ? (
                <Alert severity="warning">Se revierte la tabla del crédito y se anula su asiento. No se puede anular si el crédito recibió pagos después.</Alert>
              ) : null}
              <TextField
                size="small"
                label={action.kind === "approve" ? "Comentario (opcional)" : "Motivo"}
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                multiline
                minRows={2}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAction(null)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={action?.kind === "approve" ? "primary" : "error"}
            onClick={runAction}
            disabled={saving || (action?.kind !== "approve" && !actionText.trim())}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
