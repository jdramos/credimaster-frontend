import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Switch,
  TextField,
} from "@mui/material";

const defaultForm = {
  code: "",
  section: "IDENTIDAD",
  title: "",
  description: "",
  is_mandatory: true,
  is_active: true,
  display_order: 0,
  applies_to_new_loans: true,
  applies_to_renewals: true,
  applies_to_refinancing: true,
};

const sectionOptions = [
  "IDENTIDAD",
  "INGRESOS",
  "DOMICILIO",
  "NEGOCIO",
  "GARANTIAS",
  "CENTRALES",
  "ANALISIS",
  "LEGAL",
  "OTROS",
];

export default function CreditFileTemplateDialog({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialData = null,
}) {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          code: initialData.code || "",
          section: initialData.section || "IDENTIDAD",
          title: initialData.title || "",
          description: initialData.description || "",
          is_mandatory: !!initialData.is_mandatory,
          is_active: !!initialData.is_active,
          display_order: Number(initialData.display_order || 0),
          applies_to_new_loans: !!initialData.applies_to_new_loans,
          applies_to_renewals: !!initialData.applies_to_renewals,
          applies_to_refinancing: !!initialData.applies_to_refinancing,
        });
      } else {
        setForm(defaultForm);
      }
      setErrors({});
    }
  }, [open, initialData]);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!String(form.code || "").trim()) {
      nextErrors.code = "El código es obligatorio";
    }

    if (!String(form.section || "").trim()) {
      nextErrors.section = "La sección es obligatoria";
    }

    if (!String(form.title || "").trim()) {
      nextErrors.title = "El título es obligatorio";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      code: String(form.code || "")
        .trim()
        .toUpperCase(),
      section: String(form.section || "")
        .trim()
        .toUpperCase(),
      title: String(form.title || "").trim(),
      description: String(form.description || "").trim(),
      is_mandatory: !!form.is_mandatory,
      is_active: !!form.is_active,
      display_order: Number(form.display_order || 0),
      applies_to_new_loans: !!form.applies_to_new_loans,
      applies_to_renewals: !!form.applies_to_renewals,
      applies_to_refinancing: !!form.applies_to_refinancing,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {initialData
          ? "Editar documento del expediente"
          : "Nuevo documento del expediente"}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Código"
              fullWidth
              value={form.code}
              onChange={(e) => handleChange("code", e.target.value)}
              disabled={!!initialData}
              error={!!errors.code}
              helperText={errors.code || "Ej: ID_DOC, INCOME_PROOF"}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Sección"
              fullWidth
              value={form.section}
              onChange={(e) => handleChange("section", e.target.value)}
              error={!!errors.section}
              helperText={errors.section}
            >
              {sectionOptions.map((section) => (
                <MenuItem key={section} value={section}>
                  {section}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Orden"
              type="number"
              fullWidth
              value={form.display_order}
              onChange={(e) => handleChange("display_order", e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Título"
              fullWidth
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Descripción"
              fullWidth
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_mandatory}
                    onChange={(e) =>
                      handleChange("is_mandatory", e.target.checked)
                    }
                  />
                }
                label="Obligatorio"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active}
                    onChange={(e) =>
                      handleChange("is_active", e.target.checked)
                    }
                  />
                }
                label="Activo"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={form.applies_to_new_loans}
                    onChange={(e) =>
                      handleChange("applies_to_new_loans", e.target.checked)
                    }
                  />
                }
                label="Crédito nuevo"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={form.applies_to_renewals}
                    onChange={(e) =>
                      handleChange("applies_to_renewals", e.target.checked)
                    }
                  />
                }
                label="Renovación"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={form.applies_to_refinancing}
                    onChange={(e) =>
                      handleChange("applies_to_refinancing", e.target.checked)
                    }
                  />
                }
                label="Refinanciamiento"
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {initialData ? "Guardar cambios" : "Crear"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
