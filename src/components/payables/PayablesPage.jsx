import React, { useState } from "react";
import { Box, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import InvoicesTab from "./InvoicesTab";
import AgingTab from "./AgingTab";
import AdvancesTab from "./AdvancesTab";

export default function PayablesPage() {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <AccountBalanceIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Cuentas por Pagar</Typography>
            <Typography variant="body2" color="text.secondary">
              Facturas de proveedores, antigüedad de saldos y retenciones
            </Typography>
          </Box>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Facturas" />
          <Tab label="Anticipos" />
          <Tab label="Antigüedad de saldos" />
        </Tabs>

        {tab === 0 && <InvoicesTab />}
        {tab === 1 && <AdvancesTab />}
        {tab === 2 && <AgingTab />}
      </Paper>
    </Box>
  );
}
