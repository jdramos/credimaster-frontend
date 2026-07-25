import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Alert,
  Snackbar,
  Button,
  Grid,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import API from "../../api";

const CONFIG_LABELS = {
  inss_laboral_pct: "INSS laboral (%)",
  inss_patronal_pct_base: "INSS patronal, <50 empleados (%)",
  inss_patronal_pct_alto: "INSS patronal, ≥50 empleados (%)",
  inss_patronal_umbral_empleados: "Umbral de empleados para INSS patronal alto",
  inatec_pct: "INATEC (%)",
  vacaciones_dias_por_mes: "Vacaciones acumuladas por mes (días)",
  aguinaldo_meses_base: "Meses base para aguinaldo",
  indemnizacion_tope_meses: "Tope de indemnización (meses de salario)",
  periodo_tipo: "Tipo de período de pago",
};

const emptyConceptForm = { code: "", name: "", type: "DEDUCCION", calc_method: "MANUAL" };

export default function HrConfigPanel() {
  const [config, setConfig] = useState({});
  const [brackets, setBrackets] = useState([]);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [concepts, setConcepts] = useState([]);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingBrackets, setSavingBrackets] = useState(false);
  const [conceptDialogOpen, setConceptDialogOpen] = useState(false);
  const [conceptForm, setConceptForm] = useState(emptyConceptForm);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchAll = async () => {
    try {
      const [cfgRes, bracketsRes, conceptsRes] = await Promise.all([
        API.get("/api/hr/config"),
        API.get("/api/hr/ir-brackets"),
        API.get("/api/hr/concepts"),
      ]);
      setConfig(cfgRes.data?.data || {});
      setEffectiveDate(bracketsRes.data?.data?.effective_date || "");
      setBrackets(bracketsRes.data?.data?.brackets || []);
      setConcepts(conceptsRes.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar la configuración de RRHH", "error");
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleConfigChange = (key, value) => setConfig((c) => ({ ...c, [key]: value }));

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      await API.put("/api/hr/config", config);
      showAlert("Configuración actualizada correctamente");
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar la configuración", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleBracketChange = (index, field, value) => {
    setBrackets((rows) => rows.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  };

  const addBracket = () => {
    setBrackets((rows) => [
      ...rows,
      { bracket_order: rows.length + 1, from_amount: "0", to_amount: "", base_tax: "0", marginal_rate: "0" },
    ]);
  };

  const removeBracket = (index) => setBrackets((rows) => rows.filter((_, i) => i !== index));

  const handleSaveBrackets = async () => {
    if (!effectiveDate) {
      showAlert("Indique la fecha de vigencia de la tabla", "error");
      return;
    }
    try {
      setSavingBrackets(true);
      await API.put("/api/hr/ir-brackets", {
        effective_date: effectiveDate,
        brackets: brackets.map((b, i) => ({
          bracket_order: i + 1,
          from_amount: Number(b.from_amount || 0),
          to_amount: b.to_amount === "" || b.to_amount === null ? null : Number(b.to_amount),
          base_tax: Number(b.base_tax || 0),
          marginal_rate: Number(b.marginal_rate || 0),
        })),
      });
      showAlert("Tabla de IR actualizada correctamente");
      fetchAll();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar la tabla de IR", "error");
    } finally {
      setSavingBrackets(false);
    }
  };

  const handleCreateConcept = async () => {
    if (!conceptForm.code || !conceptForm.name) {
      showAlert("Complete el código y nombre del concepto", "error");
      return;
    }
    try {
      await API.post("/api/hr/concepts", conceptForm);
      showAlert("Concepto creado correctamente");
      setConceptDialogOpen(false);
      setConceptForm(emptyConceptForm);
      fetchAll();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al crear el concepto", "error");
    }
  };

  const toggleConceptStatus = async (concept) => {
    const newStatus = concept.status === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    try {
      await API.put(`/api/hr/concepts/${concept.id}`, { status: newStatus });
      fetchAll();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al actualizar el concepto", "error");
    }
  };

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <SettingsIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Configuración de RRHH</Typography>
            <Typography variant="body2" color="text.secondary">
              Tasas de INSS/INATEC, vacaciones, indemnización y demás parámetros de nómina
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {Object.keys(CONFIG_LABELS).map((key) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              {key === "periodo_tipo" ? (
                <TextField
                  select fullWidth size="small" label={CONFIG_LABELS[key]}
                  value={config[key] || "MENSUAL"}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                >
                  <MenuItem value="MENSUAL">Mensual</MenuItem>
                  <MenuItem value="QUINCENAL">Quincenal</MenuItem>
                </TextField>
              ) : (
                <TextField
                  fullWidth size="small" type="number" label={CONFIG_LABELS[key]}
                  value={config[key] ?? ""}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                />
              )}
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" startIcon={<SaveIcon />} sx={{ textTransform: "none" }} disabled={savingConfig} onClick={handleSaveConfig}>
            {savingConfig ? "Guardando..." : "Guardar configuración"}
          </Button>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Tabla de IR (renta del trabajo)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tramos anuales en córdobas. Art. 23 Ley 822, reformada por Ley 891.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth size="small" type="date" label="Vigente desde" InputLabelProps={{ shrink: true }}
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </Grid>
        </Grid>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tramo</TableCell>
              <TableCell>Desde (C$)</TableCell>
              <TableCell>Hasta (C$)</TableCell>
              <TableCell>Impuesto base (C$)</TableCell>
              <TableCell>% sobre exceso</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {brackets.map((b, i) => (
              <TableRow key={i}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  <TextField size="small" type="number" value={b.from_amount} onChange={(e) => handleBracketChange(i, "from_amount", e.target.value)} sx={{ width: 130 }} />
                </TableCell>
                <TableCell>
                  <TextField size="small" type="number" placeholder="Sin límite" value={b.to_amount ?? ""} onChange={(e) => handleBracketChange(i, "to_amount", e.target.value)} sx={{ width: 130 }} />
                </TableCell>
                <TableCell>
                  <TextField size="small" type="number" value={b.base_tax} onChange={(e) => handleBracketChange(i, "base_tax", e.target.value)} sx={{ width: 120 }} />
                </TableCell>
                <TableCell>
                  <TextField size="small" type="number" value={b.marginal_rate} onChange={(e) => handleBracketChange(i, "marginal_rate", e.target.value)} sx={{ width: 100 }} helperText="Ej: 0.15 = 15%" />
                </TableCell>
                <TableCell>
                  <Button size="small" color="error" sx={{ textTransform: "none" }} onClick={() => removeBracket(i)}>Quitar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
          <Button startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={addBracket}>Agregar tramo</Button>
          <Button variant="contained" startIcon={<SaveIcon />} sx={{ textTransform: "none" }} disabled={savingBrackets} onClick={handleSaveBrackets}>
            {savingBrackets ? "Guardando..." : "Guardar tabla de IR"}
          </Button>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6" fontWeight={700}>Conceptos de planilla</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={() => setConceptDialogOpen(true)}>
            Nuevo concepto
          </Button>
        </Box>
        <Divider sx={{ mb: 1 }} />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Origen</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {concepts.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.code}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>
                  <Chip size="small" label={c.type === "INGRESO" ? "Ingreso" : "Deducción"} color={c.type === "INGRESO" ? "success" : "warning"} />
                </TableCell>
                <TableCell>{c.is_legal ? "Legal" : "Personalizado"}</TableCell>
                <TableCell>
                  <Chip size="small" label={c.status === "ACTIVO" ? "Activo" : "Inactivo"} color={c.status === "ACTIVO" ? "success" : "default"} />
                </TableCell>
                <TableCell>
                  {!c.is_legal && (
                    <Button size="small" sx={{ textTransform: "none" }} onClick={() => toggleConceptStatus(c)}>
                      {c.status === "ACTIVO" ? "Inactivar" : "Activar"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={conceptDialogOpen} onClose={() => setConceptDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nuevo concepto de planilla</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              fullWidth size="small" label="Código" placeholder="Ej: BONO_PRODUCCION"
              value={conceptForm.code}
              onChange={(e) => setConceptForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, "_") }))}
            />
            <TextField
              fullWidth size="small" label="Nombre"
              value={conceptForm.name}
              onChange={(e) => setConceptForm((f) => ({ ...f, name: e.target.value }))}
            />
            <TextField
              select fullWidth size="small" label="Tipo"
              value={conceptForm.type}
              onChange={(e) => setConceptForm((f) => ({ ...f, type: e.target.value }))}
            >
              <MenuItem value="INGRESO">Ingreso</MenuItem>
              <MenuItem value="DEDUCCION">Deducción</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConceptDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateConcept} sx={{ textTransform: "none" }}>Crear</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
