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
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import PaymentsIcon from "@mui/icons-material/Payments";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import dayjs from "dayjs";
import API from "../api";
import CustomerSelect from "./Customer/CustomerSelect";
import { NumericFormat } from "react-number-format";
import BranchSelect from "./BranchSelect";
import LoanInfo from "./LoanInfo";
import FormaPagoSelect from "./conami/FormaPagoSelect";

const money = (value) =>
  Number(value || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PaymentForm = ({
  open,
  onClose,
  onSuccess,
  initialLoan = null,
  readOnlyLoan = false,
}) => {
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loanInfoRefreshKey, setLoanInfoRefreshKey] = useState(0);

  const [form, setForm] = useState({
    client_id: "",
    loan_id: "",
    branch_id: "",
    payment_date: dayjs().format("YYYY-MM-DD"),
    payment_amount: "",
    payment_type: "all",
    payment_method_id: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error",
  });

  useEffect(() => {
    if (open) {
      setInitialLoading(true);

      if (initialLoan) {
        preloadLoan(initialLoan);
      } else {
        setInitialLoading(false);
      }
    }
  }, [open, initialLoan]);

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const resetForm = () => {
    setForm({
      client_id: "",
      loan_id: "",
      branch_id: "",
      payment_date: dayjs().format("YYYY-MM-DD"),
      payment_amount: "",
      payment_type: "all",
      payment_method_id: "",
    });

    setSelectedClient(null);
    setSelectedLoan(null);
    setErrors({});
    setLoans([]);
  };

  const fetchLoans = async (clientId, preselectLoanId = null) => {
    try {
      const res = await API.get(`/api/loans/customer/${clientId}`);
      const validLoans = (res.data || []).filter((l) => Number(l.id) > 0);

      setLoans(validLoans);

      if (preselectLoanId) {
        const loan = validLoans.find(
          (l) => Number(l.id) === Number(preselectLoanId),
        );

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
      setSnackbar({
        open: true,
        message: "Error al cargar créditos",
        severity: "error",
      });
    }
  };

  const preloadLoan = async (loan) => {
    const clientId = loan.customer_id || "";

    setSelectedClient(clientId);
    setSelectedLoan(loan);

    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      loan_id: loan.id || "",
      branch_id: loan.branch_id || "",
      payment_date: dayjs().format("YYYY-MM-DD"),
      payment_amount: "",
      payment_type: "all",
    }));

    if (clientId) {
      await fetchLoans(clientId, loan.id);
    } else {
      setLoans([loan]);
    }

    setInitialLoading(false);
  };

  const handleClientChange = (e) => {
    const clientId = e?.target?.value || e?.identification || e?.id || e || "";

    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      loan_id: "",
      branch_id: "",
    }));

    setSelectedClient(clientId);
    setSelectedLoan(null);

    if (clientId) fetchLoans(clientId);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

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

  const simulatePaymentApplication = () => {
    let remaining = paymentAmount;

    const balances = {
      interest: Number(selectedLoan?.interest_balance || 0),
      defaulted_interest: Number(selectedLoan?.defaulted_interest || 0),
      insurance: Number(selectedLoan?.insurance_balance || 0),
      fee: Number(selectedLoan?.fee_balance || 0),
      other_charges: Number(selectedLoan?.other_charges_balance || 0),
      principal: Number(
        selectedLoan?.capital_balance || selectedLoan?.current_balance || 0,
      ),
    };

    const applied = {
      interest: 0,
      defaulted_interest: 0,
      insurance: 0,
      fee: 0,
      other_charges: 0,
      principal: 0,
    };

    const apply = (key) => {
      if (remaining <= 0) return;

      const amount = Math.min(remaining, balances[key]);
      applied[key] = amount;
      remaining -= amount;
    };

    apply("interest");
    apply("defaulted_interest");
    apply("insurance");
    apply("fee");
    apply("other_charges");
    apply("principal");

    return applied;
  };

  const paymentAmount = useMemo(() => {
    return Number(form.payment_amount || 0);
  }, [form.payment_amount]);

  const paymentApplication = useMemo(() => {
    return simulatePaymentApplication();
  }, [paymentAmount, selectedLoan]);

  const approvedAmount = Number(
    selectedLoan?.approved_amount ||
      selectedLoan?.amount ||
      selectedLoan?.current_balance ||
      0,
  );

  const validate = () => {
    const newErrors = {};

    if (!form.loan_id) newErrors.loan_id = "Debe seleccionar un crédito";
    if (!form.branch_id) newErrors.branch_id = "Debe seleccionar una sucursal";

    if (!paymentAmount || paymentAmount <= 0) {
      newErrors.payment_amount = "El monto debe ser mayor a cero";
    }

    if (!form.payment_method_id) {
      newErrors.payment_method_id = "Debe seleccionar una forma de pago";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const payload = {
        ...form,
        payment_date: dayjs().format("YYYY-MM-DD"),
        payment_amount: Number(form.payment_amount),
        payment_method_id: Number(form.payment_method_id),
      };

      const res = await API.post("/api/payments", {
        params: payload,
      });

      onSuccess?.(res.data);
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Error al guardar el pago",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const newBalances = {
    interest:
      (selectedLoan?.interest_balance || 0) - paymentApplication.interest,
    defaulted_interest:
      (selectedLoan?.defaulted_interest || 0) -
      paymentApplication.defaulted_interest,
    insurance:
      (selectedLoan?.insurance_balance || 0) - paymentApplication.insurance,
    fee: (selectedLoan?.fee_balance || 0) - paymentApplication.fee,
    other_charges:
      (selectedLoan?.other_charges_balance || 0) -
      paymentApplication.other_charges,
    principal:
      (selectedLoan?.capital_balance || 0) - paymentApplication.principal,
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={loading ? undefined : onClose}
        fullWidth
        maxWidth="xl"
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 0,
            background: "linear-gradient(135deg, #004C97 0%, #005EB8 100%)",
            color: "#fff",
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 2.4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: 3,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(255,255,255,0.14)",
                }}
              >
                <PaymentsIcon fontSize="large" />
              </Box>

              <Box>
                <Typography variant="h5" fontWeight={900} lineHeight={1.1}>
                  Registrar Pago
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Cliente / Crédito / Sucursal / Monto
                </Typography>
              </Box>
            </Stack>

            {selectedLoan && (
              <Box textAlign="right">
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Crédito #{selectedLoan.id}
                </Typography>
                <Typography variant="h6" fontWeight={900}>
                  C$ {money(approvedAmount)}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 3,
            background: "#F6F8FB",
          }}
        >
          {initialLoading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={8}>
                <Stack spacing={2.5}>
                  <Paper sx={cardSx}>
                    <SectionTitle
                      icon={<PersonIcon />}
                      title="Selección"
                      subtitle="Cliente / Crédito / Sucursal"
                    />

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
                            size="small"
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
                              #{l.id} ·{" "}
                              {dayjs(l.approval_date).isValid()
                                ? dayjs(l.approval_date).format("DD/MM/YYYY")
                                : "Sin fecha"}{" "}
                              · C$ {money(l.approved_amount || l.amount)}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid item xs={12} md={5}>
                        <BranchSelect
                          onChange={handleChange}
                          error={errors.branch_id}
                          name="branch_id"
                          size="small"
                          fullWidth
                          value={form.branch_id}
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  {selectedLoan && (
                    <Paper sx={cardSx}>
                      <SectionTitle
                        icon={<AccountBalanceIcon />}
                        title="Información del crédito"
                        subtitle="Detalle rápido"
                      />

                      <LoanInfo
                        clientId={selectedClient}
                        loanId={selectedLoan.id}
                        refreshKey={loanInfoRefreshKey}
                        paymentPreview={paymentApplication}
                        paymentAmount={paymentAmount}
                      />
                    </Paper>
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    ...cardSx,
                    position: { md: "sticky" },
                    top: 16,
                  }}
                >
                  <SectionTitle
                    icon={<PaymentsIcon />}
                    title="Resumen del pago"
                    subtitle="Aplicación del abono"
                  />

                  <Stack spacing={2}>
                    <TextField
                      label="Fecha del pago"
                      type="date"
                      name="payment_date"
                      value={dayjs().format("YYYY-MM-DD")}
                      fullWidth
                      disabled
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarMonthIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />

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
                        setLoanInfoRefreshKey((prev) => prev + 1);
                      }}
                      thousandSeparator=","
                      decimalSeparator="."
                      decimalScale={2}
                      fixedDecimalScale
                      allowNegative={false}
                      fullWidth
                      error={!!errors.payment_amount}
                      helperText={errors.payment_amount}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">C$</InputAdornment>
                        ),
                      }}
                    />

                    <FormaPagoSelect
                      name="payment_method_id"
                      value={form.payment_method_id}
                      onChange={handleChange}
                      error={!!errors.payment_method_id}
                      helperText={errors.payment_method_id}
                    />

                    <TextField
                      select
                      label="Tipo de pago"
                      name="payment_type"
                      value={form.payment_type}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="all">
                        Pago total: intereses, mora, cargos y capital
                      </MenuItem>
                      <MenuItem value="capital">Solo capital</MenuItem>
                      <MenuItem value="interest">Solo intereses</MenuItem>
                    </TextField>

                    <Divider />

                    <Box
                      sx={{
                        border: "1px solid #DDE7F3",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          px: 2,
                          py: 1.3,
                          background: "#EEF5FF",
                        }}
                      >
                        <Typography fontWeight={900} color="#005EB8">
                          Aplicación del pago
                        </Typography>
                      </Box>

                      <Stack spacing={1.2} sx={{ p: 2 }}>
                        <PayLine
                          label="Intereses"
                          value={paymentApplication.interest}
                        />
                        <PayLine
                          label="Interés moratorio"
                          value={paymentApplication.defaulted_interest}
                        />
                        <PayLine
                          label="Seguro"
                          value={paymentApplication.insurance}
                        />
                        <PayLine
                          label="Comisión"
                          value={paymentApplication.fee}
                        />
                        <PayLine
                          label="Otros cargos"
                          value={paymentApplication.other_charges}
                        />
                        <PayLine
                          label="Capital"
                          value={paymentApplication.principal}
                        />

                        <Divider />

                        <Stack direction="row" justifyContent="space-between">
                          <Typography fontWeight={900}>
                            Total a aplicar
                          </Typography>
                          <Typography fontWeight={900} color="#005EB8">
                            C$ {money(paymentAmount)}
                          </Typography>
                        </Stack>

                        <Box
                          sx={{
                            border: "1px dashed #DDE7F3",
                            borderRadius: 3,
                            p: 2,
                            background: "#FAFCFF",
                          }}
                        >
                          <Typography fontWeight={900} mb={1}>
                            Saldos después del pago
                          </Typography>

                          <PayLine
                            label="Intereses"
                            value={newBalances.interest}
                          />
                          <PayLine
                            label="Interés moratorio"
                            value={newBalances.defaulted_interest}
                          />
                          <PayLine
                            label="Seguro"
                            value={newBalances.insurance}
                          />
                          <PayLine label="Comisión" value={newBalances.fee} />
                          <PayLine
                            label="Otros cargos"
                            value={newBalances.other_charges}
                          />
                          <PayLine
                            label="Capital"
                            value={newBalances.principal}
                          />
                        </Box>
                      </Stack>
                    </Box>

                    <Alert
                      icon={<InfoOutlinedIcon />}
                      severity="success"
                      sx={{
                        borderRadius: 3,
                        "& .MuiAlert-message": {
                          width: "100%",
                        },
                      }}
                    >
                      <Typography fontWeight={800}>
                        Orden de aplicación
                      </Typography>
                      <Typography variant="body2">
                        Intereses → Moratorio → Seguro → Comisión → Otros cargos
                        → Capital
                      </Typography>
                    </Alert>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #E3EAF3",
            background: "#fff",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Los pagos se registran únicamente para el día actual.
          </Typography>

          <Stack direction="row" spacing={1.5}>
            <Button
              onClick={onClose}
              variant="outlined"
              disabled={loading}
              startIcon={<CloseIcon />}
              sx={{ borderRadius: 2, fontWeight: 800 }}
            >
              Cancelar
            </Button>

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || initialLoading}
              startIcon={
                loading ? (
                  <CircularProgress size={18} sx={{ color: "#fff" }} />
                ) : (
                  <SaveIcon />
                )
              }
              sx={{
                borderRadius: 2,
                fontWeight: 900,
                px: 3,
                background: "#005EB8",
                "&:hover": {
                  background: "#004C97",
                },
              }}
            >
              {loading ? "Guardando..." : "Guardar pago"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() =>
          setSnackbar((prev) => ({
            ...prev,
            open: false,
          }))
        }
      >
        <Alert
          onClose={() =>
            setSnackbar((prev) => ({
              ...prev,
              open: false,
            }))
          }
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

const cardSx = {
  p: 2,
  borderRadius: 4,
  border: "1px solid #E1E8F0",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  background: "#fff",
};

const SectionTitle = ({ icon, title, subtitle }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    sx={{ mb: 2 }}
  >
    <Stack direction="row" spacing={1.2} alignItems="center">
      <Box
        sx={{
          color: "#005EB8",
          display: "flex",
          alignItems: "center",
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography fontWeight={900} color="#005EB8">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  </Stack>
);

const PayLine = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={800}>
      C$ {money(value)}
    </Typography>
  </Stack>
);

export default PaymentForm;
