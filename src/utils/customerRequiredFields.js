// Empresa no normada por la CONAMI: la ficha completa del cliente es lo que
// pide la norma, así que deja de ser obligatoria. Solo se siguen exigiendo
// las columnas NOT NULL de customers (el backend no puede guardar sin ellas).
// Mantener en sincronía con middleware/validators/validateCustomerPayload.js.
export const UNREGULATED_REQUIRED_CUSTOMER_FIELDS = [
  "customer_name",
  "identification",
  "birth_date",
  "birth_country_id",
  "genre_id",
  "home_address",
  "reference_name",
];

export const isCustomerFieldRequired = (field, conamiRegulated) =>
  conamiRegulated || UNREGULATED_REQUIRED_CUSTOMER_FIELDS.includes(field);

// Deja de la lista de campos requeridos solo los que aplican a la empresa.
export const requiredCustomerFields = (fields, conamiRegulated) =>
  fields.filter((field) => isCustomerFieldRequired(field, conamiRegulated));

// Etiqueta con " *" solo si el campo es obligatorio para la empresa.
export const requiredCustomerLabel = (text, field, conamiRegulated) =>
  isCustomerFieldRequired(field, conamiRegulated) ? `${text} *` : text;
