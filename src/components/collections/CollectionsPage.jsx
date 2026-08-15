import React, { useState } from "react";
import { Box, Paper, Tab, Tabs } from "@mui/material";
import CollectionsWorklist from "./CollectionsWorklist";
import LegalCasesTab from "./LegalCasesTab";
import PromisesTab from "./PromisesTab";

export default function CollectionsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E5E7EB", mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label="Cartera en mora" />
          <Tab label="Judicial" />
          <Tab label="Promesas de pago" />
        </Tabs>
      </Paper>

      {/* La pestaña de mora ya trae su propio contenedor y estado. */}
      {tab === 0 && <CollectionsWorklist />}
      {tab === 1 && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
          <LegalCasesTab />
        </Paper>
      )}
      {tab === 2 && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
          <PromisesTab />
        </Paper>
      )}
    </Box>
  );
}
