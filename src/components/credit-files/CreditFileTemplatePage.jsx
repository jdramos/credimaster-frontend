import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { DataGrid } from "@mui/x-data-grid";
import { MenuItem } from "@mui/material";
import {
  createCreditFileTemplate,
  getCreditFileTemplates,
  updateCreditFileTemplate,
} from "../../api/creditFileTemplates";
import CreditFileTemplateDialog from "./CreditFileTemplateFormDialog";

const yesNoChip = (value, trueLabel = "Sí", falseLabel = "No") => (
  <Chip
    size="small"
    label={value ? trueLabel : falseLabel}
    color={value ? "success" : "default"}
    variant={value ? "filled" : "outlined"}
  />
);

const mandatoryChip = (value) => (
  <Chip
    size="small"
    label={value ? "Obligatorio" : "Opcional"}
    color={value ? "primary" : "default"}
    variant={value ? "filled" : "outlined"}
  />
);

export default function CreditFileTemplatePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getCreditFileTemplates();
      setRows(response.data || []);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "No se pudo cargar la lista de documentos del expediente.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sections = useMemo(() => {
    const unique = [
      ...new Set((rows || []).map((r) => r.section).filter(Boolean)),
    ];
    return unique.sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const text = search.trim().toLowerCase();

    return (rows || []).filter((row) => {
      const matchesText =
        !text ||
        [row.code, row.section, row.title, row.description]
          .join(" ")
          .toLowerCase()
          .includes(text);

      const matchesSection = !sectionFilter || row.section === sectionFilter;

      return matchesText && matchesSection;
    });
  }, [rows, search, sectionFilter]);

  const handleCreate = () => {
    setEditingRow(null);
    setDialogOpen(true);
  };

  const handleEdit = (row) => {
    setEditingRow(row);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingRow(null);
  };

  const handleSubmitDialog = async (payload) => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (editingRow) {
        await updateCreditFileTemplate(editingRow.id, payload);
        setSuccessMessage(
          "Documento del expediente actualizado correctamente.",
        );
      } else {
        await createCreditFileTemplate(payload);
        setSuccessMessage("Documento del expediente creado correctamente.");
      }

      setDialogOpen(false);
      setEditingRow(null);
      await loadData();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error?.response?.data?.message ||
          "No se pudo guardar el documento del expediente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggle = async (row, field) => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        ...row,
        [field]: !row[field],
      };

      await updateCreditFileTemplate(row.id, payload);

      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, [field]: !row[field] } : item,
        ),
      );

      setSuccessMessage("Cambio guardado correctamente.");
    } catch (error) {
      console.error(error);
      setErrorMessage("No se pudo actualizar el registro.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      field: "sort_order",
      headerName: "Orden",
      width: 90,
    },
    {
      field: "code",
      headerName: "Código",
      width: 150,
      renderCell: (params) => <Chip size="small" label={params.value} />,
    },
    {
      field: "section",
      headerName: "Sección",
      width: 150,
    },
    {
      field: "title",
      headerName: "Título",
      flex: 1,
      minWidth: 250,
      renderCell: (params) => (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {params.row.title}
          </Typography>
          {params.row.description ? (
            <Typography variant="caption" color="text.secondary">
              {params.row.description}
            </Typography>
          ) : null}
        </Box>
      ),
    },
    {
      field: "is_mandatory",
      headerName: "Tipo",
      width: 130,
      renderCell: (params) => mandatoryChip(!!params.value),
    },
    {
      field: "is_active",
      headerName: "Activo",
      width: 110,
      renderCell: (params) => (
        <Switch
          checked={!!params.row.is_active}
          onChange={() => handleQuickToggle(params.row, "is_active")}
          disabled={saving}
        />
      ),
    },
    {
      field: "applies_to_new_loans",
      headerName: "Nuevo",
      width: 110,
      renderCell: (params) => yesNoChip(!!params.value),
    },
    {
      field: "applies_to_renewals",
      headerName: "Renovación",
      width: 130,
      renderCell: (params) => yesNoChip(!!params.value),
    },
    {
      field: "applies_to_refinancing",
      headerName: "Refinanciamiento",
      width: 160,
      renderCell: (params) => yesNoChip(!!params.value),
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => handleEdit(params.row)}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6">
            Plantilla de expediente crediticio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define qué documentos y validaciones forman parte del expediente
            base.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Nuevo documento
        </Button>
      </Stack>

      {successMessage ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Buscar"
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Código, sección, título o descripción"
        />
        <TextField
          select
          label="Sección"
          size="small"
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {sections.map((section) => (
            <MenuItem key={section} value={section}>
              {section}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box sx={{ height: 560, width: "100%" }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 20, 50]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
          }}
          rowHeight={72}
        />
      </Box>

      <CreditFileTemplateDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSubmitDialog}
        loading={saving}
        initialData={editingRow}
      />
    </Paper>
  );
}
