import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  Stack,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import API from "../../api";

const API_URL = `/api/accounting/accounts`;

const ACCOUNT_TYPES = [
  "ACTIVO",
  "PASIVO",
  "PATRIMONIO",
  "INGRESO",
  "GASTO",
  "OTRO",
  "CONTINGENTE",
  "ORDEN",
];

export default function AccountEditDialog({ open, onClose, account, onSuccess }) {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !account) return;

    setError("");
    setForm({
      parent_code: account.parent_code || "",
      level_no: account.level_no || 1,
      account_name: account.account_name || "",
      account_type: account.account_type || "OTRO",
      nature: account.nature || "DEBIT",
      is_movement: Number(account.is_movement) === 1,
      is_active: Number(account.is_active) === 1,
    });
  }, [open, account]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.account_name?.trim()) {
      setError("El nombre de la cuenta es requerido");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await API.put(`${API_URL}/${account.id}`, {
        parent_code: form.parent_code || null,
        level_no: Number(form.level_no) || 1,
        account_name: form.account_name.trim(),
        account_type: form.account_type,
        nature: form.nature,
        is_movement: form.is_movement ? 1 : 0,
        is_active: form.is_active ? 1 : 0,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Error al actualizar la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Editar cuenta {account?.muc_code}</DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Código MUC"
            value={account?.muc_code || ""}
            disabled
            helperText="El código MUC no se puede modificar"
          />

          <TextField
            fullWidth
            label="Nombre de la cuenta"
            value={form.account_name || ""}
            onChange={(e) => handleChange("account_name", e.target.value)}
          />

          <TextField
            fullWidth
            label="Cuenta padre (código MUC)"
            value={form.parent_code || ""}
            onChange={(e) => handleChange("parent_code", e.target.value)}
          />

          <TextField
            select
            fullWidth
            label="Tipo de cuenta"
            value={form.account_type || "OTRO"}
            onChange={(e) => handleChange("account_type", e.target.value)}
          >
            {ACCOUNT_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Naturaleza"
            value={form.nature || "DEBIT"}
            onChange={(e) => handleChange("nature", e.target.value)}
          >
            <MenuItem value="DEBIT">Débito</MenuItem>
            <MenuItem value="CREDIT">Crédito</MenuItem>
          </TextField>

          <FormControlLabel
            control={
              <Checkbox
                checked={!!form.is_movement}
                onChange={(e) => handleChange("is_movement", e.target.checked)}
              />
            }
            label="Cuenta de movimiento (admite asientos directos)"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={!!form.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
              />
            }
            label="Cuenta activa"
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
