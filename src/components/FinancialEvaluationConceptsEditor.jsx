import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Tooltip,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Edit as EditIcon, Add as AddIcon, Save as SaveIcon, Delete as DeleteIcon } from "@mui/icons-material";
import API from "../api";
import {
  getFinancialEvaluationConcepts,
  invalidateFinancialEvaluationConceptsCache,
} from "../services/financialEvaluationConcepts";

const TYPES = [
  { value: "INCOME", label: "Ingreso" },
  { value: "EXPENSE", label: "Gasto" },
  { value: "DEBT", label: "Deuda" },
];

const typeLabel = (value) => TYPES.find((t) => t.value === value)?.label || value;

const EMPTY_FORM = { label: "", type: "INCOME", is_active: true, sort_order: 0 };

export default function FinancialEvaluationConceptsEditor() {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingConcept, setEditingConcept] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const fetchConcepts = async (force = false) => {
    try {
      setLoading(true);
      const data = await getFinancialEvaluationConcepts({ force });
      setConcepts(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Error al cargar los conceptos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConcepts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = () => {
    setForm(EMPTY_FORM);
    setEditingConcept(null);
    setError("");
    setOpenDialog(true);
  };

  const handleEdit = (concept) => {
    setForm({
      label: concept.label,
      type: concept.type,
      is_active: Boolean(concept.is_active),
      sort_order: concept.sort_order,
    });
    setEditingConcept(concept);
    setError("");
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      setError("La etiqueta es obligatoria.");
      return;
    }

    try {
      if (editingConcept) {
        await API.put(`/api/financial-evaluation-concepts/${editingConcept.id}`, form);
      } else {
        await API.post("/api/financial-evaluation-concepts", form);
      }

      setOpenDialog(false);
      invalidateFinancialEvaluationConceptsCache();
      await fetchConcepts(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Error al guardar");
    }
  };

  const handleDelete = async (concept) => {
    setError("");
    try {
      await API.delete(`/api/financial-evaluation-concepts/${concept.id}`);
      invalidateFinancialEvaluationConceptsCache();
      await fetchConcepts(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Error al eliminar");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Conceptos de ingreso, gasto y deuda que se capturan en la evaluación financiera de un cliente. Los
        conceptos del sistema (marcados como tal) no se pueden eliminar ni cambiar de tipo, pero sí desactivar.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ mb: 2 }}>
        Agregar concepto
      </Button>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Etiqueta</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Orden</TableCell>
            <TableCell>Activo</TableCell>
            <TableCell>Sistema</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {concepts.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.label}</TableCell>
              <TableCell>{typeLabel(c.type)}</TableCell>
              <TableCell>{c.sort_order}</TableCell>
              <TableCell>{c.is_active ? "Sí" : "No"}</TableCell>
              <TableCell>{c.is_system ? <Chip size="small" label="Sistema" /> : ""}</TableCell>
              <TableCell align="right">
                <Tooltip title="Editar">
                  <IconButton size="small" onClick={() => handleEdit(c)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={c.is_system ? "Los conceptos del sistema no se pueden eliminar" : "Eliminar"}>
                  <span>
                    <IconButton size="small" disabled={Boolean(c.is_system)} onClick={() => handleDelete(c)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingConcept ? "Editar concepto" : "Nuevo concepto"}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
          <TextField
            label="Etiqueta"
            fullWidth
            margin="dense"
            value={form.label}
            onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
          />
          <TextField
            label="Tipo"
            select
            fullWidth
            margin="dense"
            value={form.type}
            disabled={Boolean(editingConcept?.is_system)}
            helperText={editingConcept?.is_system ? "No se puede cambiar el tipo de un concepto del sistema." : ""}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            {TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Orden"
            type="number"
            fullWidth
            margin="dense"
            value={form.sort_order}
            onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
          />
          <TextField
            label="Activo"
            select
            fullWidth
            margin="dense"
            value={form.is_active ? "true" : "false"}
            onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.value === "true" }))}
          >
            <MenuItem value="true">Sí</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
