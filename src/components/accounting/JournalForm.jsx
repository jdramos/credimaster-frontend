import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";

const API_BASE = process.env.REACT_APP_API_BASE_URL;
const token = process.env.REACT_APP_API_TOKEN;

const headers = {
  Authorization: token,
  "Content-Type": "application/json",
};

const emptyLine = {
  account_id: null,
  description: "",
  debit: "",
  credit: "",
};

export default function JournalForm({ open, onClose, onSaved }) {
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    entry_date: new Date().toISOString().substring(0, 10),
    description: "",
    source_module: "MANUAL",
    reference_type: "",
    reference_id: "",
    lines: [{ ...emptyLine }, { ...emptyLine }],
  });

  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "success") => {
    setAlert({ open: true, severity, message });
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/accounting/accounts?is_active=1`,
        { headers },
      );

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Error cargando cuentas");
      }

      const movementAccounts = (json.data || []).filter(
        (x) => Number(x.is_movement) === 1,
      );

      setAccounts(movementAccounts);
    } catch (error) {
      showAlert(error.message, "error");
    }
  };

  useEffect(() => {
    if (open) fetchAccounts();
  }, [open]);

  const totals = useMemo(() => {
    const debit = form.lines.reduce(
      (sum, line) => sum + Number(line.debit || 0),
      0,
    );

    const credit = form.lines.reduce(
      (sum, line) => sum + Number(line.credit || 0),
      0,
    );

    return {
      debit,
      credit,
      difference: debit - credit,
      balanced: debit > 0 && credit > 0 && Math.abs(debit - credit) < 0.01,
    };
  }, [form.lines]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateLine = (index, field, value) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = {
        ...lines[index],
        [field]: value,
      };

      if (field === "debit" && Number(value) > 0) {
        lines[index].credit = "";
      }

      if (field === "credit" && Number(value) > 0) {
        lines[index].debit = "";
      }

      return { ...prev, lines };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...emptyLine }],
    }));
  };

  const removeLine = (index) => {
    if (form.lines.length <= 2) {
      showAlert("El comprobante debe tener al menos dos partidas", "warning");
      return;
    }

    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    if (!form.entry_date) return "Debe ingresar la fecha";
    if (!form.description.trim()) return "Debe ingresar la descripción";

    if (form.lines.length < 2) {
      return "Debe ingresar al menos dos partidas";
    }

    for (const [index, line] of form.lines.entries()) {
      if (!line.account_id) {
        return `Debe seleccionar cuenta en la línea ${index + 1}`;
      }

      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);

      if (debit <= 0 && credit <= 0) {
        return `Debe ingresar débito o crédito en la línea ${index + 1}`;
      }

      if (debit > 0 && credit > 0) {
        return `Una línea no puede tener débito y crédito al mismo tiempo`;
      }
    }

    if (!totals.balanced) {
      return "El comprobante no está balanceado";
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validate();

    if (validationError) {
      showAlert(validationError, "warning");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        entry_date: form.entry_date,
        description: form.description.trim(),
        source_module: form.source_module,
        reference_type: form.reference_type || null,
        reference_id: form.reference_id || null,
        lines: form.lines.map((line) => ({
          account_id: line.account_id,
          description: line.description || form.description,
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
        })),
      };

      const res = await fetch(`${API_BASE}/api/accounting/journal`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Error guardando comprobante");
      }

      showAlert(json.message || "Comprobante guardado correctamente");

      if (onSaved) onSaved();

      onClose();
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Nuevo comprobante contable
        </DialogTitle>

        <DialogContent dividers>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "180px 1fr 180px" },
              gap: 2,
              mb: 2,
            }}
          >
            <TextField
              size="small"
              label="Fecha"
              type="date"
              value={form.entry_date}
              onChange={(e) => updateForm("entry_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              size="small"
              label="Descripción"
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              fullWidth
            />

            <TextField
              size="small"
              label="Origen"
              select
              value={form.source_module}
              onChange={(e) => updateForm("source_module", e.target.value)}
            >
              <MenuItem value="MANUAL">Manual</MenuItem>
              <MenuItem value="LOANS">Créditos</MenuItem>
              <MenuItem value="PAYMENTS">Pagos</MenuItem>
              <MenuItem value="PROVISIONS">Provisiones</MenuItem>
              <MenuItem value="ADJUSTMENTS">Ajustes</MenuItem>
            </TextField>
          </Box>

          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Partidas contables
          </Typography>

          {form.lines.map((line, index) => {
            const selectedAccount =
              accounts.find((acc) => acc.id === line.account_id) || null;

            return (
              <Box
                key={index}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "2fr 2fr 140px 140px 48px",
                  },
                  gap: 1,
                  mb: 1,
                  alignItems: "center",
                }}
              >
                <Autocomplete
                  size="small"
                  options={accounts}
                  value={selectedAccount}
                  getOptionLabel={(option) =>
                    `${option.muc_code} - ${option.account_name}`
                  }
                  onChange={(_, value) =>
                    updateLine(index, "account_id", value?.id || null)
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Cuenta contable" />
                  )}
                />

                <TextField
                  size="small"
                  label="Detalle"
                  value={line.description}
                  onChange={(e) =>
                    updateLine(index, "description", e.target.value)
                  }
                />

                <TextField
                  size="small"
                  label="Débito"
                  type="number"
                  value={line.debit}
                  onChange={(e) => updateLine(index, "debit", e.target.value)}
                  inputProps={{ min: 0, step: "0.01" }}
                />

                <TextField
                  size="small"
                  label="Crédito"
                  type="number"
                  value={line.credit}
                  onChange={(e) => updateLine(index, "credit", e.target.value)}
                  inputProps={{ min: 0, step: "0.01" }}
                />

                <IconButton color="error" onClick={() => removeLine(index)}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
            );
          })}

          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={addLine}
            sx={{ mt: 1, borderRadius: 2, textTransform: "none" }}
          >
            Agregar partida
          </Button>

          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: totals.balanced ? "#ECFDF5" : "#FEF2F2",
              border: totals.balanced
                ? "1px solid #A7F3D0"
                : "1px solid #FECACA",
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography fontWeight={800}>
              Débito:{" "}
              {totals.debit.toLocaleString("es-NI", {
                minimumFractionDigits: 2,
              })}
            </Typography>

            <Typography fontWeight={800}>
              Crédito:{" "}
              {totals.credit.toLocaleString("es-NI", {
                minimumFractionDigits: 2,
              })}
            </Typography>

            <Typography fontWeight={900}>
              Diferencia:{" "}
              {totals.difference.toLocaleString("es-NI", {
                minimumFractionDigits: 2,
              })}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={saving}
            onClick={handleSave}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              background: "#0057B8",
              "&:hover": { background: "#003E8A" },
            }}
          >
            Guardar comprobante
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity={alert.severity}
          onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
}
