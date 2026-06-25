import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  ArrowDownward,
  ArrowUpward,
  Delete,
  Edit,
  Preview,
  Save,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import API from "../../api";

const initialForm = {
  id: null,
  name: "",
  description: "",
  source_key: "",
  title: "",
  subtitle: "",
  orientation: "landscape",
  page_size: "letter",
  is_public: 0,
  fields: [],
};

const CustomReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [open, setOpen] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewColumns, setPreviewColumns] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const availableGroupedFields = useMemo(() => {
    const groups = {};

    if (!selectedSource?.fields) return groups;

    selectedSource.fields.forEach((sourceField) => {
      const category = sourceField.category || "General";

      if (!groups[category]) groups[category] = [];

      const selectedField = form.fields.find(
        (f) => f.field_name === sourceField.name,
      );

      groups[category].push({
        ...sourceField,
        visible: selectedField?.visible ?? 0,
        selected: !!selectedField?.visible,
      });
    });

    return groups;
  }, [selectedSource, form.fields]);

  const selectedFields = useMemo(() => {
    return form.fields
      .filter((field) => field.visible)
      .sort((a, b) => Number(a.order_no || 0) - Number(b.order_no || 0));
  }, [form.fields]);

  const toggleField = (sourceField, checked) => {
    setForm((prev) => {
      const exists = prev.fields.find(
        (field) => field.field_name === sourceField.name,
      );

      if (exists) {
        return {
          ...prev,
          fields: prev.fields.map((field) =>
            field.field_name === sourceField.name
              ? {
                  ...field,
                  visible: checked ? 1 : 0,
                }
              : field,
          ),
        };
      }

      return {
        ...prev,
        fields: [
          ...prev.fields,
          {
            field_name: sourceField.name,
            label: sourceField.label,
            visible: checked ? 1 : 0,
            width: "",
            align: sourceField.align || "left",
            format: sourceField.format || "",
            order_no: prev.fields.length,
          },
        ],
      };
    });
  };

  const removeSelectedField = (fieldName) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.field_name === fieldName
          ? {
              ...field,
              visible: 0,
            }
          : field,
      ),
    }));
  };

  const loadSources = async () => {
    const res = await API.get("/api/custom-reports/sources");
    setSources(res.data.data || []);
  };

  const loadReports = async () => {
    const res = await API.get("/api/custom-reports");
    setReports(res.data.data || []);
  };

  const loadInitial = async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.all([loadSources(), loadReports()]);
    } catch (err) {
      setError(err.response?.data?.message || "Error cargando reportes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const reportRows = useMemo(() => {
    return reports.map((r) => ({
      ...r,
      id: r.id,
    }));
  }, [reports]);

  const handleNew = () => {
    setForm(initialForm);
    setSelectedSource(null);
    setOpen(true);
    setError("");
    setSuccess("");
  };

  const handleEdit = async (row) => {
    try {
      setError("");
      const res = await API.get(`/api/custom-reports/${row.id}`);
      const data = res.data.data;

      const source = sources.find((s) => s.key === data.source_key);

      setSelectedSource(source || null);
      setForm({
        id: data.id,
        name: data.name || "",
        description: data.description || "",
        source_key: data.source_key || "",
        title: data.title || "",
        subtitle: data.subtitle || "",
        orientation: data.orientation || "landscape",
        page_size: data.page_size || "letter",
        is_public: data.is_public || 0,
        fields: data.fields || [],
      });

      setOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || "Error abriendo reporte");
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`¿Eliminar el reporte "${row.name}"?`)) return;

    try {
      setError("");
      await API.delete(`/api/custom-reports/${row.id}`);
      setSuccess("Reporte eliminado correctamente");
      await loadReports();
    } catch (err) {
      setError(err.response?.data?.message || "Error eliminando reporte");
    }
  };

  const handleSourceChange = (sourceKey) => {
    const source = sources.find((s) => s.key === sourceKey);

    setSelectedSource(source || null);

    setForm((prev) => ({
      ...prev,
      source_key: sourceKey,
      title: prev.title || source?.label || "",
      fields:
        source?.fields?.map((field, index) => ({
          field_name: field.name,
          label: field.label,
          visible: 1,
          width: "",
          align: field.align || "left",
          format: field.format || "",
          order_no: index,
        })) || [],
    }));
  };

  const updateField = (index, key, value) => {
    setForm((prev) => {
      const fields = [...prev.fields];
      fields[index] = {
        ...fields[index],
        [key]: value,
      };

      return {
        ...prev,
        fields,
      };
    });
  };

  const moveField = (index, direction) => {
    setForm((prev) => {
      const fields = [...prev.fields];
      const target = direction === "up" ? index - 1 : index + 1;

      if (target < 0 || target >= fields.length) return prev;

      const temp = fields[index];
      fields[index] = fields[target];
      fields[target] = temp;

      return {
        ...prev,
        fields: fields.map((f, i) => ({
          ...f,
          order_no: i,
        })),
      };
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Digite el nombre del reporte";
    if (!form.source_key) return "Seleccione el origen de datos";
    if (!form.title.trim()) return "Digite el título del reporte";

    const visibleFields = form.fields.filter((f) => f.visible);

    if (!visibleFields.length) {
      return "Seleccione al menos un campo visible";
    }

    return "";
  };

  const handleSave = async () => {
    const validation = validateForm();

    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        ...form,
        fields: form.fields.map((f, index) => ({
          ...f,
          order_no: index,
          visible: f.visible ? 1 : 0,
        })),
      };

      if (form.id) {
        await API.put(`/api/custom-reports/${form.id}`, payload);
        setSuccess("Reporte actualizado correctamente");
      } else {
        await API.post("/api/custom-reports", payload);
        setSuccess("Reporte creado correctamente");
      }

      setOpen(false);
      await loadReports();
    } catch (err) {
      setError(err.response?.data?.message || "Error guardando reporte");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async (row) => {
    try {
      setError("");
      const res = await API.post(`/api/custom-reports/${row.id}/preview`, {
        limit: 100,
        filters: {},
      });
      const data = res.data.data;

      const cols = (data.columns || []).map((col) => ({
        field: col.key,
        headerName: col.label,
        flex: 1,
        minWidth: 130,
        align: col.align || "left",
        headerAlign: col.align || "left",
      }));

      const rows = (data.rows || []).map((r, index) => ({
        id: index + 1,
        ...r,
      }));

      setPreviewColumns(cols);
      setPreviewRows(rows);
      setPreviewOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || "Error generando vista previa");
    }
  };

  const columns = [
    {
      field: "name",
      headerName: "Reporte",
      flex: 1,
      minWidth: 220,
    },
    {
      field: "source_key",
      headerName: "Origen",
      width: 140,
    },
    {
      field: "orientation",
      headerName: "Orientación",
      width: 130,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value === "landscape" ? "Horizontal" : "Vertical"}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Vista previa">
            <IconButton size="small" onClick={() => handlePreview(params.row)}>
              <Preview fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => handleEdit(params.row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDelete(params.row)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Reportes personalizados
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prueba piloto del constructor de reportes de CrediMaster
            </Typography>
          </Box>

          <Button variant="contained" startIcon={<Add />} onClick={handleNew}>
            Nuevo reporte
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess("")}
          >
            {success}
          </Alert>
        )}

        <DataGrid
          rows={reportRows}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
          }}
        />
      </Paper>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {form.id ? "Editar reporte" : "Nuevo reporte"}
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Nombre"
                fullWidth
                size="small"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small" disabled={!!form.id}>
                <InputLabel>Origen</InputLabel>
                <Select
                  label="Origen"
                  value={form.source_key}
                  onChange={(e) => handleSourceChange(e.target.value)}
                >
                  {sources.map((source) => (
                    <MenuItem key={source.key} value={source.key}>
                      {source.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Orientación</InputLabel>
                <Select
                  label="Orientación"
                  value={form.orientation}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      orientation: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="landscape">Horizontal</MenuItem>
                  <MenuItem value="portrait">Vertical</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Tamaño</InputLabel>
                <Select
                  label="Tamaño"
                  value={form.page_size}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      page_size: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="letter">Carta</MenuItem>
                  <MenuItem value="legal">Legal</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Título del reporte"
                fullWidth
                size="small"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Subtítulo"
                fullWidth
                size="small"
                value={form.subtitle}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subtitle: e.target.value }))
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Descripción"
                fullWidth
                size="small"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Campos del reporte
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Diseñador del reporte
          </Typography>

          {!selectedSource && (
            <Alert severity="info">
              Seleccione un origen para cargar los campos disponibles.
            </Alert>
          )}

          {selectedSource && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    height: 520,
                    overflow: "auto",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={800}
                    sx={{ mb: 1 }}
                  >
                    Campos disponibles
                  </Typography>

                  <Stack spacing={1.5}>
                    {Object.entries(availableGroupedFields).map(
                      ([category, fields]) => (
                        <Box key={category}>
                          <Typography
                            variant="caption"
                            fontWeight={800}
                            sx={{
                              display: "block",
                              mb: 0.5,
                              px: 1,
                              py: 0.6,
                              borderRadius: 1,
                              bgcolor: "#F3F6FA",
                              color: "text.secondary",
                            }}
                          >
                            {category}
                          </Typography>

                          {fields.map((field) => (
                            <FormControlLabel
                              key={field.name}
                              control={
                                <Checkbox
                                  checked={!!field.selected}
                                  onChange={(e) =>
                                    toggleField(field, e.target.checked)
                                  }
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    {field.label}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {field.name}
                                  </Typography>
                                </Box>
                              }
                              sx={{
                                width: "100%",
                                ml: 0,
                                mb: 0.5,
                                px: 1,
                                py: 0.5,
                                borderRadius: 1.5,
                                "&:hover": {
                                  bgcolor: "#F8FAFC",
                                },
                              }}
                            />
                          ))}
                        </Box>
                      ),
                    )}
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    height: 520,
                    overflow: "auto",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={800}
                    sx={{ mb: 1 }}
                  >
                    Columnas del reporte
                  </Typography>

                  {selectedFields.length === 0 && (
                    <Alert severity="warning">
                      Todavía no hay columnas seleccionadas.
                    </Alert>
                  )}

                  <Stack spacing={1}>
                    {selectedFields.map((field) => {
                      const index = form.fields.findIndex(
                        (item) => item.field_name === field.field_name,
                      );

                      return (
                        <Paper
                          key={field.field_name}
                          variant="outlined"
                          sx={{
                            p: 1.2,
                            borderRadius: 2,
                            bgcolor: "#FFFFFF",
                          }}
                        >
                          <Grid container spacing={1} alignItems="center">
                            <Grid item xs={12} md={4}>
                              <Typography variant="body2" fontWeight={800}>
                                {field.label}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {field.field_name}
                              </Typography>
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <TextField
                                label="Etiqueta"
                                fullWidth
                                size="small"
                                value={field.label}
                                onChange={(e) =>
                                  updateField(index, "label", e.target.value)
                                }
                              />
                            </Grid>

                            <Grid item xs={6} md={2}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Alinear</InputLabel>
                                <Select
                                  label="Alinear"
                                  value={field.align || "left"}
                                  onChange={(e) =>
                                    updateField(index, "align", e.target.value)
                                  }
                                >
                                  <MenuItem value="left">Izq.</MenuItem>
                                  <MenuItem value="center">Centro</MenuItem>
                                  <MenuItem value="right">Der.</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>

                            <Grid item xs={6} md={2}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Formato</InputLabel>
                                <Select
                                  label="Formato"
                                  value={field.format || ""}
                                  onChange={(e) =>
                                    updateField(index, "format", e.target.value)
                                  }
                                >
                                  <MenuItem value="">Normal</MenuItem>
                                  <MenuItem value="money">Moneda</MenuItem>
                                  <MenuItem value="date">Fecha</MenuItem>
                                  <MenuItem value="percent">%</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                              >
                                <Stack direction="row">
                                  <IconButton
                                    size="small"
                                    disabled={index === 0}
                                    onClick={() => moveField(index, "up")}
                                  >
                                    <ArrowUpward fontSize="small" />
                                  </IconButton>

                                  <IconButton
                                    size="small"
                                    disabled={index === form.fields.length - 1}
                                    onClick={() => moveField(index, "down")}
                                  >
                                    <ArrowDownward fontSize="small" />
                                  </IconButton>
                                </Stack>

                                <Button
                                  size="small"
                                  color="error"
                                  startIcon={<Delete />}
                                  onClick={() =>
                                    removeSelectedField(field.field_name)
                                  }
                                >
                                  Quitar
                                </Button>
                              </Stack>
                            </Grid>
                          </Grid>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>Vista previa</DialogTitle>

        <DialogContent dividers>
          <DataGrid
            rows={previewRows}
            columns={previewColumns}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 },
              },
            }}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomReportsPage;
