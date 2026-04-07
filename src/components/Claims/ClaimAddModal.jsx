import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Button,
  MenuItem,
} from "@mui/material";
import API from "../../api";

const claimTypes = [
  "COBRO INDEBIDO",
  "ERROR DE SALDO",
  "ERROR EN PAGO",
  "MALA ATENCION",
  "COBRANZA INADECUADA",
  "INFORMACION INCORRECTA",
  "PROBLEMA CON DOCUMENTO",
  "PROBLEMA CON APP",
  "OTRO",
];

export default function ClaimAddModal({
  open,
  onClose,
  onSaved,
  customerId = "",
}) {
  const [form, setForm] = useState({
    customer_id: customerId,
    loan_id: "",
    channel: "WEB",
    claim_type: "",
    priority: "MEDIA",
    subject: "",
    description: "",
    customer_phone: "",
    customer_email: "",
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    await API.post("/api/customer-claims", form);
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Nuevo reclamo</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="customer_id"
              label="Cliente"
              value={form.customer_id}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="loan_id"
              label="Crédito asociado"
              value={form.loan_id}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              name="claim_type"
              label="Tipo de reclamo"
              value={form.claim_type}
              onChange={handleChange}
            >
              {claimTypes.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              name="channel"
              label="Canal"
              value={form.channel}
              onChange={handleChange}
            >
              <MenuItem value="OFICINA">Oficina</MenuItem>
              <MenuItem value="WEB">Web</MenuItem>
              <MenuItem value="MOVIL">Móvil</MenuItem>
              <MenuItem value="CALLCENTER">Call Center</MenuItem>
              <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
              <MenuItem value="SMS">SMS</MenuItem>
              <MenuItem value="OTRO">Otro</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              name="priority"
              label="Prioridad"
              value={form.priority}
              onChange={handleChange}
            >
              <MenuItem value="BAJA">Baja</MenuItem>
              <MenuItem value="MEDIA">Media</MenuItem>
              <MenuItem value="ALTA">Alta</MenuItem>
              <MenuItem value="CRITICA">Crítica</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              name="subject"
              label="Asunto"
              value={form.subject}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={4}
              name="description"
              label="Descripción"
              value={form.description}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="customer_phone"
              label="Teléfono"
              value={form.customer_phone}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="customer_email"
              label="Correo"
              value={form.customer_email}
              onChange={handleChange}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
