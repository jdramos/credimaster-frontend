import dayjs from "dayjs";

export const buildReportFooter = ({ user }) => `
  <div class="report-footer">

    Usuario:
    ${user?.full_name || ""}

    |
    
    Fecha impresión:
    ${dayjs().format("DD/MM/YYYY HH:mm")}

    |

    Generado por CrediMaster

  </div>
`;
