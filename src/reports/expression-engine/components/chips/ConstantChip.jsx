import { Chip } from "@mui/material";
import NumbersIcon from "@mui/icons-material/Numbers";

const ConstantChip = ({ node, onRemove }) => {
  return (
    <Chip
      icon={<NumbersIcon />}
      color="default"
      variant="outlined"
      label={node.value ?? "Valor"}
      onDelete={onRemove}
    />
  );
};

export default ConstantChip;
