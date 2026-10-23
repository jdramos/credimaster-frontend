import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Snackbar, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import API from "../api";
import HelpButton from "./help/HelpButton";

const OPEN_END_DAYS = 99999;

// Espejo de la validación del backend (loanClassificationsController.js),
// solo para avisar mientras se escribe; el backend es quien decide. Los
// mínimos de la norma solo se exigen a una empresa normada por la CONAMI.
const validateRows = (rows, enforceNorm = true) => {
  const errors = {};
  let prevMax = -1;
  let prevPct = -1;

  rows.forEach((r) => {
    const rowErrors = [];
    const isLast = r.classification === "E";
    const maxDays = isLast ? OPEN_END_DAYS : Number(r.max_days);
    const pct = Number(r.provision_percentage);

    if (!isLast) {
      if (!Number.isInteger(maxDays) || maxDays < prevMax + 1) rowErrors.push(`Debe ser ≥ ${prevMax + 1}`);
      else if (enforceNorm && r.ngrc && maxDays > r.ngrc.max_days) rowErrors.push(`Norma: máx. ${r.ngrc.max_days} días`);
    }
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) rowErrors.push("Entre 0 y 100");
    else if (enforceNorm && r.ngrc && pct < r.ngrc.provision_percentage) rowErrors.push(`Norma: mín. ${r.ngrc.provision_percentage}%`);
    else if (pct < prevPct) rowErrors.push("Menor que la categoría anterior");

    if (rowErrors.length) errors[r.classification] = rowErrors.join(" · ");
    prevMax = Number.isFinite(maxDays) ? maxDays : prevMax;
    prevPct = Number.isFinite(pct) ? pct : prevPct;
  });

  return errors;
};

// "Días desde" siempre se deriva de la categoría anterior, igual que en el backend.
const withDerivedMinDays = (rows) => {
  let prevMax = -1;
  return rows.map((r) => {
    const min_days = prevMax + 1;
    const max = r.classification === "E" ? OPEN_END_DAYS : Number(r.max_days);
    prevMax = Number.isFinite(max) ? max : prevMax;
    return { ...r, min_days };
  });
};

const matchesNorm = (rows) =>
  rows.every((r) =>
    !r.ngrc ||
    (Number(r.provision_percentage) === r.ngrc.provision_percentage &&
      (r.classification === "E" || Number(r.max_days) === r.ngrc.max_days)));

export default function ProvisionConfigManager() {
  const [groups, setGroups] = useState([]);
  // Normada por la CONAMI: la tabla es la de la NGRC y no se edita (solo se
  // puede restablecer a esos valores). No normada: se edita libremente.
  const [regulated, setRegulated] = useState(true);
  const [tab, setTab] = useState(0);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ open: false, type: "success", text: "" });
  const [serverErrors, setServerErrors] = useState([]);
  const [forbidden, setForbidden] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/loan-classifications");
      const list = Array.isArray(data) ? data : Array.isArray(data?.groups) ? data.groups : [];
      setRegulated(Array.isArray(data) ? true : data?.regulated !== false);
      setGroups(list);
      setDrafts(Object.fromEntries(list.map((g) => [g.id, g.rows.map((r) => ({ ...r }))])));
    } catch (err) {
      if (err.response?.status === 403) {
        // 403 puede venir del permiso (requirePermission) o del módulo NGRC
        // apagado para la empresa (moduleGate); el backend dice cuál.
        setForbidden(err.response?.data?.message || true);
      } else {
        setMessage({ open: true, type: "error", text: "No fue posible cargar la configuración." });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const group = groups[tab];
  const rows = useMemo(() => withDerivedMinDays(group ? drafts[group.id] || [] : []), [group, drafts]);
  const errors = useMemo(() => validateRows(rows, regulated), [rows, regulated]);
  const savedMatchesNorm = group ? matchesNorm(group.rows) : true;
  const dirty = group && JSON.stringify(drafts[group.id]) !== JSON.stringify(group.rows);

  const setField = (letter, field, value) => {
    setServerErrors([]);
    setDrafts((d) => ({
      ...d,
      [group.id]: d[group.id].map((r) => (r.classification === letter ? { ...r, [field]: value } : r)),
    }));
  };

  const save = async (sourceRows = rows) => {
    setSaving(true);
    setServerErrors([]);
    try {
      const payload = sourceRows.map((r) => ({
        classification: r.classification,
        max_days: r.classification === "E" ? OPEN_END_DAYS : Number(r.max_days),
        provision_percentage: Number(r.provision_percentage),
      }));
      const { data } = await API.put(`/api/loan-classifications/${group.id}`, { rows: payload });
      setMessage({ open: true, type: "success", text: data.message });
      await load();
    } catch (err) {
      setServerErrors(err.response?.data?.errors || []);
      setMessage({ open: true, type: "error", text: err.response?.data?.message || "No fue posible guardar." });
    } finally {
      setSaving(false);
    }
  };

  // Normada con valores distintos de la norma (p. ej. venía de no normada):
  // se guarda directamente la tabla de la NGRC.
  const applyNorm = () =>
    save(group.rows.map((r) => ({
      ...r,
      max_days: r.ngrc?.max_days ?? r.max_days,
      provision_percentage: r.ngrc?.provision_percentage ?? r.provision_percentage,
    })));

  const resetToNorm = () => {
    setServerErrors([]);
    setDrafts((d) => ({
      ...d,
      [group.id]: d[group.id].map((r) => ({
        ...r,
        max_days: r.ngrc?.max_days ?? r.max_days,
        provision_percentage: r.ngrc?.provision_percentage ?? r.provision_percentage,
      })),
    }));
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <PercentRoundedIcon color="primary" />
          <Typography variant="h5" fontWeight={900}>Clasificación y provisión de cartera</Typography>
          <HelpButton screenKey="configuracion.provision_cartera" />
        </Stack>
        <Typography color="text.secondary">
          Rangos de días de mora y % de provisión por categoría de riesgo.
          {regulated
            ? " Su empresa está normada por la CONAMI: se aplican los valores de la NGRC (Art. 30-33) y no se pueden modificar."
            : " Su empresa no está normada por la CONAMI: puede ajustar los rangos y porcentajes; los valores de la NGRC se muestran como referencia."}
        </Typography>
      </Box>

      {loading ? (
        <Box textAlign="center" py={4}><CircularProgress size={28} /></Box>
      ) : forbidden ? (
        <Alert severity="warning">
          {typeof forbidden === "string" && forbidden.includes("módulo")
            ? "La clasificación de riesgo y provisión NGRC no está habilitada para su empresa."
            : 'No tiene permiso para configurar la provisión de cartera. Solicítelo a un administrador (permiso "Configurar clasificación y provisión de cartera").'}
        </Alert>
      ) : !groups.length ? (
        <Alert severity="warning">No hay configuración disponible.</Alert>
      ) : (
        <Card variant="outlined">
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setServerErrors([]); }} variant="scrollable" sx={{ px: 1, borderBottom: 1, borderColor: "divider" }}>
            {groups.map((g) => <Tab key={g.id} label={g.name} />)}
          </Tabs>
          <CardContent>
            <Stack spacing={2}>
              <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Días desde</TableCell>
                      <TableCell>Días hasta</TableCell>
                      <TableCell>% provisión</TableCell>
                      <TableCell>{regulated ? "Valor de la norma" : "Referencia de la norma"}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.classification}>
                        <TableCell>
                          <Typography fontWeight={800}>{r.classification}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.description}</Typography>
                        </TableCell>
                        <TableCell>{r.min_days}</TableCell>
                        <TableCell sx={{ width: 150 }}>
                          {r.classification === "E" ? (
                            <Typography color="text.secondary">En adelante</Typography>
                          ) : (
                            <TextField
                              size="small" type="number" value={r.max_days}
                              disabled={regulated}
                              onChange={(e) => setField(r.classification, "max_days", e.target.value)}
                              error={Boolean(errors[r.classification])}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ width: 150 }}>
                          <TextField
                            size="small" type="number" value={r.provision_percentage}
                            disabled={regulated}
                            inputProps={{ step: "0.01", min: 0, max: 100 }}
                            onChange={(e) => setField(r.classification, "provision_percentage", e.target.value)}
                            error={Boolean(errors[r.classification])}
                            helperText={errors[r.classification] || " "}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {r.ngrc
                              ? `${r.classification === "E" ? "" : `hasta ${r.ngrc.max_days} días · `}${r.ngrc.provision_percentage}%`
                              : "—"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {serverErrors.length > 0 && (
                <Alert severity="error">
                  {serverErrors.map((e) => <div key={e}>{e}</div>)}
                </Alert>
              )}

              <Alert severity="info">
                Los cambios aplican a partir del próximo cierre del día: cada crédito se reclasifica con esta tabla y la
                diferencia de provisión se contabiliza como ajuste. Quedan registrados en la bitácora de auditoría.
              </Alert>

              {regulated ? (
                !savedMatchesNorm && (
                  <Alert
                    severity="warning"
                    action={
                      <Button color="inherit" size="small" onClick={applyNorm} disabled={saving}>
                        Aplicar valores de la norma
                      </Button>
                    }
                  >
                    Esta tabla tiene valores distintos de la NGRC. Como su empresa está normada, debe usar los de la norma.
                  </Alert>
                )
              ) : (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="text" onClick={resetToNorm} disabled={saving}>Usar valores de la norma</Button>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
                    disabled={saving || !dirty || Object.keys(errors).length > 0}
                    onClick={() => save()}
                  >
                    Guardar {group?.name}
                  </Button>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Snackbar open={message.open} autoHideDuration={4000} onClose={() => setMessage((m) => ({ ...m, open: false }))}>
        <Alert severity={message.type} variant="filled">{message.text}</Alert>
      </Snackbar>
    </Stack>
  );
}
