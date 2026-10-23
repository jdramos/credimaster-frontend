import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton,
  MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField,
  Tooltip, Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import BlockIcon from "@mui/icons-material/Block";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneIcon from "@mui/icons-material/Phone";
import dayjs from "dayjs";
import API from "../../api";
import CustomerCreditHistoryTab from "./CustomerCreditHistoryTab";
import { RATING, STAGE_COLOR, dmy, money, whatsappUrl } from "./inactiveCustomersShared";

// Detalle de un cliente inactivo: su seguimiento (etapa, responsable,
// próxima acción), la bitácora de gestiones (se anulan, nunca se borran) y su
// historial crediticio. Backend: /api/inactive-customers/customers/:id.

const today = () => dayjs().format("YYYY-MM-DD");
const errMsg = (err, fallback) => err.response?.data?.message || fallback;
const sectionSx = { p: 2, borderRadius: 2.5, border: 1, borderColor: "divider" };

const EMPTY_ACTION = {
  action_date: "",
  channel: "LLAMADA",
  result: "",
  note: "",
  stage: "",
  next_contact_date: "",
  next_action_note: "",
};

function VoidDialog({ action, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await API.post(`/api/inactive-customers/actions/${action.id}/void`, { reason });
      onDone();
    } catch (err) {
      setError(errMsg(err, "No se pudo anular la gestión."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Anular gestión</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          La gestión del {dmy(action.action_date)} queda en la bitácora como anulada, con el motivo.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField label="Motivo de la anulación" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth multiline minRows={2} autoFocus />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button color="error" variant="contained" onClick={submit} disabled={saving || reason.trim().length < 5} sx={{ textTransform: "none" }}>
          Anular
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function InactiveCustomerDetail({ customerId, catalogs, canManage, canRequestLoan, onClose, onChanged }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [action, setAction] = useState(EMPTY_ACTION);
  const [followupForm, setFollowupForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [voiding, setVoiding] = useState(null);

  const stages = useMemo(() => catalogs?.stages || [], [catalogs]);
  const manualStages = stages.filter((s) => !s.automatic);
  const stageLabel = useMemo(() => Object.fromEntries(stages.map((s) => [s.key, s.label])), [stages]);
  const channelLabel = useMemo(() => Object.fromEntries((catalogs?.channels || []).map((c) => [c.key, c.label])), [catalogs]);
  const resultByKey = useMemo(() => Object.fromEntries((catalogs?.results || []).map((r) => [r.key, r])), [catalogs]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const { data: res } = await API.get(`/api/inactive-customers/customers/${customerId}`);
      setState({ loading: false, data: res.data, error: "" });
      const inactive = res.data.inactive;
      setFollowupForm(inactive ? {
        stage: inactive.stage,
        responsible_user_id: inactive.responsible_user_id ? String(inactive.responsible_user_id) : "",
        next_action_date: inactive.next_action_date || "",
        next_action_note: inactive.next_action_note || "",
      } : null);
    } catch (err) {
      setState({ loading: false, data: null, error: errMsg(err, "No se pudo obtener el seguimiento del cliente.") });
    }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const { data } = state;
  const inactive = data?.inactive || null;
  const customer = data?.customer;
  const closedStage = inactive && ["NO_INTERESADO", "DESCARTADO", "RENOVO"].includes(inactive.stage);
  const editable = canManage && inactive && data?.tracking_available && inactive.stage !== "RENOVO";
  const notEligible = Boolean(data?.eligibility && !data.eligibility.eligible);
  const followupById = useMemo(() => Object.fromEntries((data?.followups || []).map((f) => [f.id, f])), [data]);

  const afterSave = async (text) => {
    setMessage({ severity: "success", text });
    await load();
    onChanged?.();
  };

  const setActionField = (name) => (e) => {
    const value = e.target.value;
    setAction((a) => {
      const next = { ...a, [name]: value };
      // El resultado sugiere la etapa (se puede cambiar).
      if (name === "result") next.stage = resultByKey[value]?.stage || "";
      return next;
    });
  };

  const submitAction = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body = Object.fromEntries(Object.entries({ ...action, action_date: action.action_date || today() }).filter(([, v]) => v !== ""));
      await API.post(`/api/inactive-customers/customers/${customerId}/actions`, body);
      setAction(EMPTY_ACTION);
      await afterSave("Gestión registrada.");
    } catch (err) {
      setMessage({ severity: "error", text: errMsg(err, "No se pudo registrar la gestión.") });
    } finally {
      setSaving(false);
    }
  };

  const submitFollowup = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await API.put(`/api/inactive-customers/customers/${customerId}/followup`, {
        stage: followupForm.stage,
        responsible_user_id: followupForm.responsible_user_id ? Number(followupForm.responsible_user_id) : null,
        next_action_date: followupForm.next_action_date || null,
        next_action_note: followupForm.next_action_note || null,
      });
      await afterSave("Seguimiento actualizado.");
    } catch (err) {
      setMessage({ severity: "error", text: errMsg(err, "No se pudo actualizar el seguimiento.") });
    } finally {
      setSaving(false);
    }
  };

  const phones = customer ? [customer.cellphone, customer.telephone, customer.business_telephone].filter(Boolean) : [];

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {customer ? customer.customer_name : "Cliente"}
        {customer && <Typography variant="body2" color="text.secondary">{customer.identification}</Typography>}
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }} aria-label="Cerrar"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {state.loading && !data && <CircularProgress size={22} />}
        {state.error && <Alert severity="error">{state.error}</Alert>}
        {data && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }} alignItems="center">
              {phones.map((p) => {
                const wa = whatsappUrl(p);
                return (
                  <Stack key={p} direction="row" alignItems="center">
                    <Button size="small" startIcon={<PhoneIcon />} href={`tel:${p}`} sx={{ textTransform: "none" }}>{p}</Button>
                    {wa && (
                      <Tooltip title="Abrir WhatsApp">
                        <IconButton size="small" component="a" href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${p}`}>
                          <WhatsAppIcon fontSize="small" color="success" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                );
              })}
              {!phones.length && <Typography variant="body2" color="text.secondary">Sin teléfono registrado</Typography>}
              <Box sx={{ flexGrow: 1 }} />
              <Button size="small" variant="outlined" sx={{ textTransform: "none" }} onClick={() => navigate(`/clientes/ver/${customerId}`)}>
                Ver ficha
              </Button>
              {canRequestLoan && notEligible && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  sx={{ textTransform: "none" }}
                  onClick={() => navigate(`/creditos/agregar?customerId=${customerId}`)}
                >
                  Continuar de todos modos (requerirá Comité de Crédito)
                </Button>
              )}
              {canRequestLoan && !notEligible && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  sx={{ textTransform: "none" }}
                  onClick={() => navigate(`/creditos/agregar?customerId=${customerId}`)}
                >
                  Nueva solicitud de crédito
                </Button>
              )}
            </Stack>

            {notEligible && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>No apto para represtamo:</strong> {data.eligibility.reasons.join("; ")}. No se recomienda ofrecerle un nuevo
                crédito; si se tramita, la solicitud irá obligatoriamente a Comité de Crédito.
              </Alert>
            )}

            {!inactive && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Este cliente ya no está inactivo: tiene un crédito vivo. Su seguimiento quedó registrado como "Renovó".
              </Alert>
            )}
            {inactive?.pending_request_id && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Tiene una solicitud de crédito en trámite (#{inactive.pending_request_id}). Al desembolsarse, el seguimiento se marcará "Renovó".
              </Alert>
            )}
            {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
              <Tab label="Seguimiento" sx={{ textTransform: "none" }} />
              <Tab label="Historial crediticio" sx={{ textTransform: "none" }} />
            </Tabs>

            {tab === 0 && (
              <Stack spacing={2}>
                {inactive && (
                  <Paper elevation={0} sx={sectionSx}>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Último crédito</Typography>
                        <Typography fontWeight={600}>#{inactive.last_loan_code} · {money(inactive.last_amount)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {inactive.last_loan_status === "WRITTEN_OFF" ? "Saneado" : "Cancelado"} el {dmy(inactive.last_end_date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Días inactivo</Typography>
                        <Typography fontWeight={600}>{inactive.days_inactive ?? "—"}</Typography>
                        <Typography variant="caption" color="text.secondary">{inactive.loans_count} crédito(s) en total</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Comportamiento del último crédito</Typography>
                        <Box>
                          <Chip size="small" color={RATING[inactive.last_rating]?.color || "default"} label={RATING[inactive.last_rating]?.label || inactive.last_rating} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Atraso máx. {inactive.last_max_days_late ?? "—"} d · mejor {inactive.best_max_days_late ?? "—"} / peor {inactive.worst_max_days_late ?? "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Etapa</Typography>
                        <Box><Chip size="small" color={STAGE_COLOR[inactive.stage] || "default"} label={stageLabel[inactive.stage] || inactive.stage} /></Box>
                        <Typography variant="caption" color="text.secondary">{inactive.responsible_name || "Sin responsable"}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                )}

                {inactive && !data.tracking_available && (
                  <Alert severity="info">El seguimiento aún no está habilitado en esta empresa.</Alert>
                )}

                {editable && followupForm && (
                  <Paper elevation={0} sx={sectionSx}>
                    <Typography fontWeight={700} sx={{ mb: 1.5 }}>Seguimiento</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
                      <TextField select size="small" label="Etapa" value={followupForm.stage} onChange={(e) => setFollowupForm((f) => ({ ...f, stage: e.target.value }))} sx={{ minWidth: 220 }}>
                        {manualStages.map((s) => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
                      </TextField>
                      <TextField select size="small" label="Responsable" value={followupForm.responsible_user_id} onChange={(e) => setFollowupForm((f) => ({ ...f, responsible_user_id: e.target.value }))} sx={{ minWidth: 220 }}>
                        <MenuItem value="">Sin asignar</MenuItem>
                        {(catalogs?.users || []).map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>)}
                      </TextField>
                      <TextField
                        size="small" type="date" label="Próxima acción" InputLabelProps={{ shrink: true }}
                        value={followupForm.next_action_date}
                        onChange={(e) => setFollowupForm((f) => ({ ...f, next_action_date: e.target.value }))}
                        disabled={manualStages.find((s) => s.key === followupForm.stage)?.closes}
                      />
                      <TextField
                        size="small" label="Qué hacer" value={followupForm.next_action_note} sx={{ minWidth: 240 }}
                        onChange={(e) => setFollowupForm((f) => ({ ...f, next_action_note: e.target.value }))}
                      />
                      <Button variant="outlined" onClick={submitFollowup} disabled={saving} sx={{ textTransform: "none" }}>Guardar seguimiento</Button>
                    </Stack>
                    {closedStage && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                        El seguimiento está cerrado. Para reabrirlo, cambie la etapa a Por contactar, Contactado o Interesado.
                      </Typography>
                    )}
                  </Paper>
                )}

                {editable && (
                  <Paper elevation={0} sx={sectionSx}>
                    <Typography fontWeight={700} sx={{ mb: 1.5 }}>Registrar gestión</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
                      <TextField size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={action.action_date || today()} onChange={setActionField("action_date")} inputProps={{ max: today() }} />
                      <TextField select size="small" label="Canal" value={action.channel} onChange={setActionField("channel")} sx={{ minWidth: 140 }}>
                        {(catalogs?.channels || []).map((c) => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
                      </TextField>
                      <TextField select size="small" label="Resultado" value={action.result} onChange={setActionField("result")} sx={{ minWidth: 240 }}>
                        {(catalogs?.results || []).map((r) => <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>)}
                      </TextField>
                      <TextField select size="small" label="Etapa después de la gestión" value={action.stage} onChange={setActionField("stage")} sx={{ minWidth: 230 }}>
                        <MenuItem value="">Sin cambio ({stageLabel[inactive.stage]})</MenuItem>
                        {manualStages.map((s) => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
                      </TextField>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1.5, mt: 1.5 }}>
                      <TextField size="small" label="Nota" value={action.note} onChange={setActionField("note")} sx={{ flex: 1, minWidth: 280 }} multiline maxRows={4} />
                      <TextField size="small" type="date" label="Próximo contacto" InputLabelProps={{ shrink: true }} value={action.next_contact_date} onChange={setActionField("next_contact_date")} inputProps={{ min: action.action_date || today() }} />
                      <TextField size="small" label="Qué hacer en el próximo contacto" value={action.next_action_note} onChange={setActionField("next_action_note")} sx={{ minWidth: 240 }} disabled={!action.next_contact_date} />
                      <Button variant="contained" onClick={submitAction} disabled={saving || !action.result || !action.channel} sx={{ textTransform: "none" }}>
                        Registrar gestión
                      </Button>
                    </Stack>
                  </Paper>
                )}

                <Paper elevation={0} sx={sectionSx}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>Bitácora de gestiones</Typography>
                  {!data.actions.length ? (
                    <Typography variant="body2" color="text.secondary">Todavía no hay gestiones registradas.</Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Canal</TableCell>
                            <TableCell>Resultado</TableCell>
                            <TableCell>Nota</TableCell>
                            <TableCell>Etapa</TableCell>
                            <TableCell>Próximo contacto</TableCell>
                            <TableCell>Registró</TableCell>
                            <TableCell />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.actions.map((a) => {
                            const isVoid = a.status === "VOID";
                            const episode = followupById[a.followup_id];
                            const current = inactive && episode && episode.last_loan_id === inactive.last_loan_id;
                            return (
                              <TableRow key={a.id} sx={isVoid ? { "& td": { color: "text.disabled" } } : undefined}>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                  {dmy(a.action_date)}
                                  {!current && episode && (
                                    <Typography variant="caption" display="block">tras crédito #{episode.last_loan_code || episode.last_loan_id}</Typography>
                                  )}
                                </TableCell>
                                <TableCell>{channelLabel[a.channel] || a.channel}</TableCell>
                                <TableCell>{resultByKey[a.result]?.label || a.result}</TableCell>
                                <TableCell sx={{ maxWidth: 280 }}>
                                  <span style={isVoid ? { textDecoration: "line-through" } : undefined}>{a.note || "—"}</span>
                                  {isVoid && (
                                    <Typography variant="caption" display="block" color="error">
                                      Anulada por {a.voided_by_name || "—"}: {a.void_reason}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                  {a.stage_before !== a.stage_after
                                    ? `${stageLabel[a.stage_before] || a.stage_before} → ${stageLabel[a.stage_after] || a.stage_after}`
                                    : stageLabel[a.stage_after] || a.stage_after}
                                </TableCell>
                                <TableCell>{dmy(a.next_contact_date)}</TableCell>
                                <TableCell>{a.created_by_name || "—"}</TableCell>
                                <TableCell align="right">
                                  {canManage && !isVoid && (
                                    <Tooltip title="Anular gestión">
                                      <IconButton size="small" onClick={() => setVoiding(a)} aria-label="Anular gestión"><BlockIcon fontSize="small" /></IconButton>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>

                {data.followups.some((f) => !inactive || f.last_loan_id !== inactive.last_loan_id) && (
                  <Paper elevation={0} sx={sectionSx}>
                    <Typography fontWeight={700} sx={{ mb: 1 }}>Seguimientos anteriores</Typography>
                    {data.followups.filter((f) => !inactive || f.last_loan_id !== inactive.last_loan_id).map((f) => (
                      <Typography key={f.id} variant="body2" sx={{ mb: 0.5 }}>
                        Tras el crédito #{f.last_loan_code || f.last_loan_id}:{" "}
                        <Chip size="small" color={STAGE_COLOR[f.stage] || "default"} label={stageLabel[f.stage] || f.stage} />{" "}
                        {f.close_reason || ""}
                      </Typography>
                    ))}
                  </Paper>
                )}
              </Stack>
            )}

            {tab === 1 && <CustomerCreditHistoryTab customerId={customerId} />}
          </>
        )}
      </DialogContent>
      {voiding && (
        <VoidDialog
          action={voiding}
          onClose={() => setVoiding(null)}
          onDone={async () => { setVoiding(null); await afterSave("Gestión anulada."); }}
        />
      )}
    </Dialog>
  );
}
