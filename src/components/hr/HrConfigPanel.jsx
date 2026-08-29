import React, { useEffect, useRef, useState } from "react";
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
  ToggleButtonGroup,
  ToggleButton,
  Select,
  Tooltip,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionIcon from "@mui/icons-material/Description";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignJustifyIcon from "@mui/icons-material/FormatAlignJustify";
import API from "../../api";
import { interpolate } from "../../reports/reportUtils";
import {
  buildContractTemplateData,
  buildWorkCertificateTemplateData,
  buildSalaryCertificateTemplateData,
} from "../../reports/hrDocumentTemplateData";

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

const TEMPLATE_TITLES = {
  CONTRATO: "Contrato Individual de Trabajo",
  CONSTANCIA: "Constancia Laboral",
  CARTA_SALARIAL: "Carta Salarial",
};

// Campos disponibles por tipo de plantilla, con nombre y explicación en
// español para que un administrador de RRHH sin conocimientos técnicos
// entienda qué hace cada uno. Los valores se sustituyen automáticamente
// con los datos reales del empleado al imprimir (ver
// src/reports/reportUtils.js::interpolate y hrDocumentTemplateData.js).
const TEMPLATE_PLACEHOLDERS = {
  CONTRATO: [
    { token: "empresa", label: "Nombre de la empresa" },
    { token: "ruc", label: "RUC de la empresa" },
    { token: "nombre", label: "Nombre del empleado" },
    { token: "cedula", label: "Cédula del empleado" },
    { token: "puesto", label: "Puesto del empleado" },
    { token: "tipo_contrato", label: "Tipo de contrato" },
    { token: "fecha_ingreso", label: "Fecha de ingreso" },
    { token: "fecha_fin_contrato", label: "Fecha de fin de contrato (si aplica)" },
    { token: "salario", label: "Salario mensual" },
  ],
  CONSTANCIA: [
    { token: "empresa", label: "Nombre de la empresa" },
    { token: "ruc", label: "RUC de la empresa" },
    { token: "nombre", label: "Nombre del empleado" },
    { token: "cedula", label: "Cédula del empleado" },
    { token: "fecha_ingreso", label: "Fecha de ingreso" },
    { token: "verbo", label: "Dice \"labora\" o \"laboró\" automáticamente" },
    { token: "periodo", label: "Dice \"a la fecha\" o la fecha de salida, automático" },
    { token: "puesto", label: "Puesto del empleado" },
    { token: "frase_salario", label: "Menciona el salario — desaparece sola si el empleado ya no está activo" },
    { token: "fecha_hoy", label: "Fecha de hoy" },
  ],
  CARTA_SALARIAL: [
    { token: "empresa", label: "Nombre de la empresa" },
    { token: "ruc", label: "RUC de la empresa" },
    { token: "nombre", label: "Nombre del empleado" },
    { token: "cedula", label: "Cédula del empleado" },
    { token: "fecha_ingreso", label: "Fecha de ingreso" },
    { token: "verbo", label: "Dice \"labora\" o \"laboró\" automáticamente" },
    { token: "periodo", label: "Dice \"a la fecha\" o la fecha de salida, automático" },
    { token: "puesto", label: "Puesto del empleado" },
    { token: "frase_salario", label: "Menciona el salario — desaparece sola si el empleado ya no está activo" },
    { token: "fecha_hoy", label: "Fecha de hoy" },
  ],
};

// Empleado y empresa de ejemplo para la vista previa del editor — así un
// administrador puede ver el resultado real antes de guardar, sin
// depender de datos de un empleado verdadero.
const SAMPLE_COMPANY = { legal_name: "Financiera Ejemplo, S.A.", commercial_name: "Financiera Ejemplo", tax_id: "J0310000012345" };
const SAMPLE_EMPLOYEE = {
  full_name: "Juan Pérez López",
  id_card: "001-010190-0001A",
  position: "Analista de Créditos",
  hire_date: "2022-03-15",
  base_salary: 15000,
  status: "ACTIVO",
  contract_type: "INDEFINIDO",
};

const SAMPLE_DATA_BUILDERS = {
  CONTRATO: () => buildContractTemplateData({ company: SAMPLE_COMPANY, employee: SAMPLE_EMPLOYEE }),
  CONSTANCIA: () => buildWorkCertificateTemplateData({ company: SAMPLE_COMPANY, employee: SAMPLE_EMPLOYEE, today: "18/08/2026" }),
  CARTA_SALARIAL: () => buildSalaryCertificateTemplateData({ company: SAMPLE_COMPANY, employee: SAMPLE_EMPLOYEE, today: "18/08/2026" }),
};

const FONT_FAMILIES = ["Arial", "Georgia", "Times New Roman", "Verdana", "Courier New"];
const FONT_SIZE_OPTIONS = [
  { label: "Pequeño", legacy: "2", px: "13px" },
  { label: "Normal", legacy: "3", px: "16px" },
  { label: "Grande", legacy: "5", px: "24px" },
  { label: "Muy grande", legacy: "7", px: "48px" },
];
const FONT_SIZE_PX_BY_LEGACY = FONT_SIZE_OPTIONS.reduce((acc, o) => ({ ...acc, [o.legacy]: o.px }), {});

// document.execCommand('fontName'/'fontSize', ...) produce <font face=""
// size=""> — una etiqueta obsoleta cuya presentación por defecto tiene
// menor prioridad que cualquier regla de la hoja de estilos del reporte
// (reportStyles.js define font-family/font-size en varios selectores).
// La convertimos a <span style="..."> con estilo en línea, que sí gana
// siempre, para que lo que el usuario elige en la barra de herramientas
// se respete tanto en la vista previa como en el documento impreso.
const normalizeFontTags = (root) => {
  if (!root) return;
  root.querySelectorAll("font").forEach((el) => {
    const span = document.createElement("span");
    const size = el.getAttribute("size");
    const face = el.getAttribute("face");
    if (size && FONT_SIZE_PX_BY_LEGACY[size]) span.style.fontSize = FONT_SIZE_PX_BY_LEGACY[size];
    if (face) span.style.fontFamily = face;
    while (el.firstChild) span.appendChild(el.firstChild);
    el.replaceWith(span);
  });
};

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

  const [templates, setTemplates] = useState([]);
  const [templateDialogType, setTemplateDialogType] = useState(null);
  const [templateBody, setTemplateBody] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const initialTemplateBodyRef = useRef("");
  const templateEditorRef = useRef(null);
  const savedSelectionRef = useRef(null);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchAll = async () => {
    try {
      const [cfgRes, bracketsRes, conceptsRes, templatesRes] = await Promise.all([
        API.get("/api/hr/config"),
        API.get("/api/hr/ir-brackets"),
        API.get("/api/hr/concepts"),
        API.get("/api/hr/document-templates"),
      ]);
      setConfig(cfgRes.data?.data || {});
      setEffectiveDate(bracketsRes.data?.data?.effective_date || "");
      setBrackets(bracketsRes.data?.data?.brackets || []);
      setConcepts(conceptsRes.data?.data || []);
      setTemplates(templatesRes.data?.data || []);
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

  const handleOpenTemplateEditor = (template) => {
    setTemplateDialogType(template.template_type);
    setTemplateBody(template.body_html);
    initialTemplateBodyRef.current = template.body_html;
    setShowTemplatePreview(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateBody.replace(/<[^>]*>/g, "").trim()) {
      showAlert("El contenido de la plantilla no puede estar vacío", "error");
      return;
    }
    try {
      setSavingTemplate(true);
      await API.put(`/api/hr/document-templates/${templateDialogType}`, { body_html: templateBody });
      showAlert("Plantilla actualizada correctamente");
      setTemplateDialogType(null);
      fetchAll();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar la plantilla", "error");
    } finally {
      setSavingTemplate(false);
    }
  };

  // Editor de texto enriquecido (barra de herramientas) para el cuerpo de
  // la plantilla — evita que el usuario tenga que ver o escribir HTML.
  // Guardamos la selección al salir del área editable (blur/mouseup/
  // keyup) porque los controles de la barra (botones, selects) le quitan
  // el foco al hacer clic; sin restaurarla antes de cada comando,
  // negrita/fuente/tamaño se aplicarían al lugar equivocado del texto.
  const saveTemplateSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && templateEditorRef.current && templateEditorRef.current.contains(sel.anchorNode)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreTemplateSelection = () => {
    const el = templateEditorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (savedSelectionRef.current && el.contains(savedSelectionRef.current.startContainer)) {
      sel.addRange(savedSelectionRef.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.addRange(range);
    }
  };

  const syncTemplateBodyFromEditor = () => {
    if (templateEditorRef.current) setTemplateBody(templateEditorRef.current.innerHTML);
  };

  const execTemplateCommand = (command, value = null) => {
    restoreTemplateSelection();
    document.execCommand(command, false, value);
    normalizeFontTags(templateEditorRef.current);
    syncTemplateBodyFromEditor();
  };

  const insertTemplatePlaceholder = (token) => {
    restoreTemplateSelection();
    document.execCommand("insertText", false, `{{${token}}}`);
    syncTemplateBodyFromEditor();
  };

  const templatePreviewHtml = templateDialogType
    ? interpolate(templateBody, SAMPLE_DATA_BUILDERS[templateDialogType]())
    : "";

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

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <DescriptionIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Plantillas de documentos</Typography>
            <Typography variant="body2" color="text.secondary">
              Contrato, constancia laboral y carta salarial — edite el texto para agregar o quitar cláusulas
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 1 }} />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Documento</TableCell>
              <TableCell>Última actualización</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.template_type}>
                <TableCell>{t.title || TEMPLATE_TITLES[t.template_type]}</TableCell>
                <TableCell>{t.updated_at ? String(t.updated_at).slice(0, 10) : "-"}</TableCell>
                <TableCell align="right">
                  <Button size="small" startIcon={<EditIcon />} sx={{ textTransform: "none" }} onClick={() => handleOpenTemplateEditor(t)}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={Boolean(templateDialogType)} onClose={() => setTemplateDialogType(null)} maxWidth="md" fullWidth>
        <DialogTitle>Editar plantilla — {TEMPLATE_TITLES[templateDialogType]}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Escriba el texto igual que en un procesador de texto. Haga clic en un campo de abajo para insertarlo
            donde tenga el cursor — se completa solo con el dato real de cada empleado al imprimir.
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.5 }}>
            {(TEMPLATE_PLACEHOLDERS[templateDialogType] || []).map((p) => (
              <Tooltip key={p.token} title={p.label}>
                <Chip
                  size="small"
                  label={p.label}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertTemplatePlaceholder(p.token)}
                  sx={{ cursor: "pointer" }}
                  color="primary"
                  variant="outlined"
                />
              </Tooltip>
            ))}
          </Box>

          <Box
            sx={{
              display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5,
              border: "1px solid #D8E2F0", borderBottom: "none", borderRadius: "8px 8px 0 0",
              background: "#F8FAFC", p: 0.5,
            }}
          >
            <ToggleButtonGroup size="small" onMouseDown={(e) => e.preventDefault()}>
              <ToggleButton value="bold" onClick={() => execTemplateCommand("bold")}>
                <FormatBoldIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="italic" onClick={() => execTemplateCommand("italic")}>
                <FormatItalicIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="underline" onClick={() => execTemplateCommand("underline")}>
                <FormatUnderlinedIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <ToggleButtonGroup size="small" onMouseDown={(e) => e.preventDefault()}>
              <ToggleButton value="left" onClick={() => execTemplateCommand("justifyLeft")}>
                <FormatAlignLeftIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="center" onClick={() => execTemplateCommand("justifyCenter")}>
                <FormatAlignCenterIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="justify" onClick={() => execTemplateCommand("justifyFull")}>
                <FormatAlignJustifyIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Select
              size="small" displayEmpty defaultValue=""
              onMouseDown={saveTemplateSelection}
              onChange={(e) => execTemplateCommand("fontName", e.target.value)}
              sx={{ minWidth: 130, background: "#fff" }}
            >
              <MenuItem value="" disabled>Tipo de letra</MenuItem>
              {FONT_FAMILIES.map((f) => (
                <MenuItem key={f} value={f} sx={{ fontFamily: f }}>{f}</MenuItem>
              ))}
            </Select>

            <Select
              size="small" displayEmpty defaultValue=""
              onMouseDown={saveTemplateSelection}
              onChange={(e) => execTemplateCommand("fontSize", e.target.value)}
              sx={{ minWidth: 110, background: "#fff" }}
            >
              <MenuItem value="" disabled>Tamaño</MenuItem>
              {FONT_SIZE_OPTIONS.map((o) => (
                <MenuItem key={o.legacy} value={o.legacy}>{o.label}</MenuItem>
              ))}
            </Select>

            <Box sx={{ flex: 1 }} />

            <Button
              size="small" sx={{ textTransform: "none" }}
              onClick={() => setShowTemplatePreview((v) => !v)}
            >
              {showTemplatePreview ? "Ocultar vista previa" : "Vista previa"}
            </Button>
          </Box>

          <Box
            key={templateDialogType}
            ref={templateEditorRef}
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: initialTemplateBodyRef.current }}
            onInput={syncTemplateBodyFromEditor}
            onBlur={saveTemplateSelection}
            onMouseUp={saveTemplateSelection}
            onKeyUp={saveTemplateSelection}
            sx={{
              border: "1px solid #D8E2F0", borderRadius: "0 0 8px 8px",
              background: "#fff", p: 3, minHeight: 260, maxHeight: 420, overflowY: "auto",
              fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.8, color: "#0F172A",
              "&:focus": { outline: "none" },
              "& p": { margin: "0 0 10px 0" },
            }}
          />

          {showTemplatePreview && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Vista previa con datos de ejemplo:
              </Typography>
              <Box
                sx={{
                  border: "1px dashed #94A3B8", borderRadius: 2, background: "#F8FAFC",
                  p: 3, fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.8, color: "#0F172A",
                  "& p": { margin: "0 0 10px 0" },
                }}
                dangerouslySetInnerHTML={{ __html: templatePreviewHtml }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogType(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" startIcon={<SaveIcon />} disabled={savingTemplate} onClick={handleSaveTemplate} sx={{ textTransform: "none" }}>
            {savingTemplate ? "Guardando..." : "Guardar plantilla"}
          </Button>
        </DialogActions>
      </Dialog>

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
