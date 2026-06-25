import { empty } from "./reportUtils";

export const buildFields = ({
  items = [],
  columns = 4,
  compact = false,
  className = "",
} = {}) => {
  if (!Array.isArray(items) || !items.length) return "";

  return `
<div
  class="
    report-fields
    ${compact ? "compact" : ""}
    ${className || ""}
  "
  style="grid-template-columns: repeat(${columns}, 1fr);"
>
      ${items
        .filter((item) => !item.hidden)
        .map(
          (item) => `
            <div
            class="report-field ${item.className || ""} ${item.align || ""}
            style="${item.span ? `grid-column: span ${item.span};` : ""}"
            >
              <div class="report-field-label">
                ${item.label || ""}
              </div>

              <div class="report-field-value">
                ${empty(item.value)}
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
};
