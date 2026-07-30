import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, money } from "./reportUtils";

// Constancia laboral corta — el documento que un empleado normalmente pide
// para trámites bancarios/migratorios/alquiler. Igual que el contrato, es
// una plantilla de referencia (ver nota en printEmployeeContractReport.js).
export const printWorkCertificateReport = ({ company = {}, user = {}, employee = {}, purpose = "" }) => {
  const empresa = company.legal_name || company.commercial_name || "la empresa";
  const today = date(new Date().toISOString());

  const bodyHtml = `
    <p style="text-align: justify; line-height: 1.8;">
      Quien suscribe, en representación de <strong>${empresa}</strong>${company.tax_id ? ` (RUC ${company.tax_id})` : ""},
      hace constar que <strong>${employee.full_name || ""}</strong>${employee.id_card ? `, portador(a) de cédula de identidad No. ${employee.id_card}` : ""},
      labora en esta empresa desde el <strong>${date(employee.hire_date)}</strong>${employee.termination_date && employee.status === "INACTIVO" ? ` hasta el ${date(employee.termination_date)}` : " a la fecha"},
      desempeñando el cargo de <strong>${employee.position || "-"}</strong>,
      con un salario mensual de <strong>${money(employee.base_salary, "C$")}</strong>.
    </p>

    ${purpose ? `<p style="text-align: justify;">La presente constancia se extiende para: <strong>${purpose}</strong>.</p>` : ""}

    <p style="text-align: justify;">
      Se extiende la presente a solicitud del interesado(a), en la ciudad de Managua, a los ${today}.
    </p>

    <div class="signatures" style="margin-top: 64px;">
      <div class="signature">Recursos Humanos</div>
    </div>
  `;

  const html = createReport({
    company,
    user,
    title: "Constancia Laboral",
    orientation: "portrait",

    sections: [{ html: bodyHtml }],
  });

  openReport(html);
};

export default printWorkCertificateReport;
