import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getCreditFileByLoanId } from "../../api/creditFiles";

const statusColor = {
  PENDING: "warning",
  OK: "success",
  OBSERVED: "error",
  NA: "default",
};

export default function CreditFileView({ loanId }) {
  const [loading, setLoading] = useState(false);
  const [creditFile, setCreditFile] = useState(null);

  useEffect(() => {
    if (!loanId) return;
    loadCreditFile();
  }, [loanId]);

  const loadCreditFile = async () => {
    try {
      setLoading(true);
      const res = await getCreditFileByLoanId(loanId);
      setCreditFile(res?.credit_file || null);
    } catch (error) {
      console.error("Error loading credit file:", error);
      setCreditFile(null);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const items = creditFile?.items || [];
    const mandatory = items.filter((i) => i.is_mandatory);
    const optional = items.filter((i) => !i.is_mandatory);
    const okMandatory = mandatory.filter((i) => i.status === "OK");

    return {
      mandatoryCount: mandatory.length,
      optionalCount: optional.length,
      okMandatoryCount: okMandatory.length,
      pendingMandatoryCount: mandatory.length - okMandatory.length,
    };
  }, [creditFile]);

  if (loading) {
    return (
      <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!creditFile) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>No se encontró expediente para este crédito.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Expediente del crédito
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item>
          <Chip label={`Estado: ${creditFile.status}`} color="primary" />
        </Grid>
        <Grid item>
          <Chip label={`Obligatorios: ${summary.mandatoryCount}`} />
        </Grid>
        <Grid item>
          <Chip label={`Opcionales: ${summary.optionalCount}`} />
        </Grid>
        <Grid item>
          <Chip
            label={`Obligatorios OK: ${summary.okMandatoryCount}`}
            color="success"
            variant="outlined"
          />
        </Grid>
        <Grid item>
          <Chip
            label={`Pendientes: ${summary.pendingMandatoryCount}`}
            color={summary.pendingMandatoryCount > 0 ? "warning" : "success"}
            variant="outlined"
          />
        </Grid>
      </Grid>

      {(creditFile.items || []).map((item) => (
        <Accordion key={item.id} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box>
                <Typography fontWeight={600}>{item.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.section} · {item.code}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label={item.is_mandatory ? "Obligatorio" : "Opcional"}
                  color={item.is_mandatory ? "primary" : "default"}
                  variant={item.is_mandatory ? "filled" : "outlined"}
                />
                <Chip
                  size="small"
                  label={item.status}
                  color={statusColor[item.status] || "default"}
                />
              </Box>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            {item.notes ? (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Notas:</strong> {item.notes}
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </>
            ) : null}

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Documentos relacionados
            </Typography>

            {item.documents?.length ? (
              item.documents.map((doc) => (
                <Box
                  key={doc.id}
                  sx={{
                    mb: 1,
                    p: 1,
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {doc.doc_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {doc.doc_type} · {doc.mime_type || "sin mime"} ·{" "}
                    {doc.uploaded_at}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No hay documentos vinculados a este ítem.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Paper>
  );
}
