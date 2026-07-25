import { Typography } from "@mui/material";
import { useExpression } from "../context/ExpressionContext";

const ExpressionPreview = ({ fields = [], operators = [] }) => {
  const { nodes } = useExpression();

  const getFieldLabel = (fieldName) =>
    fields.find((field) => field.name === fieldName)?.label || fieldName;

  const getOperatorSymbol = (operatorId) =>
    operators.find((operator) => operator.id === operatorId)?.symbol ||
    operatorId;

  const preview = nodes.length
    ? nodes
        .map((node) => {
          let value = node.value;

          if (node.type === "field") value = getFieldLabel(node.value);
          if (node.type === "function") value = `${node.value || "Función"}()`;

          return node.nextOperator
            ? `${value} ${getOperatorSymbol(node.nextOperator)}`
            : `${value}`;
        })
        .join(" ")
    : "Sin fórmula definida";

  return (
    <Typography
      variant="body2"
      sx={{
        fontFamily: "monospace",
        bgcolor: "grey.100",
        p: 1.5,
        borderRadius: 1,
      }}
    >
      {preview}
    </Typography>
  );
};

export default ExpressionPreview;
