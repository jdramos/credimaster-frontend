import { buildSection } from "./reportSection";

export const buildSummary = (items = [], title = "Resumen General") => {
  const content = `
    <div class="grid">
      ${items
        .map(
          (item) => `
            <div class="field">
              <div class="label">${item.label || ""}</div>
              <div class="value">${item.value || "—"}</div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;

  return buildSection(title, content);
};
