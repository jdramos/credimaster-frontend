import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import API from "../../api";

const BAC = {
  primary: "#D71920",
  primaryDark: "#A30F15",
  border: "#E5E7EB",
  textMain: "#1F2937",
  textSoft: "#6B7280",
};

const money = (n) =>
  new Intl.NumberFormat("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

function scoreCapacity(ratio) {
  if (ratio >= 1.5) return 35;
  if (ratio >= 1.3) return 28;
  if (ratio >= 1.1) return 20;
  if (ratio >= 1.0) return 10;
  return 0;
}

function scoreIndebtedness(ratio) {
  if (ratio <= 0.2) return 20;
  if (ratio <= 0.3) return 16;
  if (ratio <= 0.4) return 10;
  if (ratio <= 0.5) return 5;
  return 0;
}

function scoreStability(years) {
  const y = Number(years || 0);
  if (y >= 5) return 20;
  if (y >= 3) return 16;
  if (y >= 2) return 12;
  if (y >= 1) return 8;
  return 3;
}

function scoreWillingness(referencesResult, bureauResult) {
  let score = 0;

  if (referencesResult === "FAVORABLE") score += 8;
  else if (referencesResult === "REGULAR") score += 4;

  if (bureauResult === "LIMPIO") score += 7;
  else if (bureauResult === "OBSERVADO") score += 3;

  return score;
}

function scoreDocuments(verifiedRequired, totalRequired) {
  const total = Number(totalRequired || 0);
  const verified = Number(verifiedRequired || 0);

  if (total <= 0) return 0;

  const pct = verified / total;

  if (pct === 1) return 10;
  if (pct >= 0.8) return 8;
  if (pct >= 0.6) return 5;
  return 0;
}

function getRiskLevel(finalScore) {
  if (finalScore >= 80) return "BAJO";
  if (finalScore >= 60) return "MEDIO";
  if (finalScore >= 40) return "ALTO";
  return "MUY_ALTO";
}

function getRecommendation({ finalScore, paymentCapacityRatio }) {
  if (paymentCapacityRatio < 1) return "RECHAZAR";
  if (finalScore >= 80) return "APROBAR";
  if (finalScore >= 60) return "APROBAR_CON_CONDICIONES";
  return "PENDIENTE";
}

function getRiskChipColor(riskLevel) {
  switch (riskLevel) {
    case "BAJO":
      return "success";
    case "MEDIO":
      return "warning";
    case "ALTO":
    case "MUY_ALTO":
      return "error";
    default:
      return "default";
  }
}

function getRecommendationColor(value) {
  switch (value) {
    case "APROBAR":
      return "success";
    case "RECHAZAR":
      return "error";
    case "APROBAR_CON_CONDICIONES":
    case "PENDIENTE":
      return "warning";
    default:
      return "default";
  }
}

export default function CustomerFinancialEvaluationTab({
  customerId,
  customerIdentification,
  customerName,
  loanId = null,
  onSaved,
  onViewChecklist,
}) {
  const [form, setForm] = useState({
    id: null,
    customer_id: customerId,
    loan_id: loanId,
    version_no: 1,
    is_current: 1,

    evaluation_date: dayjs().format("YYYY-MM-DD"),
    methodology: "INDIVIDUAL",

    business_income: "",
    salary_income: "",
    other_income: "",

    business_expenses: "",
    family_expenses: "",
    other_debts_installments: "",

    proposed_installment: "",

    years_in_business: "",
    monthly_sales: "",
    inventory_value: "",
    business_location: "",

    references_result: "FAVORABLE",
    bureau_result: "NO_APLICA",

    analyst_comment: "",
    committee_comment: "",
    change_reason: "",
  });

  const [docSummary, setDocSummary] = useState({
    total_required: 0,
    uploaded: 0,
    verified: 0,
    missing: 0,
  });

  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customer_id: customerId,
      loan_id: loanId,
    }));
  }, [customerId, loanId]);

  useEffect(() => {
    let active = true;

    const loadCurrentEvaluation = async () => {
      if (!customerId) return;

      try {
        setLoadingEvaluation(true);

        const { data } = await API.get(
          `api/customer-credit-evaluations/${customerId}/current`
        );

        if (!active || !data) return;

        setForm((prev) => ({
          ...prev,
          id: data.id || null,
          customer_id: data.customer_id || customerId,
          loan_id: data.loan_id || loanId || null,
          version_no: data.version_no || 1,
          is_current: Number(data.is_current || 1),

          evaluation_date: data.evaluation_date
            ? dayjs(data.evaluation_date).format("YYYY-MM-DD")
            : dayjs().format("YYYY-MM-DD"),

          methodology: data.methodology || "INDIVIDUAL",

          business_income: data.business_income ?? "",
          salary_income: data.salary_income ?? "",
          other_income: data.other_income ?? "",

          business_expenses: data.business_expenses ?? "",
          family_expenses: data.family_expenses ?? "",
          other_debts_installments: data.other_debts_installments ?? "",

          proposed_installment: data.proposed_installment ?? "",

          years_in_business: data.years_in_business ?? "",
          monthly_sales: data.monthly_sales ?? "",
          inventory_value: data.inventory_value ?? "",
          business_location: data.business_location ?? "",

          references_result: data.references_result || "FAVORABLE",
          bureau_result: data.bureau_result || "NO_APLICA",

          analyst_comment: data.analyst_comment || "",
          committee_comment: data.committee_comment || "",
          change_reason: "",
        }));
      } catch (err) {
        console.error("Error cargando evaluación vigente:", err);
      } finally {
        if (active) setLoadingEvaluation(false);
      }
    };

    loadCurrentEvaluation();

    return () => {
      active = false;
    };
  }, [customerId, loanId]);

  useEffect(() => {
    let active = true;

    const loadChecklistSummary = async () => {
      if (!customerId) return;

      try {
        setLoadingDocs(true);

        const { data } = await API.get(
          `api/customer-documents/${customerId}/checklist-summary`
        );

        if (!active) return;

        setDocSummary({
          total_required: Number(data?.total_required || 0),
          uploaded: Number(data?.uploaded || 0),
          verified: Number(data?.verified || 0),
          missing: Number(data?.missing || 0),
        });
      } catch (err) {
        console.error("Error cargando resumen documental:", err);

        if (!active) return;

        setDocSummary({
          total_required: 0,
          uploaded: 0,
          verified: 0,
          missing: 0,
        });
      } finally {
        if (active) setLoadingDocs(false);
      }
    };

    loadChecklistSummary();

    return () => {
      active = false;
    };
  }, [customerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const summary = useMemo(() => {
    const businessIncome = Number(form.business_income || 0);
    const salaryIncome = Number(form.salary_income || 0);
    const otherIncome = Number(form.other_income || 0);

    const businessExpenses = Number(form.business_expenses || 0);
    const familyExpenses = Number(form.family_expenses || 0);
    const otherDebts = Number(form.other_debts_installments || 0);

    const proposedInstallment = Number(form.proposed_installment || 0);

    const totalIncome = businessIncome + salaryIncome + otherIncome;
    const totalExpenses = businessExpenses + familyExpenses + otherDebts;
    const availableCashFlow = totalIncome - totalExpenses;

    const paymentCapacityRatio =
      proposedInstallment > 0 ? availableCashFlow / proposedInstallment : 0;

    const indebtednessRatio = totalIncome > 0 ? otherDebts / totalIncome : 0;

    return {
      totalIncome,
      totalExpenses,
      availableCashFlow,
      paymentCapacityRatio,
      indebtednessRatio,
    };
  }, [form]);

  const score = useMemo(() => {
    const willingnessScore = scoreWillingness(
      form.references_result,
      form.bureau_result
    );

    const capacityScore = scoreCapacity(summary.paymentCapacityRatio);
    const stabilityScore = scoreStability(form.years_in_business);
    const indebtednessScore = scoreIndebtedness(summary.indebtednessRatio);
    const documentaryScore = scoreDocuments(
      docSummary.verified,
      docSummary.total_required
    );

    const finalScore =
      willingnessScore +
      capacityScore +
      stabilityScore +
      indebtednessScore +
      documentaryScore;

    const riskLevel = getRiskLevel(finalScore);
    const recommendation = getRecommendation({
      finalScore,
      paymentCapacityRatio: summary.paymentCapacityRatio,
    });

    return {
      willingness_score: willingnessScore,
      capacity_score: capacityScore,
      stability_score: stabilityScore,
      indebtedness_score: indebtednessScore,
      documentary_score: documentaryScore,
      final_score: finalScore,
      risk_level: riskLevel,
      recommendation,
    };
  }, [form, summary, docSummary]);

  const saveEvaluation = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        customer_id: customerId,
        loan_id: loanId,

        evaluation_date: form.evaluation_date,
        methodology: form.methodology,

        business_income: Number(form.business_income || 0),
        salary_income: Number(form.salary_income || 0),
        other_income: Number(form.other_income || 0),

        business_expenses: Number(form.business_expenses || 0),
        family_expenses: Number(form.family_expenses || 0),
        other_debts_installments: Number(form.other_debts_installments || 0),

        proposed_installment: Number(form.proposed_installment || 0),

        years_in_business:
          form.years_in_business === "" || form.years_in_business === null
            ? null
            : Number(form.years_in_business),

        monthly_sales: Number(form.monthly_sales || 0),
        inventory_value: Number(form.inventory_value || 0),
        business_location: form.business_location || null,

        references_result: form.references_result || null,
        bureau_result: form.bureau_result || "NO_APLICA",

        total_required_documents: docSummary.total_required,
        uploaded_required_documents: docSummary.uploaded,
        verified_required_documents: docSummary.verified,
        missing_required_documents: docSummary.missing,

        analyst_comment: form.analyst_comment || null,
        committee_comment: form.committee_comment || null,
        change_reason:
          form.id && !form.change_reason?.trim()
            ? "Revisión de evaluación"
            : form.change_reason || null,
      };

      let response;

      if (form.id) {
        response = await API.post(
          `api/customer-credit-evaluations/${form.id}/revise`,
          payload
        );
      } else {
        response = await API.post(`api/customer-credit-evaluations`, payload);
      }

      const data = response.data;

      setForm((prev) => ({
        ...prev,
        id: data.id || prev.id,
        version_no: data.version_no || prev.version_no, 
        is_current: Number(data.is_current ?? 1),
        change_reason: "",
      }));

      setSuccess(
        form.id
          ? "Se creó una nueva versión de la evaluación."
          : "Evaluación guardada correctamente."
      );

      onSaved?.(data);
    } catch (err) {
      setError(
        err?.response?.data?.message || "No se pudo guardar la evaluación."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingEvaluation) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: `1px solid ${BAC.border}`,
          background: "#fff",
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <CircularProgress size={22} />
          <Typography variant="body2">
            Cargando evaluación del cliente...
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: `1px solid ${BAC.border}`,
        background: "#fff",
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: BAC.textMain, mb: 0.5 }}
          >
            Evaluación financiera {customerName}
              <Typography variant="body2" sx={{ color: BAC.textSoft }}>
            {customerIdentification} 
          </Typography>
          </Typography>
          <Typography variant="body2" sx={{ color: BAC.textSoft }}>
            Análisis compacto de capacidad de pago, riesgo y respaldo documental.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={`Fecha: ${form.evaluation_date}`} />
          <Chip size="small" label={`Metodología: ${form.methodology}`} />
          <Chip
            size="small"
            label={`Cuota: C$ ${money(form.proposed_installment)}`}
          />
          <Chip
            size="small"
            label={`Versión: ${form.version_no || 1}`}
            color="info"
          />
          <Chip
            size="small"
            label={Number(form.is_current) === 1 ? "Vigente" : "Histórica"}
            color={Number(form.is_current) === 1 ? "success" : "default"}
          />
          <Chip
            size="small"
            color="primary"
            label={`Score: ${score.final_score}`}
            sx={{ fontWeight: 700 }}
          />
          <Chip
            size="small"
            color={getRiskChipColor(score.risk_level)}
            label={`Riesgo: ${score.risk_level}`}
            sx={{ fontWeight: 700 }}
          />
          <Chip
            size="small"
            color={getRecommendationColor(score.recommendation)}
            label={`Recomendación: ${score.recommendation}`}
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <Stack spacing={2}>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 3, borderColor: BAC.border }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Datos generales
                  </Typography>

                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Fecha"
                        name="evaluation_date"
                        value={form.evaluation_date}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        select
                        label="Metodología"
                        name="methodology"
                        value={form.methodology}
                        onChange={handleChange}
                      >
                        <MenuItem value="INDIVIDUAL">Individual</MenuItem>
                        <MenuItem value="GRUPAL">Grupal</MenuItem>
                        <MenuItem value="DESARROLLO_EMPRESARIAL">
                          Desarrollo empresarial
                        </MenuItem>
                        <MenuItem value="PERSONAL">Personal</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Cuota propuesta"
                        name="proposed_installment"
                        value={form.proposed_installment}
                        onChange={handleChange}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 3, borderColor: BAC.border }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Ingresos y gastos
                  </Typography>

                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Ingreso negocio"
                        name="business_income"
                        value={form.business_income}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Salario"
                        name="salary_income"
                        value={form.salary_income}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Otros ingresos"
                        name="other_income"
                        value={form.other_income}
                        onChange={handleChange}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Gastos negocio"
                        name="business_expenses"
                        value={form.business_expenses}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Gastos familiares"
                        name="family_expenses"
                        value={form.family_expenses}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Otras cuotas"
                        name="other_debts_installments"
                        value={form.other_debts_installments}
                        onChange={handleChange}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 3, borderColor: BAC.border }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Negocio y referencias
                  </Typography>

                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Años negocio"
                        name="years_in_business"
                        value={form.years_in_business}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Ventas mensuales"
                        name="monthly_sales"
                        value={form.monthly_sales}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Inventario"
                        name="inventory_value"
                        value={form.inventory_value}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Ubicación negocio"
                        name="business_location"
                        value={form.business_location}
                        onChange={handleChange}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        select
                        label="Referencias"
                        name="references_result"
                        value={form.references_result}
                        onChange={handleChange}
                      >
                        <MenuItem value="FAVORABLE">Favorable</MenuItem>
                        <MenuItem value="REGULAR">Regular</MenuItem>
                        <MenuItem value="DESFAVORABLE">Desfavorable</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        select
                        label="Buró"
                        name="bureau_result"
                        value={form.bureau_result}
                        onChange={handleChange}
                      >
                        <MenuItem value="LIMPIO">Limpio</MenuItem>
                        <MenuItem value="OBSERVADO">Observado</MenuItem>
                        <MenuItem value="NEGATIVO">Negativo</MenuItem>
                        <MenuItem value="NO_APLICA">No aplica</MenuItem>
                      </TextField>
                    </Grid>
                  </Grid>
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 3, borderColor: BAC.border }}
              >
                <Stack spacing={1.5}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Respaldo documental
                    </Typography>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={onViewChecklist}
                      sx={{
                        borderColor: BAC.primary,
                        color: BAC.primary,
                        textTransform: "none",
                        borderRadius: 2,
                      }}
                    >
                      Ver checklist
                    </Button>
                  </Box>

                  {loadingDocs ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={18} />
                      <Typography variant="body2">
                        Cargando resumen documental...
                      </Typography>
                    </Box>
                  ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={`Requeridos: ${docSummary.total_required}`}
                      />
                      <Chip
                        size="small"
                        color="info"
                        label={`Cargados: ${docSummary.uploaded}`}
                      />
                      <Chip
                        size="small"
                        color="success"
                        label={`Verificados: ${docSummary.verified}`}
                      />
                      <Chip
                        size="small"
                        color={docSummary.missing > 0 ? "warning" : "success"}
                        label={`Faltantes: ${docSummary.missing}`}
                      />
                      <Chip
                        size="small"
                        color="primary"
                        label={`Score doc: ${score.documentary_score}`}
                      />
                    </Stack>
                  )}
                </Stack>
              </Paper>

              {form.id && (
                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 3, borderColor: BAC.border }}
                >
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Motivo de revisión
                    </Typography>

                    <TextField
                      fullWidth
                      size="small"
                      label="Motivo del cambio"
                      name="change_reason"
                      value={form.change_reason}
                      onChange={handleChange}
                      placeholder="Ej.: actualización de ingresos, corrección de gastos, ajuste por documentos..."
                    />
                  </Stack>
                </Paper>
              )}

              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 3, borderColor: BAC.border }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Comentario del analista
                  </Typography>

                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={3}
                    label="Comentario"
                    name="analyst_comment"
                    value={form.analyst_comment}
                    onChange={handleChange}
                  />
                </Stack>
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                borderColor: BAC.border,
                position: { lg: "sticky", xs: "static" },
                top: 16,
              }}
            >
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Resultado de evaluación
                </Typography>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color={BAC.textSoft}>
                    Ingresos
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    C$ {money(summary.totalIncome)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color={BAC.textSoft}>
                    Gastos
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    C$ {money(summary.totalExpenses)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color={BAC.textSoft}>
                    Flujo disponible
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    C$ {money(summary.availableCashFlow)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color={BAC.textSoft}>
                    Capacidad de pago
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {summary.paymentCapacityRatio.toFixed(2)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color={BAC.textSoft}>
                    Endeudamiento
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {(summary.indebtednessRatio * 100).toFixed(2)}%
                  </Typography>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color={BAC.textSoft}>
                    Voluntad
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {score.willingness_score}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color={BAC.textSoft}>
                    Capacidad
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {score.capacity_score}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color={BAC.textSoft}>
                    Estabilidad
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {score.stability_score}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color={BAC.textSoft}>
                    Endeudamiento
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {score.indebtedness_score}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color={BAC.textSoft}>
                    Documentos
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {score.documentary_score}
                  </Typography>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                <Chip
                  color="primary"
                  label={`Score final: ${score.final_score}`}
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  color={getRiskChipColor(score.risk_level)}
                  label={`Riesgo: ${score.risk_level}`}
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  color={getRecommendationColor(score.recommendation)}
                  label={`Recomendación: ${score.recommendation}`}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {summary.paymentCapacityRatio < 1 && (
          <Alert severity="warning">
            La capacidad de pago es menor a 1.00. Este crédito debe revisarse antes de continuar.
          </Alert>
        )}

        {docSummary.missing > 0 && (
          <Alert severity="info">
            El expediente tiene documentos faltantes. Conviene completar el checklist antes de la aprobación.
          </Alert>
        )}

        {success && <Alert severity="success">{success}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        <Box display="flex" justifyContent="flex-end" gap={1}>
          <Button
            variant="contained"
            onClick={saveEvaluation}
            disabled={saving}
            sx={{
              textTransform: "none",
              borderRadius: 2.5,
              px: 3,
              backgroundColor: BAC.primary,
              "&:hover": {
                backgroundColor: BAC.primaryDark,
              },
            }}
          >
            {saving
              ? "Guardando..."
              : form.id
              ? "Guardar nueva versión"
              : "Guardar evaluación"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}