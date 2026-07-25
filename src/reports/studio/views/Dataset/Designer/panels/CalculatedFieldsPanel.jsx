import { useState } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FunctionsIcon from "@mui/icons-material/Functions";

import { useReportDefinition } from "../../../../../custom/context/ReportDefinitionContext";
import CalculatedFieldDialog from "../components/CalculatedFieldDialog";

const CalculatedFieldsPanel = () => {
  const { definition, addCalculatedField, removeCalculatedField } =
    useReportDefinition();

  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const calculatedFields = definition.calculatedFields || [];

  const handleAddBasic = () => {
    addCalculatedField({
      label: "Nuevo campo calculado",
      name: `calc_${Date.now()}`,
      type: "currency",
      returnType: "currency",
      format: "money",
      nodes: [],
    });
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        height: "100%",
        overflow: "auto",
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="subtitle2" fontWeight={700}>
            Campos calculados
          </Typography>

          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Nuevo
          </Button>
        </Stack>

        <Divider />

        {calculatedFields.length === 0 ? (
          <Box
            sx={{
              p: 2,
              textAlign: "center",
              color: "text.secondary",
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <FunctionsIcon fontSize="small" />

            <Typography variant="body2" sx={{ mt: 1 }}>
              Aún no hay campos calculados.
            </Typography>

            <Typography variant="caption">
              Crea columnas como Saldo Total, Edad o Estado del crédito.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {calculatedFields.map((field) => (
              <Box
                key={field.id}
                sx={{
                  p: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.default",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <FunctionsIcon fontSize="small" color="primary" />

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {field.label}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" noWrap>
                      {field.name}
                    </Typography>
                  </Box>

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeCalculatedField(field.id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>

      <CalculatedFieldDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </Paper>
  );
};

export default CalculatedFieldsPanel;
