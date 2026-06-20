import dayjs from "dayjs";

export const buildReportHeader = ({ company, title, subtitle = "" }) => {
  return `
    <div class="report-header">

      ${
        company?.logo_url
          ? `
          <img
            src="${company.logo_url}"
            class="company-logo"
          />
        `
          : ""
      }

      <div class="company-info">

        <div class="company-name">
          ${company?.commercial_name || company?.legal_name || ""}
        </div>

        <div>
          ${company?.legal_name || ""}
        </div>

        <div>
          RUC: ${company?.tax_id || ""}
        </div>

        <div>
          ${company?.address || ""}
        </div>

        <div>
          Tel: ${company?.phone || ""}
        </div>

      </div>

    </div>

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
  `;
};
