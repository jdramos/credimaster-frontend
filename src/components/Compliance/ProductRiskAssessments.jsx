import React, { useEffect, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Button,
  Alert,
  Snackbar,
  Stack,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import API from "../../api";

// Cap. VII (Art. 31-32) CD-CONAMI-070-01OCT07-2025: evaluación de riesgo
// LA/FT/FP de un producto/servicio/canal/tecnología nuevo antes de
// lanzarlo. Cada evaluación arranca en DRAFT con un checklist copiado de la
// plantilla activa; se aprueba cuando todos los ítems obligatorios quedan
// OK o NA.
const emptyForm = { product_name: "", description: "", channel: "" };

const ITEM_STATUSES = [
  { value: "PENDING", label: "Pendiente" },
  { value: "OK", label: "Cumple" },
  { value: "OBSERVED", label: "Observado" },
  { value: "NA", label: "No aplica" },
];

function AssessmentItemsPanel({ assessmentId, onApproved }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/api/aml/product-risk/assessments/${assessmentId}`);
      setAssessment(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const handleItemChange = async (itemId, status) => {
    await API.put(`/api/aml/product-risk/assessments/items/${itemId}`, { status });
    await load();
  };

  const handleApprove = async () => {
    try {
      await API.post(`/api/aml/product-risk/assessments/${assessmentId}/approve`);
      await load();
      onApproved?.();
    } catch (err) {
      alert(err?.response?.data?.message || "No se pudo aprobar la evaluación.");
    }
  };

  if (loading || !assessment) return null;

  const pendingMandatory = assessment.items.filter(
    (i) => Number(i.is_mandatory) === 1 && i.status !== "OK" && i.status !== "NA",
  );

  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Ítem</TableCell>
            <TableCell width={160}>Estado</TableCell>
            <TableCell>Notas</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {assessment.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {item.title}
                {Number(item.is_mandatory) === 1 && (
                  <Chip label="Obligatorio" size="small" sx={{ ml: 1 }} variant="outlined" />
                )}
              </TableCell>
              <TableCell>
                <TextField
                  select
                  size="small"
                  value={item.status}
                  disabled={assessment.status === "APPROVED"}
                  onChange={(e) => handleItemChange(item.id, e.target.value)}
                  fullWidth
                >
                  {ITEM_STATUSES.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>{item.notes || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {assessment.status === "APPROVED" ? (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
          Aprobada el {new Date(assessment.approved_at).toLocaleString("es-NI")}
        </Alert>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleApprove}
            disabled={pendingMandatory.length > 0}
          >
            Aprobar para lanzamiento
          </Button>
          {pendingMandatory.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              Faltan {pendingMandatory.length} ítem(s) obligatorio(s) por completar.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default function ProductRiskAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const loadAssessments = async () => {
    try {
      const { data } = await API.get("/api/aml/product-risk/assessments");
      setAssessments(Array.isArray(data) ? data : []);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al cargar las evaluaciones", "error");
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const handleCreate = async () => {
    if (!form.product_name.trim()) {
      showAlert("El nombre del producto/servicio es obligatorio", "error");
      return;
    }
    try {
      await API.post("/api/aml/product-risk/assessments", form);
      setForm(emptyForm);
      await loadAssessments();
      showAlert("Evaluación creada");
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al crear la evaluación", "error");
    }
  };

  return (
    <Box p={2}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mb: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            Evaluación de Riesgo de Nuevos Productos/Tecnologías
          </Typography>
          <HelpButton screenKey="cumplimiento.productos" />
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Antes de lanzar un producto, servicio, canal o tecnología nuevo, evalúe su riesgo
          LA/FT/FP y deje constancia del análisis (Cap. VII, Art. 31-32 CD-CONAMI-070-01OCT07-2025).
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <TextField
            label="Producto/servicio/canal"
            size="small"
            value={form.product_name}
            onChange={(e) => setForm({ ...form, product_name: e.target.value })}
            sx={{ minWidth: 240 }}
          />
          <TextField
            label="Canal"
            size="small"
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value })}
            placeholder="Ej: App móvil, agente corresponsal..."
            sx={{ minWidth: 200 }}
          />
          <TextField
            label="Descripción"
            size="small"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            sx={{ minWidth: 260 }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Iniciar evaluación
          </Button>
        </Stack>
      </Paper>

      {assessments.map((a) => (
        <Accordion key={a.id}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
              <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>{a.product_name}</Typography>
              {a.channel && <Chip label={a.channel} size="small" variant="outlined" />}
              <Chip
                label={a.status === "APPROVED" ? "Aprobada" : "Borrador"}
                size="small"
                color={a.status === "APPROVED" ? "success" : "default"}
              />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <AssessmentItemsPanel assessmentId={a.id} onApproved={loadAssessments} />
          </AccordionDetails>
        </Accordion>
      ))}

      {assessments.length === 0 && (
        <Alert severity="info">No hay evaluaciones registradas.</Alert>
      )}

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
