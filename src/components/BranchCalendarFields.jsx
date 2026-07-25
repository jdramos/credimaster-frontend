import React from "react";
import { Box, Button, Divider, Grid, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function BranchCalendarFields({ value, onChange }) {
  const holidays = value.holidays || [];
  const setField = (field, fieldValue) => onChange({ ...value, [field]: fieldValue });
  const updateHoliday = (index, field, fieldValue) => setField("holidays", holidays.map((item, i) => i === index ? { ...item, [field]: fieldValue } : item));

  return (
    <Stack spacing={2}>
      <Divider />
      <Box>
        <Typography fontWeight={700} color="primary.main">Calendario laboral</Typography>
        <Typography variant="body2" color="text.secondary">Define los días hábiles y feriados exclusivos de esta sucursal.</Typography>
      </Box>
      <TextField select size="small" label="Días laborales" value={value.works_saturday ? "MON_SAT" : "MON_FRI"} onChange={(e) => setField("works_saturday", e.target.value === "MON_SAT")} sx={{ maxWidth: 360 }}>
        <MenuItem value="MON_FRI">Lunes a viernes</MenuItem>
        <MenuItem value="MON_SAT">Lunes a sábado</MenuItem>
      </TextField>
      <Typography variant="subtitle2">Días feriados</Typography>
      {holidays.map((item, index) => (
        <Grid container spacing={1} alignItems="center" key={`${item.id || "new"}-${index}`}>
          <Grid item xs={5} sm={2}><TextField select fullWidth size="small" label="Día" value={item.day || ""} onChange={(e) => updateHoliday(index, "day", Number(e.target.value))}>{Array.from({ length: 31 }, (_, i) => <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>)}</TextField></Grid>
          <Grid item xs={6} sm={3}><TextField select fullWidth size="small" label="Mes" value={item.month || ""} onChange={(e) => updateHoliday(index, "month", Number(e.target.value))}>{months.map((name, i) => <MenuItem key={name} value={i + 1}>{name}</MenuItem>)}</TextField></Grid>
          <Grid item xs={11} sm={2}><TextField select fullWidth size="small" label="Tipo" value={item.type || "LOCAL"} onChange={(e) => updateHoliday(index, "type", e.target.value)}><MenuItem value="LOCAL">Local</MenuItem><MenuItem value="NATIONAL">Nacional</MenuItem></TextField></Grid>
          <Grid item xs={11} sm={4}><TextField fullWidth size="small" label="Descripción" placeholder="Ej. Fiesta patronal local" value={item.description || ""} onChange={(e) => updateHoliday(index, "description", e.target.value)} /></Grid>
          <Grid item xs={1}><IconButton color="error" aria-label="Eliminar feriado" onClick={() => setField("holidays", holidays.filter((_, i) => i !== index))}><DeleteRoundedIcon /></IconButton></Grid>
        </Grid>
      ))}
      <Button startIcon={<AddRoundedIcon />} onClick={() => setField("holidays", [...holidays, { day: "", month: "", type: "LOCAL", description: "" }])} sx={{ alignSelf: "flex-start" }}>Agregar feriado</Button>
    </Stack>
  );
}
