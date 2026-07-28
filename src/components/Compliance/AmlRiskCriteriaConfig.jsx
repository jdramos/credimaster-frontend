import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Switch,
  Button,
  Alert,
  Snackbar,
  Stack,
  Autocomplete,
  IconButton,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import API from "../../api";

export default function AmlRiskCriteriaConfig() {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [activities, setActivities] = useState([]);
  const [activityOptions, setActivityOptions] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const [zones, setZones] = useState([]);
  const [municipalityOptions, setMunicipalityOptions] = useState([]);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const loadCriteria = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/api/aml/risk-criteria");
      setCriteria(Array.isArray(data) ? data : []);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al cargar los criterios", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const { data } = await API.get("/api/aml/high-risk-activities");
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadZones = async () => {
    try {
      const { data } = await API.get("/api/aml/high-risk-zones");
      setZones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCriteria();
    loadActivities();
    loadZones();
    API.get("/api/conami/economic_activities")
      .then(({ data }) => setActivityOptions(Array.isArray(data) ? data : data?.data || []))
      .catch(() => setActivityOptions([]));
    API.get("/api/municipalities")
      .then(({ data }) => setMunicipalityOptions(Array.isArray(data) ? data : data?.data || []))
      .catch(() => setMunicipalityOptions([]));
    API.get("/api/provinces")
      .then(({ data }) => setProvinceOptions(Array.isArray(data) ? data : data?.data || []))
      .catch(() => setProvinceOptions([]));
  }, []);

  const handleCriterionChange = (id, field, value) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleSaveCriterion = async (criterion) => {
    try {
      await API.put(`/api/aml/risk-criteria/${criterion.id}`, {
        points: Number(criterion.points),
        active: Boolean(criterion.active),
      });
      showAlert("Criterio actualizado");
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al actualizar el criterio", "error");
    }
  };

  const handleAddActivity = async () => {
    if (!selectedActivity) return;
    try {
      await API.post("/api/aml/high-risk-activities", {
        economic_activity_id: selectedActivity.id,
      });
      setSelectedActivity(null);
      await loadActivities();
      showAlert("Actividad agregada");
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al agregar la actividad", "error");
    }
  };

  const handleRemoveActivity = async (id) => {
    try {
      await API.delete(`/api/aml/high-risk-activities/${id}`);
      await loadActivities();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al remover la actividad", "error");
    }
  };

  const handleAddZone = async () => {
    if (!selectedMunicipality && !selectedProvince) return;
    try {
      await API.post("/api/aml/high-risk-zones", {
        municipality_id: selectedMunicipality?.id || null,
        province_id: selectedMunicipality ? null : selectedProvince?.id || null,
      });
      setSelectedMunicipality(null);
      setSelectedProvince(null);
      await loadZones();
      showAlert("Zona agregada");
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al agregar la zona", "error");
    }
  };

  const handleRemoveZone = async (id) => {
    try {
      await API.delete(`/api/aml/high-risk-zones/${id}`);
      await loadZones();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al remover la zona", "error");
    }
  };

  return (
    <Box p={2}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight={800} mb={1}>
          Matriz de Riesgo LA/FT/FP — Criterios
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Puntaje por factor y umbrales que determinan la clasificación BAJO/MEDIO/ALTO de cada
          cliente. PEP y coincidencia de sanciones siempre clasifican ALTO riesgo, sin importar el
          puntaje.
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Puntos</TableCell>
                <TableCell align="center">Activo</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {criteria.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.label}</TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      value={c.points}
                      onChange={(e) => handleCriterionChange(c.id, "points", e.target.value)}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={Boolean(c.active)}
                      onChange={(e) => handleCriterionChange(c.id, "active", e.target.checked)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="outlined" onClick={() => handleSaveCriterion(c)}>
                      Guardar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && criteria.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Sin criterios configurados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} mb={1}>
          Actividades económicas de alto riesgo
        </Typography>
        <Stack direction="row" spacing={1} mb={2} alignItems="center">
          <Autocomplete
            options={activityOptions}
            getOptionLabel={(o) => o.description || ""}
            value={selectedActivity}
            onChange={(e, v) => setSelectedActivity(v)}
            sx={{ minWidth: 320 }}
            renderInput={(params) => <TextField {...params} label="Actividad económica" size="small" />}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddActivity}>
            Agregar
          </Button>
        </Stack>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={0.5}>
          {activities.map((a) => (
            <Stack key={a.id} direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">{a.activity_name || `#${a.economic_activity_id}`}</Typography>
              <IconButton size="small" color="error" onClick={() => handleRemoveActivity(a.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          {activities.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Sin actividades marcadas como alto riesgo.
            </Typography>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} mb={1}>
          Zonas geográficas de alto riesgo
        </Typography>
        <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap">
          <Autocomplete
            options={municipalityOptions}
            getOptionLabel={(o) => o.name || ""}
            value={selectedMunicipality}
            onChange={(e, v) => {
              setSelectedMunicipality(v);
              if (v) setSelectedProvince(null);
            }}
            sx={{ minWidth: 260 }}
            renderInput={(params) => <TextField {...params} label="Municipio" size="small" />}
          />
          <Typography variant="body2" color="text.secondary">
            o
          </Typography>
          <Autocomplete
            options={provinceOptions}
            getOptionLabel={(o) => o.name || ""}
            value={selectedProvince}
            onChange={(e, v) => {
              setSelectedProvince(v);
              if (v) setSelectedMunicipality(null);
            }}
            sx={{ minWidth: 260 }}
            renderInput={(params) => <TextField {...params} label="Departamento" size="small" />}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddZone}>
            Agregar
          </Button>
        </Stack>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={0.5}>
          {zones.map((z) => (
            <Stack key={z.id} direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">
                {z.municipality_name || z.province_name || "-"}
              </Typography>
              <IconButton size="small" color="error" onClick={() => handleRemoveZone(z.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          {zones.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Sin zonas marcadas como alto riesgo.
            </Typography>
          )}
        </Stack>
      </Paper>

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
