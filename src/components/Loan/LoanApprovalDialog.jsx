import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Alert,
  Typography,
  Stack,
} from "@mui/material";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function LoanApprovalDialog({
  open,
  onClose,
  mode,
  loan,
  approval,
  onSubmit,
  loading = false,
}) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!loan) return;

    setForm({
      status: mode === "approve" ? "APPROVED" : "REJECTED",
      amount: loan.approved_amount ?? loan.amount ?? "",
      term: loan.approved_term ?? loan.term ?? "",
      interest_rate: loan.approved_rate ?? loan.interest_rate ?? "",
      date: todayISO(),
    });
  }, [loan, mode, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (mode === "approve") {
      onSubmit({
        status: "APPROVED",
        amount: form.amount,
        term: form.term,
        interest_rate: form.interest_rate,
        date: form.date,
      });
      return;
    }

    onSubmit({
      status: "REJECTED",
      date: form.date,
    });
  };

  const isApprove = mode === "approve";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={isApprove ? "md" : "sm"}>
      <DialogTitle>
        {isApprove ? "Aprobar crédito" : "Rechazar crédito"}
      </DialogTitle>

      <DialogContent dividers>
        {loan && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Stack spacing={0.5}>
              <Typography variant="body2">
                <strong>Crédito:</strong> #{loan.id}
              </Typography>
              <Typography variant="body2">
                <strong>Cliente:</strong> {loan.customer_name || loan.customer_identification}
              </Typography>
            </Stack>
          </Alert>
        )}

        {!approval && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No se encontró una aprobación pendiente para este usuario.
          </Alert>
        )}

        <Grid container spacing={2}>
          {isApprove ? (
            <>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Monto aprobado"
                  name="amount"
                  type="number"
                  value={form.amount || ""}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Plazo aprobado"
                  name="term"
                  type="number"
                  value={form.term || ""}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Tasa aprobada"
                  name="interest_rate"
                  type="number"
                  value={form.interest_rate || ""}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha aprobación"
                  name="date"
                  value={form.date || ""}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Fecha decisión"
                name="date"
                value={form.date || ""}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !approval}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}