import React, { useState } from "react";
import {
  Box,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  TableContainer,
  CircularProgress,
  TextField,
  Stack,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { NumericFormat } from "react-number-format";
import API from "../api";
import BranchSelect from "./BranchSelect";

const Money = ({ value }) => (
  <NumericFormat
    value={Number(value || 0)}
    displayType="text"
    thousandSeparator=","
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
  />
);

// Proyección de cobro esperado (capital + interés) por rango de fecha, según
// el calendario de cuotas vigente de cada crédito. Cuando lo proyectado
// supera el saldo actual del crédito, la columna "Recuperación" se acota a
// ese saldo -no se puede recuperar más de lo que el crédito debe- (ver
// api/loan/recoveryProjectionController.js).
const RecoveryProjection = () => {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);

  const [dateFrom, setDateFrom] = useState(dayjs().format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(dayjs().add(1, "month").format("YYYY-MM-DD"));
  const [branchId, setBranchId] = useState("");

  const fetchProjection = async () => {
    if (!dateFrom || !dateTo) return;

    try {
      setLoading(true);

      const params = { date_from: dateFrom, date_to: dateTo };
      if (branchId) params.branch_id = branchId;

      const res = await API.get("/api/loans/recovery-projection", { params });

      setRows(res.data?.data || []);
      setSummary(res.data?.summary || null);
      setHasQueried(true);
    } catch (error) {
      console.error("Error al calcular la proyección de recuperación:", error);
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!rows.length) return;

    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Sucursal: r.branch_name || "",
        Cédula: r.customer_identification || "",
        Cliente: r.customer_name || "",
        "Crédito": r.loan_id,
        "Principal proyectado": r.projected_principal,
        "Interés proyectado": r.projected_interest,
        "Total proyectado": r.projected_total,
        "Saldo del crédito": r.current_balance,
        "Recuperación estimada": r.recovery,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proyección");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `ProyeccionRecuperacion_${dateFrom}_${dateTo}.xlsx`);
  };

  return (
    <Box className="bac-page">
      <Box className="bac-page-header">
        <Box>
          <Typography variant="h5" className="bac-page-title">
            Proyección de Recuperación
          </Typography>
          <div className="bac-page-subtitle">
            Capital e interés que se espera cobrar en el rango de fecha, según el calendario de cuotas vigente
          </div>
        </Box>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Exportar a Excel">
            <span>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportExcel}
                className="bac-btn-muted"
                disabled={!rows.length}
              >
                Exportar
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchProjection}
            className="bac-btn-muted"
            disabled={loading}
          >
            Actualizar
          </Button>
        </Stack>
      </Box>

      {summary && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(5,1fr)" },
            gap: 2,
            mb: 2,
          }}
        >
          <Box className="bac-summary-card">
            <Typography variant="caption">Créditos</Typography>
            <Typography variant="h6">{summary.loans_count}</Typography>
          </Box>
          <Box className="bac-summary-card">
            <Typography variant="caption">Principal Proyectado</Typography>
            <Typography variant="h6">
              C$ <Money value={summary.total_principal} />
            </Typography>
          </Box>
          <Box className="bac-summary-card">
            <Typography variant="caption">Interés Proyectado</Typography>
            <Typography variant="h6">
              C$ <Money value={summary.total_interest} />
            </Typography>
          </Box>
          <Box className="bac-summary-card">
            <Typography variant="caption">Total Proyectado</Typography>
            <Typography variant="h6">
              C$ <Money value={summary.total_projected} />
            </Typography>
          </Box>
          <Box className="bac-summary-card">
            <Typography variant="caption">Recuperación Estimada</Typography>
            <Typography variant="h6">
              C$ <Money value={summary.total_recovery} />
            </Typography>
          </Box>
        </Box>
      )}

      <Box className="bac-filters">
        <Box className="bac-filters__head">
          <Typography sx={{ fontWeight: 950, color: "var(--bac-text)" }}>Filtros</Typography>
          <Typography sx={{ fontSize: 12, color: "var(--bac-muted)" }}>
            Rango de fecha de las cuotas a proyectar
          </Typography>
        </Box>

        <Box className="bac-filters__body">
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
            }}
          >
            <TextField
              label="Desde"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hasta"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <BranchSelect size="small" value={branchId} onChange={(e) => setBranchId(e.target.value)} />

            <Button
              variant="contained"
              onClick={fetchProjection}
              className="bac-btn-primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Calcular"}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className="bac-table-card">
        <TableContainer>
          <Table size="small" className="bac-table">
            <TableHead>
              <TableRow>
                <TableCell>Crédito</TableCell>
                <TableCell>Cédula</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Sucursal</TableCell>
                <TableCell align="right">Principal</TableCell>
                <TableCell align="right">Interés</TableCell>
                <TableCell align="right">Total Proyectado</TableCell>
                <TableCell align="right">Saldo del Crédito</TableCell>
                <TableCell align="right">Recuperación</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 4 }}>
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ color: "var(--bac-muted)", py: 3 }}>
                    {hasQueried
                      ? "No hay cuotas proyectadas en ese rango de fecha."
                      : "Elige un rango de fecha y presiona Calcular."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const capped = r.recovery < r.projected_total;
                  return (
                    <TableRow key={r.loan_id} hover>
                      <TableCell>{r.loan_id}</TableCell>
                      <TableCell>{r.customer_identification ?? "—"}</TableCell>
                      <TableCell>{r.customer_name ?? "—"}</TableCell>
                      <TableCell>{r.branch_name ?? "—"}</TableCell>
                      <TableCell align="right">
                        <Money value={r.projected_principal} />
                      </TableCell>
                      <TableCell align="right">
                        <Money value={r.projected_interest} />
                      </TableCell>
                      <TableCell align="right">
                        <Money value={r.projected_total} />
                      </TableCell>
                      <TableCell align="right">
                        <Money value={r.current_balance} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip
                          title={
                            capped
                              ? "Acotado al saldo del crédito: lo proyectado superaba lo que realmente debe"
                              : ""
                          }
                          arrow
                          disableHoverListener={!capped}
                        >
                          <Box
                            component="span"
                            sx={{ fontWeight: capped ? 800 : 400, color: capped ? "warning.main" : "inherit" }}
                          >
                            <Money value={r.recovery} />
                          </Box>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default RecoveryProjection;
