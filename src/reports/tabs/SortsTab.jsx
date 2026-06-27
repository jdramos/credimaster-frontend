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

const SortsTab = () => {
  const { definition, sortableFields, selectedFieldNames, setSorts } =
    useReportDefinition();

  const selectedSortableFields = sortableFields.filter((field) =>
    selectedFieldNames.includes(field.name),
  );

  const addSort = () => {
    const firstField = selectedSortableFields.find(
      (field) =>
        !(definition.sorts || []).some((sort) => sort.field === field.name),
    );

    if (!firstField) return;

    setSorts([
      ...(definition.sorts || []),
      {
        field: firstField.name,
        direction: "ASC",
      },
    ]);
  };

  const updateSort = (index, patch) => {
    const next = [...(definition.sorts || [])];

    next[index] = {
      ...next[index],
      ...patch,
    };

    setSorts(next);
  };

  const removeSort = (index) => {
    setSorts((definition.sorts || []).filter((_, i) => i !== index));
  };

  const moveSort = (fromIndex, toIndex) => {
    const sorts = [...(definition.sorts || [])];

    if (toIndex < 0 || toIndex >= sorts.length) return;

    const [removed] = sorts.splice(fromIndex, 1);
    sorts.splice(toIndex, 0, removed);

    setSorts(sorts);
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
            Ordenamientos
          </Typography>

          <Typography variant="body2" sx={{ color: BAC.muted }}>
            Define el orden en que se mostrarán los registros del reporte.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={addSort}
          disabled={!selectedSortableFields.length}
        >
          Agregar orden
        </Button>
      </Stack>

      {(definition.sorts || []).length === 0 ? (
        <Alert severity="info">Este reporte no tiene ordenamientos.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {(definition.sorts || []).map((sort, index) => (
            <Paper
              key={`${sort.field}-${index}`}
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
                  value={sort.field || ""}
                  onChange={(e) =>
                    updateSort(index, {
                      field: e.target.value,
                    })
                  }
                  sx={{ minWidth: 280 }}
                >
                  {selectedSortableFields.map((field) => (
                    <MenuItem key={field.name} value={field.name}>
                      {field.category} / {field.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Dirección"
                  size="small"
                  value={sort.direction || "ASC"}
                  onChange={(e) =>
                    updateSort(index, {
                      direction: e.target.value,
                    })
                  }
                  sx={{ width: 180 }}
                >
                  <MenuItem value="ASC">Ascendente</MenuItem>
                  <MenuItem value="DESC">Descendente</MenuItem>
                </TextField>

                <IconButton
                  disabled={index === 0}
                  onClick={() => moveSort(index, index - 1)}
                >
                  <ArrowUpwardIcon />
                </IconButton>

                <IconButton
                  disabled={index === (definition.sorts || []).length - 1}
                  onClick={() => moveSort(index, index + 1)}
                >
                  <ArrowDownwardIcon />
                </IconButton>

                <IconButton color="error" onClick={() => removeSort(index)}>
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

export default SortsTab;
