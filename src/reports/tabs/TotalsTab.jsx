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

import { useReportDefinition } from "../customs/context/ReportDefinitionContext";

const BAC = {
  border: "#D8E2F0",
  muted: "#6B7280",
};

const FUNCTIONS = [
  { value: "SUM", label: "Suma" },
  { value: "AVG", label: "Promedio" },
  { value: "COUNT", label: "Conteo" },
  { value: "MIN", label: "Mínimo" },
  { value: "MAX", label: "Máximo" },
];

const TotalsTab = () => {
  const { definition, totalableFields, selectedFieldNames, setTotals } =
    useReportDefinition();

  const selectedTotalableFields = totalableFields.filter((field) =>
    selectedFieldNames.includes(field.name),
  );

  const addTotal = () => {
    const firstField = selectedTotalableFields.find(
      (field) =>
        !(definition.totals || []).some(
          (total) => total.field === field.name && total.function === "SUM",
        ),
    );

    if (!firstField) return;

    setTotals([
      ...(definition.totals || []),
      {
        field: firstField.name,
        function: "SUM",
        label: `Total ${firstField.label}`,
        showInGroups: true,
        showInGrandTotal: true,
      },
    ]);
  };

  const updateTotal = (index, patch) => {
    const next = [...(definition.totals || [])];

    next[index] = {
      ...next[index],
      ...patch,
    };

    setTotals(next);
  };

  const removeTotal = (index) => {
    setTotals((definition.totals || []).filter((_, i) => i !== index));
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
            Totales
          </Typography>

          <Typography variant="body2" sx={{ color: BAC.muted }}>
            Define sumas, conteos, promedios y totales generales del reporte.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={addTotal}
          disabled={!selectedTotalableFields.length}
        >
          Agregar total
        </Button>
      </Stack>

      {(definition.totals || []).length === 0 ? (
        <Alert severity="info">Este reporte no tiene totales definidos.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {(definition.totals || []).map((total, index) => {
            const selectedField = selectedTotalableFields.find(
              (field) => field.name === total.field,
            );

            return (
              <Paper
                key={`${total.field}-${total.function}-${index}`}
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
                    value={total.field || ""}
                    onChange={(e) => {
                      const field = selectedTotalableFields.find(
                        (item) => item.name === e.target.value,
                      );

                      updateTotal(index, {
                        field: e.target.value,
                        label: `Total ${field?.label || e.target.value}`,
                      });
                    }}
                    sx={{ minWidth: 280 }}
                  >
                    {selectedTotalableFields.map((field) => (
                      <MenuItem key={field.name} value={field.name}>
                        {field.category} / {field.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Función"
                    size="small"
                    value={total.function || "SUM"}
                    onChange={(e) =>
                      updateTotal(index, {
                        function: e.target.value,
                      })
                    }
                    sx={{ width: 170 }}
                  >
                    {FUNCTIONS.map((fn) => (
                      <MenuItem key={fn.value} value={fn.value}>
                        {fn.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="Etiqueta"
                    size="small"
                    value={total.label || ""}
                    onChange={(e) =>
                      updateTotal(index, {
                        label: e.target.value,
                      })
                    }
                    sx={{ minWidth: 230 }}
                  />

                  <TextField
                    select
                    label="En grupos"
                    size="small"
                    value={total.showInGroups ? "yes" : "no"}
                    onChange={(e) =>
                      updateTotal(index, {
                        showInGroups: e.target.value === "yes",
                      })
                    }
                    sx={{ width: 150 }}
                  >
                    <MenuItem value="yes">Mostrar</MenuItem>
                    <MenuItem value="no">Ocultar</MenuItem>
                  </TextField>

                  <TextField
                    select
                    label="Total general"
                    size="small"
                    value={total.showInGrandTotal ? "yes" : "no"}
                    onChange={(e) =>
                      updateTotal(index, {
                        showInGrandTotal: e.target.value === "yes",
                      })
                    }
                    sx={{ width: 160 }}
                  >
                    <MenuItem value="yes">Mostrar</MenuItem>
                    <MenuItem value="no">Ocultar</MenuItem>
                  </TextField>

                  <IconButton color="error" onClick={() => removeTotal(index)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>

                {selectedField && (
                  <Typography
                    variant="caption"
                    sx={{ color: BAC.muted, display: "block", mt: 1 }}
                  >
                    Campo técnico: {selectedField.name}
                  </Typography>
                )}
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default TotalsTab;
