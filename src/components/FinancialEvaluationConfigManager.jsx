import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon } from "@mui/icons-material";
import HelpButton from "./help/HelpButton";
import API from "../api";
import {
  getFinancialEvaluationConfig,
  invalidateFinancialEvaluationConfigCache,
} from "../services/financialEvaluationConfig";
import FinancialEvaluationConceptsEditor from "./FinancialEvaluationConceptsEditor";

// Editor genérico de bandas {campo_umbral, score} -- se repite para cada
// dimensión del scoring (capacidad, endeudamiento, estabilidad, documentos).
// El orden de evaluación es el orden de las filas (la primera fila cuya
// condición se cumple gana), así que se permite reordenar solo agregando o
// eliminando filas, no hay drag&drop: quien configura debe ya conocer el
// criterio (>= o <=) indicado en `thresholdLabel`.
function BandsEditor({ title, thresholdField, thresholdLabel, bands, defaultScore, onChange, onDefaultScoreChange }) {
  const updateBand = (idx, field, value) => {
    const next = bands.map((b, i) => (i === idx ? { ...b, [field]: value } : b));
    onChange(next);
  };

  const addBand = () => {
    onChange([...bands, { [thresholdField]: 0, score: 0 }]);
  };

  const removeBand = (idx) => {
    onChange(bands.filter((_, i) => i !== idx));
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{thresholdLabel}</TableCell>
            <TableCell>Puntos</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {bands.map((band, idx) => (
            <TableRow key={idx}>
              <TableCell>
                <TextField
                  type="number"
                  size="small"
                  value={band[thresholdField]}
                  onChange={(e) => updateBand(idx, thresholdField, Number(e.target.value))}
                />
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  size="small"
                  value={band.score}
                  onChange={(e) => updateBand(idx, "score", Number(e.target.value))}
                />
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Eliminar banda">
                  <IconButton size="small" onClick={() => removeBand(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
        <Button size="small" startIcon={<AddIcon />} onClick={addBand}>
          Agregar banda
        </Button>
        <TextField
          label="Puntos por defecto (si no cae en ninguna banda)"
          type="number"
          size="small"
          value={defaultScore}
          onChange={(e) => onDefaultScoreChange(Number(e.target.value))}
          sx={{ width: 320 }}
        />
      </Box>
    </Paper>
  );
}

export default function FinancialEvaluationConfigManager() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState(0);

  useEffect(() => {
    let active = true;
    getFinancialEvaluationConfig({ force: true })
      .then((data) => {
        if (active) setConfig(data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.error || err.message || "Error al cargar la configuración");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateField = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateScoreMapField = (field, key, value) => {
    setConfig((prev) => ({
      ...prev,
      [field]: { ...prev[field], [key]: Number(value) },
    }));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    try {
      setSaving(true);
      await API.put("/api/financial-evaluation-config", config);
      invalidateFinancialEvaluationConfigCache();
      setSuccess("Configuración guardada correctamente");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box p={3} sx={{ display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!config) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || "No se pudo cargar la configuración"}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mb: 1 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
          Configuración de Evaluación Financiera
        </Typography>
        <HelpButton screenKey="clientes.evaluacion.configuracion" />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Conceptos, pesos, bandas y umbrales que usa la evaluación financiera de clientes. Los cambios aplican
        de inmediato a nuevas evaluaciones y a la validación de aprobación de créditos de esta empresa.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Bandas y umbrales" />
        <Tab label="Conceptos" />
      </Tabs>

      {tab === 1 && <FinancialEvaluationConceptsEditor />}

      <Box sx={{ display: tab === 0 ? "block" : "none" }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <BandsEditor
        title="Capacidad de pago (ratio de flujo disponible / cuota propuesta)"
        thresholdField="min_ratio"
        thresholdLabel="Ratio mínimo (>=)"
        bands={config.capacity_bands}
        defaultScore={config.capacity_default_score}
        onChange={(bands) => updateField("capacity_bands", bands)}
        onDefaultScoreChange={(v) => updateField("capacity_default_score", v)}
      />

      <BandsEditor
        title="Endeudamiento (ratio de otras deudas / ingreso total)"
        thresholdField="max_ratio"
        thresholdLabel="Ratio máximo (<=)"
        bands={config.indebtedness_bands}
        defaultScore={config.indebtedness_default_score}
        onChange={(bands) => updateField("indebtedness_bands", bands)}
        onDefaultScoreChange={(v) => updateField("indebtedness_default_score", v)}
      />

      <BandsEditor
        title="Estabilidad (años en el negocio)"
        thresholdField="min_years"
        thresholdLabel="Años mínimos (>=)"
        bands={config.stability_bands}
        defaultScore={config.stability_default_score}
        onChange={(bands) => updateField("stability_bands", bands)}
        onDefaultScoreChange={(v) => updateField("stability_default_score", v)}
      />

      <BandsEditor
        title="Documentación (% de documentos requeridos verificados)"
        thresholdField="min_pct"
        thresholdLabel="% mínimo (>=, 0 a 1)"
        bands={config.documents_bands}
        defaultScore={config.documents_default_score}
        onChange={(bands) => updateField("documents_bands", bands)}
        onDefaultScoreChange={(v) => updateField("documents_default_score", v)}
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Voluntad de pago
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Referencias: FAVORABLE"
              type="number"
              size="small"
              fullWidth
              value={config.willingness_references_scores.FAVORABLE ?? 0}
              onChange={(e) => updateScoreMapField("willingness_references_scores", "FAVORABLE", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Referencias: REGULAR"
              type="number"
              size="small"
              fullWidth
              value={config.willingness_references_scores.REGULAR ?? 0}
              onChange={(e) => updateScoreMapField("willingness_references_scores", "REGULAR", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Buró: LIMPIO"
              type="number"
              size="small"
              fullWidth
              value={config.willingness_bureau_scores.LIMPIO ?? 0}
              onChange={(e) => updateScoreMapField("willingness_bureau_scores", "LIMPIO", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Buró: OBSERVADO"
              type="number"
              size="small"
              fullWidth
              value={config.willingness_bureau_scores.OBSERVADO ?? 0}
              onChange={(e) => updateScoreMapField("willingness_bureau_scores", "OBSERVADO", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Puntos por defecto (otras opciones)"
              type="number"
              size="small"
              fullWidth
              value={config.willingness_default_score}
              onChange={(e) => updateField("willingness_default_score", Number(e.target.value))}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Umbral de aprobación
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Score mínimo para aprobar (0-100)"
              type="number"
              size="small"
              fullWidth
              value={config.minimum_score_required}
              onChange={(e) => updateField("minimum_score_required", Number(e.target.value))}
              helperText="Un crédito con score menor a este valor no puede aprobarse, ni desde la pantalla ni por API."
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Ratio de capacidad mínimo para no rechazar"
              type="number"
              size="small"
              fullWidth
              value={config.recommendation_reject_if_capacity_ratio_below}
              onChange={(e) => updateField("recommendation_reject_if_capacity_ratio_below", Number(e.target.value))}
              helperText="Si el flujo disponible / cuota propuesta es menor a este valor, se recomienda RECHAZAR sin importar el score."
            />
          </Grid>
        </Grid>
      </Paper>

      <Divider sx={{ my: 2 }} />

      <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={saving}>
        Guardar configuración
      </Button>
      </Box>
    </Box>
  );
}
