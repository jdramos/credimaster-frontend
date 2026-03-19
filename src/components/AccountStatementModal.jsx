import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Stack,
  Divider,
  Paper,
  CircularProgress,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../api"; // ajusta si tu API está en otra ruta

const API_URL = process.env.REACT_APP_API_BASE_URL;

const BAC = {
  blue: "#005AA7",
  blue2: "#1E73BE",
  bg: "#F6F9FC",
  border: "#E2E8F0",
  text: "#0F172A",
  sub: "#475569",
};

const money = (value) =>
  `C$ ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const Kpi = ({ label, value }) => (
  <Paper
    elevation={0}
    sx={{
      border: `1px solid ${BAC.border}`,
      borderRadius: 2,
      px: 2,
      py: 1,
      minWidth: 160,
      bgcolor: "#fff",
    }}
  >
    <Typography sx={{ fontSize: 11, fontWeight: 800, color: BAC.sub }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 15, fontWeight: 900, lineHeight: 1.1, color: BAC.text }}>
      {value}
    </Typography>
  </Paper>
);

export default function AccountStatementModal({
  open,
  onClose,
  loanId,
  customerName,
  identification,
  cutDate, // YYYY-MM-DD
}) {
  const [loading, setLoading] = useState(false);
  const [header, setHeader] = useState(null);
  const [rows, setRows] = useState([]);

  const ENDPOINT = useMemo(() => {
    if (!loanId) return null;
    // ✅ Cambia esta ruta a la tuya
    return `${API_URL}/api/loans/${loanId}/account-statement`;
  }, [loanId]);

  const titleDate = useMemo(() => {
    if (!cutDate) return "";
    return dayjs(cutDate).format("DD/MM/YYYY");
  }, [cutDate]);

  useEffect(() => {
    if (!open || !ENDPOINT) return;

    (async () => {
      setLoading(true);
      try {
        // ✅ si tu back no usa cutDate, quítalo
        const res = await API.get(ENDPOINT, { params: { date: cutDate } });

        /**
         * Esperado (ejemplo):
         * res.data = {
         *   header: { capital_balance, interest_balance, overdue_capital, defaulted_capital, total_balance, ... },
         *   movements: [{ date, concept, debit, credit, balance, ref }, ...]
         * }
         */
        setHeader(res.data?.header ?? null);
        setRows(res.data?.movements ?? []);
      } catch (e) {
        console.error("Error estado de cuenta:", e);
        setHeader(null);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, ENDPOINT, cutDate]);

  const exportToExcel = () => {
    const data = (rows || []).map((r) => ({
      Fecha: r.date ? dayjs(r.date).format("DD/MM/YYYY") : "",
      Concepto: r.concept || "",
      Referencia: r.ref || "",
      Débito: Number(r.debit || 0),
      Crédito: Number(r.credit || 0),
      Saldo: Number(r.balance || 0),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 40 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EstadoCuenta");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `EstadoCuenta_${loanId}_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`);
  };

  const totals = useMemo(() => {
    const cap = Number(header?.capital_balance ?? header?.capital ?? 0);
    const int = Number(header?.interest_balance ?? header?.interest ?? 0);
    const mora = Number(header?.defaulted_capital ?? header?.defaulted ?? 0);
    const venc = Number(header?.overdue_capital ?? header?.overdue ?? 0);
    const total =
      Number(header?.total_balance ?? 0) || cap + int + mora + venc;

    return { cap, int, mora, venc, total };
  }, [header]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${BAC.border}`,
        },
      }}
    >
      {/* Header BAC */}
      <Box
        sx={{
          px: 2,
          py: 1.75,
          background: `linear-gradient(90deg, ${BAC.blue}, ${BAC.blue2})`,
          color: "#fff",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 17, lineHeight: 1.2 }}>
              Estado de Cuenta · Crédito #{loanId || "—"}
            </Typography>
            <Typography sx={{ opacity: 0.9, fontSize: 12 }}>
              {customerName || "Cliente"} {identification ? `· ${identification}` : ""} · Corte: {titleDate || "—"}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Exportar a Excel">
              <Button
                onClick={exportToExcel}
                disabled={loading || !rows?.length}
                variant="contained"
                startIcon={<FileDownloadIcon />}
                sx={{
                  bgcolor: "#fff",
                  color: BAC.blue,
                  fontWeight: 900,
                  "&:hover": { bgcolor: "#F1F6FF" },
                  borderRadius: 2,
                  textTransform: "none",
                }}
              >
                Exportar
              </Button>
            </Tooltip>

            <IconButton onClick={onClose} sx={{ color: "#fff" }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <DialogContent sx={{ bgcolor: BAC.bg }}>
        {/* KPIs */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2, flexWrap: "wrap" }}>
          <Kpi label="Saldo Capital" value={money(totals.cap)} />
          <Kpi label="Saldo Interés" value={money(totals.int)} />
          <Kpi label="Capital en Mora" value={money(totals.mora)} />
          <Kpi label="Capital Vencido" value={money(totals.venc)} />
          <Kpi label="Total" value={money(totals.total)} />
        </Stack>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${BAC.border}`,
            bgcolor: "#fff",
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 2, py: 1.25 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ fontWeight: 900, color: BAC.text }}>
                Movimientos
              </Typography>
              <Chip
                size="small"
                label={`${rows?.length || 0} registros`}
                sx={{ bgcolor: "#F1F6FF", color: BAC.blue, fontWeight: 800 }}
              />
            </Stack>
          </Box>

          <Divider />

          {loading ? (
            <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ width: "100%", overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>Fecha</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Concepto</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>Referencia</TableCell>
                    <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Débito</TableCell>
                    <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Crédito</TableCell>
                    <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Saldo</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {(rows || []).map((r, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>
                        {r.date ? dayjs(r.date).format("DD/MM/YYYY") : ""}
                      </TableCell>
                      <TableCell>{r.concept || ""}</TableCell>
                      <TableCell>{r.ref || ""}</TableCell>
                      <TableCell sx={{ textAlign: "right" }}>{money(r.debit)}</TableCell>
                      <TableCell sx={{ textAlign: "right" }}>{money(r.credit)}</TableCell>
                      <TableCell sx={{ textAlign: "right", fontWeight: 900 }}>
                        {money(r.balance)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {!rows?.length && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 4, textAlign: "center", color: BAC.sub }}>
                        No hay movimientos para mostrar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>

        {/* Footer botones */}
        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 2 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              borderColor: BAC.border,
              color: BAC.blue,
              fontWeight: 900,
              textTransform: "none",
              borderRadius: 2,
            }}
          >
            Cerrar
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}