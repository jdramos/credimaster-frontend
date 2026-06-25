import { buildSection } from "./reportSection";

export const buildFilters = (items = [], title = "Filtros aplicados") => {
  if (!items.length) return "";

  const content = `
    <div class="report-filters">
      ${items
        .map(
          (item) => `
            <div class="filter-item">
              <div class="filter-label">
                ${item.label || ""}
              </div>

              <div class="filter-value">
                ${item.value || "—"}
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;

  return buildSection({
    title,
    content,
  });
};
