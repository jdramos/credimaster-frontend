import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, IconButton, MenuItem, Snackbar, Stack, Switch, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import ReportExportButtons from "../common/ReportExportButtons";
import ConfirmDialog from "../ConfirmDialog";
import {
  ENTITY_LABELS, FIELD_TYPES, FIELD_TYPE_LABELS, KEY_PATTERN, SECTIONS, buildDefinitionsReport, suggestKey,
} from "./customFieldsShared";

const ENTITIES = ["CUSTOMER", "LOAN"];

const emptyForm = (entity, nextOrder) => ({
  id: null,
  entity,
  label: "",
  field_key: "",
  keyTouched: false,
  field_type: "TEXT",
  optionsText: "",
  is_required: false,
  section: Object.keys(SECTIONS[entity])[0],
  sort_order: nextOrder,
  is_active: true,
  help_text: "",
  value_count: 0,
});

const formFromRow = (row) => ({
  id: row.id,
  entity: row.entity,
  label: row.label,
  field_key: row.field_key,
  keyTouched: true,
  field_type: row.field_type,
  optionsText: (row.options || []).join("\n"),
  is_required: Number(row.is_required) === 1,
  section: row.section,
  sort_order: row.sort_order,
  is_active: Number(row.is_active) === 1,
  help_text: row.help_text || "",
  value_count: Number(row.value_count || 0),
});

const optionsFromText = (text) =>
  String(text || "")
    .split(/\r?\n/)
    .map((o) => o.trim())
    .filter(Boolean);

// Errores del formulario antes de enviarlo (el backend vuelve a validar).
export const validateDefinitionForm = (form) => {
  const errors = {};
  if (!form.label.trim()) errors.label = "El nombre es obligatorio";
  if (!form.id && !KEY_PATTERN.test(form.field_key)) {
    errors.field_key = "Empiece con letra; use minúsculas, números y guion bajo (2 a 50)";
  }
  if (form.field_type === "LIST" && !optionsFromText(form.optionsText).length) {
    errors.options = "Escriba al menos una opción (una por línea)";
  }
  const order = Number(form.sort_order);
  if (!Number.isInteger(order) || order < 0 || order > 9999) errors.sort_order = "Entero entre 0 y 9999";
  return errors;
};

export default function CustomFieldsManager() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canManage = Number(role) === 1 || permissions.includes("configuracion.campos_personalizados.gestionar");

  const [entity, setEntity] = useState("CUSTOMER");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [message, setMessage] = useState({ open: false, type: "success", text: "" });

  const notify = (text, type = "success") => setMessage({ open: true, type, text });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await API.get("/api/custom-fields/definitions");
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setLoadError(err?.response?.data?.message || "No se pudieron cargar los campos personalizados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) load();
    else setLoading(false);
  }, [canManage, load]);

  const entityRows = useMemo(
    () => rows.filter((r) => r.entity === entity).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [rows, entity],
  );

  const nextOrder = entityRows.length ? Math.max(...entityRows.map((r) => Number(r.sort_order) || 0)) + 10 : 10;

  const updateForm = (patch) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (!prev.id && patch.label !== undefined && !prev.keyTouched) next.field_key = suggestKey(patch.label);
      return next;
    });
  };

  const save = async () => {
    const errors = validateDefinitionForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const body = {
      entity: form.entity,
      label: form.label.trim(),
      field_key: form.field_key,
      field_type: form.field_type,
      options: form.field_type === "LIST" ? optionsFromText(form.optionsText) : null,
      is_required: form.is_required,
      section: form.section,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
      help_text: form.help_text.trim() || null,
    };

    setSaving(true);
    try {
      if (form.id) await API.put(`/api/custom-fields/definitions/${form.id}`, body);
      else await API.post("/api/custom-fields/definitions", body);
      notify(form.id ? "Campo actualizado." : "Campo creado.");
      setForm(null);
      await load();
    } catch (err) {
      const data = err?.response?.data || {};
      const serverErrors = {};
      (data.errors || []).forEach((e) => {
        serverErrors[e.field] = e.message;
      });
      setFormErrors(serverErrors);
      notify(data.message || "No se pudo guardar el campo.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      await API.put(`/api/custom-fields/definitions/${row.id}`, { is_active: Number(row.is_active) !== 1 });
      notify(Number(row.is_active) === 1 ? "Campo desactivado: sus datos se conservan." : "Campo activado.");
      await load();
    } catch (err) {
      notify(err?.response?.data?.message || "No se pudo cambiar el estado.", "error");
    }
  };

  const confirmDelete = async () => {
    const row = toDelete;
    setToDelete(null);
    try {
      await API.delete(`/api/custom-fields/definitions/${row.id}`);
      notify("Campo eliminado.");
      await load();
    } catch (err) {
      notify(err?.response?.data?.message || "No se pudo eliminar el campo.", "error");
    }
  };

  if (!canManage) {
    return <Alert severity="warning">No tiene permiso para configurar los campos personalizados.</Alert>;
  }

  const sections = SECTIONS[entity];
  const editingHasData = Boolean(form?.id) && form.value_count > 0;

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TuneRoundedIcon color="primary" />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Campos personalizados</Typography>
                <Typography variant="body2" color="text.secondary">
                  Datos adicionales que la empresa pide en la ficha del cliente y en la solicitud de crédito. Aparecen en el
                  formulario, el detalle y CrediMaster Studio.
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <ReportExportButtons report={() => buildDefinitionsReport(entity, entityRows)} disabled={loading} size="small" />
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => {
                  setFormErrors({});
                  setForm(emptyForm(entity, nextOrder));
                }}
                sx={{ textTransform: "none", fontWeight: 800 }}
              >
                Nuevo campo
              </Button>
            </Stack>
          </Stack>

          <Tabs value={entity} onChange={(_, value) => setEntity(value)} sx={{ mt: 2, borderBottom: 1, borderColor: "divider" }}>
            {ENTITIES.map((e) => (
              <Tab key={e} value={e} label={`${ENTITY_LABELS[e]} (${rows.filter((r) => r.entity === e).length})`} sx={{ textTransform: "none", fontWeight: 800 }} />
            ))}
          </Tabs>

          {loadError && <Alert severity="error" sx={{ mt: 2 }}>{loadError}</Alert>}

          {loading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : entityRows.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No hay campos personalizados de {ENTITY_LABELS[entity].toLowerCase()}. Use “Nuevo campo” para agregar uno.
            </Alert>
          ) : (
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right">Orden</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Clave interna</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Sección</TableCell>
                    <TableCell>Obligatorio</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Registros con dato</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entityRows.map((row) => {
                    const active = Number(row.is_active) === 1;
                    const hasData = Number(row.value_count || 0) > 0;
                    return (
                      <TableRow key={row.id} hover sx={{ opacity: active ? 1 : 0.6 }}>
                        <TableCell align="right">{row.sort_order}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {row.label}
                          {row.field_type === "LIST" && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {(row.options || []).join(" · ")}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell><code>{row.field_key}</code></TableCell>
                        <TableCell>{FIELD_TYPE_LABELS[row.field_type]}</TableCell>
                        <TableCell>{sections[row.section] || row.section}</TableCell>
                        <TableCell>{Number(row.is_required) === 1 ? "Sí" : "No"}</TableCell>
                        <TableCell>
                          <Chip size="small" label={active ? "Activo" : "Inactivo"} color={active ? "success" : "default"} />
                        </TableCell>
                        <TableCell align="right">{Number(row.value_count || 0)}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => { setFormErrors({}); setForm(formFromRow(row)); }} aria-label={`Editar ${row.label}`}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={active ? "Desactivar (se conservan los datos)" : "Activar"}>
                            <Switch size="small" checked={active} onChange={() => toggleActive(row)} inputProps={{ "aria-label": `Activo ${row.label}` }} />
                          </Tooltip>
                          <Tooltip title={hasData ? "Tiene datos: no se puede eliminar, desactívelo" : "Eliminar"}>
                            <span>
                              <IconButton size="small" color="error" disabled={hasData} onClick={() => setToDelete(row)} aria-label={`Eliminar ${row.label}`}>
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(form)} onClose={() => !saving && setForm(null)} maxWidth="sm" fullWidth>
        {form && (
          <>
            <DialogTitle sx={{ fontWeight: 900 }}>
              {form.id ? "Editar campo" : "Nuevo campo"} — {ENTITY_LABELS[form.entity]}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <TextField
                  label="Nombre (etiqueta) *"
                  value={form.label}
                  onChange={(e) => updateForm({ label: e.target.value })}
                  error={Boolean(formErrors.label)}
                  helperText={formErrors.label}
                  inputProps={{ maxLength: 120, "data-testid": "cf-label" }}
                  size="small"
                  fullWidth
                  autoFocus
                />
                <TextField
                  label="Clave interna *"
                  value={form.field_key}
                  onChange={(e) => updateForm({ field_key: e.target.value.toLowerCase(), keyTouched: true })}
                  disabled={Boolean(form.id)}
                  error={Boolean(formErrors.field_key)}
                  helperText={formErrors.field_key || (form.id ? "La clave no cambia una vez creado el campo." : "Se usa en reportes de Studio; no se puede cambiar después.")}
                  inputProps={{ maxLength: 50, "data-testid": "cf-key" }}
                  size="small"
                  fullWidth
                />
                <TextField
                  select
                  label="Tipo *"
                  value={form.field_type}
                  onChange={(e) => updateForm({ field_type: e.target.value })}
                  disabled={editingHasData}
                  error={Boolean(formErrors.field_type)}
                  helperText={formErrors.field_type || (editingHasData ? "El campo ya tiene datos: el tipo no se puede cambiar." : "")}
                  size="small"
                  fullWidth
                >
                  {FIELD_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </TextField>
                {form.field_type === "LIST" && (
                  <TextField
                    label="Opciones (una por línea) *"
                    value={form.optionsText}
                    onChange={(e) => updateForm({ optionsText: e.target.value })}
                    error={Boolean(formErrors.options)}
                    helperText={formErrors.options || "Una opción que ya tiene datos no se puede quitar."}
                    multiline
                    minRows={3}
                    inputProps={{ "data-testid": "cf-options" }}
                    size="small"
                    fullWidth
                  />
                )}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    select
                    label="Sección del formulario *"
                    value={form.section}
                    onChange={(e) => updateForm({ section: e.target.value })}
                    error={Boolean(formErrors.section)}
                    helperText={formErrors.section}
                    size="small"
                    fullWidth
                  >
                    {Object.entries(SECTIONS[form.entity]).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
                  </TextField>
                  <TextField
                    label="Orden"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => updateForm({ sort_order: e.target.value })}
                    error={Boolean(formErrors.sort_order)}
                    helperText={formErrors.sort_order}
                    size="small"
                    sx={{ width: { sm: 140 } }}
                  />
                </Stack>
                <TextField
                  label="Texto de ayuda"
                  value={form.help_text}
                  onChange={(e) => updateForm({ help_text: e.target.value })}
                  inputProps={{ maxLength: 255 }}
                  size="small"
                  fullWidth
                />
                <Stack direction="row" spacing={3}>
                  <FormControlLabel
                    control={<Switch checked={form.is_required} onChange={(e) => updateForm({ is_required: e.target.checked })} />}
                    label="Obligatorio"
                  />
                  <FormControlLabel
                    control={<Switch checked={form.is_active} onChange={(e) => updateForm({ is_active: e.target.checked })} />}
                    label="Activo"
                  />
                </Stack>
                {form.is_required && (
                  <Alert severity="info">
                    Un campo obligatorio se exige al registrar o editar en la web. Los clientes y créditos ya registrados se
                    lo pedirán la próxima vez que se editen.
                  </Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setForm(null)} disabled={saving}>Cancelar</Button>
              <Button variant="contained" onClick={save} disabled={saving} data-testid="cf-save">
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(toDelete)}
        type="error"
        title="Eliminar campo"
        message={toDelete ? `¿Eliminar el campo "${toDelete.label}"? No tiene datos guardados.` : ""}
        confirmText="Sí, eliminar"
        cancelText="No"
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <Snackbar open={message.open} autoHideDuration={4000} onClose={() => setMessage((m) => ({ ...m, open: false }))}>
        <Alert severity={message.type} onClose={() => setMessage((m) => ({ ...m, open: false }))}>{message.text}</Alert>
      </Snackbar>
    </Box>
  );
}
