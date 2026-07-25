import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, MenuItem, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import API from "../api";
import BranchCalendarFields from "./BranchCalendarFields";

const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const formatRecurringDate = (item) => item.easterOffset
  ? "Fecha variable (Semana Santa)"
  : `${String(item.day).padStart(2, "0")} de ${monthNames[Number(item.month) - 1] || "mes desconocido"}`;

export default function BranchCalendarManager() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [calendar, setCalendar] = useState({ works_saturday: false, holidays: [] });
  const [nationalHolidays, setNationalHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ open: false, type: "success", text: "" });

  useEffect(() => {
    API.get("/api/branches").then(({ data }) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setMessage({ open: true, type: "error", text: "No fue posible cargar las sucursales." }))
      .finally(() => setLoading(false));
  }, []);

  const selectBranch = async (id) => {
    setBranchId(id);
    if (!id) return setCalendar({ works_saturday: false, holidays: [] });
    setLoading(true);
    try {
      const { data } = await API.get(`/api/branches/${id}/calendar`);
      setCalendar({ works_saturday: Boolean(data.works_saturday), holidays: data.holidays || [] });
      setNationalHolidays(data.national_holidays || []);
    } catch { setMessage({ open: true, type: "error", text: "No fue posible cargar el calendario." }); }
    finally { setLoading(false); }
  };

  const save = async () => {
    const invalid = calendar.holidays.some((item) => !item.day || !item.month || !item.description?.trim());
    if (invalid) return setMessage({ open: true, type: "error", text: "Complete el día, mes y descripción de cada feriado." });
    setSaving(true);
    try {
      const { data } = await API.put(`/api/branches/${branchId}/calendar`, calendar);
      setMessage({ open: true, type: "success", text: data.message });
      await selectBranch(branchId);
    } catch (err) { setMessage({ open: true, type: "error", text: err.response?.data?.message || "No fue posible guardar." }); }
    finally { setSaving(false); }
  };

  return (
    <Stack spacing={2.5}>
      <Box><Stack direction="row" spacing={1} alignItems="center"><CalendarMonthRoundedIcon color="primary" /><Typography variant="h5" fontWeight={900}>Calendarios laborales</Typography></Stack><Typography color="text.secondary">Configura días hábiles y feriados particulares por sucursal.</Typography></Box>
      <Card variant="outlined"><CardContent><Stack spacing={3}>
        <TextField select label="Sucursal" size="small" value={branchId} onChange={(e) => selectBranch(e.target.value)} sx={{ maxWidth: 480 }}><MenuItem value="">Seleccione una sucursal</MenuItem>{branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}</TextField>
        {loading ? <Box textAlign="center" py={4}><CircularProgress size={28} /></Box> : branchId ? <><BranchCalendarFields value={calendar} onChange={setCalendar} /><Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />} disabled={saving} onClick={save} sx={{ alignSelf: "flex-end" }}>Guardar calendario</Button></> : <Alert severity="info">Seleccione una sucursal para configurar su calendario.</Alert>}
        {branchId && <><Typography variant="h6" fontWeight={800}>Lista de feriados aplicables</Typography><TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}><Table size="small"><TableHead><TableRow><TableCell>Fecha recurrente</TableCell><TableCell>Descripción</TableCell><TableCell>Tipo</TableCell></TableRow></TableHead><TableBody>
          {nationalHolidays.map((item, index) => <TableRow key={`national-${index}`}><TableCell>{formatRecurringDate(item)}</TableCell><TableCell>{item.description}</TableCell><TableCell><Chip size="small" color="primary" label="Nacional" /></TableCell></TableRow>)}
          {(calendar.holidays || []).map((item, index) => <TableRow key={`custom-${item.id || index}`}><TableCell>{formatRecurringDate(item)}</TableCell><TableCell>{item.description}</TableCell><TableCell><Chip size="small" color={item.type === "NATIONAL" ? "primary" : "secondary"} label={item.type === "NATIONAL" ? "Nacional adicional" : "Local"} /></TableCell></TableRow>)}
        </TableBody></Table></TableContainer><Alert severity="info">Los feriados nacionales se aplican todos los años automáticamente; si caen domingo, se compensa el lunes.</Alert></>}
      </Stack></CardContent></Card>
      <Snackbar open={message.open} autoHideDuration={4000} onClose={() => setMessage((m) => ({ ...m, open: false }))}><Alert severity={message.type} variant="filled">{message.text}</Alert></Snackbar>
    </Stack>
  );
}
