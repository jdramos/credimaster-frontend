import React, { useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import * as XLSX from "xlsx";
import API from "../../api";

// Expediente del ROS (Art. 9 Resolución UAF-N-021-2019): verifica los anexos
// obligatorios y los descarga en un solo libro de Excel para adjuntar en
// SIREL junto con la copia de la identificación (documento del expediente
// del cliente).
const money = (v) => (v == null ? "" : Number(v));
const d10 = (v) => (v ? String(v).slice(0, 10) : "");

const CUSTOMER_FIELDS = [
  ["customer_name", "Nombre"],
  ["identification", "Identificación"],
  ["identity_type", "Tipo de identificación"],
  ["customer_code", "Código"],
  ["birth_date", "Fecha de nacimiento"],
  ["home_address", "Domicilio"],
  ["cellphone", "Celular"],
  ["telephone", "Teléfono"],
  ["email", "Correo"],
  ["occupation", "Ocupación"],
  ["economic_activity", "Actividad económica"],
  ["business_name", "Negocio"],
  ["business_address", "Dirección del negocio"],
  ["monthly_salary", "Ingreso mensual"],
  ["funds_source", "Origen de fondos"],
  ["is_pep", "Persona expuesta políticamente"],
  ["pep_details", "Detalle PEP"],
  ["risk_level", "Nivel de riesgo"],
  ["risk_score", "Puntaje de riesgo"],
  ["risk_calculated_at", "Riesgo calculado"],
  ["next_pic_review_date", "Próxima revisión del PIC"],
  ["identity_verified_at", "Identidad verificada"],
  ["is_frozen", "Inmovilizado"],
  ["frozen_reason", "Motivo de inmovilización"],
];

export function buildDossierWorkbook(d) {
  const wb = XLSX.utils.book_new();
  const rc = d.ros_case;
  const resumen = [
    ["EXPEDIENTE DEL REPORTE DE OPERACIÓN SOSPECHOSA (ROS)"],
    ["Resolución UAF-N-021-2019, Art. 9 — CONFIDENCIAL: no revelar al cliente ni a terceros"],
    [],
    ["Caso", rc.case_number],
    ["Estado", rc.status],
    ["Alerta de origen", rc.alert_type ? `${rc.alert_type}: ${rc.alert_description || ""}` : "—"],
    ["Fecha de la alerta", d10(rc.alert_triggered_at)],
    ["Apertura del caso", d10(rc.opened_at)],
    ["Plazo de envío (30 días)", rc.deadline_date],
    ["Enviado", d10(rc.ros_sent_at)],
    ["Acuse SIREL", rc.sirel_receipt || ""],
    [],
    ["Anexos"],
    ...d.annexes.map((a) => [a.label, a.ok ? "Incluido" : "FALTA", a.detail || ""]),
    [],
    ["4. Informe de análisis del caso"],
    [rc.analysis_notes || ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), "Resumen");

  const pic = CUSTOMER_FIELDS.map(([k, label]) => [label, d.customer[k] == null ? "" : typeof d.customer[k] === "string" && /T\d\d:/.test(d.customer[k]) ? d10(d.customer[k]) : d.customer[k]]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["1. Perfil Integral del Cliente"], [], ...pic]), "1 PIC");

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.payments.map((p) => ({
        Fecha: d10(p.payment_date), Crédito: p.credit_code, "Forma de pago": p.forma_pago, Estado: p.payment_status === "A" ? "Activo" : "Anulado",
        Capital: money(p.principal_payment), Interés: money(p.interest_payment), Seguro: money(p.insurance_payment), Comisión: money(p.fee_payment),
        "Otros cargos": money(p.other_charges_payment), Mora: money(p.defaulted_interest), Total: money(p.total),
      })),
    ),
    "2 Estado de cuenta",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(d.documents.map((x) => ({ Tipo: x.doc_type, Documento: x.doc_name, Cargado: d10(x.uploaded_at) }))),
    "3 Documentos",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.loans.map((l) => ({
        Crédito: l.credit_code, Solicitud: d10(l.request_date), Desembolso: d10(l.disbursement_date), Vencimiento: d10(l.due_date),
        Estado: l.status, Monto: money(l.amount), "Saldo actual": money(l.current_balance), Plazo: l.term, Frecuencia: l.frequency,
        "Tasa %": money(l.interest_rate), "Método de desembolso": l.disbursement_method || "", Cancelación: d10(l.cancellation_date), Castigo: d10(l.writeoff_date),
      })),
    ),
    "5 Historial crediticio",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      ...d.alerts.map((a) => ({ Tipo: "Alerta", Fecha: d10(a.triggered_at), Detalle: `${a.alert_type}: ${a.description}`, Monto: money(a.amount), Estado: a.status })),
      ...d.screenings.map((s) => ({ Tipo: "Consulta de listas", Fecha: d10(s.screened_at), Detalle: `${s.list_name}: ${s.notes || ""}`, Monto: "", Estado: s.result })),
    ]),
    "Alertas y listas",
  );
  return wb;
}

export default function RosDossierDialog({ rosCase, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!rosCase) return;
    setData(null);
    setError("");
    API.get(`/api/aml/ros-cases/${rosCase.id}/dossier`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "No se pudo armar el expediente"));
  }, [rosCase]);

  const download = () => {
    XLSX.writeFile(buildDossierWorkbook(data), `Expediente_ROS_${data.ros_case.case_number}.xlsx`);
  };

  return (
    <Dialog open={Boolean(rosCase)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Expediente del caso {rosCase?.case_number}</DialogTitle>
      <DialogContent dividers>
        {!data && !error && (
          <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} /><Typography>Armando expediente…</Typography></Stack>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {data && (
          <>
            <Typography fontSize={13.5} color="text.secondary" sx={{ mb: 1.5 }}>
              Anexos obligatorios del ROS (Art. 9). El estado de cuenta cubre desde el {data.statement_from}, dos años antes de la alerta.
            </Typography>
            <Stack spacing={1}>
              {data.annexes.map((a) => (
                <Stack key={a.key} direction="row" spacing={1} alignItems="flex-start">
                  {a.ok ? <CheckCircleIcon sx={{ color: "var(--cm-success-text, #16A34A)" }} fontSize="small" /> : <WarningAmberIcon sx={{ color: "var(--cm-warning-text, #D97706)" }} fontSize="small" />}
                  <Box>
                    <Typography fontSize={14} fontWeight={700}>{a.label}</Typography>
                    {a.detail && <Typography fontSize={12.5} color="text.secondary">{a.detail}</Typography>}
                  </Box>
                </Stack>
              ))}
            </Stack>
            <Alert severity="info" sx={{ mt: 2 }}>
              {data.loans.length} crédito(s), {data.payments.length} pago(s) en el período y {data.documents.length} documento(s) en el expediente del cliente.
              Adjunte en SIREL este libro de Excel y la copia de la identificación del expediente del cliente.
            </Alert>
            <Alert severity="warning" sx={{ mt: 1 }}>
              Confidencial: no revele al cliente ni a terceros que se enviará o se envió un ROS (Art. 9, inciso a).
            </Alert>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        <Button variant="contained" startIcon={<FileDownloadIcon />} disabled={!data} onClick={download} sx={{ textTransform: "none" }}>
          Descargar expediente (Excel)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
