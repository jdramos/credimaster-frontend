export const buildSection = ({
  title = "",
  subtitle = "",
  content = "",
  className = "",
} = {}) => {
  if (!title && !subtitle && !content) return "";

  return `
    <section class="report-section ${className}">
      ${
        title || subtitle
          ? `
            <div class="section-header">
              ${title ? `<div class="section-title">${title}</div>` : ""}
              ${subtitle ? `<div class="section-subtitle">${subtitle}</div>` : ""}
            </div>
          `
          : ""
      }

      <div class="section-content">
        ${content || ""}
      </div>
    </section>
  `;
};
