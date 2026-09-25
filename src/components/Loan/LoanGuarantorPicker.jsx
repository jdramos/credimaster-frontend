import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import BAC from "../../styles/bac";

// Selector de fiadores para un crédito: los candidatos son clientes con
// customer_type FIADOR/AMBOS (Art. 48 CD-CONAMI-070-01OCT07-2025 — el
// fiador es un tipo de cliente, no un registro de texto libre). Presentacional
// puro, sin fetch propio, mismo patrón que LoanGuaranteeSelector.jsx.
const LoanGuarantorPicker = ({ candidates = [], selectedIds = [], onToggle }) => {
  if (candidates.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        No hay clientes marcados como Fiador/Ambos todavía. Puede crear uno desde Clientes con
        Tipo de cliente = Fiador o Ambos.
      </Alert>
    );
  }

  return (
    <Stack spacing={1}>
      {candidates.map((c) => {
        const checked = selectedIds.includes(c.id);
        return (
          <Box
            key={c.id}
            sx={{
              border: `1px solid ${BAC.border}`,
              borderRadius: 2,
              p: 1,
              bgcolor: BAC.white,
            }}
          >
            <FormControlLabel
              sx={{ m: 0, width: "100%", alignItems: "flex-start" }}
              control={<Checkbox checked={checked} onChange={() => onToggle(c.id)} sx={{ pt: 0.5 }} />}
              label={
                <Box>
                  <Typography sx={{ fontWeight: 700, color: BAC.text }}>{c.customer_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.identification ? `Identificación: ${c.identification}` : "Sin identificación registrada"}
                    {c.cellphone ? ` — Cel: ${c.cellphone}` : ""}
                  </Typography>
                </Box>
              }
            />
          </Box>
        );
      })}
    </Stack>
  );
};

export default LoanGuarantorPicker;
