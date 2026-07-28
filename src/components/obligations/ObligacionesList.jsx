import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Autocomplete,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PaymentsIcon from "@mui/icons-material/Payments";
import BlockIcon from "@mui/icons-material/Block";
import API from "../../api";

const API_URL = "/api/obligations";

const money = (value) => Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyForm = {
  financiador: null,
  linea: null,
  id_obligacion: "",
  nombre_fondo: "",
  mto_aprobado: "",
  fecha_otorgamiento: new Date().toISOString().slice(0, 10),
  fecha_vcto: "",
  tasa_contrato: "",
  cantidad_cuotas: "12",
  gl_account: null,
  gl_interest_expense_account: null,
};

const emptyMovForm = {
  tipo_movimiento: "DESEMBOLSO",
  fecha: new Date().toISOString().slice(0, 10),
  mto_principal: "",
  mto_interes: "",
  bank_account: null,
};

export default function ObligacionesList() {
  const [rows, setRows] = useState([]);
  const [financiadores, setFinanciadores] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [movDialogOpen, setMovDialogOpen] = useState(false);
  const [movForm, setMovForm] = useState(emptyMovForm);
  const [movSaving, setMovSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchObligaciones = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar las obligaciones", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObligaciones();
    API.get("/api/obligations/financiadores?status=ACTIVO").then((res) => setFinanciadores(res.data?.data || [])).catch(() => {});
    API.get("/api/obligations/lineas-credito").then((res) => setLineas(res.data?.data || [])).catch(() => {});
    API.get("/api/accounting/accounts?is_active=1").then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAccounts(list.filter((a) => Number(a.is_movement) === 1));
    }).catch(() => {});
    API.get("/api/banks/accounts?status=ACTIVA").then((res) => setBankAccounts(res.data?.data || [])).catch(() => {});
  }, []);

  const handleOpenCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.financiador || !form.id_obligacion || !form.mto_aprobado || !form.fecha_vcto || !form.cantidad_cuotas || !form.gl_account) {
      showAlert("Complete financiador, identificador, monto aprobado, fecha de vencimiento, cantidad de cuotas y cuenta contable", "error");
      return;
    }

    try {
      setSaving(true);
      await API.post(API_URL, {
        financiador_id: form.financiador.id,
        linea_credito_id: form.linea?.id || null,
        id_obligacion: form.id_obligacion,
        nombre_fondo: form.nombre_fondo || null,
        mto_aprobado: Number(form.mto_aprobado),
        mto_solicitado: Number(form.mto_aprobado),
        fecha_otorgamiento: form.fecha_otorgamiento,
        fecha_vcto: form.fecha_vcto,
        tasa_contrato: Number(form.tasa_contrato || 0),
        cantidad_cuotas: Number(form.cantidad_cuotas),
        gl_account_id: form.gl_account.id,
        gl_interest_expense_account_id: form.gl_interest_expense_account?.id || null,
      });

      showAlert("Obligación registrada correctamente");
      setDialogOpen(false);
      fetchObligaciones();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al registrar la obligación", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDetail = async (row) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await API.get(`${API_URL}/${row.id}`);
      setDetail(res.data?.data || null);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar el detalle", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenMovimiento = (tipo) => {
    setMovForm({ ...emptyMovForm, tipo_movimiento: tipo });
    setMovDialogOpen(true);
  };

  const handleSaveMovimiento = async () => {
    if (!movForm.fecha || !movForm.bank_account || (!movForm.mto_principal && !movForm.mto_interes)) {
      showAlert("Complete la fecha, la cuenta bancaria y al menos un monto", "error");
      return;
    }

    try {
      setMovSaving(true);
      await API.post(`${API_URL}/${detail.obligacion.id}/movimientos`, {
        tipo_movimiento: movForm.tipo_movimiento,
        fecha: movForm.fecha,
        mto_principal: Number(movForm.mto_principal || 0),
        mto_interes: Number(movForm.mto_interes || 0),
        gl_bank_account_id: movForm.bank_account.id,
      });

      showAlert(`${movForm.tipo_movimiento === "DESEMBOLSO" ? "Desembolso" : "Pago"} registrado correctamente`);
      setMovDialogOpen(false);
      handleOpenDetail(detail.obligacion);
      fetchObligaciones();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al registrar el movimiento", "error");
    } finally {
      setMovSaving(false);
    }
  };

  const handleVoidMovimiento = async (mov) => {
    const confirmed = window.confirm(`¿Confirma anular el movimiento del ${String(mov.fecha).slice(0, 10)} por C$/US$ ${money(Number(mov.mto_principal) + Number(mov.mto_interes))}?`);
    if (!confirmed) return;

    try {
      await API.put(`${API_URL}/movimientos/${mov.id}/void`, {});
      showAlert("Movimiento anulado correctamente");
      handleOpenDetail(detail.obligacion);
      fetchObligaciones();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al anular el movimiento", "error");
    }
  };

  const columns = useMemo(() => [
    { field: "id_obligacion", headerName: "Obligación", width: 140 },
    { field: "financiador_name", headerName: "Financiador", flex: 1, minWidth: 180 },
    { field: "gl_muc_code", headerName: "Cuenta contable", width: 220, renderCell: (p) => `${p.row.gl_muc_code} - ${p.row.gl_account_name}` },
    { field: "mto_aprobado", headerName: "Monto aprobado", width: 150, renderCell: (p) => money(p.value) },
    { field: "current_balance", headerName: "Saldo", width: 140, renderCell: (p) => money(p.value) },
    { field: "tasa_contrato", headerName: "Tasa", width: 90, renderCell: (p) => `${p.value}%` },
    { field: "fecha_vcto", headerName: "Vencimiento", width: 120, renderCell: (p) => String(p.value).slice(0, 10) },
    {
      field: "status",
      headerName: "Estado",
      width: 110,
      renderCell: (p) => <Chip size="small" color={p.value === "ACTIVA" ? "success" : "default"} label={p.value === "ACTIVA" ? "Activa" : "Cancelada"} />,
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Tooltip title="Ver detalle">
          <IconButton size="small" onClick={() => handleOpenDetail(params.row)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <RequestQuoteIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Obligaciones Financieras</Typography>
              <Typography variant="body2" color="text.secondary">
                Deuda de la institución con sus financiadores
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
              Nueva obligación
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchObligaciones}>
              Actualizar
            </Button>
          </Box>
        </Box>

        <Box sx={{ height: 560, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            disableRowSelectionOnClick
            sx={{
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F8FAFC", fontWeight: 700 },
            }}
          />
        </Box>
      </Paper>

      {/* Alta de obligación */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva obligación</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={financiadores}
                value={form.financiador}
                getOptionLabel={(o) => o.name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, financiador: value }))}
                renderInput={(params) => <TextField {...params} label="Financiador" />}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={lineas.filter((l) => !form.financiador || l.financiador_id === form.financiador.id)}
                value={form.linea}
                getOptionLabel={(o) => o.id_linea || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, linea: value }))}
                renderInput={(params) => <TextField {...params} label="Línea de crédito (opcional)" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Identificador de la obligación"
                value={form.id_obligacion}
                onChange={(e) => setForm((f) => ({ ...f, id_obligacion: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Nombre del fondo (opcional)"
                value={form.nombre_fondo}
                onChange={(e) => setForm((f) => ({ ...f, nombre_fondo: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="number" label="Monto aprobado"
                value={form.mto_aprobado}
                onChange={(e) => setForm((f) => ({ ...f, mto_aprobado: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="number" label="Tasa contractual anual (%)"
                value={form.tasa_contrato}
                onChange={(e) => setForm((f) => ({ ...f, tasa_contrato: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="date" label="Fecha de otorgamiento" InputLabelProps={{ shrink: true }}
                value={form.fecha_otorgamiento}
                onChange={(e) => setForm((f) => ({ ...f, fecha_otorgamiento: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="date" label="Fecha de vencimiento" InputLabelProps={{ shrink: true }}
                value={form.fecha_vcto}
                onChange={(e) => setForm((f) => ({ ...f, fecha_vcto: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="number" label="Cantidad de cuotas mensuales"
                value={form.cantidad_cuotas}
                onChange={(e) => setForm((f) => ({ ...f, cantidad_cuotas: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={accounts}
                value={form.gl_account}
                getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, gl_account: value }))}
                renderInput={(params) => <TextField {...params} label="Cuenta contable del pasivo" helperText="Sugerido: 2201.0X (hasta 1 año) / 2202.0X (más de 1 año)" />}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={accounts}
                value={form.gl_interest_expense_account}
                getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, gl_interest_expense_account: value }))}
                renderInput={(params) => <TextField {...params} label="Cuenta de gasto financiero (para pagos con interés)" />}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : "Registrar obligación"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detalle: cronograma + movimientos */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Detalle de la obligación {detail?.obligacion?.id_obligacion || ""}
          {detail?.obligacion?.status === "ACTIVA" && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={() => handleOpenMovimiento("DESEMBOLSO")}>
                Desembolso recibido
              </Button>
              <Button size="small" variant="outlined" color="secondary" startIcon={<PaymentsIcon />} sx={{ textTransform: "none" }} onClick={() => handleOpenMovimiento("PAGO")}>
                Registrar pago
              </Button>
            </Box>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Typography variant="body2">Cargando...</Typography>
          ) : !detail ? (
            <Typography variant="body2">Sin información</Typography>
          ) : (
            <>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 1.5, mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Financiador</Typography>
                  <Typography variant="body2" fontWeight={700}>{detail.obligacion.financiador_name}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Monto aprobado</Typography>
                  <Typography variant="body2" fontWeight={700}>{money(detail.obligacion.mto_aprobado)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Saldo actual</Typography>
                  <Typography variant="body2" fontWeight={700}>{money(detail.obligacion.current_balance)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Tasa contractual</Typography>
                  <Typography variant="body2" fontWeight={700}>{detail.obligacion.tasa_contrato}%</Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Movimientos</Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Principal</TableCell>
                    <TableCell align="right">Interés</TableCell>
                    <TableCell>Comprobante</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.movimientos.map((mov) => (
                    <TableRow key={mov.id} sx={{ opacity: mov.status === "VOID" ? 0.5 : 1 }}>
                      <TableCell>{String(mov.fecha).slice(0, 10)}</TableCell>
                      <TableCell>{mov.tipo_movimiento === "DESEMBOLSO" ? "Desembolso" : "Pago"}</TableCell>
                      <TableCell align="right">{money(mov.mto_principal)}</TableCell>
                      <TableCell align="right">{money(mov.mto_interes)}</TableCell>
                      <TableCell>{mov.entry_no}</TableCell>
                      <TableCell>
                        {mov.status === "VOID" ? <Chip size="small" label="Anulado" /> : <Chip size="small" color="success" label="Aplicado" />}
                      </TableCell>
                      <TableCell align="right">
                        {mov.status === "POSTED" && (
                          <Tooltip title="Anular">
                            <IconButton size="small" color="error" onClick={() => handleVoidMovimiento(mov)}>
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!detail.movimientos.length && (
                    <TableRow><TableCell colSpan={7}><Typography variant="body2" color="text.secondary">Sin movimientos registrados</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Cronograma de pago</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="right">Principal</TableCell>
                    <TableCell align="right">Interés</TableCell>
                    <TableCell align="right">Principal pagado</TableCell>
                    <TableCell align="right">Interés pagado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.cuotas.map((cuota) => (
                    <TableRow key={cuota.id}>
                      <TableCell>{cuota.payment_number}</TableCell>
                      <TableCell>{String(cuota.payment_date).slice(0, 10)}</TableCell>
                      <TableCell align="right">{money(cuota.payment_principal)}</TableCell>
                      <TableCell align="right">{money(cuota.payment_interest)}</TableCell>
                      <TableCell align="right">{money(cuota.paid_principal)}</TableCell>
                      <TableCell align="right">{money(cuota.paid_interest)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Registrar movimiento */}
      <Dialog open={movDialogOpen} onClose={() => setMovDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{movForm.tipo_movimiento === "DESEMBOLSO" ? "Registrar desembolso recibido" : "Registrar pago"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                select fullWidth size="small" label="Tipo de movimiento"
                value={movForm.tipo_movimiento}
                onChange={(e) => setMovForm((f) => ({ ...f, tipo_movimiento: e.target.value }))}
              >
                <MenuItem value="DESEMBOLSO">Desembolso recibido</MenuItem>
                <MenuItem value="PAGO">Pago realizado</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
                value={movForm.fecha}
                onChange={(e) => setMovForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={bankAccounts}
                value={movForm.bank_account}
                getOptionLabel={(o) => `${o.bank_name} - ${o.account_alias}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setMovForm((f) => ({ ...f, bank_account: value }))}
                renderInput={(params) => <TextField {...params} label="Cuenta bancaria" />}
              />
            </Grid>
            <Grid item xs={12} sm={movForm.tipo_movimiento === "PAGO" ? 6 : 12}>
              <TextField
                fullWidth size="small" type="number" label="Monto principal"
                value={movForm.mto_principal}
                onChange={(e) => setMovForm((f) => ({ ...f, mto_principal: e.target.value }))}
              />
            </Grid>
            {movForm.tipo_movimiento === "PAGO" && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth size="small" type="number" label="Monto de interés"
                  value={movForm.mto_interes}
                  onChange={(e) => setMovForm((f) => ({ ...f, mto_interes: e.target.value }))}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveMovimiento} disabled={movSaving} sx={{ textTransform: "none" }}>
            {movSaving ? "Guardando..." : "Registrar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
