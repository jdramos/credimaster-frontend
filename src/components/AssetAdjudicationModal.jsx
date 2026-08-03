import React, { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Typography,
  Box,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Autocomplete,
} from "@mui/material";
import API from "../api";

const emptyForm = {
  guarantee_ids: [],
  adjudication_date: new Date().toISOString().substring(0, 10),
  adjudication_reason: "",
  asset_description: "",
  asset_type: "",
  appraisal_value: "",
  adjudicated_value: "",
  applied_to_principal: "",
  applied_to_interest: "",
  applied_to_default_interest: "",
  notes: "",
};

export default function AssetAdjudicationModal({ open, onClose, loan, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingGuarantees, setLoadingGuarantees] = useState(false);
  const [error, setError] = useState("");
  const [guarantees, setGuarantees] = useState([]);
  const [excludedGuaranteeIds, setExcludedGuaranteeIds] = useState(new Set());
  const [form, setForm] = useState(emptyForm);

  const availableGuarantees = useMemo(
    () => guarantees.filter((g) => !excludedGuaranteeIds.has(Number(g.id))),
    [guarantees, excludedGuaranteeIds],
  );

  useEffect(() => {
    if (!open || !loan?.customer_id) return;

    setForm(emptyForm);
    setError("");
    setLoadingGuarantees(true);

    Promise.all([
      API.get(`/api/guarantees/${loan.customer_id}`),
      API.get(`/api/asset-adjudications`, { params: { customer_id: loan.customer_id } }),
    ])
      .then(([guaranteesRes, adjudicationsRes]) => {
        setGuarantees(Array.isArray(guaranteesRes.data) ? guaranteesRes.data : []);

        const excluded = new Set(
          (Array.isArray(adjudicationsRes.data) ? adjudicationsRes.data : [])
            .filter((a) => a.status !== "CANCELLED" && a.guarantee_id)
            .map((a) => Number(a.guarantee_id)),
        );
        setExcludedGuaranteeIds(excluded);
      })
      .catch((err) => {
        console.error("Error cargando garantías/adjudicaciones:", err);
        setGuarantees([]);
        setExcludedGuaranteeIds(new Set());
      })
      .finally(() => setLoadingGuarantees(false));
  }, [open, loan?.customer_id]);

  const totalApplied = useMemo(() => {
    return (
      Number(form.applied_to_principal || 0) +
      Number(form.applied_to_interest || 0) +
      Number(form.applied_to_default_interest || 0)
    );
  }, [form]);

  const remainingBalance = useMemo(() => {
    return Math.max(Number(loan?.current_balance || 0) - totalApplied, 0);
  }, [loan, totalApplied]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGuaranteesChange = (_e, selectedGuarantees) => {
    const totalValue = selectedGuarantees.reduce((sum, g) => sum + Number(g.value || 0), 0);

    setForm({
      ...form,
      guarantee_ids: selectedGuarantees.map((g) => g.id),
      asset_description: selectedGuarantees.length
        ? selectedGuarantees
            .map((g) => [g.article, g.brand].filter(Boolean).join(" - "))
            .join(", ")
        : form.asset_description,
      appraisal_value: selectedGuarantees.length ? totalValue : form.appraisal_value,
      adjudicated_value: selectedGuarantees.length ? totalValue : form.adjudicated_value,
    });
  };

  const handleSubmit = async () => {
    if (!form.asset_description) {
      setError("Debe ingresar la descripción del bien");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data } = await API.post("/api/asset-adjudications", {
        loan_id: loan.id,
        customer_id: loan.customer_id,
        guarantee_ids: form.guarantee_ids,
        adjudication_date: form.adjudication_date,
        adjudication_reason: form.adjudication_reason,
        asset_description: form.asset_description,
        asset_type: form.asset_type,
        appraisal_value: Number(form.appraisal_value || 0),
        adjudicated_value: Number(form.adjudicated_value || 0),
        applied_to_principal: Number(form.applied_to_principal || 0),
        applied_to_interest: Number(form.applied_to_interest || 0),
        applied_to_default_interest: Number(form.applied_to_default_interest || 0),
        remaining_balance: remainingBalance,
        notes: form.notes,
      });

      onSuccess?.(data);
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "Error registrando la adjudicación",
      );
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

          <Chip
            size="small"
            label={`Saldo Actual: C$ ${Number(loan?.current_balance || 0).toLocaleString()}`}
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
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={availableGuarantees}
              value={availableGuarantees.filter((g) => form.guarantee_ids.includes(g.id))}
              onChange={handleGuaranteesChange}
              disabled={loadingGuarantees}
              getOptionLabel={(g) =>
                `${[g.article, g.brand].filter(Boolean).join(" - ")}${g.series ? ` (#${g.series})` : ""} — C$ ${Number(g.value).toLocaleString()}`
              }
              isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
              renderTags={(value, getTagProps) =>
                value.map((g, index) => (
                  <Chip
                    label={[g.article, g.brand].filter(Boolean).join(" - ")}
                    size="small"
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Garantías registradas (opcional, una o varias)"
                  helperText={
                    loadingGuarantees
                      ? "Cargando garantías..."
                      : "Solo se muestran garantías del cliente aún no adjudicadas"
                  }
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="Fecha de adjudicación"
              name="adjudication_date"
              value={form.adjudication_date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Descripción del bien"
              name="asset_description"
              value={form.asset_description}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Tipo de bien"
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
              label="Valor de avalúo"
              name="appraisal_value"
              value={form.appraisal_value}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Valor adjudicado"
              name="adjudicated_value"
              value={form.adjudicated_value}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2">Aplicación del saldo del crédito</Typography>
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

          <Grid item xs={12}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#f5f7fa" }}>
              <Typography>
                Total aplicado: <strong>C$ {totalApplied.toLocaleString()}</strong>
              </Typography>
              <Typography>
                Saldo restante (se sanea automáticamente si aplica):{" "}
                <strong>C$ {remainingBalance.toLocaleString()}</strong>
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
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>

        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
