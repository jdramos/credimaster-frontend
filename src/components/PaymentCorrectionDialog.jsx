import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CustomerSelect from "./Customer/CustomerSelect";
import API from "../api";

const money = (value) =>
  Number(value || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Corrige un pago grabado contra el cliente equivocado: anula el pago
// original y ajusta el interés de ambos créditos (cobra de más al crédito
// equivocado, acredita de más al crédito correcto) por los días transcurridos
// desde el pago hasta hoy. Ver api/payment/PaymentController.js:
// previewMisappliedCorrection / applyMisappliedCorrection.
const PaymentCorrectionDialog = ({ open, payment, onClose, onSuccess }) => {
  const [clientId, setClientId] = useState("");
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [correctLoanId, setCorrectLoanId] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error",
  });

  useEffect(() => {
    if (open) {
      setClientId("");
      setLoans([]);
      setCorrectLoanId("");
      setPreview(null);
    }
  }, [open, payment]);

  const handleClientChange = async (e) => {
    const newClientId = e?.target?.value || "";
    setClientId(newClientId);
    setCorrectLoanId("");
    setPreview(null);
    setLoans([]);

    if (!newClientId) return;

    try {
      setLoansLoading(true);
      const res = await API.get(`/api/payments/customer-loans/${newClientId}`);
      const validLoans = (res.data || []).filter((l) => Number(l.id) > 0);
      setLoans(validLoans);
    } catch (err) {
      console.error("Error loading loans", err);
      setSnackbar({
        open: true,
        message: "Error al cargar créditos del cliente",
        severity: "error",
      });
    } finally {
      setLoansLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!correctLoanId || !payment) return;

    try {
      setPreviewLoading(true);
      setPreview(null);
      const res = await API.post(
        `/api/payments/${payment.id}/correction/preview`,
        { correct_loan_id: correctLoanId },
      );
      setPreview(res.data);
    } catch (err) {
      console.error("Error previewing correction", err);
      setSnackbar({
        open: true,
        message:
          err.response?.data?.error ||
          "Error al calcular la corrección",
        severity: "error",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    if (!correctLoanId || !payment) return;

    try {
      setApplying(true);
      const res = await API.post(
        `/api/payments/${payment.id}/correction/apply`,
        { correct_loan_id: correctLoanId },
      );
      setSnackbar({
        open: true,
        message: res.data?.message || "Corrección aplicada correctamente",
        severity: "success",
      });
      onSuccess?.(res.data);
    } catch (err) {
      console.error("Error applying correction", err);
      setSnackbar({
        open: true,
        message:
          err.response?.data?.error || "Error al aplicar la corrección",
        severity: "error",
      });
    } finally {
      setApplying(false);
    }
  };

  if (!payment) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Corrección de pago mal aplicado</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="warning" icon={<WarningAmberIcon />}>
              Este proceso <strong>anulará el pago #{payment.id}</strong> (C${" "}
              {money(payment.principal_payment)} aplicado el{" "}
              {payment.payment_date} al crédito{" "}
              {payment.credit_code ?? payment.loan_id}) y ajustará el interés
              de ambos créditos por los días transcurridos. Debe registrar el
              pago correcto en el crédito indicado abajo una vez confirmada la
              corrección.
            </Alert>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Cliente y crédito correcto (al que debió aplicarse el pago)
              </Typography>
              <Stack spacing={1.5}>
                <CustomerSelect
                  name="correct_client_id"
                  label="Cliente correcto"
                  value={clientId}
                  onChange={handleClientChange}
                />
                <TextField
                  select
                  label="Crédito correcto"
                  value={correctLoanId}
                  onChange={(e) => {
                    setCorrectLoanId(e.target.value);
                    setPreview(null);
                  }}
                  disabled={!clientId || loansLoading}
                  size="small"
                  fullWidth
                >
                  {loans.map((l) => (
                    <MenuItem key={l.id} value={l.id}>
                      {`Crédito #${l.id}`} — Saldo C${" "}
                      {money(l.current_balance)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Box>

            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={handlePreview}
                disabled={!correctLoanId || previewLoading}
              >
                {previewLoading ? (
                  <CircularProgress size={18} />
                ) : (
                  "Calcular corrección"
                )}
              </Button>
            </Stack>

            {preview && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Resultado del cálculo ({preview.gap_days} día
                    {preview.gap_days === 1 ? "" : "s"} transcurridos)
                  </Typography>
                  <Stack spacing={1}>
                    <Alert severity="error" variant="outlined">
                      Crédito equivocado #{preview.wrong_loan.id} (
                      {preview.wrong_loan.customer_name}): se le cargará{" "}
                      <strong>C$ {money(preview.wrong_loan.charge_amount)}</strong>{" "}
                      de interés adicional (su capital estuvo de más durante
                      los días del error).
                    </Alert>
                    <Alert severity="success" variant="outlined">
                      Crédito correcto #{preview.correct_loan.id} (
                      {preview.correct_loan.customer_name}): se le acreditará{" "}
                      <strong>C$ {money(preview.correct_loan.credit_amount)}</strong>{" "}
                      de interés (su capital estuvo de menos durante los días
                      del error).
                    </Alert>
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={applying}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={handleApply}
            disabled={!preview || applying}
          >
            {applying ? (
              <CircularProgress size={18} sx={{ color: "#fff" }} />
            ) : (
              "Confirmar corrección"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PaymentCorrectionDialog;
