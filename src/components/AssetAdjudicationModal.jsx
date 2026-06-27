import React, { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  MenuItem,
  Typography,
  Box,
  Chip,
  Divider,
  Alert,
} from "@mui/material";
import API from "../api";
const API = "/api/asset-adjudications";

export default function AssetAdjudicationModal({
  open,
  onClose,
  loan,
  customer,
  guarantees = [],
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    guarantee_id: "",

    adjudication_date: new Date().toISOString().substring(0, 10),

    adjudication_reason: "",

    asset_description: "",
    asset_type: "",

    appraisal_value: "",
    adjudicated_value: "",

    applied_to_principal: "",
    applied_to_interest: "",
    applied_to_default_interest: "",
    applied_to_fees: "",
    applied_to_other_charges: "",

    notes: "",
  });

  const totalApplied = useMemo(() => {
    return (
      Number(form.applied_to_principal || 0) +
      Number(form.applied_to_interest || 0) +
      Number(form.applied_to_default_interest || 0) +
      Number(form.applied_to_fees || 0) +
      Number(form.applied_to_other_charges || 0)
    );
  }, [form]);

  const remainingBalance = useMemo(() => {
    return Math.max(Number(loan?.current_balance || 0) - totalApplied, 0);
  }, [loan, totalApplied]);

  useEffect(() => {
    if (!open) return;

    setError("");
  }, [open]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleGuaranteeChange = (e) => {
    const guaranteeId = e.target.value;

    const guarantee = guarantees.find(
      (g) => Number(g.id) === Number(guaranteeId),
    );

    setForm({
      ...form,
      guarantee_id: guaranteeId,
      asset_description: guarantee?.description || "",
      asset_type: guarantee?.guarantee_type || "",
      appraisal_value: guarantee?.commercial_value || "",
      adjudicated_value: guarantee?.commercial_value || "",
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      if (!form.asset_description) {
        throw new Error("Debe ingresar descripción del bien");
      }

      const response = await API.post(API, {
        body: JSON.stringify({
          loan_id: loan.id,
          customer_id: customer.id,

          ...form,

          remaining_balance: remainingBalance,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error guardando adjudicación");
      }

      if (onSaved) {
        onSaved(data);
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Adjudicación de Bien</DialogTitle>

      <DialogContent dividers>
        <Box mb={2}>
          <Typography variant="h6">{loan?.credit_code}</Typography>

          <Typography variant="body2">
            {customer?.first_name} {customer?.first_last_name}
          </Typography>

          <Chip
            size="small"
            label={`Saldo Actual: ${Number(
              loan?.current_balance || 0,
            ).toLocaleString()}`}
            color="primary"
            sx={{ mt: 1 }}
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Garantía"
              name="guarantee_id"
              value={form.guarantee_id}
              onChange={handleGuaranteeChange}
            >
              <MenuItem value="">Ninguna</MenuItem>

              {guarantees.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.description}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="Fecha"
              name="adjudication_date"
              value={form.adjudication_date}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Descripción del Bien"
              name="asset_description"
              value={form.asset_description}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Tipo de Bien"
              name="asset_type"
              value={form.asset_type}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Motivo"
              name="adjudication_reason"
              value={form.adjudication_reason}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Valor Avalúo"
              name="appraisal_value"
              value={form.appraisal_value}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Valor Adjudicado"
              name="adjudicated_value"
              value={form.adjudicated_value}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2">Aplicación del saldo</Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Capital"
              name="applied_to_principal"
              value={form.applied_to_principal}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Interés"
              name="applied_to_interest"
              value={form.applied_to_interest}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Mora"
              name="applied_to_default_interest"
              value={form.applied_to_default_interest}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Comisiones"
              name="applied_to_fees"
              value={form.applied_to_fees}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Otros Cargos"
              name="applied_to_other_charges"
              value={form.applied_to_other_charges}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#f5f7fa",
              }}
            >
              <Typography>
                Total Aplicado: <strong>{totalApplied.toLocaleString()}</strong>
              </Typography>

              <Typography>
                Saldo Restante:{" "}
                <strong>{remainingBalance.toLocaleString()}</strong>
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Observaciones"
              name="notes"
              value={form.notes}
              onChange={handleChange}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>

        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
