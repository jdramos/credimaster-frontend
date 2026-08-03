import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import VisibilityIcon from "@mui/icons-material/Visibility";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PostingRuns() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canPost = role === 1 || permissions.includes("contabilidad.asientos.crear");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [pending, setPending] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLabel, setDetailLabel] = useState("");
  const [detailRows, setDetailRows] = useState([]);

  const [form, setForm] = useState({
    from_date: "",
    to_date: "",
    operation_type: "PAYMENT",
    posting_mode: "SUMMARY",
  });

  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "success") => {
    setAlert({
      open: true,
      severity,
      message,
    });
  };

  const fetchRuns = async () => {
    try {
      setLoading(true);

      const res = await API.get(`/api/accounting/posting-runs`);

      const json = await res.data;
      setRows(json || []);
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    try {
      setLoadingPending(true);

      const res = await API.get(`/api/accounting/pending-operations`);
      setPending(res.data?.data || []);
    } catch (error) {
      console.error("Error cargando operaciones pendientes:", error);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    fetchPending();
  }, []);

  const openDetail = async (operationType, label) => {
    setDetailOpen(true);
    setDetailLabel(label);
    setDetailLoading(true);
    setDetailRows([]);

    try {
      const res = await API.get(`/api/accounting/pending-operations/${operationType}`);
      setDetailRows(res.data?.data || []);
    } catch (error) {
      showAlert(
        error.response?.data?.message || "No se pudo cargar el detalle",
        "error",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePost = async () => {
    try {
      if (!form.from_date || !form.to_date) {
        showAlert("Debe seleccionar rango de fechas", "warning");
        return;
      }

      setPosting(true);

      const res = await API.post(`/api/accounting/post-operations`, form);
      const json = res.data;

      if (!json.ok) {
        throw new Error(json.message || "Error contabilizando");
      }

      showAlert(json.message || "Contabilización realizada");

      fetchRuns();
      fetchPending();
    } catch (error) {
      showAlert(
        error.response?.data?.message || error.message,
        "error",
      );
    } finally {
      setPosting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "id",
        headerName: "Run",
        width: 90,
      },
      {
        field: "from_date",
        headerName: "Desde",
        width: 120,
        valueGetter: (params) =>
          params.value ? String(params.value).substring(0, 10) : "",
      },
      {
        field: "to_date",
        headerName: "Hasta",
        width: 120,
        valueGetter: (params) =>
          params.value ? String(params.value).substring(0, 10) : "",
      },
      {
        field: "operation_type",
        headerName: "Operación",
        width: 180,
      },
      {
        field: "posting_mode",
        headerName: "Modo",
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            color={params.value === "SUMMARY" ? "primary" : "secondary"}
            label={params.value === "SUMMARY" ? "Resumido" : "Detallado"}
          />
        ),
      },
      {
        field: "total_operations",
        headerName: "Operaciones",
        width: 130,
      },
      {
        field: "total_debit",
        headerName: "Débito",
        width: 140,
        valueFormatter: (params) =>
          Number(params.value || 0).toLocaleString("es-NI", {
            minimumFractionDigits: 2,
          }),
      },
      {
        field: "total_credit",
        headerName: "Crédito",
        width: 140,
        valueFormatter: (params) =>
          Number(params.value || 0).toLocaleString("es-NI", {
            minimumFractionDigits: 2,
          }),
      },
      {
        field: "entry_no",
        headerName: "Comprobante",
        width: 170,
        renderCell: (params) => params.value || "-",
      },
      {
        field: "status",
        headerName: "Estado",
        width: 130,
        renderCell: (params) => {
          const status = params.value || "POSTED";

          if (status === "ERROR") {
            return <Chip size="small" color="error" label="Error" />;
          }

          if (status === "VOID") {
            return <Chip size="small" color="warning" label="Anulado" />;
          }

          return <Chip size="small" color="success" label="Contabilizado" />;
        },
      },
    ],
    [],
  );

  return (
    <Box sx={{ p: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: "1px solid #E5E7EB",
          background: "#fff",
        }}
      >
        <Box
          sx={{
            mb: 2,
            display: "flex",
            gap: 1,
            alignItems: "center",
          }}
        >
          <AutoFixHighIcon sx={{ color: "#0057B8" }} />

          <Box>
            <Typography variant="h6" fontWeight={700}>
              Contabilizar operaciones
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Generación automática de comprobantes
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <PendingActionsIcon fontSize="small" sx={{ color: "#D97706" }} />
            <Typography variant="subtitle2" fontWeight={700}>
              Operaciones pendientes de contabilizar
            </Typography>
          </Stack>

          <Grid container spacing={1}>
            {pending.map((p) => (
              <Grid item xs={6} sm={4} md={2} key={p.operation_type}>
                <Paper
                  variant="outlined"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, operation_type: p.operation_type }))
                  }
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    cursor: "pointer",
                    borderColor: p.count > 0 ? "#F59E0B" : "#E5E7EB",
                    bgcolor: p.count > 0 ? "#FFFBEB" : "#fff",
                    "&:hover": { borderColor: "#D97706" },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {p.label}
                    </Typography>

                    {p.count > 0 && (
                      <Tooltip title="Ver detalle">
                        <IconButton
                          size="small"
                          sx={{ p: 0.25, mt: -0.5, mr: -0.5 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(p.operation_type, p.label);
                          }}
                        >
                          <VisibilityIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>

                  <Typography variant="h6" fontWeight={900}>
                    {p.count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    C$ {formatMoney(p.total_amount)}
                  </Typography>
                </Paper>
              </Grid>
            ))}

            {!loadingPending && !pending.length && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  No hay operaciones pendientes de contabilizar.
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>

        <Box
          sx={{
            mb: 2,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "180px 180px 220px 180px 150px",
            },
            gap: 1,
          }}
        >
          <TextField
            size="small"
            label="Desde"
            type="date"
            value={form.from_date}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                from_date: e.target.value,
              }))
            }
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            size="small"
            label="Hasta"
            type="date"
            value={form.to_date}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                to_date: e.target.value,
              }))
            }
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            size="small"
            label="Operación"
            value={form.operation_type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                operation_type: e.target.value,
              }))
            }
          >
            <MenuItem value="PAYMENT">Pagos</MenuItem>

            <MenuItem value="LOAN_DISBURSEMENT">Desembolsos</MenuItem>

            <MenuItem value="INTEREST_ACCRUAL">Devengo de intereses</MenuItem>

            <MenuItem value="PROVISION">Provisiones</MenuItem>

            <MenuItem value="DEFAULT_INTEREST">Mora</MenuItem>

            <MenuItem value="WRITEOFF">Castigos</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Modo"
            value={form.posting_mode}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                posting_mode: e.target.value,
              }))
            }
          >
            <MenuItem value="SUMMARY">Resumido</MenuItem>

            <MenuItem value="DETAILED">Detallado</MenuItem>
          </TextField>

          {canPost && (
            <Button
              variant="contained"
              disabled={posting}
              onClick={handlePost}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                background: "#0057B8",
                "&:hover": {
                  background: "#003E8A",
                },
              }}
            >
              Contabilizar
            </Button>
          )}
        </Box>

        <Box sx={{ height: 620 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 25,
                  page: 0,
                },
              },
            }}
            disableRowSelectionOnClick
            sx={{
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#F8FAFC",
                fontWeight: 700,
              },
            }}
          />
        </Box>
      </Paper>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() =>
          setAlert((prev) => ({
            ...prev,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Alert
          severity={alert.severity}
          onClose={() =>
            setAlert((prev) => ({
              ...prev,
              open: false,
            }))
          }
        >
          {alert.message}
        </Alert>
      </Snackbar>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Pendientes — {detailLabel}</DialogTitle>

        <DialogContent dividers>
          {detailLoading && (
            <Typography variant="body2" color="text.secondary">
              Cargando...
            </Typography>
          )}

          {!detailLoading && !detailRows.length && (
            <Typography variant="body2" color="text.secondary">
              No hay operaciones pendientes de este tipo.
            </Typography>
          )}

          {!detailLoading && !!detailRows.length && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Crédito</TableCell>
                    <TableCell>Sucursal</TableCell>
                    <TableCell align="right">Monto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailRows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.date ? String(r.date).substring(0, 10) : "-"}</TableCell>
                      <TableCell>{r.customer_name || "-"}</TableCell>
                      <TableCell>{r.credit_code || "-"}</TableCell>
                      <TableCell>{r.branch_name || "-"}</TableCell>
                      <TableCell align="right">C$ {formatMoney(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
