import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import API from "../../api";

const STATUS_URL = "/api/superadmin/sanctions-feeds/status";
const SYNC_URL = "/api/superadmin/sanctions-feeds/sync";

// Sincronización de la tabla ÚNICA compartida (credimaster_license.sanctions_entries,
// visible para todos los tenants) con los feeds públicos de OFAC (SDN) y
// ONU (Consolidated List) -- ver api/compliance/sanctionsFeedSync.js. Ya no
// es "por tenant" (una sola escritura sirve para todos), por eso vive en
// superadmin; también corre automáticamente cada noche vía
// jobs/sanctionsFeedCron.js.
export default function SanctionsFeedSyncPanel() {
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = async () => {
    try {
      const { data } = await API.get(STATUS_URL);
      setStatus(data);
    } catch (err) {
      // no bloquea el panel si falla
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError("");
      await API.post(SYNC_URL);
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo completar la sincronización");
    } finally {
      setSyncing(false);
    }
  };

  const lastRun = status?.lastRun;

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>
            Sincronización OFAC/ONU
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Actualiza la lista compartida de sanciones (visible para todos los tenants) con los feeds
            públicos de OFAC (SDN) y la ONU (Consolidated List). Corre automáticamente cada noche a las
            3:00am, o se puede disparar aquí de forma manual.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {lastRun && (
            <Chip
              size="small"
              label={`Última corrida: ${new Date(lastRun.ranAt).toLocaleString("es-NI")} (${lastRun.totalFetched} entradas)`}
            />
          )}
          {status?.running && <Chip size="small" color="warning" label="En curso..." />}
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncing || status?.running}
            sx={{ textTransform: "none" }}
          >
            {syncing ? "Sincronizando..." : "Sincronizar ahora"}
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}

      {lastRun && (
        <Alert severity="success" sx={{ mt: 1.5 }}>
          OFAC: {lastRun.ofacFetched.toLocaleString("es-NI")} · ONU: {lastRun.unFetched.toLocaleString("es-NI")} ·{" "}
          {lastRun.upserted.toLocaleString("es-NI")} actualizadas, {lastRun.deactivated.toLocaleString("es-NI")} desactivadas
        </Alert>
      )}
    </Paper>
  );
}
