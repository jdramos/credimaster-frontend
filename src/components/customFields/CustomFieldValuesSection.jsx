import React from "react";
import { Grid } from "@mui/material";
import { CompactAccordion } from "../Loan/detail/primitives";
import CustomFieldInputs from "./CustomFieldInputs";
import useCustomFields from "./useCustomFields";

// Detalle del crédito: los campos personalizados activos y sus valores.
// No aparece si la empresa no tiene campos de crédito.
const CustomFieldValuesSection = ({ entity = "LOAN", recordId, title = "Datos adicionales" }) => {
  const { fields, values } = useCustomFields(entity, recordId || null);
  if (!recordId || !fields.length) return null;

  return (
    <Grid item xs={12}>
      <CompactAccordion title={title} defaultExpanded>
        <CustomFieldInputs fields={fields} values={values} readOnly title={null} sx={{ mt: 0 }} />
      </CompactAccordion>
    </Grid>
  );
};

export default CustomFieldValuesSection;
