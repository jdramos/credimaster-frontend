export const validateExpression = ({
  expression,
  fields = [],
  operators = [],
  functions = [],
}) => {
  const errors = [];
  const nodes = expression?.nodes || [];

  if (!nodes.length) {
    errors.push("La fórmula debe tener al menos un elemento.");
    return errors;
  }

  const fieldNames = fields.map((field) => field.name);
  const operatorIds = operators.map((operator) => operator.id);
  const functionIds = functions.map((fn) => fn.id);

  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1;
    const item = index + 1;

    if (!node.type) {
      errors.push(`El elemento ${item} no tiene tipo.`);
      return;
    }

    if (node.type === "field") {
      if (!node.value) {
        errors.push(`El elemento ${item} debe seleccionar un campo.`);
      }

      if (node.value && !fieldNames.includes(node.value)) {
        errors.push(`El campo "${node.value}" no existe en la fuente.`);
      }
    }

    if (node.type === "constant") {
      if (
        node.value === "" ||
        node.value === null ||
        node.value === undefined
      ) {
        errors.push(`El elemento ${item} debe tener un valor.`);
      }

      if (Number.isNaN(Number(node.value))) {
        errors.push(`El elemento ${item} debe ser numérico.`);
      }
    }

    if (node.type === "function") {
      if (!node.value) {
        errors.push(`El elemento ${item} debe seleccionar una función.`);
      }

      if (node.value && !functionIds.includes(node.value)) {
        errors.push(`La función "${node.value}" no existe.`);
      }
    }

    if (!isLast && !node.nextOperator) {
      errors.push(`El elemento ${item} debe tener una operación siguiente.`);
    }

    if (isLast && node.nextOperator) {
      errors.push("El último elemento no debe tener operación siguiente.");
    }

    if (node.nextOperator && !operatorIds.includes(node.nextOperator)) {
      errors.push(`Operador no permitido: ${node.nextOperator}`);
    }
  });

  return errors;
};

export const isExpressionValid = ({
  expression,
  fields = [],
  operators = [],
  functions = [],
}) => {
  return (
    validateExpression({
      expression,
      fields,
      operators,
      functions,
    }).length === 0
  );
};
