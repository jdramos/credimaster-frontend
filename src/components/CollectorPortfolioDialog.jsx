import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import API from "../api";
import { UserContext } from "../contexts/UserContext";

// Cartera de un cobrador: traslado de créditos a otro cobrador (con
// historial), baja y reactivación. El traslado cambia el cobrador
// responsable desde la fecha efectiva; los pagos y saldos anteriores se
// quedan con quien los gestionó (ver collectorPortfolioController.js).

const money = (v) =>
  `C$ ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dmy = (v) => (v ? dayjs(String(v).slice(0, 10)).format("DD/MM/YYYY") : "—");

const STATUS_LABEL = {
  DISBURSED: "Desembolsado",
  APPROVED: "Aprobado",
  PENDING: "Pendiente",
  DRAFT: "Borrador",
};

export default function CollectorPortfolioDialog({ open, collector, collectors = [], onClose, onChanged }) {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canManage = role === 1 || permissions.includes("cobradores.cartera.gestionar");

  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [toCollector, setToCollector] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [reason, setReason] = useState("");
  const [deactivateReason, setDeactivateReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    if (!collector?.id) return;
    setLoading(true);
    setError("");
    try {
      const [portfolio, transfers] = await Promise.all([
        API.get(`/api/collectors/${collector.id}/portfolio`),
        API.get("/api/collectors/transfers", { params: { collector_id: collector.id } }),
      ]);
      setData(portfolio.data?.data || null);
      setHistory(transfers.data?.data || []);
      setSelected(new Set((portfolio.data?.data?.loans || []).map((l) => l.id)));
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo cargar la cartera del cobrador.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setTab(0);
    setMessage(null);
    setReason("");
    setDeactivateReason("");
    setToCollector("");
    setEffectiveDate(dayjs().format("YYYY-MM-DD"));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collector?.id]);

  const loans = data?.loans || [];
  const isActive = Number(data?.collector?.active ?? collector?.active ?? 1) === 1;

  // Destino: cobradores activos de la misma sucursal, distintos al actual.
  const destinations = useMemo(
    () =>
      collectors.filter(
        (c) => c.id !== collector?.id && Number(c.active ?? 1) === 1 && Number(c.branch_id) === Number(collector?.branch_id),
      ),
    [collectors, collector],
  );

  const allSelected = loans.length > 0 && selected.size === loans.length;
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleTransfer = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const { data: res } = await API.post("/api/collectors/transfer", {
        from_collector_id: collector.id,
        to_collector_id: Number(toCollector),
        loan_ids: allSelected ? undefined : [...selected],
        effective_date: effectiveDate,
        reason,
      });
      setMessage({
        type: "success",
        text: `${res.data.transferred} crédito(s) trasladados de ${res.data.from} a ${res.data.to} desde el ${dmy(res.data.effective_date)}.`,
      });
      setReason("");
      await load();
      onChanged?.();
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "No se pudo trasladar la cartera." });
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivate = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const { data: res } = await API.put(`/api/collectors/${collector.id}/deactivate`, { reason: deactivateReason });
      setMessage({
        type: "success",
        text: `Cobrador desactivado.${res.data?.app_users_disabled ? ` Se desactivaron ${res.data.app_users_disabled} usuario(s) de la app.` : ""}`,
      });
      await load();
      onChanged?.();
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "No se pudo desactivar el cobrador." });
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await API.put(`/api/collectors/${collector.id}/activate`);
      setMessage({ type: "success", text: "Cobrador reactivado. Sus usuarios de la app se reactivan aparte, desde Usuarios." });
      await load();
      onChanged?.();
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "No se pudo reactivar el cobrador." });
    } finally {
      setBusy(false);
    }
  };

  const s = data?.summary;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h6" fontWeight={800}>
            Cartera de {collector?.name}
          </Typography>
          <Chip size="small" label={collector?.branch_name || "Sin sucursal"} variant="outlined" />
          <Chip size="small" color={isActive ? "success" : "default"} label={isActive ? "Activo" : "Inactivo"} />
        </Stack>
        {!isActive && data?.collector?.deactivation_reason ? (
          <Typography variant="caption" color="text.secondary">
            Desactivado el {dmy(data.collector.deactivated_at)}: {data.collector.deactivation_reason}
          </Typography>
        ) : null}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box textAlign="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Stack spacing={1.5}>
            {message ? <Alert severity={message.type}>{message.text}</Alert> : null}

            {s ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`${s.loans_count} crédito(s) abiertos`} />
                <Chip label={`Saldo ${money(s.balance)}`} />
                <Chip color={s.late_count ? "warning" : "default"} label={`${s.late_count} con atraso`} />
                <Chip
                  color={Math.abs(s.cash_in_custody) >= 0.01 ? "warning" : "default"}
                  label={`Efectivo en custodia ${money(s.cash_in_custody)}`}
                />
                <Chip
                  variant="outlined"
                  label={`Usuarios de la app: ${
                    data.app_users.length
                      ? data.app_users.map((u) => `${u.user_name}${Number(u.user_status) ? "" : " (inactivo)"}`).join(", ")
                      : "ninguno"
                  }`}
                />
              </Stack>
            ) : null}

            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label={`Cartera (${loans.length})`} />
              <Tab label={`Historial de traslados (${history.length})`} />
            </Tabs>

            {tab === 0 ? (
              <>
                <TableContainer sx={{ maxHeight: 340, border: "1px solid #E5E7EB", borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          {canManage && isActive ? (
                            <Checkbox
                              size="small"
                              checked={allSelected}
                              indeterminate={selected.size > 0 && !allSelected}
                              onChange={() => setSelected(allSelected ? new Set() : new Set(loans.map((l) => l.id)))}
                            />
                          ) : null}
                        </TableCell>
                        <TableCell>Crédito</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="right">Saldo</TableCell>
                        <TableCell>Próx. vencimiento</TableCell>
                        <TableCell align="center">Días atraso</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loans.map((l) => (
                        <TableRow key={l.id} hover>
                          <TableCell padding="checkbox">
                            {canManage && isActive ? (
                              <Checkbox size="small" checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                            ) : null}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>#{l.credit_code || l.id}</TableCell>
                          <TableCell>{l.customer_name || l.customer_identification}</TableCell>
                          <TableCell>{STATUS_LABEL[l.status] || l.status}</TableCell>
                          <TableCell align="right">{money(l.current_balance)}</TableCell>
                          <TableCell>{dmy(l.next_due)}</TableCell>
                          <TableCell align="center" sx={{ color: l.days_late ? "error.main" : undefined, fontWeight: l.days_late ? 800 : 400 }}>
                            {l.days_late || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!loans.length ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                            Este cobrador no tiene créditos abiertos.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>

                {canManage && isActive && loans.length > 0 ? (
                  <Box sx={{ p: 1.5, border: "1px solid #D8E2F0", borderRadius: 1, bgcolor: "#F8FBFF" }}>
                    <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                      Trasladar {selected.size} crédito(s) seleccionados
                    </Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                      <TextField
                        select
                        size="small"
                        label="Cobrador destino"
                        value={toCollector}
                        onChange={(e) => setToCollector(e.target.value)}
                        sx={{ minWidth: 260 }}
                        helperText={destinations.length ? "Activos de la misma sucursal" : "No hay otro cobrador activo en esta sucursal"}
                      >
                        {destinations.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        type="date"
                        size="small"
                        label="Fecha efectiva"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ max: dayjs().format("YYYY-MM-DD") }}
                      />
                      <TextField
                        size="small"
                        label="Motivo"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ej.: renuncia del cobrador, redistribución de rutas"
                        sx={{ flex: 1 }}
                      />
                      <Button
                        variant="contained"
                        disabled={busy || !toCollector || !reason.trim() || selected.size === 0}
                        onClick={handleTransfer}
                      >
                        Trasladar
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                      Los pagos y saldos anteriores se quedan con {collector?.name}; desde la fecha efectiva la cartera,
                      la mora y los cobros cuentan para el nuevo cobrador, que la ve en su lista de la app móvil.
                    </Typography>
                  </Box>
                ) : null}
              </>
            ) : (
              <TableContainer sx={{ maxHeight: 380, border: "1px solid #E5E7EB", borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha efectiva</TableCell>
                      <TableCell>Crédito</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>De</TableCell>
                      <TableCell>A</TableCell>
                      <TableCell>Motivo</TableCell>
                      <TableCell>Registró</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.id} hover>
                        <TableCell>{dmy(h.effective_date)}</TableCell>
                        <TableCell>#{h.credit_code || h.loan_id}</TableCell>
                        <TableCell>{h.customer_name}</TableCell>
                        <TableCell>{h.from_name || "—"}</TableCell>
                        <TableCell>{h.to_name}</TableCell>
                        <TableCell>{h.reason}</TableCell>
                        <TableCell>{h.created_by_name || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {!history.length ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          Sin traslados registrados.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {canManage ? (
              <Box sx={{ p: 1.5, border: "1px solid #FDE2E2", borderRadius: 1, bgcolor: isActive ? "#FFF8F8" : "#F6FFF8" }}>
                {isActive ? (
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      <b>Dar de baja al cobrador.</b> Antes debe trasladar toda su cartera y liquidar su efectivo en custodia
                      (arqueo o depósito). Sus usuarios de la app quedan desactivados.
                    </Typography>
                    <TextField
                      size="small"
                      label="Motivo de la baja"
                      value={deactivateReason}
                      onChange={(e) => setDeactivateReason(e.target.value)}
                      sx={{ minWidth: 240 }}
                    />
                    <Button color="error" variant="outlined" disabled={busy || !deactivateReason.trim()} onClick={handleDeactivate}>
                      Desactivar
                    </Button>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      Cobrador inactivo: no aparece al asignar cobrador en un crédito ni puede recibir cartera.
                    </Typography>
                    <Button variant="outlined" disabled={busy} onClick={handleActivate}>
                      Reactivar
                    </Button>
                  </Stack>
                )}
              </Box>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
