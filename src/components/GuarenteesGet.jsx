import React, { useMemo, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Stack,
  Typography,
  TextField,
  IconButton,
  Button,
  CircularProgress,
  InputAdornment,
  Tooltip,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RefreshIcon from "@mui/icons-material/Refresh";
import { alpha } from "@mui/material/styles";
import { NumericFormat } from "react-number-format";

const token = process.env.REACT_APP_API_TOKEN;

const toMoney = (v) => Number(v || 0);

const MoneyText = ({ value, bold = false }) => (
  <Typography
    component="span"
    sx={{
      fontVariantNumeric: "tabular-nums",
      fontWeight: bold ? 900 : 600,
      whiteSpace: "nowrap",
    }}
  >
    <NumericFormat
      value={toMoney(value)}
      displayType="text"
      thousandSeparator=","
      decimalSeparator="."
      decimalScale={2}
      fixedDecimalScale
      prefix="C$"
    />
  </Typography>
);

const GuaranteesGet = ({ apiUrl, TotalGuarenteeValue }) => {
  const [open, setOpen] = useState(false);
  const [guarantees, setGuarantees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalValue = useMemo(() => {
    if (!Array.isArray(guarantees) || guarantees.length === 0) return 0;
    return guarantees.reduce((sum, item) => sum + toMoney(item?.value), 0);
  }, [guarantees]);

  const displayTotal = totalValue || toMoney(TotalGuarenteeValue);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const fetchGuarantees = async () => {
    if (!apiUrl) {
      setError("No se recibió la URL del endpoint.");
      setGuarantees([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { Authorization: token },
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const rows = Array.isArray(data) ? data : [];
      setGuarantees(rows);
    } catch (err) {
      setError(err?.message || "Error al cargar garantías");
      setGuarantees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchGuarantees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      {/* Campo resumen */}
      <NumericFormat
        customInput={TextField}
        label="Valor de garantías"
        variant="outlined"
        value={displayTotal}
        thousandSeparator
        decimalSeparator="."
        decimalScale={2}
        fixedDecimalScale
        size="small"
        prefix="C$"
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Ver detalle de garantías" arrow>
                <IconButton onClick={handleOpen} aria-label="view guarantees">
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />

      {/* Dialog profesional (mejor que Modal raw) */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: (t) => ({
               borderRadius: 3,
      backgroundColor: "#ffffff",
          }),
        }}
      >
        <DialogTitle
  sx={{
    backgroundColor: "#f5f9ff", // azul muy suave
    borderBottom: "1px solid #e3e8ef",
    py: 2,
  }}
>
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
      Detalle de Garantías
    </Typography>

    <Chip
      label={
        <>
          Total:&nbsp;
          <strong>
            <NumericFormat
              value={displayTotal}
              displayType="text"
              thousandSeparator=","
              decimalSeparator="."
              decimalScale={2}
              fixedDecimalScale
              prefix="C$"
            />
          </strong>
        </>
      }
      sx={{
        backgroundColor: "#e6f4ea", // verde muy suave
        color: "#166534",
        fontWeight: 600,
      }}
    />
  </Stack>
</DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 2 }}>
          {/* Estados */}
          {loading ? (
            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between">
                <Skeleton variant="text" width={220} height={24} />
                <Skeleton variant="rounded" width={180} height={28} />
              </Stack>
              <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
            </Stack>
          ) : error ? (
            <Box
              sx={(t) => ({
                p: 2,
                borderRadius: 2,
                border: `1px solid ${alpha(t.palette.error.main, 0.35)}`,
                backgroundColor: alpha(t.palette.error.main, 0.06),
              })}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
                No se pudo cargar
              </Typography>
              <Typography variant="body2" color="error">
                {error}
              </Typography>

              <Box sx={{ mt: 1.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchGuarantees}
                >
                  Reintentar
                </Button>
              </Box>
            </Box>
          ) : guarantees.length === 0 ? (
            <Box
              sx={(t) => ({
                p: 2,
                borderRadius: 2,
                border: `1px dashed ${alpha(t.palette.divider, 0.9)}`,
              })}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
                Sin garantías
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No hay garantías disponibles para mostrar.
              </Typography>
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={(t) => ({
                borderRadius: 2.5,
                borderColor: alpha(t.palette.divider, 0.9),
                overflow: "hidden",
              })}
            >
              <Table size="small">
               <TableHead>
				<TableRow
					sx={{
					"& th": {
						backgroundColor: "#f1f5f9", // gris muy claro
						fontWeight: 700,
						color: "#334155",
					},
					}}
				>
					<TableCell>Artículo</TableCell>
					<TableCell>Serie</TableCell>
					<TableCell>Marca</TableCell>
					<TableCell align="right">Valor</TableCell>
				</TableRow>
				</TableHead>

                <TableBody>
                  {guarantees.map((item, index) => (
                    <TableRow key={item?.id ?? index} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{item.article ?? "-"}</TableCell>
                      <TableCell>{item.series ?? "-"}</TableCell>
                      <TableCell>{item.brand ?? "-"}</TableCell>
                      <TableCell align="right">
                        <MoneyText value={item.value} />
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Total sticky */}
                  <TableRow
					sx={{
						"& td": {
						backgroundColor: "#f8fafc",
						fontWeight: 800,
						borderTop: "2px solid #e2e8f0",
						},
					}}
					>
					<TableCell colSpan={3} align="right">
						Total
					</TableCell>
					<TableCell align="right">
						<NumericFormat
						value={displayTotal}
						displayType="text"
						thousandSeparator=","
						decimalSeparator="."
						decimalScale={2}
						fixedDecimalScale
						prefix="C$"
						/>
					</TableCell>
					</TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {loading ? (
            <Box sx={{ mt: 2, display: "flex", gap: 1, alignItems: "center" }}>
              <CircularProgress size={18} />
              <Typography variant="caption" color="text.secondary">
                Cargando garantías…
              </Typography>
            </Box>
          ) : null}
        </DialogContent>

    <DialogActions
		sx={{
			backgroundColor: "#f8fafc",
			borderTop: "1px solid #e2e8f0",
		}}
		>
		<Button
			onClick={handleClose}
			variant="contained"
			sx={{
			backgroundColor: "#0033A0",
			"&:hover": { backgroundColor: "#00257A" },
			textTransform: "none",
			fontWeight: 600,
			px: 3,
			}}
		>
			Cerrar
		</Button>
		</DialogActions>
      </Dialog>
    </>
  );
};

export default GuaranteesGet;