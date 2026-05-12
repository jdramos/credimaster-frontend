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
import API from "../api";

const BAC = {
  blue: "#005AA7",
  blue2: "#1E73BE",
  bg: "#F6F9FC",
  border: "#E2E8F0",
  text: "#0F172A",
  sub: "#475569",
  green: "#16A34A",
};

const money = (value) =>
  `C$ ${Number(value || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Kpi = ({ label, value, color }) => (
  <Paper
    elevation={0}
    sx={{
      border: `1px solid ${BAC.border}`,
      borderRadius: 2,
      px: 1.5,
      py: 0.8,
      minWidth: 145,
      bgcolor: "#fff",
    }}
  >
    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: BAC.sub }}>
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: 14,
        fontWeight: 900,
        color: color || BAC.text,
      }}
    >
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
  cutDate,
}) {
  const [loading, setLoading] = useState(false);
  const [header, setHeader] = useState(null);
  const [rows, setRows] = useState([]);

  const endpoint = useMemo(() => {
    if (!loanId) return null;
    return `/api/loans/${loanId}/account-statement`;
  }, [loanId]);

  const finalCutDate = cutDate || dayjs().format("YYYY-MM-DD");

  const titleDate = useMemo(() => {
    return finalCutDate ? dayjs(finalCutDate).format("DD/MM/YYYY") : "";
  }, [finalCutDate]);

  useEffect(() => {
    if (!open || !endpoint) return;

    const loadStatement = async () => {
      setLoading(true);

      try {
        const res = await API.get(endpoint, {
          params: {
            date: finalCutDate,
          },
        });

        setHeader(res.data?.header ?? null);
        setRows(res.data?.movements ?? []);
      } catch (error) {
        console.error("Error estado de cuenta:", error);
        setHeader(null);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadStatement();
  }, [open, endpoint, finalCutDate]);

  const totals = useMemo(() => {
    const cap = Number(header?.capital_balance ?? 0);
    const int = Number(header?.interest_balance ?? 0);
    const mora = Number(header?.defaulted_capital ?? 0);
    const venc = Number(header?.overdue_capital ?? 0);
    const total = Number(header?.total_balance ?? 0) || cap + int + mora + venc;

    const scheduledInterest = Number(header?.scheduled_interest ?? 0);
    const generatedInterest = Number(header?.generated_interest ?? 0);
    const paidInterest = Number(header?.paid_interest ?? 0);
    const savedInterest = Number(header?.saved_interest ?? 0);

    return {
      cap,
      int,
      mora,
      venc,
      total,
      scheduledInterest,
      generatedInterest,
      paidInterest,
      savedInterest,
    };
  }, [header]);

  const exportToExcel = () => {
    const summary = [
      {
        Crédito: loanId,
        Cliente: header?.customer_name || customerName || "",
        Identificación: header?.customer_identification || identification || "",
        Corte: titleDate,
        "Saldo Capital": totals.cap,
        "Saldo Interés": totals.int,
        "Capital en Mora": totals.mora,
        "Capital Vencido": totals.venc,
        "Interés Programado": totals.scheduledInterest,
        "Interés Generado": totals.generatedInterest,
        "Interés Pagado": totals.paidInterest,
        "Interés Ahorrado": totals.savedInterest,
        Total: totals.total,
      },
    ];

    const movements = (rows || []).map((r) => ({
      Fecha: r.date ? dayjs(r.date).format("DD/MM/YYYY") : "",
      Concepto: r.concept || "",
      "Cargo interés": Number(r.interest_charge || 0),
      "Abono interés": Number(r.interest_payment || 0),
      "Abono capital": Number(r.principal_payment || 0),
      "Abono total": Number(r.total_payment || 0),
      "Saldo capital": Number(r.capital_balance || 0),
      "Saldo interés": Number(r.interest_balance || 0),
      "Saldo total": Number(r.total_balance || 0),
    }));

    const wsSummary = XLSX.utils.json_to_sheet(summary);
    const wsMovements = XLSX.utils.json_to_sheet(movements);

    wsSummary["!cols"] = [
      { wch: 12 },
      { wch: 35 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
    ];

    wsMovements["!cols"] = [
      { wch: 12 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
    XLSX.utils.book_append_sheet(wb, wsMovements, "EstadoCuenta");

    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(
      blob,
      `EstadoCuenta_${loanId}_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`,
    );
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
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
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: `linear-gradient(90deg, ${BAC.blue}, ${BAC.blue2})`,
          color: "#fff",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 17, lineHeight: 1.2 }}>
              Estado de Cuenta · Crédito #{loanId || "—"}
            </Typography>

            <Typography sx={{ opacity: 0.9, fontSize: 12 }}>
              {header?.customer_name || customerName || "Cliente"}
              {header?.customer_identification || identification
                ? ` · ${header?.customer_identification || identification}`
                : ""}
              {" · "}
              Corte: {titleDate || "—"}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Exportar a Excel">
              <span>
                <Button
                  onClick={exportToExcel}
                  disabled={loading || !rows?.length}
                  variant="contained"
                  size="small"
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
              </span>
            </Tooltip>

            <IconButton onClick={onClose} sx={{ color: "#fff" }} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <DialogContent sx={{ bgcolor: BAC.bg, p: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          sx={{ mb: 1.5, flexWrap: "wrap" }}
        >
          <Kpi label="Saldo Capital" value={money(totals.cap)} />
          <Kpi label="Saldo Interés" value={money(totals.int)} />
          <Kpi label="Capital en Mora" value={money(totals.mora)} />
          <Kpi label="Capital Vencido" value={money(totals.venc)} />
          <Kpi label="Total" value={money(totals.total)} />
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          sx={{ mb: 1.5, flexWrap: "wrap" }}
        >
          <Kpi
            label="Interés Programado"
            value={money(totals.scheduledInterest)}
          />
          <Kpi
            label="Interés Generado"
            value={money(totals.generatedInterest)}
          />
          <Kpi label="Interés Pagado" value={money(totals.paidInterest)} />
          <Kpi
            label="Interés Ahorrado"
            value={money(totals.savedInterest)}
            color={totals.savedInterest > 0 ? BAC.green : BAC.text}
          />
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
          <Box sx={{ px: 2, py: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography sx={{ fontWeight: 900, color: BAC.text }}>
                Movimientos
              </Typography>

              <Chip
                size="small"
                label={`${rows?.length || 0} registros`}
                sx={{
                  bgcolor: "#F1F6FF",
                  color: BAC.blue,
                  fontWeight: 800,
                }}
              />
            </Stack>
          </Box>

          <Divider />

          {loading ? (
            <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ width: "100%", overflowX: "auto" }}>
              <Table
                size="small"
                sx={{
                  "& .MuiTableCell-root": {
                    py: 0.55,
                    px: 1,
                    fontSize: 12,
                    lineHeight: 1.2,
                  },
                  "& .MuiTableHead-root .MuiTableCell-root": {
                    bgcolor: "#F1F5F9",
                    fontWeight: 900,
                    color: BAC.text,
                    fontSize: 11,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Concepto</TableCell>
                    <TableCell align="right">Cargo interés</TableCell>
                    <TableCell align="right">Abono interés</TableCell>
                    <TableCell align="right">Abono capital</TableCell>
                    <TableCell align="right">Abono total</TableCell>
                    <TableCell align="right">Saldo capital</TableCell>
                    <TableCell align="right">Saldo interés</TableCell>
                    <TableCell align="right">Saldo total</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {(rows || []).map((r, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {r.date ? dayjs(r.date).format("DD/MM/YYYY") : ""}
                      </TableCell>

                      <TableCell>{r.concept || ""}</TableCell>

                      <TableCell align="right">
                        {money(r.interest_charge)}
                      </TableCell>

                      <TableCell align="right">
                        {money(r.interest_payment)}
                      </TableCell>

                      <TableCell align="right">
                        {money(r.principal_payment)}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {money(r.total_payment)}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 900 }}>
                        {money(r.capital_balance)}
                      </TableCell>

                      <TableCell align="right">
                        {money(r.interest_balance)}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 900 }}>
                        {money(r.total_balance)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {!rows?.length && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        sx={{
                          py: 4,
                          textAlign: "center",
                          color: BAC.sub,
                        }}
                      >
                        No hay movimientos para mostrar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>

        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={1.5}
          sx={{ mt: 2 }}
        >
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
