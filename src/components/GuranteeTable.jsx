import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { NumericFormat } from "react-number-format";
import API from "../api"; // ajusta la ruta si tu archivo está en otra carpeta

const GuaranteesTable = ({
  customerId,
  guarantees: externalGuarantees,
  setGuarantees: setExternalGuarantees,
  readOnly = false,
  onTotalChange, // 👈 nuevo
}) => {
  const [guarantees, setGuarantees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rows = externalGuarantees || guarantees;
  const updateRows = setExternalGuarantees || setGuarantees;

  const loadGuarantees = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      setError("");

      const res = await API.get(`/api/guarantees/${customerId}`);
      const data = Array.isArray(res.data) ? res.data : [];

      const normalized = data.map((g) => ({
        customer_identification: g.customer_identification || "",
        customer_name: g.customer_name || "",
        article: g.article || "",
        series: g.series || "",
        brand: g.brand || "",
        value: Number(g.value || 0),
      }));

      updateRows(normalized);
    } catch (err) {
      console.error("Error cargando garantías:", err);
      setError(
        err?.response?.data?.errors ||
          err?.response?.data?.message ||
          "No se pudieron cargar las garantías",
      );
      updateRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuarantees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleChange = (e, rowIndex) => {
    const { name, value } = e.target;
    const newGuarantees = [...rows];
    newGuarantees[rowIndex] = {
      ...newGuarantees[rowIndex],
      [name]: value,
    };
    updateRows(newGuarantees);
  };

  const handleAddRow = () => {
    updateRows([
      ...rows,
      {
        article: "",
        series: "",
        brand: "",
        value: 0,
      },
    ]);
  };

  const handleDelete = (rowIndex) => {
    updateRows(rows.filter((_, index) => index !== rowIndex));
  };

  const totalValue = useMemo(() => {
    return rows.reduce((total, row) => total + Number(row.value || 0), 0);
  }, [rows]);

  useEffect(() => {
    onTotalChange?.(totalValue);
  }, [totalValue, onTotalChange]);

  if (loading) {
    return (
      <Stack alignItems="center" py={2}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" mt={1}>
          Cargando garantías...
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {rows.length === 0 && (
        <Alert severity="info" sx={{ mb: 1 }}>
          Este cliente no tiene garantías registradas.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="guarantees table">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell sx={{ fontWeight: 800 }}>Artículo</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>N° de serie</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Marca/modelo</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                Valor
              </TableCell>
              {!readOnly && (
                <TableCell align="center" sx={{ fontWeight: 800 }}>
                  Acciones
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex} hover>
                <TableCell>
                  <TextField
                    name="article"
                    value={row.article || ""}
                    onChange={(e) => handleChange(e, rowIndex)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={readOnly}
                  />
                </TableCell>

                <TableCell>
                  <TextField
                    name="series"
                    value={row.series || ""}
                    onChange={(e) => handleChange(e, rowIndex)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={readOnly}
                  />
                </TableCell>

                <TableCell>
                  <TextField
                    name="brand"
                    value={row.brand || ""}
                    onChange={(e) => handleChange(e, rowIndex)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={readOnly}
                  />
                </TableCell>

                <TableCell align="right">
                  <NumericFormat
                    customInput={TextField}
                    name="value"
                    value={row.value || 0}
                    onValueChange={({ value }) =>
                      handleChange(
                        { target: { name: "value", value } },
                        rowIndex,
                      )
                    }
                    thousandSeparator
                    decimalSeparator="."
                    decimalScale={2}
                    fixedDecimalScale
                    size="small"
                    prefix="C$ "
                    disabled={readOnly}
                    sx={{ maxWidth: 150 }}
                  />
                </TableCell>

                {!readOnly && (
                  <TableCell align="center">
                    <Stack
                      direction="row"
                      spacing={0.5}
                      justifyContent="center"
                    >
                      {rowIndex === rows.length - 1 && (
                        <Tooltip title="Agregar">
                          <IconButton onClick={handleAddRow} size="small">
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      <Tooltip title="Eliminar">
                        <IconButton
                          onClick={() => handleDelete(rowIndex)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}

            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell colSpan={3} align="right" sx={{ fontWeight: 900 }}>
                Total Garantías
              </TableCell>

              <TableCell align="right" sx={{ fontWeight: 900 }}>
                <NumericFormat
                  value={totalValue}
                  displayType="text"
                  thousandSeparator
                  decimalSeparator="."
                  decimalScale={2}
                  fixedDecimalScale
                  prefix="C$ "
                />
              </TableCell>

              {!readOnly && <TableCell />}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default GuaranteesTable;
