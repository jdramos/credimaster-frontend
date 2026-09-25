import React, { useCallback, useEffect, useState } from "react";
import { Button, Chip, Stack, Tooltip, IconButton } from "@mui/material";
import API from "../../../api";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GavelIcon from "@mui/icons-material/Gavel";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DescriptionIcon from "@mui/icons-material/Description";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PaymentsIcon from "@mui/icons-material/Payments";
import { printLoanApplicationReport } from "../../../reports/loanApplicationReport";
import { CompactCard } from "./primitives";

const disclosureLabels = {
  SUMMARY_SHEET: "Hoja Resumen",
  CONTRACT: "Contrato",
  AMORTIZATION_TABLE: "Tabla de Amortización",
};

const LoanSummaryBar = ({
  loan,
  loanData,
  loanId,
  globalStatusUI,
  pendingCountUI,
  isComplianceValid,
  canAddPayment,
  onAddPayment,
  company,
  user,
  userId,
  clientId,
  clientIdentification,
  guarantees = [],
  financialEvaluation,
  notify,
}) => {
  const [disclosures, setDisclosures] = useState([]);
  const [acceptingDisclosure, setAcceptingDisclosure] = useState("");

  const loadDisclosures = useCallback(async () => {
    if (!loanId) {
      setDisclosures([]);
      return;
    }

    try {
      const res = await API.get(
        `/api/conami-transparency/loans/${loanId}/disclosures`,
      );
      setDisclosures(res.data?.data || []);
    } catch (error) {
      console.error("Error cargando evidencias CONAMI:", error);
    }
  }, [loanId]);

  useEffect(() => {
    loadDisclosures();
  }, [loadDisclosures]);

  const openConamiDocument = async (type) => {
    try {
      const response = await API.get(
        `/api/conami-transparency/loans/${loanId}/document/${type}`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "text/html;charset=utf-8",
      });

      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank");

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (error) {
      console.error(error);
      notify?.("No se pudo abrir el documento CONAMI", "error");
    }
  };

  const isDisclosureAccepted = (type) =>
    disclosures.some((d) => d.disclosure_type === type);

  const handleAcceptDisclosure = async (type) => {
    if (!loanId) return;

    try {
      setAcceptingDisclosure(type);

      await API.post(`/api/conami-transparency/loans/${loanId}/accept`, {
        disclosure_type: type,
      });

      await loadDisclosures();

      notify?.(`${disclosureLabels[type]}: evidencia registrada.`, "success");
    } catch (error) {
      console.error(error);
      notify?.(
        error.response?.data?.error ||
          `No se pudo registrar la evidencia de "${disclosureLabels[type]}".`,
        "error",
      );
    } finally {
      setAcceptingDisclosure("");
    }
  };

  return (
    <CompactCard sx={{ mb: 1.25 }}>
      <Stack direction="column" spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            icon={<GavelIcon fontSize="small" />}
            label={
              globalStatusUI === "PENDIENTE" && pendingCountUI > 0
                ? `Pendiente (${pendingCountUI})`
                : globalStatusUI
            }
            color={
              globalStatusUI === "APROBADO"
                ? "success"
                : globalStatusUI === "RECHAZADO"
                  ? "error"
                  : "warning"
            }
            size="small"
          />

          {loanData?.status === "DISBURSED" && (
            <Chip
              icon={<WarningAmberIcon fontSize="small" />}
              label={
                Number(loanData?.days_overdue || 0) > 0
                  ? `Mora ${loanData.days_overdue}d — ${loanData?.overdue_installments ?? 0} cuota${
                      Number(loanData?.overdue_installments) === 1 ? "" : "s"
                    } vencida${Number(loanData?.overdue_installments) === 1 ? "" : "s"}`
                  : "Al día"
              }
              color={Number(loanData?.days_overdue || 0) > 0 ? "error" : "success"}
              size="small"
            />
          )}

          <Chip
            icon={
              isComplianceValid ? (
                <VerifiedUserIcon fontSize="small" />
              ) : (
                <WarningAmberIcon fontSize="small" />
              )
            }
            label={isComplianceValid ? "CONAMI OK" : "CONAMI pendiente"}
            color={isComplianceValid ? "success" : "warning"}
            size="small"
            variant="outlined"
          />
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          rowGap={1}
        >
          {canAddPayment && (
            <Button
              variant="contained"
              size="small"
              startIcon={<PaymentsIcon />}
              onClick={onAddPayment}
              sx={{
                borderRadius: 2,
                fontWeight: 900,
                textTransform: "none",
              }}
            >
              Agregar pago
            </Button>
          )}
          {[
            { type: "SUMMARY_SHEET", doc: "summary", label: "Hoja Resumen" },
            { type: "CONTRACT", doc: "contract", label: "Contrato" },
            {
              type: "AMORTIZATION_TABLE",
              doc: "amortization",
              label: "Tabla de Amortización",
            },
          ].map(({ type, doc, label }) => (
            <Stack key={type} direction="row" spacing={0.5} alignItems="center">
              <Button variant="outlined" onClick={() => openConamiDocument(doc)}>
                {label}
              </Button>

              {isDisclosureAccepted(type) ? (
                <Tooltip title="Evidencia CONAMI registrada">
                  <CheckCircleIcon color="success" fontSize="small" />
                </Tooltip>
              ) : (
                <Tooltip
                  title={`Registrar aceptación de "${label}" (requerido para desembolsar)`}
                >
                  <span>
                    <IconButton
                      size="small"
                      color="primary"
                      disabled={acceptingDisclosure === type}
                      onClick={() => handleAcceptDisclosure(type)}
                    >
                      <AssignmentTurnedInIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Stack>
          ))}

          <Button
            variant="outlined"
            startIcon={<DescriptionIcon />}
            onClick={() =>
              printLoanApplicationReport({
                company,
                user: {
                  id: userId,
                  full_name: user?.full_name || "",
                },
                loan: loanData || {},
                customer: {
                  id: clientId || loanData?.customer_id,
                  full_name:
                    loanData?.customer_name ||
                    loanData?.full_name ||
                    loanData?.customer_full_name,
                  identification:
                    clientIdentification ||
                    loanData?.customer_identification ||
                    loanData?.identification,
                },
                guarantees,
                evaluation: financialEvaluation || {},
              })
            }
          >
            Solicitud de Crédito
          </Button>
        </Stack>
      </Stack>
    </CompactCard>
  );
};

export default LoanSummaryBar;
