import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import API from "../../api";
import { fetchWithCache } from "../../hooks/useCachedFetch";
import today from "../../functions/today";
import { UserContext } from "../../contexts/UserContext";

const url = `/api/loans`;
const urlGuarantee = `/api/guarantees`;

// Toda la lógica de "Agregar crédito" vive aquí — extraída de LoanAddGpt.jsx
// para que dos layouts distintos (el clásico de una sola página y el
// wizard por pasos) puedan compartir exactamente el mismo estado,
// validaciones y llamadas al backend sin duplicar ~800 líneas de lógica.
export default function useLoanForm() {
  const navigate = useNavigate();
  const { permissions = [], role, userBranches = [] } =
    useContext(UserContext) || {};
  const canCreateLoan = role === 1 || permissions.includes("creditos.insertar");

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [loan, setLoan] = useState({
    customer_id: "",
    customer_identification: "",
    customer_name: "",
    requestDate: today(),
    branch_id: "",
    vendor_id: "",
    promoter_id: "",
    amount: "1.00",
    fee: "0.00",
    deduction: "0.00",
    insurance: "0.00",
    other_charges: "0.00",
    term: 0,
    due_date: today(),
    interest_type_id: 1,
    interest_type_name: "compound",
    interest_rate: "1.00",
    defaulted_rate: "0.00",
    frequency_id: "",
    frequency_name: "",
    current_balance: 0,
    status: "",
    guaranteeValue: 0,
    credit_evaluation_id: "",
    created_by:
      currentUser?.user_name || currentUser?.username || currentUser?.id || "",
    id_tipo_credito: "",
    id_destino_credito: "",
    id_garantia: "",
    id_linea: "",
    id_modalidad_credito: "",
    id_moneda: "",
    id_municipio: "",
    id_oficina: "",
    id_origen_recursos: "",
    id_sindicado: "",
    id_periodo_cobro_interes: "",
    id_periodo_cobro_principal: "",
    id_situacion_credito: 1,
    id_tipo_agrupacion_credito: "",
    id_sector_economico: "",
    id_met_atencion: "",
    id_tipo_zona: "",
    id_estado_credito: 1,
    id_analista: "",
  });

  const [catalogs, setCatalogs] = useState({
    tiposCredito: [],
    destinosCredito: [],
    lineas: [],
    modalidadesCredito: [],
    monedas: [],
    oficinas: [],
    origenesRecursos: [],
    tiposAgrupacionCredito: [],
    sectoresEconomicos: [],
    metodosAtencion: [],
    tiposZona: [],
    estadosCredito: [],
    analistas: [],
  });

  const [guaranteeValue, setGuaranteeValue] = useState(0);
  const [guarantees, setGuarantees] = useState([]);
  const [selectedGuaranteeIds, setSelectedGuaranteeIds] = useState([]);

  const availableGuarantees = useMemo(
    () => guarantees.filter((g) => !g.is_committed),
    [guarantees],
  );

  const selectedGuaranteeValue = useMemo(
    () =>
      guarantees
        .filter((g) => selectedGuaranteeIds.includes(g.id))
        .reduce((sum, g) => sum + Number(g.value || 0), 0),
    [guarantees, selectedGuaranteeIds],
  );

  const toggleGuaranteeSelection = (guaranteeId) => {
    setSelectedGuaranteeIds((prev) =>
      prev.includes(guaranteeId)
        ? prev.filter((id) => id !== guaranteeId)
        : [...prev, guaranteeId],
    );
  };

  const selectAllGuarantees = () => {
    setSelectedGuaranteeIds(availableGuarantees.map((g) => g.id));
  };

  const clearGuaranteeSelection = () => {
    setSelectedGuaranteeIds([]);
  };

  // id_garantia (catálogo CONAMI "¿posee garantías?") no tiene un default
  // seguro en el catálogo -- a diferencia de moneda/tipo de crédito/etc.,
  // aquí sí existe una respuesta objetiva: se sigue directamente de si el
  // usuario seleccionó alguna garantía real en el selector nuevo, en vez de
  // pedirle que marque a mano un campo redundante con esa selección.
  useEffect(() => {
    setLoan((prev) => ({
      ...prev,
      id_garantia: selectedGuaranteeIds.length > 0 ? "1" : "0",
    }));
  }, [selectedGuaranteeIds]);

  const [amortizationTable, setAmortizationTable] = useState([]);
  const [installment, setInstallment] = useState(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [policies, setPolicies] = useState({});
  const [evaluations, setEvaluations] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [docSummary, setDocSummary] = useState(null);
  const [showCustomerDocs, setShowCustomerDocs] = useState(false);
  const [activeLoansSummary, setActiveLoansSummary] = useState(null);
  const [evaluationViewForm, setEvaluationViewForm] = useState({});

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);

  const selectedEvaluation = useMemo(() => {
    return (
      evaluations.find(
        (ev) => String(ev.id) === String(loan.credit_evaluation_id),
      ) || null
    );
  }, [evaluations, loan.credit_evaluation_id]);

  const evaluationCustomer = useMemo(() => {
    if (!selectedEvaluation) return null;

    return {
      ...selectedEvaluation,

      id: loan.customer_id,
      customer_id: loan.customer_id,
      customerIdentification: loan.customer_identification,
      customerName: loan.customer_name,

      business_income: Number(selectedEvaluation.business_income || 0),
      salary_income: Number(selectedEvaluation.salary_income || 0),
      other_income: Number(selectedEvaluation.other_income || 0),
      total_income: Number(selectedEvaluation.total_income || 0),

      business_expenses: Number(selectedEvaluation.business_expenses || 0),
      family_expenses: Number(selectedEvaluation.family_expenses || 0),
      financial_expenses: Number(selectedEvaluation.financial_expenses || 0),
      total_expenses: Number(selectedEvaluation.total_expenses || 0),

      net_income: Number(selectedEvaluation.net_income || 0),
      payment_capacity: Number(selectedEvaluation.payment_capacity || 0),
      recommended_amount: Number(selectedEvaluation.recommended_amount || 0),

      business_type_name: selectedEvaluation.business_type_name || "—",
      total_loans: selectedEvaluation.total_loans || 0,
      productOrService: selectedEvaluation.productOrService || "—",
      creditLimit: selectedEvaluation.creditLimit || "—",
      chanel: selectedEvaluation.chanel || "—",
      province_name: selectedEvaluation.province_name || "—",
      scores: selectedEvaluation.scores || {},
    };
  }, [
    selectedEvaluation,
    loan.customer_id,
    loan.customer_identification,
    loan.customer_name,
  ]);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const data = (await fetchWithCache("/api/credit-policies")) || [];
        const policyMap = {};
        data.forEach((policy) => {
          policyMap[policy.policy_key] = policy;
        });
        setPolicies(policyMap);
      } catch {
        toast.error("Error al obtener políticas de crédito");
      }
    };

    fetchPolicies();
  }, []);

  useEffect(() => {
    const fetchCustomerChecklist = async () => {
      if (!loan.customer_id) {
        setDocSummary(null);
        return;
      }

      try {
        const { data } = await API.get(
          `/api/customer-credit-evaluations/${loan.customer_id}/current`,
        );

        setDocSummary(data);
      } catch (error) {
        console.error("Error obteniendo checklist:", error);
        setDocSummary(null);
      }
    };

    fetchCustomerChecklist();
  }, [loan.customer_id]);

  useEffect(() => {
    const fetchGuaranteesByCustomer = async () => {
      if (!loan.customer_id) {
        setGuaranteeValue(0);
        setGuarantees([]);
        setSelectedGuaranteeIds([]);
        return;
      }

      setLoading(true);
      try {
        const response = await API.get(`${urlGuarantee}/${loan.customer_id}`);

        const data = await response.data;

        const totalValue = data.reduce(
          (sum, item) => sum + Number(item.value || 0),
          0,
        );
        setGuaranteeValue(totalValue);
        setGuarantees(data);
        setSelectedGuaranteeIds([]);
        setLoan((prev) => {
          if (prev.credit_evaluation_id === "") return prev;

          return {
            ...prev,
            credit_evaluation_id: "",
          };
        });
      } catch (error) {
        toast.error(error.message || "Error al obtener garantías");
      } finally {
        setLoading(false);
      }
    };

    fetchGuaranteesByCustomer();
  }, [loan.customer_id]);

  useEffect(() => {
    const fetchActiveLoansSummary = async () => {
      if (!loan.customer_id) {
        setActiveLoansSummary(null);
        return;
      }

      try {
        const { data } = await API.get(
          `${url}/customer/${loan.customer_id}/active-summary`,
        );
        setActiveLoansSummary(data);
      } catch (error) {
        console.error("Error obteniendo créditos activos del cliente:", error);
        setActiveLoansSummary(null);
      }
    };

    fetchActiveLoansSummary();
  }, [loan.customer_id]);

  useEffect(() => {
    const fetchCustomerEvaluations = async () => {
      if (!loan.customer_id) {
        setEvaluations([]);
        setLoan((prev) => ({ ...prev, credit_evaluation_id: "" }));
        return;
      }

      try {
        const res = await API.get(
          `api/customer-credit-evaluations/${loan.customer_id}/current`,
        );

        const row = res.data;

        if (row) {
          setEvaluations([row]);
          setLoan((prev) => {
            if (String(prev.credit_evaluation_id) === String(row.id)) {
              return prev;
            }

            return {
              ...prev,
              credit_evaluation_id: row.id,
            };
          });
        } else {
          setEvaluations([]);
          setLoan((prev) => ({ ...prev, credit_evaluation_id: "" }));
        }
      } catch (error) {
        console.error("Error obteniendo evaluación vigente:", error);
        setEvaluations([]);
        setLoan((prev) => ({ ...prev, credit_evaluation_id: "" }));
      }
    };

    fetchCustomerEvaluations();
  }, [loan.customer_id]);

  useEffect(() => {
    let cancelled = false;

    const fetchAmortizationTable = async () => {
      const isMissingRequiredData =
        !loan.amount ||
        !loan.interest_rate ||
        !loan.term ||
        !loan.frequency_id ||
        loan.fee === "" ||
        loan.insurance === "" ||
        !loan.requestDate ||
        !loan.due_date ||
        loan.other_charges === "";

      if (isMissingRequiredData) {
        setAmortizationTable([]);
        setInstallment(null);
        return;
      }

      setLoading(true);

      try {
        const payload = {
          amount: Number(loan.amount || 0),
          interest_rate: Number(loan.interest_rate || 0),
          term: Number(loan.term || 0),
          requestDate: dayjs(loan.requestDate).format("YYYY-MM-DD"),
          due_date: dayjs(loan.due_date).format("YYYY-MM-DD"),
          fee: Number(loan.fee || 0),
          insurance: Number(loan.insurance || 0),
          other_charges: Number(loan.other_charges || 0),
          interest_type_name: loan.interest_type_name || "compound",
          frequency_id: loan.frequency_id,
          branch_id: loan.branch_id,
        };

        const response = await API.post(`${url}/amortization`, payload);

        if (cancelled) return;

        const rows = Array.isArray(response.data) ? response.data : [];

        setAmortizationTable(rows);

        const firstInstallment =
          rows.find((row) => Number(row.paymentNumber) === 1) || null;

        setInstallment(firstInstallment);

        const lastPayment = rows[rows.length - 1];
        const lastPaymentDate = lastPayment?.paymentDate;

        if (!lastPaymentDate) return;

        setLoan((prevLoan) => {
          if (prevLoan.frequency_id === "V") return prevLoan;

          const newDueDate = dayjs(lastPaymentDate).format("YYYY-MM-DD");

          if (newDueDate === prevLoan.due_date) return prevLoan;

          return {
            ...prevLoan,
            due_date: newDueDate,
          };
        });
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error?.response?.data?.message ||
              error?.response?.data?.error ||
              error?.message ||
              "Error de conexión al obtener la tabla de amortización",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAmortizationTable();

    return () => {
      cancelled = true;
    };
  }, [
    loan.amount,
    loan.interest_rate,
    loan.term,
    loan.requestDate,
    loan.due_date,
    loan.frequency_id,
    loan.fee,
    loan.insurance,
    loan.other_charges,
    loan.interest_type_name,
  ]);

  useEffect(() => {
    if (!selectedEvaluation) {
      setEvaluationViewForm({});
      return;
    }

    setEvaluationViewForm({
      ...selectedEvaluation,
      evaluation_date: selectedEvaluation.evaluation_date
        ? dayjs(selectedEvaluation.evaluation_date).format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD"),

      methodology: selectedEvaluation.methodology || "INDIVIDUAL",

      business_income: selectedEvaluation.business_income ?? "",
      salary_income: selectedEvaluation.salary_income ?? "",
      other_income: selectedEvaluation.other_income ?? "",

      business_expenses: selectedEvaluation.business_expenses ?? "",
      family_expenses: selectedEvaluation.family_expenses ?? "",
      other_debts_installments:
        selectedEvaluation.other_debts_installments ?? "",

      proposed_installment: selectedEvaluation.proposed_installment ?? "",

      years_in_business: selectedEvaluation.years_in_business ?? "",

      monthly_sales: selectedEvaluation.monthly_sales ?? "",
      inventory_value: selectedEvaluation.inventory_value ?? "",
      business_location: selectedEvaluation.business_location ?? "",

      references_result: selectedEvaluation.references_result || "FAVORABLE",

      bureau_result: selectedEvaluation.bureau_result || "NO_APLICA",

      analyst_comment: selectedEvaluation.analyst_comment || "",

      committee_comment: selectedEvaluation.committee_comment || "",

      version_no: selectedEvaluation.version_no || 1,
      is_current: selectedEvaluation.is_current ?? 1,
    });
  }, [selectedEvaluation]);

  const getPolicy = (key) => policies[key]?.policy_value;

  // Valida solo los campos del paso 1 del wizard (datos básicos del crédito),
  // reutilizando las mismas claves/mensajes de validateForm para que el
  // texto en rojo bajo cada campo sea idéntico sin importar en qué punto del
  // flujo se detectó el error.
  const validateStep1 = () => {
    const nextErrors = {};

    if (!loan.branch_id) nextErrors.branch_id = "La sucursal es requerida";
    if (!loan.customer_id) nextErrors.customer_id = "El cliente es requerido";
    if (!loan.amount || Number(loan.amount) <= 0)
      nextErrors.amount = "El monto es requerido";
    if (!loan.term || Number(loan.term) <= 0)
      nextErrors.term = "El plazo es requerido";
    if (!loan.due_date)
      nextErrors.due_date = "La fecha de vencimiento es requerida";
    if (!loan.interest_rate || Number(loan.interest_rate) <= 0)
      nextErrors.interest_rate = "La tasa de interés es requerida";
    if (!loan.frequency_id)
      nextErrors.frequency_id = "La frecuencia es requerida";
    if (!loan.credit_evaluation_id)
      nextErrors.credit_evaluation_id =
        "Debe seleccionar una evaluación financiera";

    setErrors(nextErrors);
    return nextErrors;
  };

  const validateForm = (data) => {
    const nextErrors = {};

    if (docSummary && Number(docSummary.missing || 0) > 0) {
      nextErrors.documents =
        "El cliente no tiene completos los documentos obligatorios";
    }

    if (!data.customer_id) {
      nextErrors.customer_id = "El cliente es requerido";
    }

    if (!data.requestDate) {
      nextErrors.requestDate = "La fecha de solicitud es requerida";
    }

    if (!data.branch_id) {
      nextErrors.branch_id = "La sucursal es requerida";
    }

    if (!data.amount || Number(data.amount) <= 0) {
      nextErrors.amount = "El monto es requerido";
    }

    if (!data.term || Number(data.term) <= 0) {
      nextErrors.term = "El plazo es requerido";
    }

    if (!data.due_date) {
      nextErrors.due_date = "La fecha de vencimiento es requerida";
    }

    if (!data.interest_rate || Number(data.interest_rate) <= 0) {
      nextErrors.interest_rate = "La tasa de interés es requerida";
    }

    if (!data.frequency_id) {
      nextErrors.frequency_id = "La frecuencia es requerida";
    }

    if (!data.credit_evaluation_id) {
      nextErrors.credit_evaluation_id =
        "Debe seleccionar una evaluación financiera";
    }

    if (!data.id_tipo_credito) {
      nextErrors.id_tipo_credito = "El tipo de crédito es requerido";
    }

    if (!data.id_moneda) {
      nextErrors.id_moneda = "La moneda es requerida";
    }

    if (!data.id_estado_credito) {
      nextErrors.id_estado_credito = "El estado del crédito es requerido";
    }

    if (
      getPolicy("max_amount") &&
      Number(data.amount) > Number(getPolicy("max_amount"))
    ) {
      nextErrors.amount = `El monto excede el máximo permitido: C$${getPolicy("max_amount")}`;
    }

    if (
      getPolicy("max_interest_rate") &&
      Number(data.interest_rate) * 12 > Number(getPolicy("max_interest_rate"))
    ) {
      nextErrors.interest_rate = `La tasa anual excede lo permitido: ${getPolicy("max_interest_rate")}%`;
    }

    if (
      getPolicy("max_defaulted_rate") &&
      Number(data.defaulted_rate) > Number(getPolicy("max_defaulted_rate"))
    ) {
      nextErrors.defaulted_rate = `La tasa de mora excede el máximo permitido: ${getPolicy("max_defaulted_rate")}%`;
    }

    if (
      getPolicy("max_term_months") &&
      Number(data.term) > Number(getPolicy("max_term_months"))
    ) {
      nextErrors.term = `El plazo excede el máximo permitido: ${getPolicy("max_term_months")} meses`;
    }

    if (
      getPolicy("min_term_months") &&
      Number(data.term) < Number(getPolicy("min_term_months"))
    ) {
      nextErrors.term = `El plazo es menor al mínimo permitido: ${getPolicy("min_term_months")} meses`;
    }

    if (
      getPolicy("min_amount") &&
      Number(data.amount) < Number(getPolicy("min_amount"))
    ) {
      nextErrors.amount = `El monto es menor al mínimo permitido: C$${getPolicy("min_amount")}`;
    }

    if (
      getPolicy("min_interest_rate") &&
      Number(data.interest_rate) < Number(getPolicy("min_interest_rate"))
    ) {
      nextErrors.interest_rate = `La tasa de interés es menor al mínimo permitido: ${getPolicy("min_interest_rate")}%`;
    }

    if (
      getPolicy("max_late_interest_rate") &&
      Number(data.defaulted_rate) > Number(data.interest_rate) / 4
    ) {
      nextErrors.defaulted_rate = "La tasa de mora excede el máximo permitido";
    }

    if (getPolicy("min_collateral_coverage") && Number(selectedGuaranteeValue) > 0) {
      const cobertura =
        (Number(selectedGuaranteeValue) / Number(data.amount)) * 100;
      if (cobertura < Number(getPolicy("min_collateral_coverage"))) {
        nextErrors.amount = `Las garantías seleccionadas no cubren el ${getPolicy(
          "min_collateral_coverage",
        )}% mínimo requerido del monto del crédito`;
      }
    }

    setErrors(nextErrors);
    return nextErrors;
  };

  const getDefaultId = (rows = []) => {
    const found = rows.find((row) => Number(row.is_default) === 1);
    return found ? found.id : "";
  };

  const loadConamiCatalogs = async () => {
    try {
      const data = (await fetchWithCache("/api/conami/catalogs")) || {};

      setCatalogs(data);

      setLoan((prev) => ({
        ...prev,
        id_tipo_credito:
          prev.id_tipo_credito || getDefaultId(data.tiposCredito),

        id_destino_credito:
          prev.id_destino_credito || getDefaultId(data.destinosCredito),

        id_garantia: prev.id_garantia || getDefaultId(data.garantias),

        id_linea: prev.id_linea || getDefaultId(data.lineas),

        id_modalidad_credito:
          prev.id_modalidad_credito || getDefaultId(data.modalidadesCredito),

        id_moneda: prev.id_moneda || getDefaultId(data.monedas),

        id_oficina: prev.id_oficina || getDefaultId(data.oficinas),

        id_origen_recursos:
          prev.id_origen_recursos || getDefaultId(data.origenesRecursos),

        id_tipo_agrupacion_credito:
          prev.id_tipo_agrupacion_credito ||
          getDefaultId(data.tiposAgrupacionCredito),

        id_sector_economico:
          prev.id_sector_economico || getDefaultId(data.sectoresEconomicos),

        id_met_atencion:
          prev.id_met_atencion || getDefaultId(data.metodosAtencion),

        id_tipo_zona: prev.id_tipo_zona || getDefaultId(data.tiposZona),

        id_sindicado: prev.id_sindicado || getDefaultId(data.sindicados),

        id_estado_credito:
          prev.id_estado_credito || getDefaultId(data.estadosCredito),

        id_analista: prev.id_analista || getDefaultId(data.analistas),
      }));
    } catch (error) {
      console.error("Error cargando catálogos:", error);
    }
  };

  useEffect(() => {
    loadConamiCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preselecciona la sucursal cuando el usuario solo tiene acceso a una (o
  // como conveniencia general, la primera de la lista permitida), igual que
  // ya se hace con los catálogos CONAMI -- evita un clic redundante en el
  // caso más común sin quitarle al usuario la opción de cambiarla.
  useEffect(() => {
    if (userBranches.length === 0) return;

    const loadDefaultBranch = async () => {
      try {
        const branches = (await fetchWithCache("/api/branches")) || [];
        const allowedIds = userBranches.map((id) => Number(id));
        const defaultBranch = branches.find((b) =>
          allowedIds.includes(Number(b.id)),
        );

        if (!defaultBranch) return;

        setLoan((prev) =>
          prev.branch_id
            ? prev
            : {
                ...prev,
                branch_id: defaultBranch.id,
                id_oficina: defaultBranch.id,
              },
        );
      } catch (error) {
        console.error("Error cargando sucursal por defecto:", error);
      }
    };

    loadDefaultBranch();
  }, [userBranches]);

  const handleInputChange = (e, selectedOption = null) => {
    const {
      name,
      value,
      customer_identification,
      customer_name,
      conami_id_actividad_economica,
      municipality_id,
      frecuency_id,
      promoter_identification,
    } = e.target;

    setLoan((prev) => ({
      ...prev,
      [name]: value,
      frequency_name: selectedOption
        ? selectedOption.name
        : prev.frequency_name,
      customer_identification:
        customer_identification !== undefined
          ? customer_identification
          : prev.customer_identification,
      customer_name:
        customer_name !== undefined ? customer_name : prev.customer_name,
      conami_id_actividad_economica:
        conami_id_actividad_economica !== undefined
          ? conami_id_actividad_economica
          : prev.conami_id_actividad_economica,
      id_municipio:
        municipality_id !== undefined ? municipality_id : prev.id_municipio,
      id_oficina: name === "branch_id" ? value : prev.id_oficina,
      id_analista:
        promoter_identification !== undefined
          ? promoter_identification
          : prev.id_analista,
      id_periodo_cobro_interes:
        frecuency_id !== undefined
          ? frecuency_id
          : prev.id_periodo_cobro_interes,
      id_periodo_cobro_principal:
        frecuency_id !== undefined
          ? frecuency_id
          : prev.id_periodo_cobro_principal,
    }));
  };

  const buildPayload = () => {
    return {
      customer_id: Number(loan.customer_id),
      customer_identification: loan.customer_identification || "",
      requestDate: dayjs(loan.requestDate).format("YYYY-MM-DD"),
      branch_id: Number(loan.branch_id),
      vendor_id: loan.vendor_id ? Number(loan.vendor_id) : null,
      promoter_id: loan.promoter_id ? Number(loan.promoter_id) : null,
      amount: Number(loan.amount || 0),
      fee: Number(loan.fee || 0),
      deduction: Number(loan.deduction || 0),
      insurance: Number(loan.insurance || 0),
      other_charges: Number(loan.other_charges || 0),
      term: Number(loan.term || 0),
      due_date: dayjs(loan.due_date).format("YYYY-MM-DD"),
      interest_type_id: Number(loan.interest_type_id || 1),
      interest_type_name: loan.interest_type_name || "compound",
      interest_rate: Number(loan.interest_rate || 0),
      defaulted_rate: Number(loan.defaulted_rate || 0),
      frequency_id: loan.frequency_id,
      credit_evaluation_id: loan.credit_evaluation_id
        ? Number(loan.credit_evaluation_id)
        : null,
      created_by: loan.created_by || null,
      conami_id_actividad_economica: loan.conami_id_actividad_economica,
      id_tipo_credito: loan.id_tipo_credito
        ? Number(loan.id_tipo_credito)
        : null,
      id_destino_credito: loan.id_destino_credito
        ? Number(loan.id_destino_credito)
        : null,
      id_garantia: loan.id_garantia ? Number(loan.id_garantia) : null,
      id_linea: loan.id_linea ? Number(loan.id_linea) : null,
      id_modalidad_credito: loan.id_modalidad_credito
        ? Number(loan.id_modalidad_credito)
        : null,
      id_moneda: loan.id_moneda ? Number(loan.id_moneda) : null,
      id_municipio: loan.id_municipio ? Number(loan.id_municipio) : null,
      id_oficina: loan.id_oficina ? Number(loan.id_oficina) : null,
      id_origen_recursos: loan.id_origen_recursos
        ? Number(loan.id_origen_recursos)
        : null,
      id_sindicado: loan.id_sindicado ? Number(loan.id_sindicado) : null,
      id_periodo_cobro_interes: loan.id_periodo_cobro_interes
        ? Number(loan.id_periodo_cobro_interes)
        : null,
      id_periodo_cobro_principal: loan.id_periodo_cobro_principal
        ? Number(loan.id_periodo_cobro_principal)
        : null,
      id_situacion_credito: loan.id_situacion_credito
        ? Number(loan.id_situacion_credito)
        : null,
      id_tipo_agrupacion_credito: loan.id_tipo_agrupacion_credito
        ? Number(loan.id_tipo_agrupacion_credito)
        : null,
      id_sector_economico: loan.id_sector_economico
        ? Number(loan.id_sector_economico)
        : null,
      id_met_atencion: loan.id_met_atencion
        ? Number(loan.id_met_atencion)
        : null,
      id_tipo_zona: loan.id_tipo_zona ? Number(loan.id_tipo_zona) : null,
      id_estado_credito: loan.id_estado_credito
        ? Number(loan.id_estado_credito)
        : null,
      id_analista: loan.id_analista ? Number(loan.id_analista) : null,
      guarantee_ids: selectedGuaranteeIds,
    };
  };

  const addLoan = async () => {
    setLoading(true);

    try {
      const payload = buildPayload();

      const response = await API.post(url, payload);

      await response.data;

      showSnackbar("Solicitud guardada exitosamente.", "success");

      setTimeout(() => {
        setOpenDialog(false);
        navigate("/creditos");
      }, 1200);
    } catch (error) {
      const backendMessage =
        error.response?.data?.message || error.response?.data?.error;
      showSnackbar(
        backendMessage || `Error de red: ${error.message}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nextErrors = validateForm(loan);
    const messages = Object.values(nextErrors).filter(Boolean);

    if (messages.length === 0) {
      setCancelDialog(false);
      setOpenDialog(true);
    } else {
      toast.error(
        messages.length === 1
          ? messages[0]
          : `Corrija estos errores: ${messages.join(" — ")}`,
      );
    }
  };

  const handleDialogConfirmation = async () => {
    if (cancelDialog) {
      setCancelDialog(false);
      setOpenDialog(false);
      navigate("/creditos");
      return;
    }

    await addLoan();
  };

  const handleCancel = () => {
    setCancelDialog(true);
    setOpenDialog(true);
  };

  const totalPaymentAmount = amortizationTable.reduce(
    (acc, row) => acc + Number(row.paymentAmount ?? 0),
    0,
  );
  const totalPrincipal = amortizationTable.reduce(
    (acc, row) => acc + Number(row.principal ?? 0),
    0,
  );
  const totalInterest = amortizationTable.reduce(
    (acc, row) => acc + Number(row.interest ?? 0),
    0,
  );
  const totalFee = amortizationTable.reduce(
    (acc, row) => acc + Number(row.feeByPayment ?? 0),
    0,
  );
  const totalInsurance = amortizationTable.reduce(
    (acc, row) => acc + Number(row.insuranceByPayment ?? 0),
    0,
  );
  const totalOtherCharges = amortizationTable.reduce(
    (acc, row) => acc + Number(row.otherChargesByPayment ?? 0),
    0,
  );

  return {
    canCreateLoan,
    errors,
    loading,
    loan,
    catalogs,
    guaranteeValue,
    guarantees,
    availableGuarantees,
    selectedGuaranteeIds,
    selectedGuaranteeValue,
    toggleGuaranteeSelection,
    selectAllGuarantees,
    clearGuaranteeSelection,
    getPolicy,
    amortizationTable,
    installment,
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    setSnackbarOpen,
    evaluations,
    openDialog,
    setOpenDialog,
    cancelDialog,
    docSummary,
    showCustomerDocs,
    setShowCustomerDocs,
    activeLoansSummary,
    evaluationViewForm,
    setEvaluationViewForm,
    evaluationModalOpen,
    setEvaluationModalOpen,
    selectedEvaluation,
    evaluationCustomer,
    handleInputChange,
    handleSubmit,
    handleDialogConfirmation,
    handleCancel,
    validateForm,
    validateStep1,
    urlGuarantee,
    totalPaymentAmount,
    totalPrincipal,
    totalInterest,
    totalFee,
    totalInsurance,
    totalOtherCharges,
  };
}
