import { reportStyles } from "./reportStyles";
import { buildHeader } from "./reportHeader";
import { buildFooter } from "./reportFooter";
import { buildFilters } from "./reportFilters";
import { buildSummary } from "./reportSummary";
import { buildSection } from "./reportSection";
import { buildTable } from "./reportTable";
import { buildReportContext } from "./reportContext";
import { buildFields } from "./reportFields";

export const createReport = ({
  company = {},
  user = {},
  title = "",
  subtitle = "",
  filters = [],
  summary = [],
  sections = [],
  context = null,
  styles = reportStyles,
  orientation = "portrait",
} = {}) => {
  const safeSections = Array.isArray(sections) ? sections : [];
  const safeFilters = Array.isArray(filters) ? filters : [];
  const safeSummary = Array.isArray(summary) ? summary : [];

  const html = [];

  html.push(`
    <html>
      <head>
        <title>${title || "Reporte"}</title>
        <meta charset="UTF-8" />
        ${styles}
        <style>
          @page {
            size: ${orientation};
          }
        </style>
      </head>
      <body>
  `);

  html.push(
    buildHeader({
      company,
      title,
      subtitle,
      user,
    }),
  );

  if (context) {
    html.push(buildReportContext(context));
  }

  if (safeFilters.length > 0) {
    html.push(buildFilters(safeFilters));
  }

  if (safeSummary.length > 0) {
    html.push(buildSummary(safeSummary));
  }

  safeSections.forEach((section = {}) => {
    const contents = [];

    if (section.fields) {
      contents.push(buildFields(section.fields));
    }

    if (section.html) {
      contents.push(section.html);
    }

    if (section.table) {
      contents.push(buildTable(section.table));
    }

    if (Array.isArray(section.tables)) {
      section.tables.forEach((table) => {
        contents.push(buildTable(table));
      });
    }

    html.push(
      buildSection({
        title: section.title,
        subtitle: section.subtitle,
        content: contents.join(""),
        className: section.className,
      }),
    );
  });

  html.push(
    buildFooter({
      company,
      user,
    }),
  );

  html.push(`
      </body>
    </html>
  `);

  return html.join("");
};
