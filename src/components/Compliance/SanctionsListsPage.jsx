import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import BrowseSanctionsListsPanel from "./BrowseSanctionsListsPanel";

// Pantalla propia para consultar las listas OFAC/ONU completas
// (Cumplimiento > Listas OFAC / ONU).
export default function SanctionsListsPage() {
  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <PublicIcon sx={{ color: "#0057B8" }} />
        <Box>
          <Typography variant="h6" fontWeight={700}>Listas OFAC / ONU</Typography>
          <Typography variant="body2" color="text.secondary">
            Personas y entidades sancionadas por la OFAC y el Consejo de Seguridad de la ONU, con las que se tamizan clientes, fiadores, empleados, proveedores y socios
          </Typography>
        </Box>
      </Stack>
      <BrowseSanctionsListsPanel fullPage />
    </Box>
  );
}
