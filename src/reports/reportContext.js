import { buildSection } from "./reportSection";

const isMeaningful = (value) => {
  if (!value) return false;

  const text = String(value).trim().toLowerCase();

  return !["todos", "todas", "todo", "toda", "sin agrupación"].includes(text);
};

export const buildReportContextLines = ({
  period = "",
  items = [],
  grouping = "",
} = {}) => {
  const lines = [];

  if (period) lines.push(period);

  items.forEach((item) => {
    if (isMeaningful(item.value)) {
      lines.push(`${item.label}: ${item.value}`);
    }
  });

  if (isMeaningful(grouping)) {
    lines.push(`Agrupado por: ${grouping}`);
  }

  return lines;
};

export const buildReportContext = (context = {}) => {
  const lines = buildReportContextLines(context);

  if (!lines.length) return "";

  return buildSection({
    title: "Contexto del reporte",
    content: `
      <div class="report-context">
        ${lines.map((line) => `<div>${line}</div>`).join("")}
      </div>
    `,
  });
};
