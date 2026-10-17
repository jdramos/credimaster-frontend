import React from "react";
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";

// Estados financieros en pantalla con el formato del Manual Único de Cuentas
// de la CONAMI (Formas A, B y C de mucReportModels.js), con las mismas
// columnas que el reporte impreso: filas de sección (section) y de total
// (total) resaltadas, montos alineados a la derecha.
// columns: [{ field, label, numeric, format }]
const defaultFormat = (v) =>
  typeof v === "number" ? v.toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v ?? "";

export default function MucFormTable({ columns, rows, caption, emptyText = "Genere el reporte para ver el estado financiero." }) {
  if (!rows?.length) {
    return (
      <Box sx={{ p: 4, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">{emptyText}</Typography>
      </Box>
    );
  }
  return (
    <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, maxHeight: 640 }}>
      <Table size="small" stickyHeader aria-label={caption}>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell
                key={c.field}
                align={c.numeric ? "right" : "left"}
                sx={{ fontWeight: 800, bgcolor: "action.hover", whiteSpace: c.numeric ? "nowrap" : undefined }}
              >
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => {
            const isSection = Boolean(row.section);
            const isTotal = Boolean(row.total) && !isSection && typeof row.total !== "number";
            return (
              <TableRow
                key={`${row.label}-${i}`}
                data-row-kind={isSection ? "section" : isTotal ? "total" : "line"}
                sx={{
                  ...(isSection && { bgcolor: "rgba(0, 87, 184, 0.08)" }),
                  ...(isTotal && { bgcolor: "action.hover" }),
                }}
              >
                {columns.map((c, idx) => {
                  const value = row[c.field];
                  const fmt = c.format || defaultFormat;
                  return (
                    <TableCell
                      key={c.field}
                      align={c.numeric ? "right" : "left"}
                      sx={{
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: c.numeric ? "nowrap" : undefined,
                        fontWeight: isSection ? 900 : isTotal ? 800 : 400,
                        pl: idx === 0 && !isSection && !isTotal ? 3 : undefined,
                        ...(isTotal && { borderTop: "1px solid", borderTopColor: "text.secondary" }),
                        ...(c.numeric && typeof value === "number" && value < 0 && { color: "error.main" }),
                      }}
                    >
                      {isSection && idx > 0 ? "" : c.numeric ? fmt(value) : value}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
