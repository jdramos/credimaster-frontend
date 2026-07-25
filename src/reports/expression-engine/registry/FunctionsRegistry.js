export const FUNCTIONS = [
  {
    id: "ROUND",
    label: "Redondear",
    category: "Matemáticas",
    returnType: "number",
    parameters: [
      { name: "valor", type: ["number", "currency"] },
      { name: "decimales", type: ["number"] },
    ],
  },
  {
    id: "ABS",
    label: "Valor absoluto",
    category: "Matemáticas",
    returnType: "number",
    parameters: [{ name: "valor", type: ["number", "currency"] }],
  },
  {
    id: "YEAR",
    label: "Año",
    category: "Fechas",
    returnType: "number",
    parameters: [{ name: "fecha", type: ["date"] }],
  },
  {
    id: "MONTH",
    label: "Mes",
    category: "Fechas",
    returnType: "number",
    parameters: [{ name: "fecha", type: ["date"] }],
  },
  {
    id: "DAY",
    label: "Día",
    category: "Fechas",
    returnType: "number",
    parameters: [{ name: "fecha", type: ["date"] }],
  },
  {
    id: "TODAY",
    label: "Hoy",
    category: "Fechas",
    returnType: "date",
    parameters: [],
  },
  {
    id: "CONCAT",
    label: "Concatenar",
    category: "Texto",
    returnType: "string",
    parameters: [
      { name: "texto 1", type: ["string", "number", "currency"] },
      { name: "texto 2", type: ["string", "number", "currency"] },
    ],
  },
  {
    id: "UPPER",
    label: "Mayúsculas",
    category: "Texto",
    returnType: "string",
    parameters: [{ name: "texto", type: ["string"] }],
  },
  {
    id: "LOWER",
    label: "Minúsculas",
    category: "Texto",
    returnType: "string",
    parameters: [{ name: "texto", type: ["string"] }],
  },
  {
    id: "IF",
    label: "Si",
    category: "Lógicas",
    returnType: "dynamic",
    parameters: [
      { name: "condición", type: ["boolean"] },
      { name: "valor si verdadero", type: ["any"] },
      { name: "valor si falso", type: ["any"] },
    ],
  },
  {
    id: "ISNULL",
    label: "Si está vacío",
    category: "Lógicas",
    returnType: "dynamic",
    parameters: [
      { name: "valor", type: ["any"] },
      { name: "reemplazo", type: ["any"] },
    ],
  },
];

export const getFunctions = () => FUNCTIONS;

export const getFunctionById = (id) => {
  return FUNCTIONS.find((fn) => fn.id === id) || null;
};
