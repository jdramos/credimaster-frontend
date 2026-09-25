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
import { getFinancialEvaluationConfig } from "../../services/financialEvaluationConfig";
import { getFinancialEvaluationConcepts } from "../../services/financialEvaluationConcepts";

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

// Valores por defecto usados como vista previa mientras se carga la
// configuración real del tenant (getFinancialEvaluationConfig) -- son los
// mismos números que antes estaban hardcodeados acá, y los mismos que
// utils/creditEvaluationScoring.js usa como fallback en el backend.
const FALLBACK_SCORING_CONFIG = {
  capacity_bands: [
    { min_ratio: 1.5, score: 35 },
    { min_ratio: 1.3, score: 28 },
    { min_ratio: 1.1, score: 20 },
    { min_ratio: 1.0, score: 10 },
  ],
  capacity_default_score: 0,

  indebtedness_bands: [
    { max_ratio: 0.2, score: 20 },
    { max_ratio: 0.3, score: 16 },
    { max_ratio: 0.4, score: 10 },
    { max_ratio: 0.5, score: 5 },
  ],
  indebtedness_default_score: 0,

  stability_bands: [
    { min_years: 5, score: 20 },
    { min_years: 3, score: 16 },
    { min_years: 2, score: 12 },
    { min_years: 1, score: 8 },
  ],
  stability_default_score: 3,

  willingness_references_scores: { FAVORABLE: 8, REGULAR: 4 },
  willingness_bureau_scores: { LIMPIO: 7, OBSERVADO: 3 },
  willingness_default_score: 0,

  documents_bands: [
    { min_pct: 1, score: 10 },
    { min_pct: 0.8, score: 8 },
    { min_pct: 0.6, score: 5 },
  ],
  documents_default_score: 0,

  risk_level_bands: [
    { min_score: 80, level: "BAJO" },
    { min_score: 60, level: "MEDIO" },
    { min_score: 40, level: "ALTO" },
  ],
  risk_level_default: "MUY_ALTO",

  recommendation_bands: [
    { min_score: 80, recommendation: "APROBAR" },
    { min_score: 60, recommendation: "APROBAR_CON_CONDICIONES" },
  ],
  recommendation_default: "PENDIENTE",
  recommendation_reject_if_capacity_ratio_below: 1,

  minimum_score_required: 60,
};

// Conceptos por defecto -- vista previa mientras carga la lista real del
// tenant (getFinancialEvaluationConcepts), mismos 6 que antes eran campos
// fijos del formulario.
const FALLBACK_CONCEPTS = [
  { concept_key: "business_income", label: "Ingreso negocio", type: "INCOME", is_active: 1, sort_order: 1 },
  { concept_key: "salary_income", label: "Salario", type: "INCOME", is_active: 1, sort_order: 2 },
  { concept_key: "other_income", label: "Otros ingresos", type: "INCOME", is_active: 1, sort_order: 3 },
  { concept_key: "business_expenses", label: "Gastos negocio", type: "EXPENSE", is_active: 1, sort_order: 4 },
  { concept_key: "family_expenses", label: "Gastos familiares", type: "EXPENSE", is_active: 1, sort_order: 5 },
  { concept_key: "other_debts_installments", label: "Otras cuotas", type: "DEBT", is_active: 1, sort_order: 6 },
];

const CONCEPT_GROUP_LABELS = {
  INCOME: "Ingresos",
  EXPENSE: "Gastos",
  DEBT: "Deudas",
};

function scoreCapacity(ratio, config) {
  const band = config.capacity_bands.find((b) => ratio >= b.min_ratio);
  return band ? band.score : config.capacity_default_score;
}

function scoreIndebtedness(ratio, config) {
  const band = config.indebtedness_bands.find((b) => ratio <= b.max_ratio);
  return band ? band.score : config.indebtedness_default_score;
}

function scoreStability(years, config) {
  const y = Number(years || 0);
  const band = config.stability_bands.find((b) => y >= b.min_years);
  return band ? band.score : config.stability_default_score;
}

function scoreWillingness(referencesResult, bureauResult, config) {
  const referencesScore =
    config.willingness_references_scores[referencesResult] ?? config.willingness_default_score;
  const bureauScore = config.willingness_bureau_scores[bureauResult] ?? config.willingness_default_score;
  return referencesScore + bureauScore;
}

function scoreDocuments(verifiedRequired, totalRequired, config) {
  const total = Number(totalRequired || 0);
  const verified = Number(verifiedRequired || 0);

  if (total <= 0) return 0;

  const pct = verified / total;
  const band = config.documents_bands.find((b) => pct >= b.min_pct);
  return band ? band.score : config.documents_default_score;
}

function getRiskLevel(finalScore, config) {
  const band = config.risk_level_bands.find((b) => finalScore >= b.min_score);
  return band ? band.level : config.risk_level_default;
}

function getRecommendation({ finalScore, paymentCapacityRatio }, config) {
  if (paymentCapacityRatio < config.recommendation_reject_if_capacity_ratio_below) return "RECHAZAR";
  const band = config.recommendation_bands.find((b) => finalScore >= b.min_score);
  return band ? band.recommendation : config.recommendation_default;
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
  form = {},
  setForm,
  customerId,
  customerIdentification,
  customerName,
  loanId = null,
  onSaved,
  onViewChecklist,
  readOnly = false,
}) {
  const [docSummary, setDocSummary] = useState({
    total_required: 0,
    uploaded: 0,
    verified: 0,
    missing: 0,
  });

  const [scoringConfig, setScoringConfig] = useState(FALLBACK_SCORING_CONFIG);
  const [concepts, setConcepts] = useState(FALLBACK_CONCEPTS);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!setForm) return;

    setForm((prev) => ({
      ...(prev || {}),
      customer_id: customerId,
      loan_id: loanId,
    }));
  }, [customerId, loanId, setForm]);

  useEffect(() => {
    let active = true;

    const loadCurrentEvaluation = async () => {
      if (!customerId) return;

      try {
        setLoadingEvaluation(true);

        const { data } = await API.get(
          `api/customer-credit-evaluations/${customerId}/current`,
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

          concept_values: Object.fromEntries(
            (data.concept_values || []).map((cv) => [cv.concept_key, cv.value]),
          ),

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

    getFinancialEvaluationConfig()
      .then((config) => {
        if (active && config) setScoringConfig(config);
      })
      .catch((err) => {
        console.error("Error cargando configuración de evaluación financiera:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getFinancialEvaluationConcepts()
      .then((data) => {
        if (active && data?.length) setConcepts(data);
      })
      .catch((err) => {
        console.error("Error cargando conceptos de evaluación financiera:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadChecklistSummary = async () => {
      if (!customerId) return;

      try {
        setLoadingDocs(true);

        const { data } = await API.get(
          `api/customer-documents/${customerId}/checklist-summary`,
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
    if (readOnly) return;

    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConceptChange = (conceptKey, value) => {
    if (readOnly) return;

    setForm((prev) => ({
      ...prev,
      concept_values: { ...(prev.concept_values || {}), [conceptKey]: value },
    }));
  };

  const summary = useMemo(() => {
    const conceptValues = form.concept_values || {};
    const proposedInstallment = Number(form.proposed_installment || 0);

    let totalIncome = 0;
    let totalExpenses = 0;
    let debtsSum = 0;

    for (const concept of concepts) {
      if (!concept.is_active) continue;

      const value = Number(conceptValues[concept.concept_key] || 0);

      if (concept.type === "INCOME") {
        totalIncome += value;
      } else if (concept.type === "EXPENSE") {
        totalExpenses += value;
      } else if (concept.type === "DEBT") {
        totalExpenses += value;
        debtsSum += value;
      }
    }

    const availableCashFlow = totalIncome - totalExpenses;

    const paymentCapacityRatio =
      proposedInstallment > 0 ? availableCashFlow / proposedInstallment : 0;

    const indebtednessRatio = totalIncome > 0 ? debtsSum / totalIncome : 0;

    return {
      totalIncome,
      totalExpenses,
      availableCashFlow,
      paymentCapacityRatio,
      indebtednessRatio,
    };
  }, [form, concepts]);

  const score = useMemo(() => {
    const willingnessScore = scoreWillingness(
      form.references_result,
      form.bureau_result,
      scoringConfig,
    );

    const capacityScore = scoreCapacity(summary.paymentCapacityRatio, scoringConfig);
    const stabilityScore = scoreStability(form.years_in_business, scoringConfig);
    const indebtednessScore = scoreIndebtedness(summary.indebtednessRatio, scoringConfig);
    const documentaryScore = scoreDocuments(
      docSummary.verified,
      docSummary.total_required,
      scoringConfig,
    );

    const finalScore =
      willingnessScore +
      capacityScore +
      stabilityScore +
      indebtednessScore +
      documentaryScore;

    const riskLevel = getRiskLevel(finalScore, scoringConfig);
    const recommendation = getRecommendation(
      { finalScore, paymentCapacityRatio: summary.paymentCapacityRatio },
      scoringConfig,
    );

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
  }, [form, summary, docSummary, scoringConfig]);

  const saveEvaluation = async () => {
    if (readOnly) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        customer_id: customerId,
        loan_id: loanId,

        evaluation_date: form.evaluation_date,
        methodology: form.methodology,

        concept_values: Object.fromEntries(
          Object.entries(form.concept_values || {}).map(([key, value]) => [key, Number(value || 0)]),
        ),

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
          payload,
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
          : "Evaluación guardada correctamente.",
      );

      onSaved?.(data);
    } catch (err) {
      setError(
        err?.response?.data?.message || "No se pudo guardar la evaluación.",
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
          p: 1.5,
          borderRadius: 2,
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
        p: 1.25,
        borderRadius: 2,
        border: `1px solid ${BAC.border}`,
        background: "#fff",
      }}
    >
      <Stack spacing={1.25}>
        {readOnly && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Este crédito ya fue aprobado o no tienes autorización pendiente. La
            evaluación financiera está en modo solo lectura.
          </Alert>
        )}

        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 900,
                color: BAC.textMain,
                lineHeight: 1.1,
              }}
            >
              Evaluación financiera {customerName || ""}
            </Typography>

            <Typography variant="caption" sx={{ color: BAC.textSoft }}>
              {customerIdentification || ""} · Capacidad de pago, riesgo y
              documentos
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              color="primary"
              label={`Score: ${score.final_score}`}
            />
            <Chip
              size="small"
              color={getRiskChipColor(score.risk_level)}
              label={`Riesgo: ${score.risk_level}`}
            />
            <Chip
              size="small"
              color={getRecommendationColor(score.recommendation)}
              label={score.recommendation}
            />
            <Chip size="small" label={`V${form.version_no || 1}`} />
            <Chip
              size="small"
              label={Number(form.is_current) === 1 ? "Vigente" : "Histórica"}
              color={Number(form.is_current) === 1 ? "success" : "default"}
            />
          </Stack>
        </Stack>

        <Grid container spacing={1.25}>
          <Grid item xs={12} lg={9}>
            <Grid container spacing={1.25}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Fecha"
                  name="evaluation_date"
                  value={form.evaluation_date}
                  onChange={handleChange}
                  disabled={readOnly}
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
                  disabled={readOnly}
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
                  disabled={readOnly}
                />
              </Grid>

              {["INCOME", "EXPENSE", "DEBT"].map((type) => {
                const typeConcepts = concepts
                  .filter((c) => c.is_active && c.type === type)
                  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

                if (!typeConcepts.length) return null;

                return (
                  <React.Fragment key={type}>
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: BAC.textSoft, fontWeight: 700 }}>
                        {CONCEPT_GROUP_LABELS[type]}
                      </Typography>
                    </Grid>
                    {typeConcepts.map((concept) => (
                      <Grid item xs={12} md={4} key={concept.concept_key}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label={concept.label}
                          value={(form.concept_values || {})[concept.concept_key] ?? ""}
                          onChange={(e) => handleConceptChange(concept.concept_key, e.target.value)}
                          disabled={readOnly}
                        />
                      </Grid>
                    ))}
                  </React.Fragment>
                );
              })}

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Años negocio"
                  name="years_in_business"
                  value={form.years_in_business}
                  onChange={handleChange}
                  disabled={readOnly}
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
                  disabled={readOnly}
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
                  disabled={readOnly}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Ubicación"
                  name="business_location"
                  value={form.business_location}
                  onChange={handleChange}
                  disabled={readOnly}
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
                  disabled={readOnly}
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
                  disabled={readOnly}
                >
                  <MenuItem value="LIMPIO">Limpio</MenuItem>
                  <MenuItem value="OBSERVADO">Observado</MenuItem>
                  <MenuItem value="NEGATIVO">Negativo</MenuItem>
                  <MenuItem value="NO_APLICA">No aplica</MenuItem>
                </TextField>
              </Grid>

              {form.id && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Motivo del cambio"
                    name="change_reason"
                    value={form.change_reason}
                    onChange={handleChange}
                    disabled={readOnly}
                    placeholder="Ej.: actualización de ingresos, corrección de gastos..."
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  label="Comentario del analista"
                  name="analyst_comment"
                  value={form.analyst_comment}
                  onChange={handleChange}
                  disabled={readOnly}
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12} lg={3}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.25,
                borderRadius: 2,
                borderColor: BAC.border,
                height: "100%",
              }}
            >
              <Stack spacing={0.75}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  Resultado
                </Typography>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color={BAC.textSoft}>
                    Ingresos
                  </Typography>
                  <Typography variant="caption" fontWeight={800}>
                    C$ {money(summary.totalIncome)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color={BAC.textSoft}>
                    Gastos
                  </Typography>
                  <Typography variant="caption" fontWeight={800}>
                    C$ {money(summary.totalExpenses)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color={BAC.textSoft}>
                    Flujo
                  </Typography>
                  <Typography variant="caption" fontWeight={800}>
                    C$ {money(summary.availableCashFlow)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color={BAC.textSoft}>
                    Capacidad
                  </Typography>
                  <Typography variant="caption" fontWeight={800}>
                    {summary.paymentCapacityRatio.toFixed(2)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color={BAC.textSoft}>
                    Endeudamiento
                  </Typography>
                  <Typography variant="caption" fontWeight={800}>
                    {(summary.indebtednessRatio * 100).toFixed(2)}%
                  </Typography>
                </Box>

                <Divider />

                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={`Vol: ${score.willingness_score}`}
                  />
                  <Chip size="small" label={`Cap: ${score.capacity_score}`} />
                  <Chip size="small" label={`Est: ${score.stability_score}`} />
                  <Chip
                    size="small"
                    label={`End: ${score.indebtedness_score}`}
                  />
                  <Chip
                    size="small"
                    label={`Doc: ${score.documentary_score}`}
                  />
                </Stack>

                <Divider />

                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={`Req: ${docSummary.total_required}`}
                  />
                  <Chip
                    size="small"
                    color="info"
                    label={`Car: ${docSummary.uploaded}`}
                  />
                  <Chip
                    size="small"
                    color="success"
                    label={`Ver: ${docSummary.verified}`}
                  />
                  <Chip
                    size="small"
                    color={docSummary.missing > 0 ? "warning" : "success"}
                    label={`Fal: ${docSummary.missing}`}
                  />
                </Stack>

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
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {summary.paymentCapacityRatio < 1 && (
          <Alert severity="warning" sx={{ py: 0 }}>
            La capacidad de pago es menor a 1.00.
          </Alert>
        )}

        {docSummary.missing > 0 && (
          <Alert severity="info" sx={{ py: 0 }}>
            El expediente tiene documentos faltantes.
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ py: 0 }}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ py: 0 }}>
            {error}
          </Alert>
        )}

        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={saveEvaluation}
            disabled={saving || readOnly}
            size="small"
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 2,
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
