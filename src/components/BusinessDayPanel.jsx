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
} from "@mui/material";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import BranchSelect from "./BranchSelect";
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

const BusinessDayPanel = () => {
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");

  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
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
  };

  const handleConfirmAction = async () => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const endpoint =
        status.pending_action === "OPEN"
          ? "/api/business-day/open"
          : "/api/business-day/close";

      const { data } = await API.post(endpoint, { branch_id: branchId });

      setSuccess(data?.message || "Operación realizada correctamente.");
      await loadStatus();
    } catch (err) {
      setError(
        err.response?.data?.message || "No se pudo completar la operación.",
      );
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const isOpenAction = status?.pending_action === "OPEN";

  return (
    <Box sx={{ width: "100%", maxWidth: 700, margin: "auto", mt: 5 }}>
      <Typography variant="h5" gutterBottom textAlign="center">
        Apertura y Cierre del Día
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
        intereses de cada día depende del cierre del día anterior.
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
                    ? "Falta aperturar este día."
                    : "Este día está abierto — falta hacer el cierre final."}
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
              {isOpenAction ? (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<LockOpenIcon />}
                  disabled={submitting}
                  onClick={() => setConfirmOpen(true)}
                >
                  Aperturar día {formatDate(status.pending_date)}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<LockIcon />}
                  disabled={submitting}
                  onClick={() => setConfirmOpen(true)}
                >
                  Cierre final {formatDate(status.pending_date)}
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadStatus}
                disabled={submitting}
              >
                Actualizar
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          {isOpenAction ? "Aperturar día" : "Confirmar cierre final"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isOpenAction
              ? `¿Confirma la apertura del día ${formatDate(status?.pending_date)} para la sucursal "${branchName}"? A partir de este momento se podrán registrar pagos, créditos y aprobaciones en esa sucursal para ese día.`
              : `⚠️ El cierre final es DEFINITIVO y no se puede deshacer. Una vez cerrado, no se podrá volver a operar el día ${formatDate(status?.pending_date)} en la sucursal "${branchName}". ¿Confirma el cierre final?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmAction}
            color={isOpenAction ? "primary" : "error"}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? "Procesando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BusinessDayPanel;
