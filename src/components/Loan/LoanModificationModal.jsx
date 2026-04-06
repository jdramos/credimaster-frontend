import React, { useEffect, useMemo, useState } from "react";
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
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Checkbox,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import API from "../../api";

const MODIFICATION_TYPES = [
  { value: "PRORROGA", label: "Prórroga" },
  { value: "REESTRUCTURACION", label: "Reestructuración" },
  { value: "REFINANCIAMIENTO", label: "Refinanciamiento" },
];

const initialForm = {
  modification_type: "PRORROGA",
  extension_months: "",
  new_amount: "",
  new_term: "",
  new_interest_rate: "",
  new_payment_frequency: "",
  first_payment_date: "",
  new_fee: "",
  new_insurance: "",
  new_other_charges: "",
  justification: "",

  payment_capacity_verified: false,
  external_temporary_cause: false,
  no_fund_diversion_verified: false,
  no_contract_breach_verified: false,
  no_technical_noncompliance_verified: false,

  payment_capacity_deteriorated: false,
  risk_analysis_done: false,
  guarantee_coverage_maintained: false,
  recovery_position_improved: false,
  safe_payment_source: false,
  pending_interest_paid_cash: false,
  secure_source_coverage_percent: "",
  principal_paid_percent: "",
};

function statusColor(status) {
  switch ((status || "").toUpperCase()) {
    case "PENDING":
      return "warning";
    case "IN_REVIEW":
      return "info";
    case "APPROVED":
      return "success";
    case "APPLIED":
      return "success";
    case "REJECTED":
      return "error";
    default:
      return "default";
  }
}

export default function LoanModificationModal({
  open,
  onClose,
  loan,
  user,
  selectedModification = null,
  mode = "create", // create | review
  onSaved,
}) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [approvals, setApprovals] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isCreate = mode === "create";
  const isReview = mode === "review";

  useEffect(() => {
    if (!open) return;

    setError("");
    setSuccess("");

    if (isCreate) {
      setForm({
        ...initialForm,
        modification_type: "PRORROGA",
        new_payment_frequency: loan?.frequency || "",
        new_amount: loan?.current_balance || loan?.amount || "",
        new_term: loan?.term || "",
        new_interest_rate: loan?.interest_rate || "",
        new_fee: loan?.fee || "",
        new_insurance: loan?.insurance || "",
        new_other_charges: loan?.other_charges || "",
      });
      setApprovals([]);
      return;
    }

    if (isReview && selectedModification) {
      setForm((prev) => ({
        ...prev,
        ...selectedModification,
      }));
      fetchApprovals(selectedModification.id);
    }
  }, [open, isCreate, isReview, selectedModification, loan]);

  const myApproval = useMemo(() => {
    if (!user?.id) return null;
    return (
      approvals.find((a) => Number(a.approver_id) === Number(user.id)) || null
    );
  }, [approvals, user]);

  const canApprove = useMemo(() => {
    if (!selectedModification || !myApproval) return false;
    const status = String(selectedModification.status || "").toUpperCase();
    const myStatus = String(myApproval.status || "").toUpperCase();
    return !["REJECTED", "APPLIED"].includes(status) && myStatus === "PENDING";
  }, [selectedModification, myApproval]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleCheck = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.checked,
    }));
  };

  const fetchApprovals = async (modificationId) => {
    try {
      setLoadingApprovals(true);
      const res = await API.get(
        `/api/loan-modifications/${modificationId}/approvals`,
      );
      setApprovals(res.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Error cargando aprobaciones.");
    } finally {
      setLoadingApprovals(false);
    }
  };

  const validateForm = () => {
    if (!form.modification_type) {
      return "Debe seleccionar el tipo de modificación.";
    }

    if (!form.first_payment_date) {
      return "Debe indicar la fecha de la primera cuota.";
    }

    if (!form.justification?.trim()) {
      return "Debe indicar una justificación.";
    }

    if (form.modification_type === "PRORROGA") {
      if (!form.extension_months || Number(form.extension_months) <= 0) {
        return "Debe indicar los meses de prórroga.";
      }
      if (!form.payment_capacity_verified)
        return "Debe verificar capacidad de pago.";
      if (!form.external_temporary_cause)
        return "Debe marcar causa externa transitoria.";
      if (!form.no_fund_diversion_verified)
        return "Debe confirmar no desviación de fondos.";
      if (!form.no_contract_breach_verified)
        return "Debe confirmar no incumplimiento contractual.";
      if (!form.no_technical_noncompliance_verified) {
        return "Debe confirmar no incumplimiento de orientaciones técnicas.";
      }
    }

    if (form.modification_type === "REESTRUCTURACION") {
      if (!form.new_term) return "Debe indicar el nuevo plazo.";
      if (!form.new_interest_rate) return "Debe indicar la nueva tasa.";
      if (!form.payment_capacity_deteriorated) {
        return "Debe marcar deterioro de capacidad de pago.";
      }
      if (!form.risk_analysis_done) {
        return "Debe marcar análisis de riesgo realizado.";
      }
      if (!form.payment_capacity_verified) {
        return "Debe verificar capacidad de pago.";
      }
    }

    if (form.modification_type === "REFINANCIAMIENTO") {
      if (!form.new_term) return "Debe indicar el nuevo plazo.";
      if (!form.new_interest_rate) return "Debe indicar la nueva tasa.";
    }

    return "";
  };

  const handleSave = async () => {
    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        modification_type: form.modification_type,
        extension_months: form.extension_months || null,
        new_amount: form.new_amount || null,
        new_term: form.new_term || null,
        new_interest_rate: form.new_interest_rate || null,
        new_payment_frequency: form.new_payment_frequency || null,
        first_payment_date: form.first_payment_date || null,
        new_fee: form.new_fee || null,
        new_insurance: form.new_insurance || null,
        new_other_charges: form.new_other_charges || null,
        justification: form.justification,

        payment_capacity_verified: form.payment_capacity_verified,
        external_temporary_cause: form.external_temporary_cause,
        no_fund_diversion_verified: form.no_fund_diversion_verified,
        no_contract_breach_verified: form.no_contract_breach_verified,
        no_technical_noncompliance_verified:
          form.no_technical_noncompliance_verified,

        payment_capacity_deteriorated: form.payment_capacity_deteriorated,
        risk_analysis_done: form.risk_analysis_done,
        guarantee_coverage_maintained: form.guarantee_coverage_maintained,
        recovery_position_improved: form.recovery_position_improved,
        safe_payment_source: form.safe_payment_source,
        pending_interest_paid_cash: form.pending_interest_paid_cash,
        secure_source_coverage_percent:
          form.secure_source_coverage_percent || null,
        principal_paid_percent: form.principal_paid_percent || null,
      };

      const res = await API.post(`/api/loan-modifications/${loan.id}`, payload);

      setSuccess(res.data?.message || "Solicitud creada correctamente.");
      if (onSaved) onSaved();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Error creando la modificación.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await API.post(
        `/api/loan-modifications/${selectedModification.id}/approve`,
        { comments: "Aprobado desde interfaz" },
      );

      setSuccess(res.data?.message || "Aprobación registrada.");
      await fetchApprovals(selectedModification.id);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Error aprobando modificación.");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt("Escriba el motivo del rechazo:");
    if (!reason) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await API.post(
        `/api/loan-modifications/${selectedModification.id}/reject`,
        { comments: reason },
      );

      setSuccess(res.data?.message || "Rechazo registrado.");
      await fetchApprovals(selectedModification.id);
      if (onSaved) onSaved();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Error rechazando modificación.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderChecksProrroga = () => (
    <Grid container spacing={1}>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!form.payment_capacity_verified}
              onChange={handleCheck("payment_capacity_verified")}
            />
          }
          label="Capacidad de pago verificada"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!form.external_temporary_cause}
              onChange={handleCheck("external_temporary_cause")}
            />
          }
          label="Causa externa transitoria"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!form.no_fund_diversion_verified}
              onChange={handleCheck("no_fund_diversion_verified")}
            />
          }
          label="Sin desviación de fondos"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!form.no_contract_breach_verified}
              onChange={handleCheck("no_contract_breach_verified")}
            />
          }
          label="Sin incumplimiento contractual"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!form.no_technical_noncompliance_verified}
              onChange={handleCheck("no_technical_noncompliance_verified")}
            />
          }
          label="Sin incumplimiento técnico"
        />
      </Grid>
    </Grid>
  );

  const renderChecksReestructuracion = () => (
    <Grid container spacing={1}>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!form.payment_capacity_deteriorated}
              onChange={handleCheck("payment_capacity_deteriorated")}
            />
          }
          label="Deterioro de capacidad de pago"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!form.risk_analysis_done}
              onChange={handleCheck("risk_analysis_done")}
            />
          }
          label="Análisis de riesgo realizado"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!form.payment_capacity_verified}
              onChange={handleCheck("payment_capacity_verified")}
            />
          }
          label="Capacidad de pago verificada"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!form.no_fund_diversion_verified}
              onChange={handleCheck("no_fund_diversion_verified")}
            />
          }
          label="Sin desviación de fondos"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!form.guarantee_coverage_maintained}
              onChange={handleCheck("guarantee_coverage_maintained")}
            />
          }
          label="Cobertura de garantía mantenida"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!form.recovery_position_improved}
              onChange={handleCheck("recovery_position_improved")}
            />
          }
          label="Posición de recuperación mejorada"
        />
      </Grid>
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {isCreate
          ? "Nueva modificación de crédito"
          : "Revisión de modificación"}
      </DialogTitle>

      <DialogContent dividers>
        {!!error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!!success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Crédito: ${loan?.credit_code || loan?.id || ""}`}
              color="primary"
            />
            <Chip
              label={`Saldo: ${loan?.current_balance || 0}`}
              variant="outlined"
            />
            <Chip label={`Plazo: ${loan?.term || 0}`} variant="outlined" />
            <Chip
              label={`Tasa: ${loan?.interest_rate || 0}`}
              variant="outlined"
            />
            <Chip
              label={`Frecuencia: ${loan?.frequency || ""}`}
              variant="outlined"
            />
            {selectedModification?.status && (
              <Chip
                label={`Estado: ${selectedModification.status}`}
                color={statusColor(selectedModification.status)}
              />
            )}
          </Stack>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Tipo de modificación"
              value={form.modification_type || ""}
              onChange={handleChange("modification_type")}
              disabled={!isCreate}
            >
              {MODIFICATION_TYPES.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Primera cuota"
              value={form.first_payment_date || ""}
              onChange={handleChange("first_payment_date")}
              InputLabelProps={{ shrink: true }}
              disabled={!isCreate}
            />
          </Grid>

          {form.modification_type === "PRORROGA" ? (
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Meses de prórroga"
                value={form.extension_months || ""}
                onChange={handleChange("extension_months")}
                disabled={!isCreate}
              />
            </Grid>
          ) : (
            <>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Nuevo monto"
                  value={form.new_amount || ""}
                  onChange={handleChange("new_amount")}
                  disabled={!isCreate}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Nuevo plazo"
                  value={form.new_term || ""}
                  onChange={handleChange("new_term")}
                  disabled={!isCreate}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Nueva tasa"
                  value={form.new_interest_rate || ""}
                  onChange={handleChange("new_interest_rate")}
                  disabled={!isCreate}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Nueva frecuencia"
                  value={form.new_payment_frequency || ""}
                  onChange={handleChange("new_payment_frequency")}
                  disabled={!isCreate}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Nuevo cargo administrativo"
              value={form.new_fee || ""}
              onChange={handleChange("new_fee")}
              disabled={!isCreate}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Nuevo seguro"
              value={form.new_insurance || ""}
              onChange={handleChange("new_insurance")}
              disabled={!isCreate}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Otros cargos"
              value={form.new_other_charges || ""}
              onChange={handleChange("new_other_charges")}
              disabled={!isCreate}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Justificación"
              value={form.justification || ""}
              onChange={handleChange("justification")}
              disabled={!isCreate}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
          Validaciones normativas
        </Typography>

        {form.modification_type === "PRORROGA" && renderChecksProrroga()}
        {form.modification_type === "REESTRUCTURACION" &&
          renderChecksReestructuracion()}
        {form.modification_type === "REFINANCIAMIENTO" && (
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!form.safe_payment_source}
                    onChange={handleCheck("safe_payment_source")}
                  />
                }
                label="Fuente de pago segura"
              />
            </Grid>
          </Grid>
        )}

        {isReview && (
          <>
            <Divider sx={{ my: 2 }} />

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <HistoryOutlinedIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Aprobaciones
              </Typography>
            </Stack>

            {loadingApprovals ? (
              <Box sx={{ py: 3, textAlign: "center" }}>
                <CircularProgress size={26} />
              </Box>
            ) : (
              <Stack spacing={1}>
                {approvals.map((a) => (
                  <Paper
                    key={a.id}
                    variant="outlined"
                    sx={{ p: 1.5, borderRadius: 2 }}
                  >
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1}
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Aprobador #{a.approver_id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Nivel: {a.approval_level} | Tipo: {a.approval_type}
                        </Typography>
                      </Box>
                      <Chip
                        label={a.status}
                        color={statusColor(a.status)}
                        size="small"
                      />
                    </Stack>
                    {a.comment ? (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {a.comment}
                      </Typography>
                    ) : null}
                  </Paper>
                ))}
              </Stack>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>

        {isCreate && (
          <Button
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar solicitud"}
          </Button>
        )}

        {isReview && canApprove && (
          <>
            <Button
              color="error"
              variant="outlined"
              startIcon={<CancelOutlinedIcon />}
              onClick={handleReject}
              disabled={saving}
            >
              Rechazar
            </Button>
            <Button
              color="success"
              variant="contained"
              startIcon={<CheckCircleOutlineIcon />}
              onClick={handleApprove}
              disabled={saving}
            >
              Aprobar
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
