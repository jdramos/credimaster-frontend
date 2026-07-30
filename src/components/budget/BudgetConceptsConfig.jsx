import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  Snackbar,
  Button,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Switch,
  Autocomplete,
  Breadcrumbs,
  Link,
  Grid,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import CategoryIcon from "@mui/icons-material/Category";
import AddIcon from "@mui/icons-material/Add";
import { getBudgetConcepts, createBudgetConcept, updateBudgetConcept, getBudgetableAccounts } from "../../api/budget";

export default function BudgetConceptsConfig() {
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", account: null });
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const load = async () => {
    try {
      setLoading(true);
      const [conceptsRes, accountsRes] = await Promise.all([getBudgetConcepts(), getBudgetableAccounts()]);
      setRows(conceptsRes?.data || []);
      setAccounts(accountsRes?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar conceptos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.account) {
      showAlert("Nombre y cuenta MUC son requeridos", "error");
      return;
    }
    try {
      setSaving(true);
      await createBudgetConcept({
        name: form.name.trim(),
        description: form.description.trim(),
        account_id: form.account.id,
      });
      setForm({ name: "", description: "", account: null });
      showAlert("Concepto creado");
      load();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al crear el concepto", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (row) => {
    try {
      await updateBudgetConcept(row.id, { is_active: row.is_active ? 0 : 1 });
      load();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al actualizar el concepto", "error");
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Breadcrumbs sx={{ mb: 1.5 }}>
        <Link component={RouterLink} to="/presupuesto" underline="hover">Presupuestos</Link>
        <Typography color="text.primary">Conceptos de presupuesto</Typography>
      </Breadcrumbs>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <CategoryIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Conceptos de presupuesto</Typography>
            <Typography variant="body2" color="text.secondary">
              Traducen un gasto conocido (Papelería, Equipo de cómputo...) a una cuenta MUC, para que los departamentos no necesiten saber códigos contables
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={3}>
            <TextField size="small" fullWidth label="Concepto" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField size="small" fullWidth label="Descripción (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Autocomplete
              size="small"
              options={accounts}
              getOptionLabel={(a) => `${a.muc_code} — ${a.account_name}`}
              value={form.account}
              onChange={(_, value) => setForm((f) => ({ ...f, account: value }))}
              renderInput={(params) => <TextField {...params} label="Cuenta MUC" />}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button fullWidth variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} disabled={saving} onClick={handleCreate}>
              Agregar
            </Button>
          </Grid>
        </Grid>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, backgroundColor: "#F8FAFC" } }}>
              <TableCell>Concepto</TableCell>
              <TableCell>Cuenta MUC</TableCell>
              <TableCell align="center">Activo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                  {row.description && <Typography variant="caption" color="text.secondary">{row.description}</Typography>}
                </TableCell>
                <TableCell>
                  <Chip size="small" label={`${row.muc_code} — ${row.account_name}`} variant="outlined" />
                </TableCell>
                <TableCell align="center">
                  <Switch size="small" checked={Boolean(row.is_active)} onChange={() => handleToggleActive(row)} />
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && !loading && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                    No hay conceptos creados
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
