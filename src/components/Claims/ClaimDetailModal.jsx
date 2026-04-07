import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Divider,
  Chip,
  Box,
  Tab,
  Tabs,
} from "@mui/material";
import API from "../../api";

const STATUS_OPTIONS = [
  "RECIBIDO",
  "EN_ANALISIS",
  "PENDIENTE_CLIENTE",
  "RESPONDIDO",
  "CERRADO",
  "RECHAZADO",
];

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export default function ClaimDetailModal({
  open,
  claimId,
  onClose,
  onUpdated,
}) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [claim, setClaim] = useState(null);
  const [logs, setLogs] = useState([]);

  const [note, setNote] = useState("");
  const [statusForm, setStatusForm] = useState({
    status: "",
    note: "",
    response_text: "",
    resolution_type: "",
  });

  const fetchDetail = async () => {
    if (!claimId) return;

    try {
      setLoading(true);
      const res = await API.get(`/api/customer-claims/${claimId}`);
      const data = res.data?.data || {};

      setClaim(data.claim || null);
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setStatusForm({
        status: data.claim?.status || "",
        note: "",
        response_text: data.claim?.response_text || "",
        resolution_type: data.claim?.resolution_type || "",
      });
    } catch (error) {
      console.error("Error cargando detalle:", error);
      setClaim(null);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && claimId) {
      fetchDetail();
    }
  }, [open, claimId]);

  const handleAddNote = async () => {
    try {
      await API.post(`/api/customer-claims/${claimId}/note`, { note });
      setNote("");
      fetchDetail();
      onUpdated?.();
    } catch (error) {
      console.error("Error agregando nota:", error);
      alert(error?.response?.data?.message || "Error agregando nota");
    }
  };

  const handleUpdateStatus = async () => {
    try {
      await API.put(`/api/customer-claims/${claimId}/status`, statusForm);
      fetchDetail();
      onUpdated?.();
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert(error?.response?.data?.message || "Error actualizando estado");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Detalle del reclamo {claim?.claim_code ? `- ${claim.claim_code}` : ""}
      </DialogTitle>

      <DialogContent dividers>
        {loading || !claim ? (
          <Typography>Cargando...</Typography>
        ) : (
          <>
            <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption">Código</Typography>
                  <Typography fontWeight={700}>{claim.claim_code}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption">Estado</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={claim.status} color="info" />
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption">Cliente</Typography>
                  <Typography>
                    {claim.customer_name || claim.customer_id}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption">Crédito</Typography>
                  <Typography>
                    {claim.credit_code || claim.loan_id || "-"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption">Tipo</Typography>
                  <Typography>{claim.claim_type}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption">Prioridad</Typography>
                  <Typography>{claim.priority}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption">Canal</Typography>
                  <Typography>{claim.channel}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">Asunto</Typography>
                  <Typography fontWeight={600}>{claim.subject}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">Descripción</Typography>
                  <Typography>{claim.description}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Bitácora" />
              <Tab label="Agregar nota" />
              <Tab label="Actualizar estado" />
            </Tabs>

            <TabPanel value={tab} index={0}>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                {logs.length === 0 ? (
                  <Typography color="text.secondary">
                    No hay movimientos.
                  </Typography>
                ) : (
                  logs.map((item, idx) => (
                    <Box key={item.id || idx} sx={{ mb: 2 }}>
                      <Typography fontWeight={700}>
                        {item.action_type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.created_at}
                      </Typography>
                      {!!item.previous_status && (
                        <Typography variant="body2">
                          Estado anterior: {item.previous_status}
                        </Typography>
                      )}
                      {!!item.new_status && (
                        <Typography variant="body2">
                          Estado nuevo: {item.new_status}
                        </Typography>
                      )}
                      {!!item.note && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {item.note}
                        </Typography>
                      )}
                      {idx < logs.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  ))
                )}
              </Paper>
            </TabPanel>

            <TabPanel value={tab} index={1}>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  label="Nota interna"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={handleAddNote}>
                    Guardar nota
                  </Button>
                </Box>
              </Paper>
            </TabPanel>

            <TabPanel value={tab} index={2}>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="Estado"
                      value={statusForm.status}
                      onChange={(e) =>
                        setStatusForm((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                    >
                      {STATUS_OPTIONS.map((item) => (
                        <MenuItem key={item} value={item}>
                          {item}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Tipo de resolución"
                      value={statusForm.resolution_type}
                      onChange={(e) =>
                        setStatusForm((prev) => ({
                          ...prev,
                          resolution_type: e.target.value,
                        }))
                      }
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={4}
                      label="Respuesta"
                      value={statusForm.response_text}
                      onChange={(e) =>
                        setStatusForm((prev) => ({
                          ...prev,
                          response_text: e.target.value,
                        }))
                      }
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Comentario del cambio"
                      value={statusForm.note}
                      onChange={(e) =>
                        setStatusForm((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={handleUpdateStatus}>
                    Actualizar estado
                  </Button>
                </Box>
              </Paper>
            </TabPanel>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
