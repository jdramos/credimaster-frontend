import { AST_NODE_TYPES } from "./AstTypes";

const nodeToAst = (node) => {
  if (node.type === "field") {
    return {
      type: AST_NODE_TYPES.FIELD,
      value: node.value,
    };
  }

  if (node.type === "constant") {
    return {
      type: AST_NODE_TYPES.CONSTANT,
      value: Number(node.value || 0),
    };
  }

  throw new Error(`Tipo de nodo no soportado: ${node.type}`);
};

export const compileExpressionToAst = (expression) => {
  const nodes = expression?.nodes || [];

  if (!nodes.length) {
    throw new Error("La expresión no tiene nodos.");
  }

  let ast = nodeToAst(nodes[0]);

  for (let i = 1; i < nodes.length; i++) {
    const previousNode = nodes[i - 1];
    const currentNode = nodes[i];

    if (!previousNode.nextOperator) {
      throw new Error(`Falta operador antes del nodo ${i + 1}.`);
    }

    ast = {
      type: AST_NODE_TYPES.BINARY_EXPRESSION,
      operator: previousNode.nextOperator,
      left: ast,
      right: nodeToAst(currentNode),
    };
  }

  return ast;
};
