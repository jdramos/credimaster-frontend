import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

import { useReportDefinition } from "../custom/context/ReportDefinitionContext";
import ExpressionBuilder from "../expression-engine/components/ExpressionBuilder";
import { createExpression } from "../expression-engine/model/Expression";

const CalculatedFieldsTab = () => {
  const {
    definition,
    sourceFields,
    addCalculatedField,
    updateCalculatedField,
    removeCalculatedField,
  } = useReportDefinition();

  const [newLabel, setNewLabel] = useState("");

  const numericFields = useMemo(() => {
    return (sourceFields || []).filter((field) =>
      ["number", "currency", "decimal", "integer"].includes(field.type),
    );
  }, [sourceFields]);

  const handleAddCalculatedField = () => {
    if (!newLabel.trim()) return;

    const expression = createExpression({
      label: newLabel.trim(),
      returnType: "currency",
      format: "money",
      nodes: [],
    });

    addCalculatedField({
      ...expression,
      type: "currency",
      visible: true,
      width: 120,
      align: "right",
      totalable: true,
    });

    setNewLabel("");
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Campos calculados
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Crea columnas nuevas combinando campos numéricos existentes.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Nombre del nuevo campo"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          size="small"
          fullWidth
        />

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddCalculatedField}
        >
          Crear
        </Button>
      </Stack>

      <Stack spacing={2}>
        {(definition.calculatedFields || []).map((calc) => (
          <Card key={calc.id} variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    label="Etiqueta"
                    value={calc.label}
                    size="small"
                    fullWidth
                    onChange={(e) =>
                      updateCalculatedField(calc.id, {
                        label: e.target.value,
                      })
                    }
                  />

                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Formato</InputLabel>
                    <Select
                      label="Formato"
                      value={calc.format || "money"}
                      onChange={(e) =>
                        updateCalculatedField(calc.id, {
                          format: e.target.value,
                          type:
                            e.target.value === "money" ? "currency" : "number",
                          returnType:
                            e.target.value === "money" ? "currency" : "number",
                        })
                      }
                    >
                      <MenuItem value="money">Moneda</MenuItem>
                      <MenuItem value="number">Número</MenuItem>
                    </Select>
                  </FormControl>

                  <IconButton
                    color="error"
                    onClick={() => removeCalculatedField(calc.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>

                <ExpressionBuilder
                  value={calc}
                  fields={numericFields}
                  onChange={(updatedExpression) =>
                    updateCalculatedField(calc.id, updatedExpression)
                  }
                />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default CalculatedFieldsTab;
