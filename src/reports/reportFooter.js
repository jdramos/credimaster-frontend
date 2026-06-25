import dayjs from "dayjs";

export const buildFooter = ({ company = {}, user = {} } = {}) => `
  <div class="report-footer">
    Generado el ${dayjs().format("DD/MM/YYYY HH:mm")}
    ${user?.full_name ? ` por ${user.full_name}` : ""}
    ${company?.commercial_name || company?.legal_name ? ` | ${company.commercial_name || company.legal_name}` : ""}
  </div>
`;
