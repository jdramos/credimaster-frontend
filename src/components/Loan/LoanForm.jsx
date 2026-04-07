import React, { useState } from "react";
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Stack,
  Divider,
  Alert,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CalculateIcon from "@mui/icons-material/Calculate";
import LoanAmortizationModal from "./LoanAmortizationModal";
import { loanApi } from "../../api/loanApi";

const initialState = {
  customer_id: "",
  customer_identification: "",
  vendor_id: "",
  promoter_id: "",
  amount: "",
  fee: 0,
  deduction: 0,
  term: "",
  interest_type_id: "",
  interest_type_name: "compound",
  interest_rate: "",
  defaulted_rate: 0,
  insurance: 0,
  other_charges: 0,
  frequency_id: "",
  branch_id: "",
  credit_evaluation_id: "",
  created_by: "",
  requestDate: new Date().toISOString().slice(0, 10),
  due_date: "",
};

export default function LoanForm({ onCreated }) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [openPreview, setOpenPreview] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreview = async () => {
    try {
      setError("");
      setLoadingPreview(true);
      const data = await loanApi.previewAmortization(form);
      setPreviewRows(data || []);
      setOpenPreview(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Error al generar amortización.",
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSave = async () => {
    try {
      setError("");
      setLoadingSave(true);
      const resp = await loanApi.create(form);
      if (onCreated) onCreated(resp);
      setForm(initialState);
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || "Error al crear crédito.",
      );
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <>
      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Nueva solicitud de crédito
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Identificación cliente"
              name="customer_identification"
              value={form.customer_identification}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Sucursal"
              name="branch_id"
              value={form.branch_id}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Fecha solicitud"
              name="requestDate"
              value={form.requestDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Monto"
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Plazo"
              name="term"
              type="number"
              value={form.term}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Tasa interés"
              name="interest_rate"
              type="number"
              value={form.interest_rate}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Frecuencia"
              name="frequency_id"
              value={form.frequency_id}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Tipo interés"
              name="interest_type_name"
              value={form.interest_type_name}
              onChange={handleChange}
              SelectProps={{ native: true }}
            >
              <option value="compound">Compuesto</option>
              <option value="simple">Simple</option>
            </TextField>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Comisión"
              name="fee"
              type="number"
              value={form.fee}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Seguro"
              name="insurance"
              type="number"
              value={form.insurance}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Otros cargos"
              name="other_charges"
              type="number"
              value={form.other_charges}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Deducción"
              name="deduction"
              type="number"
              value={form.deduction}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Tasa mora"
              name="defaulted_rate"
              type="number"
              value={form.defaulted_rate}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Fecha vencimiento"
              name="due_date"
              value={form.due_date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Vendedor"
              name="vendor_id"
              value={form.vendor_id}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Promotor"
              name="promoter_id"
              value={form.promoter_id}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Evaluación crediticia"
              name="credit_evaluation_id"
              value={form.credit_evaluation_id}
              onChange={handleChange}
            />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end" mt={3}>
          <Button
            variant="outlined"
            startIcon={<CalculateIcon />}
            onClick={handlePreview}
            disabled={loadingPreview}
          >
            Ver amortización
          </Button>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loadingSave}
          >
            Guardar
          </Button>
        </Stack>
      </Paper>

      <LoanAmortizationModal
        open={openPreview}
        onClose={() => setOpenPreview(false)}
        rows={previewRows}
        title="Previsualización de amortización"
      />
    </>
  );
}
