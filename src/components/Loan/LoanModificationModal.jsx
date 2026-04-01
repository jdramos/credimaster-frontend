import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";

const API_URL = process.env.REACT_APP_API_BASE_URL;
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

const MODIFICATION_TYPES = [
  { value: "PRORROGA", label: "Prórroga" },
  { value: "REFINANCIAMIENTO", label: "Refinanciamiento" },
  { value: "REESTRUCTURACION", label: "Reestructuración" },
];

const initialForm = {
  modification_type: "",
  new_amount: "",
  new_term: "",
  new_interest_rate: "",
  new_payment_frequency: "",
  extension_months: "",
  payment_capacity_verified: false,
  external_temporary_cause: false,
  no_fund_diversion_verified: false,
  no_contract_breach_verified: false,
  no_technical_noncompliance_verified: false,
  risk_analysis_done: false,
  guarantee_coverage_maintained: false,
  recovery_position_improved: false,
  payment_capacity_deteriorated: false,
  pending_interest_paid_cash: false,
  safe_payment_source: false,
  secure_source_coverage_percent: "",
  principal_paid_percent: "",
  first_payment_date: "",
  justification: "",
  approval_comments: "",
};

const normalizeLoanResponse = (resp) => {
  if (Array.isArray(resp?.data)) return resp.data[0] || null;
  return resp?.data || null;
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export default function LoanModificationModal({
  open,
  onClose,
  loan,
  onSuccess,
}) {
  const [loadingLoan, setLoadingLoan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullLoan, setFullLoan] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedType = form.modification_type;

  const currentLoan = fullLoan || loan;

  useEffect(() => {
    if (!open || !loan?.id) return;

    const loadLoan = async () => {
      try {
        setLoadingLoan(true);
        setError("");
        setSuccessMessage("");

        const resp = await axios.get(`${API_URL}/api/loans/${loan.id}`, {
          headers,
        });

        const loanData = normalizeLoanResponse(resp);
        setFullLoan(loanData || loan);

        setForm({
          ...initialForm,
          modification_type: "",
          new_amount: loanData?.approved_amount ?? loanData?.amount ?? "",
          new_term: loanData?.approved_term ?? loanData?.term ?? "",
          new_interest_rate:
            loanData?.approved_rate ?? loanData?.interest_rate ?? "",
          new_payment_frequency: loanData?.frequency ?? "",
          first_payment_date: dayjs().format("YYYY-MM-DD"),
        });
      } catch (err) {
        console.error("Error cargando crédito para modificación:", err);
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            "No se pudo cargar el crédito.",
        );
        setFullLoan(loan);
      } finally {
        setLoadingLoan(false);
      }
    };

    loadLoan();
  }, [open, loan]);

  const canModify = useMemo(() => {
    if (!currentLoan) return false;

    const status = String(currentLoan.status || "").toUpperCase();
    const isDisbursed =
      String(currentLoan.disbursed || "").toUpperCase() === "Y" ||
      status === "DISBURSED";

    return isDisbursed;
  }, [currentLoan]);

  const title = useMemo(() => {
    if (!selectedType) return "Aplicar modificación normativa";
    const found = MODIFICATION_TYPES.find((x) => x.value === selectedType);
    return found ? found.label : "Aplicar modificación normativa";
  }, [selectedType]);

  const handleChange = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetAndClose = () => {
    setForm(initialForm);
    setFullLoan(null);
    setError("");
    setSuccessMessage("");
    onClose?.();
  };

  const validateForm = () => {
    if (!currentLoan?.id) {
      throw new Error("No se encontró el crédito.");
    }

    if (!canModify) {
      throw new Error(
        "Solo se permiten modificaciones normativas sobre créditos desembolsados.",
      );
    }

    if (!selectedType) {
      throw new Error("Debe seleccionar el tipo de modificación.");
    }

    if (!form.justification?.trim()) {
      throw new Error("Debe ingresar una justificación.");
    }

    if (selectedType === "PRORROGA") {
      const extensionMonths = toNumber(form.extension_months);

      if (extensionMonths <= 0) {
        throw new Error("Debe indicar los meses de prórroga.");
      }

      if (extensionMonths > 6) {
        throw new Error("La prórroga no puede exceder 6 meses.");
      }

      if (!form.payment_capacity_verified) {
        throw new Error("Debe verificar la capacidad de pago.");
      }

      if (!form.external_temporary_cause) {
        throw new Error("Debe existir causa externa transitoria.");
      }

      if (!form.no_fund_diversion_verified) {
        throw new Error("Debe confirmar que no hubo desviación de fondos.");
      }

      if (!form.no_contract_breach_verified) {
        throw new Error(
          "Debe confirmar que no hubo incumplimiento contractual.",
        );
      }

      if (!form.no_technical_noncompliance_verified) {
        throw new Error(
          "Debe confirmar que no hubo incumplimiento de orientaciones técnicas.",
        );
      }
    }

    if (selectedType === "REFINANCIAMIENTO") {
      if (toNumber(form.new_amount) <= 0) {
        throw new Error("Debe ingresar el nuevo monto.");
      }

      if (toNumber(form.new_term) <= 0) {
        throw new Error("Debe ingresar el nuevo plazo.");
      }

      if (toNumber(form.new_interest_rate) <= 0) {
        throw new Error("Debe ingresar la nueva tasa.");
      }

      if (form.payment_capacity_deteriorated) {
        throw new Error(
          "Si existe deterioro de capacidad de pago, corresponde reestructuración.",
        );
      }
    }

    if (selectedType === "REESTRUCTURACION") {
      if (toNumber(form.new_amount) <= 0) {
        throw new Error("Debe ingresar el nuevo monto.");
      }

      if (toNumber(form.new_term) <= 0) {
        throw new Error("Debe ingresar el nuevo plazo.");
      }

      if (toNumber(form.new_interest_rate) <= 0) {
        throw new Error("Debe ingresar la nueva tasa.");
      }

      if (!form.payment_capacity_deteriorated) {
        throw new Error(
          "La reestructuración requiere deterioro de capacidad de pago.",
        );
      }

      if (!form.risk_analysis_done) {
        throw new Error("Debe indicar que existe análisis previo.");
      }

      if (!form.payment_capacity_verified) {
        throw new Error(
          "Debe demostrar capacidad de pago bajo las nuevas condiciones.",
        );
      }

      if (!form.no_fund_diversion_verified) {
        throw new Error("Debe confirmar que no hubo desviación de fondos.");
      }

      if (
        !form.guarantee_coverage_maintained &&
        !form.recovery_position_improved
      ) {
        throw new Error(
          "Debe mantenerse/mejorarse la cobertura de garantía o mejorar la recuperación.",
        );
      }
    }
  };

  const buildPayload = () => {
    const base = {
      loan_id: currentLoan.id,
      modification_type: form.modification_type,
      new_amount:
        selectedType === "PRORROGA"
          ? toNumber(currentLoan.approved_amount || currentLoan.amount)
          : toNumber(form.new_amount),
      new_term:
        selectedType === "PRORROGA"
          ? toNumber(currentLoan.approved_term || currentLoan.term) +
            toNumber(form.extension_months)
          : toNumber(form.new_term),
      new_interest_rate:
        selectedType === "PRORROGA"
          ? toNumber(currentLoan.approved_rate || currentLoan.interest_rate)
          : toNumber(form.new_interest_rate),
      new_payment_frequency:
        selectedType === "PRORROGA"
          ? currentLoan.frequency
          : form.new_payment_frequency || currentLoan.frequency,
      extension_months:
        selectedType === "PRORROGA" ? toNumber(form.extension_months) : null,
      payment_capacity_verified: form.payment_capacity_verified,
      external_temporary_cause: form.external_temporary_cause,
      no_fund_diversion_verified: form.no_fund_diversion_verified,
      no_contract_breach_verified: form.no_contract_breach_verified,
      no_technical_noncompliance_verified:
        form.no_technical_noncompliance_verified,
      risk_analysis_done: form.risk_analysis_done,
      guarantee_coverage_maintained: form.guarantee_coverage_maintained,
      recovery_position_improved: form.recovery_position_improved,
      payment_capacity_deteriorated: form.payment_capacity_deteriorated,
      pending_interest_paid_cash: form.pending_interest_paid_cash,
      safe_payment_source: form.safe_payment_source,
      secure_source_coverage_percent:
        form.secure_source_coverage_percent === ""
          ? null
          : toNumber(form.secure_source_coverage_percent),
      principal_paid_percent:
        form.principal_paid_percent === ""
          ? null
          : toNumber(form.principal_paid_percent),
      first_payment_date: form.first_payment_date || null,
      justification: form.justification?.trim(),
      approval_comments: form.approval_comments?.trim() || null,
    };

    return base;
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      validateForm();

      const payload = buildPayload();

      const resp = await axios.post(
        `${API_URL}/api/loan-modifications/${currentLoan.id}`,
        payload,
        { headers },
      );

      const msg =
        resp?.data?.message || "Modificación normativa aplicada correctamente.";

      setSuccessMessage(msg);
      onSuccess?.(resp?.data);
      resetAndClose();
    } catch (err) {
      console.error("Error guardando modificación:", err);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err.message ||
          "No se pudo guardar la modificación.",
      );
    } finally {
      setSaving(false);
    }
  };

  const amountBase = toNumber(
    currentLoan?.approved_amount || currentLoan?.amount || 0,
  );
  const termBase = toNumber(
    currentLoan?.approved_term || currentLoan?.term || 0,
  );
  const rateBase = toNumber(
    currentLoan?.approved_rate || currentLoan?.interest_rate || 0,
  );

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : resetAndClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AutorenewIcon color="warning" />
        {title}
      </DialogTitle>

      <DialogContent dividers>
        {loadingLoan ? (
          <Box py={5} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {successMessage ? (
              <Alert severity="success">{successMessage}</Alert>
            ) : null}

            <Alert severity="info">
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <strong>Crédito:</strong> #{currentLoan?.id}
                </Typography>
                <Typography variant="body2">
                  <strong>Cliente:</strong>{" "}
                  {currentLoan?.customer_name ||
                    currentLoan?.customer_identification ||
                    "N/A"}
                </Typography>
                <Typography variant="body2">
                  <strong>Estado:</strong> {currentLoan?.status || "N/A"}
                </Typography>
                <Typography variant="body2">
                  <strong>Desembolsado:</strong>{" "}
                  {String(currentLoan?.disbursed || "").toUpperCase() === "Y"
                    ? "Sí"
                    : "No"}
                </Typography>
              </Stack>
            </Alert>

            {!canModify && (
              <Alert severity="warning">
                Solo se permiten prórrogas, refinanciamientos o
                reestructuraciones en créditos desembolsados.
              </Alert>
            )}

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
              }}
            >
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`Monto base: C$ ${amountBase.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                />
                <Chip label={`Plazo base: ${termBase}`} />
                <Chip label={`Tasa base: ${rateBase}%`} />
                <Chip
                  label={`Frecuencia: ${currentLoan?.frequency || "N/A"}`}
                />
              </Stack>
            </Box>

            <TextField
              select
              fullWidth
              label="Tipo de modificación"
              value={form.modification_type}
              onChange={handleChange("modification_type")}
              disabled={!canModify || saving}
            >
              {MODIFICATION_TYPES.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>

            {!!selectedType && (
              <>
                <Divider />

                {selectedType === "PRORROGA" && (
                  <Stack spacing={2}>
                    <Alert severity="warning">
                      La prórroga solo permite ampliar plazo, sin modificar
                      monto, tasa ni otras condiciones distintas del plazo.
                    </Alert>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Meses de prórroga"
                          value={form.extension_months}
                          onChange={handleChange("extension_months")}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Monto resultante"
                          value={`C$ ${amountBase.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          label="Desde"
                          value={form.first_payment_date}
                          onChange={(newValue) => {
                            setForm((prev) => ({
                              ...prev,
                              first_payment_date: newValue,
                            }));
                          }}
                          renderInput={(params) => (
                            <TextField {...params} size="small" />
                          )}
                        />

                        <DatePicker
                          label="Hasta"
                          value={form.last_payment_date}
                          onChange={(newValue) => {
                            setForm((prev) => ({
                              ...prev,
                              last_payment_date: newValue,
                            }));
                          }}
                          renderInput={(params) => (
                            <TextField {...params} size="small" />
                          )}
                        />
                      </LocalizationProvider>
                    </Grid>

                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Condiciones normativas obligatorias
                    </Typography>

                    <Grid container spacing={1}>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.payment_capacity_verified}
                              onChange={handleChange(
                                "payment_capacity_verified",
                              )}
                            />
                          }
                          label="Capacidad de pago verificada"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.external_temporary_cause}
                              onChange={handleChange(
                                "external_temporary_cause",
                              )}
                            />
                          }
                          label="Causa externa transitoria"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.no_fund_diversion_verified}
                              onChange={handleChange(
                                "no_fund_diversion_verified",
                              )}
                            />
                          }
                          label="Sin desviación de fondos"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.no_contract_breach_verified}
                              onChange={handleChange(
                                "no_contract_breach_verified",
                              )}
                            />
                          }
                          label="Sin incumplimiento contractual"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.no_technical_noncompliance_verified}
                              onChange={handleChange(
                                "no_technical_noncompliance_verified",
                              )}
                            />
                          }
                          label="Sin incumplimiento de orientaciones técnicas"
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                )}

                {selectedType === "REFINANCIAMIENTO" && (
                  <Stack spacing={2}>
                    <Alert severity="info">
                      Aplica cuando cambian condiciones, sin deterioro en la
                      capacidad de pago.
                    </Alert>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Nuevo monto"
                          value={form.new_amount}
                          onChange={handleChange("new_amount")}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Nuevo plazo"
                          value={form.new_term}
                          onChange={handleChange("new_term")}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Nueva tasa"
                          value={form.new_interest_rate}
                          onChange={handleChange("new_interest_rate")}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Nueva frecuencia"
                          value={form.new_payment_frequency}
                          onChange={handleChange("new_payment_frequency")}
                        />
                      </Grid>
                    </Grid>

                    <Grid container spacing={1}>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.payment_capacity_verified}
                              onChange={handleChange(
                                "payment_capacity_verified",
                              )}
                            />
                          }
                          label="Capacidad de pago verificada"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.payment_capacity_deteriorated}
                              onChange={handleChange(
                                "payment_capacity_deteriorated",
                              )}
                            />
                          }
                          label="Existe deterioro de capacidad de pago"
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                )}

                {selectedType === "REESTRUCTURACION" && (
                  <Stack spacing={2}>
                    <Alert severity="warning">
                      Requiere deterioro en la capacidad de pago y análisis
                      previo.
                    </Alert>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Nuevo monto"
                          value={form.new_amount}
                          onChange={handleChange("new_amount")}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Nuevo plazo"
                          value={form.new_term}
                          onChange={handleChange("new_term")}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Nueva tasa"
                          value={form.new_interest_rate}
                          onChange={handleChange("new_interest_rate")}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Nueva frecuencia"
                          value={form.new_payment_frequency}
                          onChange={handleChange("new_payment_frequency")}
                        />
                      </Grid>
                    </Grid>

                    <Grid container spacing={1}>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.payment_capacity_deteriorated}
                              onChange={handleChange(
                                "payment_capacity_deteriorated",
                              )}
                            />
                          }
                          label="Deterioro de capacidad de pago"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.risk_analysis_done}
                              onChange={handleChange("risk_analysis_done")}
                            />
                          }
                          label="Análisis previo realizado"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.payment_capacity_verified}
                              onChange={handleChange(
                                "payment_capacity_verified",
                              )}
                            />
                          }
                          label="Capacidad de pago verificada"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.no_fund_diversion_verified}
                              onChange={handleChange(
                                "no_fund_diversion_verified",
                              )}
                            />
                          }
                          label="Sin desviación de fondos"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.guarantee_coverage_maintained}
                              onChange={handleChange(
                                "guarantee_coverage_maintained",
                              )}
                            />
                          }
                          label="Se mantiene o mejora cobertura"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.recovery_position_improved}
                              onChange={handleChange(
                                "recovery_position_improved",
                              )}
                            />
                          }
                          label="Mejora posición de recuperación"
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                )}

                <Divider />

                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Justificación"
                  value={form.justification}
                  onChange={handleChange("justification")}
                />

                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Comentarios adicionales"
                  value={form.approval_comments}
                  onChange={handleChange("approval_comments")}
                />
              </>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={resetAndClose} disabled={saving}>
          Cerrar
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleSubmit}
          disabled={!canModify || !selectedType || saving || loadingLoan}
        >
          {saving ? "Guardando..." : "Aplicar modificación"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
