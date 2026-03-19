import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, CircularProgress,
  Grid, Box, Typography, Snackbar, Alert
} from "@mui/material";

import dayjs from "dayjs";
import API from "../api";
import CustomerSelect from "./Customer/CustomerSelect";
import { NumericFormat } from "react-number-format";
import BranchSelect from "./BranchSelect";
import LoanInfo from "./LoanInfo";

const PaymentForm = ({
  open,
  onClose,
  onSuccess,
  initialLoan = null,
  readOnlyLoan = false,
}) => {
  const [clients, setClients] = useState([]);
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  const [form, setForm] = useState({
    client_id: "",
    loan_id: "",
    branch_id: "",
    payment_date: dayjs().format("YYYY-MM-DD"),
    payment_amount: 0,
    payment_type: "all",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "error" });

  useEffect(() => {
    if (open) {
      setInitialLoading(true);
      fetchClients();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (open && initialLoan) {
      preloadLoan(initialLoan);
    }
  }, [open, initialLoan]);

  const resetForm = () => {
    setForm({
      client_id: "",
      loan_id: "",
      branch_id: "",
      payment_date: dayjs().format("YYYY-MM-DD"),
      payment_amount: 0,
      payment_type: "all",
    });
    setSelectedClient(null);
    setSelectedLoan(null);
    setErrors({});
    setLoans([]);
  };

  const fetchClients = async () => {
    try {
      const res = await API.get("/api/customers");
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setClients(data);
    } catch (err) {
      console.error("Error loading clients", err);
      setSnackbar({ open: true, message: "Error al cargar clientes", severity: "error" });
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchLoans = async (clientId, preselectLoanId = null) => {
    try {
      const res = await API.get(`/api/loans/customer/${clientId}`);
      const validLoans = (res.data || []).filter((l) => l.id > 0);
      setLoans(validLoans);

      if (preselectLoanId) {
        const loan = validLoans.find((l) => Number(l.id) === Number(preselectLoanId));
        if (loan) {
          setSelectedLoan(loan);
          setForm((prev) => ({
            ...prev,
            loan_id: loan.id,
            branch_id: loan.branch_id || prev.branch_id || "",
          }));
        }
      }
    } catch (err) {
      console.error("Error loading loans", err);
      setSnackbar({ open: true, message: "Error al cargar créditos", severity: "error" });
    }
  };

  const preloadLoan = async (loan) => {
    const clientId =
      loan.customer_identification ||
      loan.client_id ||
      loan.customer_id ||
      "";

    setSelectedClient(clientId);
    setSelectedLoan(loan);

    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      loan_id: loan.id || "",
      branch_id: loan.branch_id || "",
      payment_date: dayjs().format("YYYY-MM-DD"),
      payment_amount: 0,
    }));

    if (clientId) {
      await fetchLoans(clientId, loan.id);
    } else {
      setLoans([loan]);
    }

    setInitialLoading(false);
  };

  const handleClientChange = (e) => {
    const clientId = e.target.value;

    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      loan_id: "",
      branch_id: "",
    }));

    setSelectedLoan(null);
    setSelectedClient(clientId);
    fetchLoans(clientId);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "loan_id") {
      const loan = loans.find((l) => Number(l.id) === Number(value));
      setSelectedLoan(loan || null);

      if (loan) {
        setForm((prev) => ({
          ...prev,
          loan_id: value,
          branch_id: loan.branch_id || prev.branch_id || "",
        }));
      }
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.loan_id) newErrors.loan_id = "Debe seleccionar un crédito";
    if (!form.branch_id) newErrors.branch_id = "Debe seleccionar una sucursal";

    if (!form.payment_amount && form.payment_amount !== 0) {
      newErrors.payment_amount = "Debe ingresar un monto";
    } else if (isNaN(form.payment_amount) || parseFloat(form.payment_amount) <= 0) {
      newErrors.payment_amount = "El monto debe ser un número válido y mayor a cero";
    }

    if (selectedLoan) {
      const approvalDate = dayjs(selectedLoan.approval_date);
      const paymentDate = dayjs(form.payment_date);

      if (approvalDate.isValid() && paymentDate.isBefore(approvalDate, "day")) {
        newErrors.payment_date =
          "La fecha de pago no puede ser anterior a la fecha de aprobación del crédito";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const res = await API.post("/api/payments", { params: form });

      onSuccess?.(res.data);
      onClose?.();
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          (error.response?.data?.error &&
            `${error.response?.data?.error} ${error.response?.data?.details || ""}`) ||
          "Error al guardar el pago",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="lg" className="bac-dialog">
        <DialogTitle className="bac-dialog-title">
          <div className="bac-dialog-title__inner">
            <div>
              <Typography variant="h6" fontWeight={900} lineHeight={1.1}>
                Registrar Pago
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Cliente / crédito / sucursal / monto
              </Typography>
            </div>

            {selectedLoan ? (
              <div style={{ textAlign: "right" }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Crédito #{selectedLoan.id}
                </Typography>
                <Typography fontWeight={900}>
                  <NumericFormat
                    value={selectedLoan.approved_amount}
                    displayType="text"
                    thousandSeparator=","
                    decimalSeparator="."
                    decimalScale={2}
                    fixedDecimalScale
                    prefix="C$ "
                  />
                </Typography>
              </div>
            ) : null}
          </div>
        </DialogTitle>

        <DialogContent dividers>
          {initialLoading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2.2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <div className="bac-section">
                  <div className="bac-section__head">
                    <Typography fontWeight={900} sx={{ color: "var(--bac-primary)" }}>
                      Selección
                    </Typography>
                    <Typography variant="body2" sx={{ color: "var(--bac-muted)" }}>
                      Cliente / Crédito / Sucursal
                    </Typography>
                  </div>

                  <div className="bac-section__body">
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        {readOnlyLoan && initialLoan ? (
                          <TextField
                            fullWidth
                            label="Cliente"
                            value={
                              initialLoan.customer_name ||
                              initialLoan.full_name ||
                              initialLoan.customer_identification ||
                              ""
                            }
                            size="small"
                            InputProps={{ readOnly: true }}
                          />
                        ) : (
                          <CustomerSelect
                            onChange={handleClientChange}
                            size="large"
                            fullWidth
                            value={form.client_id}
                          />
                        )}
                      </Grid>

                      <Grid item xs={12} md={7}>
                        <TextField
                          select
                          label="Crédito"
                          name="loan_id"
                          value={form.loan_id}
                          fullWidth
                          onChange={handleChange}
                          error={!!errors.loan_id}
                          helperText={errors.loan_id}
                          size="small"
                          disabled={readOnlyLoan}
                        >
                          {loans.map((l) => (
                            <MenuItem key={l.id} value={l.id}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                                <Typography sx={{ fontWeight: 900, color: "var(--bac-text)" }}>
                                  #{l.id}
                                </Typography>
                                <Typography sx={{ color: "var(--bac-muted)" }}>
                                  {dayjs(l.approval_date).format("DD/MM/YYYY")}
                                </Typography>
                                <Box sx={{ flex: 1 }} />
                                <Typography sx={{ fontWeight: 900, color: "var(--bac-primary)" }}>
                                  <NumericFormat
                                    value={l.approved_amount}
                                    displayType="text"
                                    thousandSeparator=","
                                    decimalSeparator="."
                                    decimalScale={2}
                                    fixedDecimalScale
                                    prefix="C$ "
                                  />
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid item xs={12} md={5}>
                        <BranchSelect
                          onChange={handleChange}
                          error={errors.branch_id}
                          name="branch_id"
                          size="large"
                          fullWidth
                          value={form.branch_id}
                        />
                      </Grid>
                    </Grid>
                  </div>
                </div>
              </Grid>

              {selectedLoan && (
                <Grid item xs={12}>
                  <div className="bac-section">
                    <div className="bac-section__head">
                      <Typography fontWeight={900} sx={{ color: "var(--bac-primary)" }}>
                        Información del crédito
                      </Typography>
                      <Typography variant="body2" sx={{ color: "var(--bac-muted)" }}>
                        Detalle rápido
                      </Typography>
                    </div>
                    <div className="bac-section__body">
                      <LoanInfo clientId={selectedClient} loanId={selectedLoan.id} />
                    </div>
                  </div>
                </Grid>
              )}

              <Grid item xs={12}>
                <div className="bac-section">
                  <div className="bac-section__head">
                    <Typography fontWeight={900} sx={{ color: "var(--bac-primary)" }}>
                      Datos del pago
                    </Typography>
                    <Typography variant="body2" sx={{ color: "var(--bac-muted)" }}>
                      Fecha y monto
                    </Typography>
                  </div>

                  <div className="bac-section__body">
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Fecha de pago"
                          type="date"
                          name="payment_date"
                          value={form.payment_date}
                          onChange={handleChange}
                          fullWidth
                          error={!!errors.payment_date}
                          helperText={errors.payment_date}
                          inputProps={{ max: dayjs().format("YYYY-MM-DD") }}
                          size="small"
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <NumericFormat
                          customInput={TextField}
                          label="Monto a pagar"
                          name="payment_amount"
                          value={form.payment_amount}
                          onValueChange={(values) => {
                            setForm((prev) => ({
                              ...prev,
                              payment_amount: values.floatValue || "",
                            }));
                          }}
                          thousandSeparator=","
                          decimalSeparator="."
                          decimalScale={2}
                          allowNegative={false}
                          fullWidth
                          error={!!errors.payment_amount}
                          helperText={errors.payment_amount}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </div>
                </div>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} variant="outlined" className="bac-btn-ghost" disabled={loading}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || initialLoading}
            className="bac-btn-primary"
          >
            {loading ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Guardar pago"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PaymentForm;