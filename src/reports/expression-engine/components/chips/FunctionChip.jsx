import { Chip } from "@mui/material";
import FunctionsIcon from "@mui/icons-material/Functions";

const FunctionChip = ({ node, functions = [], onRemove }) => {
  const fn = functions.find((item) => item.id === node.value);

  return (
    <Chip
      icon={<FunctionsIcon />}
      color="secondary"
      variant="filled"
      label={fn?.label || node.value || "Función"}
      onDelete={onRemove}
    />
  );
};

export default FunctionChip;
