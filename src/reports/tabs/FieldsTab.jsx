import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import { useReportDefinition } from "../customs/context/ReportDefinitionContext";

const FieldsTab = () => {
  const {
    definition,
    categories,
    selectedFieldNames,
    addField,
    removeField,
    updateField,
    moveField,
  } = useReportDefinition();

  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const activeCategory = category || categories[0]?.category || "";

  const availableFields = useMemo(() => {
    const currentCategory = categories.find(
      (item) => item.category === activeCategory,
    );

    return (currentCategory?.fields || []).filter((field) =>
      `${field.label} ${field.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [categories, activeCategory, search]);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
        Campos del reporte
      </Typography>

      {!definition.source && (
        <Typography variant="body2" color="text.secondary">
          Primero selecciona una fuente de datos en la pestaña General.
        </Typography>
      )}

      {definition.source && (
        <>
          <Stack direction="row" spacing={2} alignItems="stretch">
            <Paper variant="outlined" sx={{ width: 220, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Categorías
              </Typography>

              <Stack spacing={1}>
                {categories.map((item) => (
                  <Button
                    key={item.category}
                    variant={
                      activeCategory === item.category
                        ? "contained"
                        : "outlined"
                    }
                    onClick={() => setCategory(item.category)}
                    sx={{ justifyContent: "flex-start" }}
                  >
                    {item.category}
                  </Button>
                ))}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ flex: 1, p: 2 }}>
              <Stack spacing={2}>
                <TextField
                  size="small"
                  label="Buscar campo"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <Divider />

                <Stack spacing={1}>
                  {availableFields.map((field) => {
                    const selected = selectedFieldNames.includes(field.name);

                    return (
                      <Stack
                        key={field.name}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          border: "1px solid #e0e0e0",
                          borderRadius: 1,
                          p: 1,
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {field.label}
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            {field.name}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            label={field.format || field.type || "text"}
                          />

                          <Button
                            size="small"
                            variant={selected ? "outlined" : "contained"}
                            startIcon={<AddIcon />}
                            disabled={selected}
                            onClick={() => addField(field)}
                          >
                            {selected ? "Agregado" : "Agregar"}
                          </Button>
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              </Stack>
            </Paper>
          </Stack>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
              Campos seleccionados
            </Typography>

            <Stack spacing={1}>
              {definition.fields.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Aún no has agregado campos al reporte.
                </Typography>
              )}

              {definition.fields.map((field, index) => (
                <Stack
                  key={field.name}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  <TextField
                    size="small"
                    label="Campo"
                    value={field.name}
                    disabled
                    sx={{ width: 180 }}
                  />

                  <TextField
                    size="small"
                    label="Etiqueta"
                    value={field.label || ""}
                    onChange={(e) =>
                      updateField(index, { label: e.target.value })
                    }
                    sx={{ width: 220 }}
                  />

                  <TextField
                    size="small"
                    label="Ancho"
                    type="number"
                    value={field.width || 120}
                    onChange={(e) =>
                      updateField(index, {
                        width: Number(e.target.value || 120),
                      })
                    }
                    sx={{ width: 110 }}
                  />

                  <TextField
                    select
                    size="small"
                    label="Alineación"
                    value={field.align || "left"}
                    onChange={(e) =>
                      updateField(index, { align: e.target.value })
                    }
                    sx={{ width: 150 }}
                  >
                    <MenuItem value="left">Izquierda</MenuItem>
                    <MenuItem value="center">Centro</MenuItem>
                    <MenuItem value="right">Derecha</MenuItem>
                  </TextField>

                  <TextField
                    select
                    size="small"
                    label="Formato"
                    value={field.format || "text"}
                    onChange={(e) =>
                      updateField(index, { format: e.target.value })
                    }
                    sx={{ width: 150 }}
                  >
                    <MenuItem value="text">Texto</MenuItem>
                    <MenuItem value="date">Fecha</MenuItem>
                    <MenuItem value="number">Número</MenuItem>
                    <MenuItem value="money">Moneda</MenuItem>
                    <MenuItem value="percent">Porcentaje</MenuItem>
                  </TextField>

                  <IconButton
                    disabled={index === 0}
                    onClick={() => moveField(index, index - 1)}
                  >
                    <ArrowUpwardIcon />
                  </IconButton>

                  <IconButton
                    disabled={index === definition.fields.length - 1}
                    onClick={() => moveField(index, index + 1)}
                  >
                    <ArrowDownwardIcon />
                  </IconButton>

                  <IconButton
                    color="error"
                    onClick={() => removeField(field.name)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </>
      )}
    </Stack>
  );
};

export default FieldsTab;
