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
  Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import API from "../api";
import PrintIcon from "@mui/icons-material/Print";

const BAC = {
  blue: "#005AA7",
  blue2: "#1E73BE",
  bg: "#F6F9FC",
  border: "#E2E8F0",
  text: "#0F172A",
  sub: "#475569",
  green: "#16A34A",
  red: "#DC2626",
  orange: "#EA580C",
};

const money = (value) =>
  `C$ ${Number(value || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (value) =>
  value && dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY") : "—";

const InfoItem = ({ label, value }) => (
  <Box>
    <Typography sx={{ fontSize: 10, fontWeight: 800, color: BAC.sub }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 12, fontWeight: 800, color: BAC.text }}>
      {value || "—"}
    </Typography>
  </Box>
);

const Kpi = ({ label, value, color }) => (
  <Paper
    elevation={0}
    sx={{
      border: `1px solid ${BAC.border}`,
      borderRadius: 2,
      px: 1.2,
      py: 0.7,
      bgcolor: "#fff",
      minHeight: 52,
    }}
  >
    <Typography sx={{ fontSize: 10, fontWeight: 800, color: BAC.sub }}>
      {label}
    </Typography>

    <Typography
      sx={{ fontSize: 13, fontWeight: 900, color: color || BAC.text }}
    >
      {value}
    </Typography>
  </Paper>
);

const StatusChip = ({ status }) => {
  const s = String(status || "").toUpperCase();

  if (s === "PAID") {
    return <Chip size="small" label="Pagada" color="success" />;
  }

  if (s === "PARTIAL") {
    return <Chip size="small" label="Parcial" color="warning" />;
  }

  if (s === "OVERDUE") {
    return <Chip size="small" label="Atrasado" color="error" />;
  }

  return <Chip size="small" label="Vigente" color="info" variant="outlined" />;
};

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

  const finalCutDate = cutDate || dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    if (!open || !loanId) return;

    const loadStatement = async () => {
      setLoading(true);

      try {
        const res = await API.get(`/api/loans/${loanId}/account-statement`, {
          params: { date: finalCutDate },
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
  }, [open, loanId, finalCutDate]);

  const totals = useMemo(() => {
    const h = header || {};

    return {
      approvedAmount: Number(h.approved_amount || h.amount || 0),
      capitalBalance: Number(h.capital_balance || 0),
      interestBalance: Number(h.interest_balance || 0),
      insuranceBalance: Number(h.insurance_balance || 0),
      feeBalance: Number(h.fee_balance || 0),
      otherBalance: Number(h.other_charges_balance || 0),
      totalBalance: Number(h.total_balance || 0),

      defaultedDays: Number(h.defaulted_days || 0),
      overdueCapital: Number(h.overdue_capital || 0),
      overdueInterest: Number(h.overdue_interest_balance || 0),
      defaultedCapital: Number(h.defaulted_capital || 0),
      defaultedInterest: Number(h.defaulted_interest || 0),

      totalInstallments: Number(h.total_installments || 0),
      paidInstallments: Number(h.paid_installments || 0),
      partialInstallments: Number(h.partial_installments || 0),
      pendingInstallments: Number(h.pending_installments || 0),

      scheduledPrincipal: Number(h.scheduled_principal || 0),
      scheduledInterest: Number(h.scheduled_interest || 0),
      paidPrincipal: Number(h.paid_principal || 0),
      paidInterest: Number(h.paid_interest || 0),
      paidTotal: Number(h.paid_total || 0),
      pendingTotal: Number(h.pending_total || 0),
      paymentProgress: Number(h.payment_progress || 0),
    };
  }, [header]);

  const exportToExcel = () => {
    const h = header || {};

    const summary = [
      {
        Crédito: loanId,
        Cliente: h.customer_name || customerName || "",
        Identificación: h.customer_identification || identification || "",
        Sucursal: h.branch_name || "",
        Promotor: h.promoter_name || "",
        "Fecha solicitud": fmtDate(h.date),
        "Fecha aprobación": fmtDate(h.approval_date),
        "Fecha desembolso": fmtDate(h.disbursement_date),
        Vencimiento: fmtDate(h.due_date),
        Corte: fmtDate(h.cut_date || finalCutDate),
        "Monto aprobado": totals.approvedAmount,
        Plazo: h.approved_term || h.term || "",
        Tasa: h.approved_rate || h.interest_rate || "",
        Frecuencia: h.frequency_name || h.frequency || "",
        "Saldo capital": totals.capitalBalance,
        "Saldo interés": totals.interestBalance,
        "Saldo seguro": totals.insuranceBalance,
        "Saldo comisión": totals.feeBalance,
        "Otros cargos": totals.otherBalance,
        "Total adeudado": totals.totalBalance,
        "Días mora": totals.defaultedDays,
        "Cuotas totales": totals.totalInstallments,
        "Cuotas pagadas": totals.paidInstallments,
        "Cuotas parciales": totals.partialInstallments,
        "Cuotas pendientes": totals.pendingInstallments,
      },
    ];

    const installments = rows.map((r) => ({
      Cuota: r.payment_number,
      "Fecha cuota": fmtDate(r.payment_date),
      "Pagado el": fmtDate(r.paid_at),
      Estado: r.status_label || r.status,
      Capital: Number(r.payment_principal || 0),
      Interés: Number(r.payment_interest || 0),
      Seguro: Number(r.payment_insurance || 0),
      Comisión: Number(r.payment_fee || 0),
      Otros: Number(r.payment_other_charges || 0),
      "Cuota total": Number(r.installment_total || 0),
      "Pagado capital": Number(r.paid_principal || 0),
      "Pagado interés": Number(r.paid_interest || 0),
      "Total pagado": Number(r.paid_total || 0),
      "Pendiente capital": Number(r.pending_principal || 0),
      "Pendiente interés": Number(r.pending_interest || 0),
      "Pendiente total": Number(r.pending_total || 0),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(summary),
      "Resumen",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(installments),
      "Cuotas",
    );

    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      `EstadoCuenta_${loanId}_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`,
    );
  };

  const h = header || {};

  const handlePrint = () => {
    const content = document.getElementById("account-statement-print");

    if (!content) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=1000,height=700");

    printWindow.document.write(`
    <html>
      <head>
        <title>Estado de Cuenta - Crédito ${loanId}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #0F172A;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }

          th, td {
            border: 1px solid #CBD5E1;
            padding: 4px;
            text-align: left;
          }

          th {
            background: #F1F5F9;
            font-weight: bold;
          }

          .MuiPaper-root {
            box-shadow: none !important;
          }

          @page {
            size: landscape;
            margin: 10mm;
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handlePrintReport = () => {
    const h = header || {};

    const rowsHtml = (rows || [])
      .map(
        (r) => `
        <tr>
          <td>${r.payment_number || ""}</td>
          <td>${fmtDate(r.payment_date)}</td>
          <td>${fmtDate(r.paid_at)}</td>
          <td>${r.status_label || ""}</td>
          <td class="num">${money(r.payment_principal)}</td>
          <td class="num">${money(r.payment_interest)}</td>
          <td class="num">${money(r.payment_insurance)}</td>
          <td class="num">${money(r.payment_fee)}</td>
          <td class="num">${money(r.payment_other_charges)}</td>
          <td class="num strong">${money(r.installment_total)}</td>
          <td class="num">${money(r.paid_principal)}</td>
          <td class="num">${money(r.paid_interest)}</td>
          <td class="num strong">${money(r.paid_total)}</td>
          <td class="num">${money(r.pending_principal)}</td>
          <td class="num">${money(r.pending_interest)}</td>
          <td class="num strong">${money(r.pending_total)}</td>
        </tr>
      `,
      )
      .join("");

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Estado de Cuenta - Crédito ${loanId}</title>
        <style>
          @page {
            size: landscape;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #0F172A;
            margin: 0;
            padding: 0;
            font-size: 11px;
          }

          .report {
            width: 100%;
          }

          .header {
            border-bottom: 3px solid #005AA7;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }

          .brand {
            font-size: 18px;
            font-weight: 900;
            color: #005AA7;
          }

          .title {
            font-size: 15px;
            font-weight: 900;
            margin-top: 3px;
          }

          .subtitle {
            font-size: 11px;
            color: #475569;
            margin-top: 2px;
          }

          .section-title {
            font-size: 12px;
            font-weight: 900;
            background: #F1F5F9;
            border: 1px solid #CBD5E1;
            padding: 5px 7px;
            margin-top: 8px;
          }

          .info-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }

          .info-grid td {
            border: 1px solid #CBD5E1;
            padding: 5px;
            vertical-align: top;
          }

          .label {
            font-size: 9px;
            color: #475569;
            font-weight: 800;
            text-transform: uppercase;
          }

          .value {
            font-size: 11px;
            font-weight: 800;
            margin-top: 2px;
          }

          .kpi-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }

          .kpi-grid td {
            border: 1px solid #CBD5E1;
            padding: 5px;
            width: 12.5%;
          }

          .kpi-label {
            font-size: 9px;
            color: #475569;
            font-weight: 800;
          }

          .kpi-value {
            font-size: 12px;
            font-weight: 900;
          }

          table.detail {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }

          table.detail th {
            background: #005AA7;
            color: white;
            padding: 4px;
            border: 1px solid #CBD5E1;
            text-align: center;
          }

          table.detail td {
            border: 1px solid #CBD5E1;
            padding: 3px;
          }

          .num {
            text-align: right;
            white-space: nowrap;
          }

          .strong {
            font-weight: 900;
          }

          .footer {
            margin-top: 10px;
            font-size: 9px;
            color: #64748B;
            display: flex;
            justify-content: space-between;
          }

          .status-pagada {
            color: #15803D;
            font-weight: 900;
          }

          .status-parcial {
            color: #C2410C;
            font-weight: 900;
          }

          .status-atrasado {
            color: #B91C1C;
            font-weight: 900;
          }

          .status-vigente {
            color: #005AA7;
            font-weight: 900;
          }
        </style>
      </head>

      <body>
        <div class="report">
          <div class="header">
            <div class="brand">CrediMaster</div>
            <div class="title">Estado de Cuenta</div>
            <div class="subtitle">
              Crédito #${loanId} · Corte ${fmtDate(h.cut_date || finalCutDate)}
            </div>
          </div>

          <div class="section-title">Información del crédito</div>

          <table class="info-grid">
            <tr>
              <td>
                <div class="label">Cliente</div>
                <div class="value">${h.customer_name || customerName || ""}</div>
              </td>
              <td>
                <div class="label">Identificación</div>
                <div class="value">${h.customer_identification || identification || ""}</div>
              </td>
              <td>
                <div class="label">Sucursal</div>
                <div class="value">${h.branch_name || ""}</div>
              </td>
              <td>
                <div class="label">Promotor</div>
                <div class="value">${h.promoter_name || ""}</div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="label">Fecha solicitud</div>
                <div class="value">${fmtDate(h.date)}</div>
              </td>
              <td>
                <div class="label">Fecha aprobación</div>
                <div class="value">${fmtDate(h.approval_date)}</div>
              </td>
              <td>
                <div class="label">Fecha desembolso</div>
                <div class="value">${fmtDate(h.disbursement_date)}</div>
              </td>
              <td>
                <div class="label">Vencimiento</div>
                <div class="value">${fmtDate(h.due_date)}</div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="label">Monto aprobado</div>
                <div class="value">${money(h.approved_amount || h.amount)}</div>
              </td>
              <td>
                <div class="label">Plazo</div>
                <div class="value">${h.approved_term || h.term || 0}</div>
              </td>
              <td>
                <div class="label">Tasa</div>
                <div class="value">${Number(h.approved_rate || h.interest_rate || 0).toFixed(2)}%</div>
              </td>
              <td>
                <div class="label">Frecuencia</div>
                <div class="value">${h.frequency_name || h.frequency || ""}</div>
              </td>
            </tr>
          </table>

          <div class="section-title">Resumen financiero</div>

          <table class="kpi-grid">
            <tr>
              <td>
                <div class="kpi-label">Saldo capital</div>
                <div class="kpi-value">${money(totals.capitalBalance)}</div>
              </td>
              <td>
                <div class="kpi-label">Saldo interés</div>
                <div class="kpi-value">${money(totals.interestBalance)}</div>
              </td>
              <td>
                <div class="kpi-label">Seguro/Comisión</div>
                <div class="kpi-value">${money(totals.insuranceBalance + totals.feeBalance)}</div>
              </td>
              <td>
                <div class="kpi-label">Total adeudado</div>
                <div class="kpi-value">${money(totals.totalBalance)}</div>
              </td>
              <td>
                <div class="kpi-label">Días mora</div>
                <div class="kpi-value">${totals.defaultedDays}</div>
              </td>
              <td>
                <div class="kpi-label">% pagado</div>
                <div class="kpi-value">${totals.paymentProgress.toFixed(0)}%</div>
              </td>
              <td>
                <div class="kpi-label">Cuotas pagadas</div>
                <div class="kpi-value">${totals.paidInstallments}</div>
              </td>
              <td>
                <div class="kpi-label">Cuotas pendientes</div>
                <div class="kpi-value">${totals.pendingInstallments}</div>
              </td>
            </tr>
          </table>

          <div class="section-title">Detalle de cuotas</div>

          <table class="detail">
            <thead>
              <tr>
                <th>Cuota</th>
                <th>Fecha</th>
                <th>Pagado el</th>
                <th>Estado</th>
                <th>Capital</th>
                <th>Interés</th>
                <th>Seguro</th>
                <th>Comisión</th>
                <th>Otros</th>
                <th>Total cuota</th>
                <th>Pag. capital</th>
                <th>Pag. interés</th>
                <th>Total pagado</th>
                <th>Pend. capital</th>
                <th>Pend. interés</th>
                <th>Total pendiente</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <div>Generado desde CrediMaster</div>
            <div>Fecha de impresión: ${dayjs().format("DD/MM/YYYY HH:mm")}</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "70vw",
          height: "70vh",
          maxWidth: "70vw",
          maxHeight: "70vh",
          borderRadius: 2,
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.8,
          background: `linear-gradient(90deg, ${BAC.blue}, ${BAC.blue2})`,
          color: "#fff",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box id="account-statement-print">
            <Typography sx={{ fontWeight: 900, fontSize: 15, lineHeight: 1.1 }}>
              Estado de Cuenta · Crédito #{loanId}
            </Typography>

            <Typography sx={{ opacity: 0.9, fontSize: 11 }}>
              {h.customer_name || customerName || "Cliente"} ·{" "}
              {h.customer_identification ||
                identification ||
                "Sin identificación"}{" "}
              · Corte: {fmtDate(h.cut_date || finalCutDate)}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.7}>
            <Tooltip title="Exportar a Excel">
              <span>
                <Button
                  onClick={handlePrintReport}
                  disabled={loading}
                  variant="contained"
                  size="small"
                  startIcon={<PrintIcon />}
                  sx={{
                    minHeight: 30,
                    bgcolor: "#fff",
                    color: BAC.blue,
                    fontWeight: 900,
                    textTransform: "none",
                    borderRadius: 1.5,
                    px: 1.2,
                    "&:hover": { bgcolor: "#F1F6FF" },
                  }}
                >
                  Imprimir
                </Button>
                <Button
                  onClick={exportToExcel}
                  disabled={loading}
                  variant="contained"
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  sx={{
                    minHeight: 30,
                    bgcolor: "#fff",
                    color: BAC.blue,
                    fontWeight: 900,
                    textTransform: "none",
                    borderRadius: 1.5,
                    px: 1.2,
                    "&:hover": { bgcolor: "#F1F6FF" },
                  }}
                >
                  Exportar
                </Button>
              </span>
            </Tooltip>

            <IconButton onClick={onClose} sx={{ color: "#fff" }} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <DialogContent sx={{ bgcolor: BAC.bg, p: 1.3 }}>
        {loading ? (
          <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Paper
              elevation={0}
              sx={{
                p: 1.2,
                mb: 1.2,
                borderRadius: 2,
                border: `1px solid ${BAC.border}`,
                bgcolor: "#fff",
              }}
            >
              <Grid container spacing={1}>
                <Grid item xs={12} md={2.5}>
                  <InfoItem
                    label="Cliente"
                    value={h.customer_name || customerName}
                  />
                </Grid>

                <Grid item xs={6} md={1.5}>
                  <InfoItem
                    label="Identificación"
                    value={h.customer_identification || identification}
                  />
                </Grid>

                <Grid item xs={6} md={1.5}>
                  <InfoItem label="Sucursal" value={h.branch_name} />
                </Grid>

                <Grid item xs={6} md={1.5}>
                  <InfoItem label="Promotor" value={h.promoter_name} />
                </Grid>

                <Grid item xs={6} md={1.2}>
                  <InfoItem label="Solicitud" value={fmtDate(h.date)} />
                </Grid>

                <Grid item xs={6} md={1.2}>
                  <InfoItem
                    label="Aprobación"
                    value={fmtDate(h.approval_date)}
                  />
                </Grid>

                <Grid item xs={6} md={1.2}>
                  <InfoItem
                    label="Desembolso"
                    value={fmtDate(h.disbursement_date)}
                  />
                </Grid>

                <Grid item xs={6} md={1.2}>
                  <InfoItem label="Vence" value={fmtDate(h.due_date)} />
                </Grid>

                <Grid item xs={6} md={1.2}>
                  <InfoItem
                    label="Monto"
                    value={money(h.approved_amount || h.amount)}
                  />
                </Grid>

                <Grid item xs={6} md={1}>
                  <InfoItem
                    label="Plazo"
                    value={`${h.approved_term || h.term || 0}`}
                  />
                </Grid>

                <Grid item xs={6} md={1}>
                  <InfoItem
                    label="Tasa"
                    value={`${Number(h.approved_rate || h.interest_rate || 0).toFixed(2)}%`}
                  />
                </Grid>

                <Grid item xs={6} md={1.4}>
                  <InfoItem
                    label="Frecuencia"
                    value={h.frequency_name || h.frequency}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: `1px solid ${BAC.border}`,
                bgcolor: "#fff",
                overflow: "hidden",
              }}
            >
              <Box sx={{ px: 1.4, py: 0.8 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography sx={{ fontWeight: 900, fontSize: 13 }}>
                    Detalle de cuotas
                  </Typography>

                  <Chip
                    size="small"
                    label={`${rows.length} cuotas`}
                    sx={{
                      bgcolor: "#F1F6FF",
                      color: BAC.blue,
                      fontWeight: 800,
                      height: 22,
                    }}
                  />
                </Stack>
              </Box>

              <Divider />

              <Box sx={{ width: "100%", overflowX: "auto" }}>
                <Table
                  size="small"
                  sx={{
                    minWidth: 1000,
                    "& .MuiTableCell-root": {
                      py: 0.45,
                      px: 0.75,
                      fontSize: 11.5,
                      whiteSpace: "nowrap",
                    },
                    "& .MuiTableHead-root .MuiTableCell-root": {
                      bgcolor: "#F1F5F9",
                      fontWeight: 900,
                      fontSize: 10.5,
                      textTransform: "uppercase",
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Cuota</TableCell>
                      <TableCell>Fecha cuota</TableCell>
                      <TableCell>Pagado el</TableCell>
                      <TableCell>Estado</TableCell>

                      <TableCell align="right">Capital</TableCell>
                      <TableCell align="right">Interés</TableCell>
                      <TableCell align="right">Seguro</TableCell>
                      <TableCell align="right">Comisión</TableCell>
                      <TableCell align="right">Otros</TableCell>
                      <TableCell align="right">Cuota total</TableCell>

                      <TableCell align="right">Total pagado</TableCell>

                      <TableCell align="right">Pendiente total</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {rows.map((r, idx) => (
                      <TableRow key={r.id || idx} hover>
                        <TableCell sx={{ fontWeight: 800 }}>
                          {r.payment_number}
                        </TableCell>

                        <TableCell>{fmtDate(r.payment_date)}</TableCell>
                        <TableCell>{fmtDate(r.paid_at)}</TableCell>

                        <TableCell>
                          <StatusChip status={r.status} />
                        </TableCell>

                        <TableCell align="right">
                          {money(r.payment_principal)}
                        </TableCell>
                        <TableCell align="right">
                          {money(r.payment_interest)}
                        </TableCell>
                        <TableCell align="right">
                          {money(r.payment_insurance)}
                        </TableCell>
                        <TableCell align="right">
                          {money(r.payment_fee)}
                        </TableCell>
                        <TableCell align="right">
                          {money(r.payment_other_charges)}
                        </TableCell>

                        <TableCell align="right" sx={{ fontWeight: 900 }}>
                          {money(r.installment_total)}
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{ fontWeight: 900, color: BAC.green }}
                        >
                          {money(r.paid_total)}
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{ fontWeight: 900, color: BAC.red }}
                        >
                          {money(r.pending_total)}
                        </TableCell>
                      </TableRow>
                    ))}

                    {!rows.length && (
                      <TableRow>
                        <TableCell
                          colSpan={16}
                          align="center"
                          sx={{ py: 4, color: BAC.sub }}
                        >
                          No hay cuotas para mostrar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Paper>

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.2 }}>
              <Button
                onClick={onClose}
                variant="outlined"
                size="small"
                sx={{
                  borderColor: BAC.border,
                  color: BAC.blue,
                  fontWeight: 900,
                  textTransform: "none",
                  borderRadius: 1.5,
                }}
              >
                Cerrar
              </Button>
            </Stack>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
