import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  Button,
  Alert,
  Paper,
  Stack,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import BranchSelect from "./BranchSelect";
import HelpButton from "./help/HelpButton";
import API from "../api";

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-NI");
}

function formatDate(value) {
  if (!value) return "-";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

// Generar el saldo INICIAL/FINAL y aperturar/cerrar el día son, en el
// backend, un solo paso (ver LoanController.generateBalances, que llama
// openBusinessDayCore/closeBusinessDayCore): generar el saldo INICIAL
// abre el día, generar el FINAL lo cierra. Esta pantalla une lo que
// antes eran dos menús separados ("Crear saldos" y "Cierre del día")
// para que no haga falta saber que hay que pasar por los dos.
const BusinessDayPanel = () => {
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");

  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logs, setLogs] = useState([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!branchId) {
      setStatus(null);
      return;
    }

    setLoadingStatus(true);
    setError("");

    try {
      const { data } = await API.get(`/api/business-day/status/${branchId}`);
      setStatus(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo obtener el estado del día operativo.",
      );
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleBranchChange = (e) => {
    const selected = e?.target?.value || e;
    setBranchId(selected.id || selected);
    setBranchName(selected.name || "Sucursal seleccionada");
    setSuccess("");
    setError("");
    setLogs([]);
  };

  const isOpenAction = status?.pending_action === "OPEN";
  const balanceType = isOpenAction ? "INITIAL" : "FINAL";

  const getCurrentTime = () => new Date().toLocaleTimeString("es-ES", { hour12: false });
  const addLog = (message) => setLogs((prev) => [...prev, `[${getCurrentTime()}] ${message}`]);

  const startAction = async () => {
    setError("");
    setSuccess("");
    setLogs([]);

    try {
      const { data } = await API.get(`/api/balances/balance-exist`, {
        params: { branch_id: branchId, balance_type: balanceType, balance_date: status.pending_date },
      });

      if (data.exists) setRegenerateOpen(true);
      else setConfirmOpen(true);
    } catch {
      setError("No se pudo verificar si ya existe un saldo para este día.");
    }
  };

  const handleGenerate = async () => {
    setSubmitting(true);
    setError("");
    setSuccess("");
    setConfirmOpen(false);
    setRegenerateOpen(false);

    addLog(
      `Generando saldo ${isOpenAction ? "inicial" : "final"} — Sucursal: ${branchName}, día ${formatDate(status.pending_date)}...`,
    );

    try {
      const { data } = await API.post(`/api/loans/balances`, {
        branch_id: branchId,
        balance_type: balanceType,
        balance_date: status.pending_date,
      });

      if (data.generated_dates) {
        data.generated_dates.forEach((date) => addLog(`Saldo generado para ${formatDate(date)}`));
      }

      if (data.warning) {
        addLog(`Atención: ${data.warning}`);
        setError(data.warning);
      } else {
        addLog(`Listo — ${data.loans_processed || 0} crédito(s) procesados. El día quedó ${isOpenAction ? "abierto" : "cerrado"}.`);
        setSuccess(data.message || "Operación realizada correctamente.");
      }

      await loadStatus();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "No se pudo generar el saldo.";
      addLog(`Error: ${msg}`);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualFallback = async (action) => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await API.post(`/api/business-day/${action}`, { branch_id: branchId });
      setSuccess(data?.message || "Operación realizada correctamente.");
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo completar la operación.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 700, margin: "auto", mt: 5 }}>
      <Typography variant="h5" gutterBottom textAlign="center" sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
        Día Operativo
        <HelpButton screenKey="dia-operativo" />
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        textAlign="center"
        sx={{ mb: 3 }}
      >
        Mientras el día no esté abierto para una sucursal, no se pueden
        registrar pagos, créditos nuevos, aprobaciones, modificaciones ni
        adjudicaciones de esa sucursal. Los días se procesan siempre en
        orden — no se puede elegir una fecha libremente, ya que el saldo de
        intereses de cada día depende del cierre del día anterior. Generar
        el saldo del día también lo abre o lo cierra: es un solo paso.
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <BranchSelect
          size="lg"
          value={branchId}
          onChange={handleBranchChange}
          label="Seleccione sucursal"
          name="branch_id"
        />
      </FormControl>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {loadingStatus && (
        <Box sx={{ textAlign: "center", my: 3 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!loadingStatus && status && (
        <Paper
          elevation={0}
          sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E5E7EB" }}
        >
          <Stack spacing={2}>
            {status.is_backlog && (
              <Alert severity="warning" icon={<WarningAmberIcon />}>
                Esta sucursal tiene <b>{status.days_behind}</b> día(s) de
                atraso. El sistema solo permite ponerse al día procesando un
                día a la vez, en orden, empezando por el más antiguo
                pendiente.
              </Alert>
            )}

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography fontWeight={800}>
                  Día pendiente · {formatDate(status.pending_date)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isOpenAction
                    ? "Falta generar el saldo inicial y aperturar este día."
                    : "Este día está abierto — falta generar el saldo final y hacer el cierre."}
                </Typography>
              </Box>
              <Chip
                icon={isOpenAction ? <LockIcon /> : <LockOpenIcon />}
                label={isOpenAction ? "Por abrir" : "Abierto"}
                size="small"
                color={isOpenAction ? "default" : "success"}
                sx={{ fontWeight: 700 }}
              />
            </Stack>

            <Divider />

            <Box>
              <Typography fontWeight={800}>Último día cerrado</Typography>
              {status.last_closed ? (
                <Typography variant="caption" color="text.secondary">
                  {formatDate(status.last_closed.business_date)} — cerrado{" "}
                  {formatDateTime(status.last_closed.closed_at)} por{" "}
                  {status.last_closed.closed_by}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Esta sucursal aún no tiene ningún cierre registrado (será
                  su primer día operativo).
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ pt: 1 }}>
              <Button
                variant="contained"
                color={isOpenAction ? "success" : "error"}
                startIcon={isOpenAction ? <LockOpenIcon /> : <LockIcon />}
                disabled={submitting}
                onClick={startAction}
              >
                {isOpenAction
                  ? `Generar saldo inicial y aperturar ${formatDate(status.pending_date)}`
                  : `Generar saldo final y cerrar ${formatDate(status.pending_date)}`}
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadStatus}
                disabled={submitting}
              >
                Actualizar
              </Button>
            </Stack>

            {logs.length > 0 && (
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Bitácora</Typography>
                <List dense>
                  {logs.map((log, index) => (
                    <ListItem key={index} disableGutters>
                      <ListItemText primary={log} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Accordion elevation={0} sx={{ border: "1px solid #E5E7EB", "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" color="text.secondary">
                  Avanzado: aperturar/cerrar manualmente sin generar saldo
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                  Usá esto solo si ya generaste el saldo pero el día no quedó
                  abierto/cerrado automáticamente (por ejemplo, sin créditos
                  desembolsados ese día).
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={submitting}
                  onClick={() => handleManualFallback(isOpenAction ? "open" : "close")}
                >
                  {isOpenAction ? "Forzar apertura manual" : "Forzar cierre manual"}
                </Button>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </Paper>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          {isOpenAction ? "Generar saldo inicial y aperturar" : "Generar saldo final y cerrar"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isOpenAction
              ? `Generar el saldo INICIAL del día ${formatDate(status?.pending_date)} también APERTURA el día operativo de "${branchName}". A partir de ese momento se podrán registrar pagos, créditos y aprobaciones en esa sucursal para ese día. ¿Confirma la apertura?`
              : `⚠️ Generar el saldo FINAL también CIERRA el día operativo de "${branchName}" de forma DEFINITIVA e IRREVERSIBLE — no hay forma de reabrirlo desde el sistema. A partir de ese momento no se podrán registrar más pagos, créditos, aprobaciones ni desembolsos de esa sucursal para el día ${formatDate(status?.pending_date)}. Verifique antes de confirmar que ya se registró todo lo pendiente. ¿Confirma el cierre?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            color={isOpenAction ? "primary" : "error"}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? "Procesando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={regenerateOpen} onClose={() => setRegenerateOpen(false)}>
        <DialogTitle>Regenerar saldo existente</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ⚠️ Ya existe un saldo {isOpenAction ? "inicial" : "final"} generado
            para el {formatDate(status?.pending_date)} en "{branchName}".
            ¿Desea reemplazarlo y regenerarlo?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateOpen(false)} color="secondary">
            Cancelar
          </Button>
          <Button onClick={handleGenerate} color="primary" variant="contained" disabled={submitting}>
            {submitting ? "Procesando..." : "Sí, regenerar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BusinessDayPanel;
