import { createExpressionNode } from "../utils/expressionFactory";

export const createExpression = ({
  id,
  name,
  label = "",
  returnType = "currency",
  format = "money",
  nodes = [],
} = {}) => ({
  id: id || `expr_${Date.now()}`,
  name: name || `expr_${Date.now()}`,
  label,
  returnType,
  format,
  nodes,
});

export const createEmptyExpression = () =>
  createExpression({
    nodes: [createExpressionNode()],
  });
