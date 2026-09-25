import React, { useState } from "react";
import { Grid, Chip } from "@mui/material";
import dayjs from "dayjs";
import CustomerFinancialEvaluationTab from "../../Customer/CustomerFinancialEvaluationTab";
import { CompactAccordion } from "./primitives";

const LoanFinancialEvaluationSection = ({
  financialEvaluation,
  currentClientId,
  evaluationLoanId,
  canEditFinancialEvaluation,
  onSaved,
  onViewChecklist,
}) => {
  const [financialEvaluationForm, setFinancialEvaluationForm] = useState({
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
    version_no: 1,
    is_current: 1,
  });

  return (
    <Grid item xs={12}>
      <CompactAccordion
        title="Evaluación financiera"
        chip={
          financialEvaluation ? (
            <Chip
              label={`Score: ${financialEvaluation.final_score ?? 0}`}
              size="small"
              variant="outlined"
            />
          ) : null
        }
      >
        <CustomerFinancialEvaluationTab
          form={financialEvaluationForm}
          setForm={setFinancialEvaluationForm}
          customerId={currentClientId}
          loanId={evaluationLoanId}
          readOnly={!canEditFinancialEvaluation}
          onSaved={onSaved}
          onViewChecklist={onViewChecklist}
        />
      </CompactAccordion>
    </Grid>
  );
};

export default LoanFinancialEvaluationSection;
