export const createExpressionNode = ({
  id,
  type = "field",
  value = "",
  nextOperator = null,
} = {}) => ({
  id: id || `node_${Date.now()}_${Math.random()}`,
  type,
  value,
  nextOperator,
});
