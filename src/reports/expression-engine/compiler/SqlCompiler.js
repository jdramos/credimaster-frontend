import { AST_NODE_TYPES } from "./AstTypes";

const ALLOWED_OPERATORS = ["+", "-", "*", "/"];

export const compileAstToSql = ({ ast, fieldMap = {} }) => {
  if (!ast) {
    throw new Error("AST vacío.");
  }

  if (ast.type === AST_NODE_TYPES.FIELD) {
    const field = fieldMap[ast.value];

    if (!field) {
      throw new Error(`Campo no permitido: ${ast.value}`);
    }

    return field.expression || field.name;
  }

  if (ast.type === AST_NODE_TYPES.CONSTANT) {
    const value = Number(ast.value || 0);

    if (Number.isNaN(value)) {
      throw new Error("Constante numérica inválida.");
    }

    return String(value);
  }

  if (ast.type === AST_NODE_TYPES.BINARY_EXPRESSION) {
    if (!ALLOWED_OPERATORS.includes(ast.operator)) {
      throw new Error(`Operador no permitido: ${ast.operator}`);
    }

    const left = compileAstToSql({
      ast: ast.left,
      fieldMap,
    });

    const right = compileAstToSql({
      ast: ast.right,
      fieldMap,
    });

    return `(${left} ${ast.operator} ${right})`;
  }

  throw new Error(`Tipo AST no soportado: ${ast.type}`);
};
