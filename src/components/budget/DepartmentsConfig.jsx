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
  Switch,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AddIcon from "@mui/icons-material/Add";
import { getDepartments, createDepartment, updateDepartment } from "../../api/budget";

export default function DepartmentsConfig() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const load = async () => {
    try {
      setLoading(true);
      const res = await getDepartments();
      setRows(res?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar departamentos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      setSaving(true);
      await createDepartment(newName.trim());
      setNewName("");
      showAlert("Departamento creado");
      load();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al crear el departamento", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (row) => {
    try {
      await updateDepartment(row.id, { is_active: row.is_active ? 0 : 1 });
      load();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al actualizar el departamento", "error");
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Breadcrumbs sx={{ mb: 1.5 }}>
        <Link component={RouterLink} to="/presupuesto" underline="hover">Presupuestos</Link>
        <Typography color="text.primary">Departamentos</Typography>
      </Breadcrumbs>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <ApartmentIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Departamentos</Typography>
            <Typography variant="body2" color="text.secondary">
              Cada usuario se asigna a uno de estos departamentos para llenar su parte del presupuesto
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 2, maxWidth: 480 }}>
          <TextField
            size="small"
            fullWidth
            label="Nuevo departamento"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} disabled={saving} onClick={handleCreate}>
            Agregar
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, backgroundColor: "#F8FAFC" } }}>
              <TableCell>Nombre</TableCell>
              <TableCell align="center">Activo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.name}</TableCell>
                <TableCell align="center">
                  <Switch size="small" checked={Boolean(row.is_active)} onChange={() => handleToggleActive(row)} />
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && !loading && (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                    No hay departamentos creados
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
