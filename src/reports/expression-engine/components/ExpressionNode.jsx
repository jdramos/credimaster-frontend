import {
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

import { EXPRESSION_NODE_TYPES } from "../constants/Types";

const ExpressionNode = ({
  node,
  isLast,
  fields = [],
  operators = [],
  onChange,
  onRemove,
}) => {
  const handleTypeChange = (newType) => {
    onChange({
      type: newType,
      value:
        newType === EXPRESSION_NODE_TYPES.FIELD ? fields[0]?.name || "" : 0,
    });
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              label="Tipo"
              value={node.type}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <MenuItem value={EXPRESSION_NODE_TYPES.FIELD}>Campo</MenuItem>
              <MenuItem value={EXPRESSION_NODE_TYPES.CONSTANT}>
                Valor fijo
              </MenuItem>
            </Select>
          </FormControl>

          {node.type === EXPRESSION_NODE_TYPES.FIELD && (
            <FormControl size="small" fullWidth>
              <InputLabel>Campo</InputLabel>
              <Select
                label="Campo"
                value={node.value || ""}
                onChange={(e) => onChange({ value: e.target.value })}
              >
                {fields.map((field) => (
                  <MenuItem key={field.name} value={field.name}>
                    {field.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {node.type === EXPRESSION_NODE_TYPES.CONSTANT && (
            <TextField
              label="Valor"
              type="number"
              size="small"
              value={node.value}
              onChange={(e) =>
                onChange({
                  value: Number(e.target.value || 0),
                })
              }
              fullWidth
            />
          )}

          {!isLast && (
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Operación siguiente</InputLabel>
              <Select
                label="Operación siguiente"
                value={node.nextOperator || "+"}
                onChange={(e) =>
                  onChange({
                    nextOperator: e.target.value,
                  })
                }
              >
                {operators.map((operator) => (
                  <MenuItem key={operator.id} value={operator.id}>
                    {operator.label} ({operator.symbol})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <IconButton color="error" onClick={onRemove}>
            <DeleteIcon />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ExpressionNode;
