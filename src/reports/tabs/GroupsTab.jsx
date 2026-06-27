import React from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import { useReportDefinition } from "../customs/context/ReportDefinitionContext";

const BAC = {
  border: "#D8E2F0",
  muted: "#6B7280",
};

const GroupsTab = () => {
  const { definition, groupableFields, selectedFieldNames, setGroups } =
    useReportDefinition();

  const selectedGroupableFields = groupableFields.filter((field) =>
    selectedFieldNames.includes(field.name),
  );

  const addGroup = () => {
    const firstField = selectedGroupableFields.find(
      (field) =>
        !(definition.groups || []).some((group) => group.field === field.name),
    );

    if (!firstField) return;

    setGroups([
      ...(definition.groups || []),
      {
        field: firstField.name,
        label: firstField.label,
        showHeader: true,
        showFooter: true,
        showTotals: true,
      },
    ]);
  };

  const updateGroup = (index, patch) => {
    const next = [...(definition.groups || [])];

    next[index] = {
      ...next[index],
      ...patch,
    };

    setGroups(next);
  };

  const removeGroup = (index) => {
    setGroups((definition.groups || []).filter((_, i) => i !== index));
  };

  const moveGroup = (fromIndex, toIndex) => {
    const groups = [...(definition.groups || [])];

    if (toIndex < 0 || toIndex >= groups.length) return;

    const [removed] = groups.splice(fromIndex, 1);
    groups.splice(toIndex, 0, removed);

    setGroups(groups);
  };

  if (!definition.source) {
    return (
      <Alert severity="info">
        Primero selecciona una fuente de datos en la pestaña General.
      </Alert>
    );
  }

  if (!definition.fields?.length) {
    return (
      <Alert severity="info">
        Primero selecciona campos en la pestaña Campos.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Agrupaciones
          </Typography>

          <Typography variant="body2" sx={{ color: BAC.muted }}>
            Define niveles de agrupación como sucursal, gestor, cliente o
            estado.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={addGroup}
          disabled={!selectedGroupableFields.length}
        >
          Agregar agrupación
        </Button>
      </Stack>

      {(definition.groups || []).length === 0 ? (
        <Alert severity="info">Este reporte no tiene agrupaciones.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {(definition.groups || []).map((group, index) => (
            <Paper
              key={`${group.field}-${index}`}
              elevation={0}
              sx={{
                p: 1.5,
                border: `1px solid ${BAC.border}`,
                borderRadius: 2,
              }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems="center"
              >
                <TextField
                  select
                  label="Campo"
                  size="small"
                  value={group.field || ""}
                  onChange={(e) => {
                    const selected = selectedGroupableFields.find(
                      (field) => field.name === e.target.value,
                    );

                    updateGroup(index, {
                      field: e.target.value,
                      label: selected?.label || e.target.value,
                    });
                  }}
                  sx={{ minWidth: 260 }}
                >
                  {selectedGroupableFields.map((field) => (
                    <MenuItem key={field.name} value={field.name}>
                      {field.category} / {field.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Etiqueta"
                  size="small"
                  value={group.label || ""}
                  onChange={(e) =>
                    updateGroup(index, { label: e.target.value })
                  }
                  sx={{ minWidth: 220 }}
                />

                <TextField
                  select
                  label="Encabezado"
                  size="small"
                  value={group.showHeader ? "yes" : "no"}
                  onChange={(e) =>
                    updateGroup(index, {
                      showHeader: e.target.value === "yes",
                    })
                  }
                  sx={{ width: 150 }}
                >
                  <MenuItem value="yes">Mostrar</MenuItem>
                  <MenuItem value="no">Ocultar</MenuItem>
                </TextField>

                <TextField
                  select
                  label="Subtotal"
                  size="small"
                  value={group.showTotals ? "yes" : "no"}
                  onChange={(e) =>
                    updateGroup(index, {
                      showTotals: e.target.value === "yes",
                    })
                  }
                  sx={{ width: 150 }}
                >
                  <MenuItem value="yes">Mostrar</MenuItem>
                  <MenuItem value="no">Ocultar</MenuItem>
                </TextField>

                <IconButton
                  disabled={index === 0}
                  onClick={() => moveGroup(index, index - 1)}
                >
                  <ArrowUpwardIcon />
                </IconButton>

                <IconButton
                  disabled={index === (definition.groups || []).length - 1}
                  onClick={() => moveGroup(index, index + 1)}
                >
                  <ArrowDownwardIcon />
                </IconButton>

                <IconButton color="error" onClick={() => removeGroup(index)}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default GroupsTab;
