import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

const AvailableFieldsPanel = ({
  fields = [],
  selectedFieldNames = [],
  onAddField,
  onSelectField,
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={800} sx={{ mb: 1 }}>
        Campos disponibles
      </Typography>

      <Stack spacing={1}>
        {fields.map((field) => {
          const selected = selectedFieldNames.includes(field.name);

          return (
            <Stack
              key={field.name}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: selected ? "action.selected" : "transparent",
                cursor: "pointer",
              }}
              onClick={() => onSelectField(field)}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {field.label}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {field.category || "General"} · {field.type}
                </Typography>
              </Box>

              <Button
                size="small"
                variant={selected ? "outlined" : "contained"}
                disabled={selected}
                startIcon={<AddIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddField(field);
                }}
              >
                {selected ? "Agregado" : "Agregar"}
              </Button>
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
};

export default AvailableFieldsPanel;
