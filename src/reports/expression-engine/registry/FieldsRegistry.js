const normalizeFieldType = (type) => {
  if (type === "currency") return "currency";
  if (type === "number") return "number";
  if (type === "date" || type === "datetime") return "date";
  if (type === "boolean") return "boolean";

  return "string";
};

export const buildFieldsRegistry = ({
  sourceFields = [],
  calculatedFields = [],
} = {}) => {
  const physicalFields = sourceFields.map((field) => ({
    id: field.name,
    name: field.name,
    label: field.label || field.name,
    type: normalizeFieldType(field.type),
    format: field.format || "text",
    category: field.category || "General",
    source: "physical",
    filterable: field.filterable !== false,
    sortable: field.sortable !== false,
    groupable: field.groupable === true,
    totalable: field.totalable === true,
  }));

  const calculated = calculatedFields.map((field) => ({
    id: field.name || field.id,
    name: field.name || field.id,
    label: field.label || field.name || "Campo calculado",
    type: normalizeFieldType(field.returnType || field.type),
    format: field.format || "text",
    category: "Campos calculados",
    source: "calculated",
    calculatedFieldId: field.id,
    filterable: true,
    sortable: true,
    groupable: ["string", "date", "boolean"].includes(
      normalizeFieldType(field.returnType || field.type),
    ),
    totalable: ["number", "currency"].includes(
      normalizeFieldType(field.returnType || field.type),
    ),
  }));

  return [...physicalFields, ...calculated];
};

export const getFieldByName = (fieldsRegistry = [], name) => {
  return fieldsRegistry.find((field) => field.name === name) || null;
};
