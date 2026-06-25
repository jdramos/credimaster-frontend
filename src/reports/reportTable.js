import {
  date,
  datetime,
  money,
  number,
  percent,
  integer,
  empty,
} from "./reportUtils";

const getVisibleColumns = (columns = []) =>
  columns.filter((col) => !col.hidden);

const formatValue = (value, row, col) => {
  if (typeof col.formatter === "function") {
    return col.formatter(value, row, col);
  }

  switch (col.format) {
    case "money":
      return money(value);
    case "number":
      return number(value);
    case "percent":
      return percent(value);
    case "date":
      return date(value);
    case "datetime":
      return datetime(value);
    case "integer":
      return integer(value);
    default:
      return empty(value, "");
  }
};

const getRawValue = (row, col) => {
  if (typeof col.field === "function") return col.field(row);
  return row?.[col.field];
};

const getAutoClass = (col = {}) => {
  if (["money", "number", "percent"].includes(col.format))
    return "right nowrap";
  if (["date", "datetime"].includes(col.format)) return "center nowrap";
  return "";
};

const getColumnClass = (col = {}) =>
  [
    getAutoClass(col),
    col.align === "right" ? "right" : "",
    col.align === "center" ? "center" : "",
    col.nowrap ? "nowrap" : "",
    col.className || "",
  ]
    .filter(Boolean)
    .join(" ");

const getColumnKey = (col = {}) => {
  if (typeof col.field === "string") return col.field;
  return col.footerKey || col.key || col.title;
};

const getGroupKey = (row, groupBy) => {
  if (!groupBy) return "";
  if (typeof groupBy === "function") return groupBy(row);
  return row?.[groupBy] ?? "";
};

const getGroupTitle = (row, groupBy, groupTitle) => {
  if (typeof groupTitle === "function") return groupTitle(row);

  const value = getGroupKey(row, groupBy);

  if (groupTitle) return `${groupTitle}: ${value || "—"}`;

  return value || "SIN AGRUPAR";
};

const calcTotal = (rows = [], col = {}) =>
  rows.reduce((acc, row) => acc + Number(getRawValue(row, col) || 0), 0);

const calcGroupTotal = (rows = [], col = {}) => {
  if (typeof col.groupTotal === "function") {
    return col.groupTotal(rows, col);
  }

  if (col.groupTotal === true) {
    return calcTotal(rows, col);
  }

  return "";
};

const getTotalLayout = (columns = [], totalPredicate) => {
  const visibleColumns = getVisibleColumns(columns);
  const totalColumns = visibleColumns.filter(totalPredicate);

  const labelColspan = Math.max(1, visibleColumns.length - totalColumns.length);

  return {
    visibleColumns,
    totalColumns,
    labelColspan,
    valueColumns: visibleColumns.slice(labelColspan),
  };
};

const buildFooter = (footer = null, columns = [], rows = []) => {
  if (!footer) return "";

  const visibleColumns = getVisibleColumns(columns);

  if (Array.isArray(footer)) {
    return `
      <tfoot>
        <tr>
          ${footer
            .map(
              (item) => `
                <td
                  colspan="${item.colspan || 1}"
                  class="${[
                    item.align === "right" ? "right" : "",
                    item.align === "center" ? "center" : "",
                    item.nowrap ? "nowrap" : "",
                    item.className || "",
                  ]
                    .filter(Boolean)
                    .join(" ")}"
                >
                  ${item.value || ""}
                </td>
              `,
            )
            .join("")}
        </tr>
      </tfoot>
    `;
  }

  const values = footer.values || {};
  const label = footer.label || "Totales";
  const autoTotals = footer.autoTotals === true;

  const { labelColspan, valueColumns } = getTotalLayout(
    visibleColumns,
    (col) => {
      const key = getColumnKey(col);
      const hasValue = Object.prototype.hasOwnProperty.call(values, key);
      const shouldAutoTotal = autoTotals && col.total === true;

      return hasValue || shouldAutoTotal;
    },
  );

  return `
    <tfoot>
      <tr>
        <td colspan="${footer.labelColspan || labelColspan}" class="right total-label">
          ${label}
        </td>

        ${valueColumns
          .map((col) => {
            const key = getColumnKey(col);
            const hasValue = Object.prototype.hasOwnProperty.call(values, key);
            const shouldAutoTotal = autoTotals && col.total === true;

            if (!hasValue && !shouldAutoTotal) return `<td></td>`;

            const value = hasValue ? values[key] : calcTotal(rows, col);

            return `
              <td class="${getColumnClass(col)}">
                ${formatValue(value, {}, col)}
              </td>
            `;
          })
          .join("")}
      </tr>
    </tfoot>
  `;
};

const buildRows = ({ rows = [], columns = [], rowClass }) => {
  const visibleColumns = getVisibleColumns(columns);

  return rows
    .map((row) => {
      const trClass = typeof rowClass === "function" ? rowClass(row) : "";

      return `
        <tr class="${trClass || ""}">
          ${visibleColumns
            .map((col) => {
              const rawValue = getRawValue(row, col);

              return `
                <td class="${getColumnClass(col)}">
                  ${formatValue(rawValue, row, col)}
                </td>
              `;
            })
            .join("")}
        </tr>
      `;
    })
    .join("");
};

const buildGroupTotalRow = ({ group, columns = [] }) => {
  const { labelColspan, valueColumns } = getTotalLayout(
    columns,
    (col) => col.groupTotal,
  );

  return `
    <tr class="group-total-row">
      <td colspan="${labelColspan}" class="right total-label">
        Subtotal ${group.title}
      </td>

      ${valueColumns
        .map((col) => {
          if (!col.groupTotal) return `<td></td>`;

          const value = calcGroupTotal(group.rows, col);

          return `
            <td class="${getColumnClass(col)}">
              ${value === "" ? "" : formatValue(value, {}, col)}
            </td>
          `;
        })
        .join("")}
    </tr>
  `;
};

const buildGroupedRows = ({
  rows = [],
  columns = [],
  groupBy,
  groupTitle,
  showGroupTotals = true,
  rowClass,
}) => {
  const visibleColumns = getVisibleColumns(columns);
  const groups = [];

  rows.forEach((row) => {
    const key = getGroupKey(row, groupBy);
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || lastGroup.key !== key) {
      groups.push({
        key,
        title: getGroupTitle(row, groupBy, groupTitle),
        rows: [row],
      });
    } else {
      lastGroup.rows.push(row);
    }
  });

  return groups
    .map((group) => {
      const groupHeader = `
        <tr class="group-row">
          <td colspan="${visibleColumns.length}">
            <div class="group-title">
              ${group.title}
            </div>
          </td>
        </tr>
      `;

      const detailRows = buildRows({
        rows: group.rows,
        columns: visibleColumns,
        rowClass,
      });

      const totalRow =
        showGroupTotals && visibleColumns.some((col) => col.groupTotal)
          ? buildGroupTotalRow({
              group,
              columns: visibleColumns,
            })
          : "";

      return `${groupHeader}${detailRows}${totalRow}`;
    })
    .join("");
};

const getGroupValue = (row, group = {}) => {
  if (typeof group.field === "function") return group.field(row);
  return row?.[group.field] ?? "";
};

const getGroupLabel = (row, group = {}) => {
  if (typeof group.label === "function") return group.label(row);

  const value = getGroupValue(row, group);

  if (group.title) return `${group.title}: ${value || "—"}`;

  return value || "SIN AGRUPAR";
};

const buildMultiGroupedRows = ({
  rows = [],
  columns = [],
  groups = [],
  level = 0,
  showGroupTotals = true,
  rowClass,
}) => {
  const visibleColumns = getVisibleColumns(columns);
  const currentGroup = groups[level];

  if (!currentGroup) {
    return buildRows({
      rows,
      columns: visibleColumns,
      rowClass,
    });
  }

  const grouped = [];

  rows.forEach((row) => {
    const key = getGroupValue(row, currentGroup);
    const lastGroup = grouped[grouped.length - 1];

    if (!lastGroup || lastGroup.key !== key) {
      grouped.push({
        key,
        title: getGroupLabel(row, currentGroup),
        rows: [row],
      });
    } else {
      lastGroup.rows.push(row);
    }
  });

  return grouped
    .map((group) => {
      const groupHeader = `
        <tr class="group-row group-level-${level}">
          <td colspan="${visibleColumns.length}">
            <div class="group-title" style="padding-left:${level * 14}px">
              ${group.title}
            </div>
          </td>
        </tr>
      `;

      const detailRows = buildMultiGroupedRows({
        rows: group.rows,
        columns: visibleColumns,
        groups,
        level: level + 1,
        showGroupTotals,
        rowClass,
      });

      const totalRow =
        showGroupTotals && visibleColumns.some((col) => col.groupTotal)
          ? buildGroupTotalRow({
              group,
              columns: visibleColumns,
            })
          : "";

      return `${groupHeader}${detailRows}${totalRow}`;
    })
    .join("");
};

export const buildTable = ({
  columns = [],
  rows = [],
  footer = null,
  className = "",
  emptyMessage = "No hay datos para mostrar.",
  rowClass = null,

  groupBy = null,
  groupTitle = null,
  groups = [],
  showGroupTotals = true,
} = {}) => {
  const visibleColumns = getVisibleColumns(columns);

  const normalizedGroups =
    Array.isArray(groups) && groups.length
      ? groups
      : groupBy
        ? [
            {
              field: groupBy,
              title: groupTitle,
            },
          ]
        : [];

  return `
    <table class="report-table ${className || ""}">
      <thead>
        <tr>
          ${visibleColumns
            .map(
              (col) => `
                <th
                  ${col.width ? `style="width:${col.width}"` : ""}
                  class="${getColumnClass(col)}"
                >
                  ${col.title || ""}
                </th>
              `,
            )
            .join("")}
        </tr>
      </thead>

<tbody>
  ${
    rows.length
      ? normalizedGroups.length
        ? buildMultiGroupedRows({
            rows,
            columns: visibleColumns,
            groups: normalizedGroups,
            showGroupTotals,
            rowClass,
          })
        : buildRows({
            rows,
            columns: visibleColumns,
            rowClass,
          })
      : `
        <tr>
          <td colspan="${visibleColumns.length || 1}" class="center empty-row">
            ${emptyMessage}
          </td>
        </tr>
      `
  }
</tbody>

      ${buildFooter(footer, visibleColumns, rows)}
    </table>
  `;
};
