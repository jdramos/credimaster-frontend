import dayjs from "dayjs";

export const buildHeader = ({
  company = {},
  title = "",
  subtitle = "",
  user = user,
} = {}) => `


  <div class="report-header">

    ${
      company.logo_url
        ? `
        <div class="logo-box">
          <img
            src="${company.logo_url}"
            class="company-logo"
          />
        </div>
      `
        : ""
    }

    <div class="company-info">

      <div class="company-name">
        ${company.commercial_name || company.legal_name || ""}
      </div>

      ${
        company.legal_name &&
        company.commercial_name &&
        company.legal_name !== company.commercial_name
          ? `<div class="company-legal">${company.legal_name}</div>`
          : ""
      }

      <div class="company-line">
        ${company.tax_id ? `RUC: ${company.tax_id}` : ""}
        ${
          company.phone
            ? `${company.tax_id ? " | " : ""}Tel: ${company.phone}`
            : ""
        }
      </div>

      ${
        company.address
          ? `<div class="company-line">${company.address}</div>`
          : ""
      }

    </div>

    <div class="report-title-box">

      <div class="report-title">
        ${title}
      </div>

      ${
        subtitle
          ? `
            <div class="report-subtitle">
              ${subtitle}
            </div>
          `
          : ""
      }

      <div class="report-meta">
        Fecha: ${dayjs().format("DD/MM/YYYY HH:mm")}
        ${user?.full_name ? `<br>Usuario: ${user.full_name}` : ""}
      </div>

    </div>

  </div>
`;
