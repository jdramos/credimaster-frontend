import React from "react";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useNavigate } from "react-router-dom";

function DataTable({ columns = [], data = [], route = "" }) {
  const navigate = useNavigate();

  const handleEdit = (row) => {
    navigate(`/${route}/editar/${row.id}`, { state: { record: row } });
  };

  const renderCellValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return (
        <Typography variant="body2" color="text.disabled">
          —
        </Typography>
      );
    }

    return value;
  };

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        boxShadow: "none",
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow
            sx={{
              background:
                "linear-gradient(90deg, rgba(13,71,161,0.08) 0%, rgba(66,165,245,0.08) 100%)",
            }}
          >
            {columns.map((col, index) => (
              <TableCell
                key={index}
                sx={{
                  fontWeight: 800,
                  color: "primary.main",
                  whiteSpace: "nowrap",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                {col.header}
              </TableCell>
            ))}

            <TableCell
              align="center"
              sx={{
                fontWeight: 800,
                color: "primary.main",
                whiteSpace: "nowrap",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id}
              hover
              sx={{
                "&:hover": {
                  backgroundColor: "rgba(21, 101, 192, 0.04)",
                },
                "&:last-child td": {
                  borderBottom: 0,
                },
              }}
            >
              {columns.map((col, colIndex) => (
                <TableCell
                  key={colIndex}
                  sx={{
                    verticalAlign: "middle",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {col.accessorKey === "id" ? (
                    <Chip
                      label={row[col.accessorKey]}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        minWidth: 52,
                        bgcolor: "rgba(13,71,161,0.08)",
                        color: "primary.main",
                      }}
                    />
                  ) : (
                    <Typography variant="body2">
                      {renderCellValue(row[col.accessorKey])}
                    </Typography>
                  )}
                </TableCell>
              ))}

              <TableCell
                align="center"
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  whiteSpace: "nowrap",
                }}
              >
                <Tooltip title="Editar sucursal">
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(row)}
                    sx={{
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "primary.main",
                      color: "primary.main",
                      backgroundColor: "rgba(13,71,161,0.04)",
                      "&:hover": {
                        backgroundColor: "rgba(13,71,161,0.10)",
                      },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Abrir edición">
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(row)}
                    sx={{
                      ml: 1,
                      borderRadius: 2,
                      color: "text.secondary",
                      "&:hover": {
                        backgroundColor: "rgba(15, 23, 42, 0.06)",
                      },
                    }}
                  >
                    <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default DataTable;
