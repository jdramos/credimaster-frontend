import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Switch,
  FormControlLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import API from "../../api";

const API_URL = "/api/superadmin/screen-help";

const emptyForm = {
  screen_key: "",
  title: "",
  do_content: "",
  dont_content: "",
  careful_content: "",
  active: true,
};

// Administración del contenido del botón de ayuda ("?") que se ve en las
// pantallas del tenant. screen_key es la clave que cada pantalla pasa a
// <HelpButton screenKey="..." /> -- debe coincidir exactamente.
export default function ScreenHelpAdminPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar la ayuda de pantallas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setIsNew(true);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setIsNew(false);
    setForm({
      screen_key: row.screen_key,
      title: row.title || "",
      do_content: row.do_content || "",
      dont_content: row.dont_content || "",
      careful_content: row.careful_content || "",
      active: Boolean(row.active),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.screen_key.trim() || !form.title.trim()) {
      showAlert("screen_key y título son requeridos", "error");
      return;
    }

    try {
      setSaving(true);
      await API.put(`${API_URL}/${encodeURIComponent(form.screen_key.trim())}`, {
        title: form.title.trim(),
        do_content: form.do_content || null,
        dont_content: form.dont_content || null,
        careful_content: form.careful_content || null,
        active: form.active,
      });
      showAlert("Ayuda guardada correctamente");
      setDialogOpen(false);
      fetchRows();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar la ayuda", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await API.delete(`${API_URL}/${encodeURIComponent(deleteTarget.screen_key)}`);
      showAlert("Ayuda eliminada");
      setDeleteTarget(null);
      fetchRows();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al eliminar la ayuda", "error");
    } finally {
      setDeleting(false);
    }
  };

  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.screen_key.localeCompare(b.screen_key)), [rows]);

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <HelpOutlineIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Ayuda de pantallas</Typography>
              <Typography variant="body2" color="text.secondary">
                Contenido del botón "?" que ven las empresas en cada pantalla — qué hacer, qué no, y en qué tener cuidado
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={openNew}>
              Nueva
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchRows}>
              Actualizar
            </Button>
          </Box>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>screen_key</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Título</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actualizado</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={row.screen_key} hover>
                  <TableCell><code>{row.screen_key}</code></TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>
                    <Chip size="small" color={row.active ? "success" : "default"} label={row.active ? "Activo" : "Inactivo"} />
                  </TableCell>
                  <TableCell>{row.updated_at ? String(row.updated_at).slice(0, 16).replace("T", " ") : "-"}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && sortedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                      No hay ayuda configurada todavía.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isNew ? "Nueva ayuda de pantalla" : `Editar ayuda — ${form.screen_key}`}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="screen_key" placeholder="ej. caja.arqueos"
                value={form.screen_key}
                disabled={!isNew}
                onChange={(e) => setForm((f) => ({ ...f, screen_key: e.target.value }))}
                helperText="Debe coincidir con el screenKey que usa la pantalla"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Título"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" multiline minRows={3} label="Qué hacer (una línea por punto)"
                value={form.do_content}
                onChange={(e) => setForm((f) => ({ ...f, do_content: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" multiline minRows={3} label="Qué no hacer (una línea por punto)"
                value={form.dont_content}
                onChange={(e) => setForm((f) => ({ ...f, dont_content: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" multiline minRows={3} label="Cuidado con (una línea por punto)"
                value={form.careful_content}
                onChange={(e) => setForm((f) => ({ ...f, careful_content: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />}
                label="Activo (visible para las empresas)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar ayuda</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Se eliminará la ayuda de "{deleteTarget?.screen_key}". El botón "?" de esa pantalla dejará de mostrar contenido.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleting} sx={{ textTransform: "none" }}>
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
