import { date, money } from "./reportUtils";

// Arma los datos de sustitución para las 3 plantillas editables de RRHH
// (Contrato/Constancia/Carta Salarial) — una sola fuente para que la
// vista previa del editor (HrConfigPanel.jsx) y la impresión real
// (printEmployeeContractReport.js y hermanos) nunca se desincronicen.
//
// Los nombres de placeholder son en español y sin jerga técnica porque
// un administrador de RRHH sin conocimientos técnicos los edita
// directamente en el texto de la plantilla.

const CONTRACT_TYPE_LABELS = {
  INDEFINIDO: "Tiempo indefinido",
  PLAZO_FIJO: "Plazo fijo",
  OBRA_DETERMINADA: "Obra o servicio determinado",
};

export const buildContractTemplateData = ({ company = {}, employee = {} }) => {
  const empresa = company.commercial_name || company.legal_name || "la empresa";
  const contractTypeLabel = CONTRACT_TYPE_LABELS[employee.contract_type] || "Tiempo indefinido";

  return {
    empresa: company.legal_name || empresa,
    ruc: company.tax_id || "N/D",
    nombre: employee.full_name || "",
    cedula: employee.id_card || "N/D",
    puesto: employee.position || "-",
    tipo_contrato: contractTypeLabel,
    fecha_ingreso: date(employee.hire_date),
    fecha_fin_contrato: employee.contract_type === "PLAZO_FIJO" && employee.contract_end_date
      ? date(employee.contract_end_date)
      : "No aplica",
    salario: money(employee.base_salary, "C$"),
  };
};

// Constancia laboral y carta salarial comparten exactamente la misma
// forma de datos — la única diferencia entre ambas es texto fijo fuera
// de la plantilla (el título del documento).
const buildCertificateTemplateData = ({ company = {}, employee = {}, today }) => {
  const empresa = company.legal_name || company.commercial_name || "la empresa";
  const isInactive = employee.status === "INACTIVO";

  return {
    empresa,
    ruc: company.tax_id || "N/D",
    nombre: employee.full_name || "",
    cedula: employee.id_card || "N/D",
    fecha_ingreso: date(employee.hire_date),
    verbo: isInactive ? "laboró" : "labora",
    periodo: isInactive
      ? (employee.termination_date ? `hasta el ${date(employee.termination_date)}` : "hasta su retiro")
      : "a la fecha",
    puesto: employee.position || "-",
    // Único placeholder que desaparece por completo (no solo un dato en
    // blanco): a un empleado dado de baja no se le certifica un salario
    // vigente, así que la frase entera se omite en vez de mostrar "N/D".
    // Va inline (con coma inicial) dentro de la misma oración de la
    // plantilla, así que al quedar vacío no deja un párrafo suelto.
    frase_salario: isInactive ? "" : `, con un salario mensual de <strong>${money(employee.base_salary, "C$")}</strong>`,
    fecha_hoy: today || date(new Date().toISOString()),
  };
};

export const buildWorkCertificateTemplateData = (args) => buildCertificateTemplateData(args);
export const buildSalaryCertificateTemplateData = (args) => buildCertificateTemplateData(args);
