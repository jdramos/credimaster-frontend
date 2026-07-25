import { useMemo } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";

import { useReportDefinition } from "../../custom/context/ReportDefinitionContext";

import { ExpressionProvider } from "../context/ExpressionContext";
import { validateExpression } from "../validator/ExpressionValidator";
import { buildFieldsRegistry } from "../registry/FieldsRegistry";
import { getOperators } from "../registry/OperatorsRegistry";
import { getFunctions } from "../registry/FunctionsRegistry";

import ExpressionCanvas from "./ExpressionCanvas";
import ExpressionToolbar from "./ExpressionToolbar";
import ExpressionPreview from "./ExpressionPreview";
import ExpressionErrors from "./ExpressionErrors";

const ExpressionBuilder = ({ value, onChange, fields = [] }) => {
  const { sourceFields, definition } = useReportDefinition();

  const expression = value || { nodes: [] };

  const registryFields = useMemo(() => {
    if (fields.length > 0) return fields;

    return buildFieldsRegistry({
      sourceFields,
      calculatedFields: definition.calculatedFields || [],
    });
  }, [fields, sourceFields, definition.calculatedFields]);

  const operators = useMemo(() => getOperators(), []);
  const functions = useMemo(() => getFunctions(), []);

  const validationErrors = validateExpression({
    expression,
    fields: registryFields,
    operators,
    functions,
  });

  return (
    <ExpressionProvider value={expression} onChange={onChange}>
      <Box>
        <Stack spacing={2}>
          <Typography variant="subtitle2" fontWeight={700}>
            Fórmula visual
          </Typography>

          <ExpressionToolbar
            fields={registryFields}
            operators={operators}
            functions={functions}
          />

          <ExpressionCanvas
            fields={registryFields}
            operators={operators}
            functions={functions}
          />

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              Vista previa
            </Typography>

            <ExpressionPreview
              fields={registryFields}
              operators={operators}
              functions={functions}
            />
          </Box>

          <ExpressionErrors errors={validationErrors} />
        </Stack>
      </Box>
    </ExpressionProvider>
  );
};

export default ExpressionBuilder;
