import { EXPRESSION_NODE_TYPES } from "../constants/Types";

export const createExpressionNode = ({
  type = EXPRESSION_NODE_TYPES.FIELD,
  value = "",
  nextOperator = null,
} = {}) => ({
  id: `node_${Date.now()}_${Math.random()}`,
  type,
  value,
  nextOperator,
});

export const createExpression = ({
  id,
  name,
  label = "Nueva expresión",
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
