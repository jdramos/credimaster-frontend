import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from "@mui/material";

import { useReportDefinition } from "../../../../../custom/context/ReportDefinitionContext";
import ExpressionBuilder from "../../../../../expression-engine/components/ExpressionBuilder";

const DATA_TYPES = [
  { value: "currency", label: "Moneda" },
  { value: "number", label: "Número" },
  { value: "string", label: "Texto" },
  { value: "date", label: "Fecha" },
  { value: "boolean", label: "Sí / No" },
];

const FORMAT_BY_TYPE = {
  currency: "money",
  number: "number",
  string: "text",
  date: "date",
  boolean: "boolean",
};

const createSafeName = (label = "") => {
  const safe = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return safe || `calc_${Date.now()}`;
};

const CalculatedFieldDialog = ({ open, onClose }) => {
  const { addCalculatedField } = useReportDefinition();

  const [label, setLabel] = useState("");
  const [type, setType] = useState("currency");
  const [expression, setExpression] = useState({ nodes: [] });

  const name = useMemo(() => createSafeName(label), [label]);

  const canSave = label.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;

    addCalculatedField({
      id: `calc_${Date.now()}`,
      name,
      label,
      type,
      returnType: type,
      format: FORMAT_BY_TYPE[type] || "text",
      visible: true,
      width: type === "string" ? 180 : 120,
      align: type === "currency" || type === "number" ? "right" : "left",
      totalable: type === "currency" || type === "number",
      expression,
      nodes: expression.nodes || [],
    });

    setLabel("");
    setType("currency");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nuevo campo calculado</DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              label="Nombre visible"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              fullWidth
              autoFocus
              placeholder="Ej: Saldo con mora"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Nombre interno"
              value={name}
              fullWidth
              disabled
              helperText="Este nombre se usará internamente en filtros, totales y exportaciones."
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Tipo de dato"
              value={type}
              onChange={(event) => setType(event.target.value)}
              select
              fullWidth
            >
              {DATA_TYPES.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <ExpressionBuilder value={expression} onChange={setExpression} />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>

        <Button variant="contained" disabled={!canSave} onClick={handleSave}>
          Crear campo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CalculatedFieldDialog;
