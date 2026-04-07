import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import API from "../../api";
import ClaimAddModal from "./ClaimAddModal";
import ClaimDetailModal from "./ClaimDetailModal";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "RECIBIDO", label: "Recibido" },
  { value: "EN_ANALISIS", label: "En análisis" },
  { value: "PENDIENTE_CLIENTE", label: "Pendiente cliente" },
  { value: "RESPONDIDO", label: "Respondido" },
  { value: "CERRADO", label: "Cerrado" },
  { value: "RECHAZADO", label: "Rechazado" },
];

const getStatusColor = (status) => {
  switch (status) {
    case "RECIBIDO":
      return "default";
    case "EN_ANALISIS":
      return "info";
    case "PENDIENTE_CLIENTE":
      return "warning";
    case "RESPONDIDO":
      return "success";
    case "CERRADO":
      return "success";
    case "RECHAZADO":
      return "error";
    default:
      return "default";
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case "BAJA":
      return "default";
    case "MEDIA":
      return "info";
    case "ALTA":
      return "warning";
    case "CRITICA":
      return "error";
    default:
      return "default";
  }
};

export default function CustomerClaimsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState(null);

  const fetchClaims = async () => {
    try {
      setLoading(true);

      const params = {};
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();

      const res = await API.get("/api/customer-claims", { params });
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      console.error("Error cargando reclamos:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [status]);

  const summary = useMemo(() => {
    return {
      total: rows.length,
      recibidos: rows.filter((r) => r.status === "RECIBIDO").length,
      analisis: rows.filter((r) => r.status === "EN_ANALISIS").length,
      pendientes: rows.filter((r) => r.status === "PENDIENTE_CLIENTE").length,
      cerrados: rows.filter((r) => r.status === "CERRADO").length,
    };
  }, [rows]);

  const handleOpenDetail = (id) => {
    setSelectedClaimId(id);
    setOpenDetail(true);
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          border: "1px solid #E6EAF2",
          background: "linear-gradient(135deg, #0057B8 0%, #003E8A 100%)",
          color: "#fff",
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          Reclamos de clientes
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Registro, seguimiento y respuesta de reclamos
        </Typography>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={2.4}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="caption">Total</Typography>
            <Typography variant="h6" fontWeight={700}>
              {summary.total}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="caption">Recibidos</Typography>
            <Typography variant="h6" fontWeight={700}>
              {summary.recibidos}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="caption">En análisis</Typography>
            <Typography variant="h6" fontWeight={700}>
              {summary.analisis}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="caption">Pendiente cliente</Typography>
            <Typography variant="h6" fontWeight={700}>
              {summary.pendientes}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="caption">Cerrados</Typography>
            <Typography variant="h6" fontWeight={700}>
              {summary.cerrados}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Buscar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchClaims()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                justifyContent: { xs: "stretch", md: "flex-end" },
              }}
            >
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchClaims}
              >
                Actualizar
              </Button>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenAdd(true)}
              >
                Nuevo reclamo
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "140px 120px 1.2fr 1fr 140px 140px 110px 90px",
            gap: 1,
            px: 2,
            py: 1.5,
            bgcolor: "#F7F9FC",
            borderBottom: "1px solid #E6EAF2",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <Box>Código</Box>
          <Box>Fecha</Box>
          <Box>Cliente</Box>
          <Box>Asunto</Box>
          <Box>Estado</Box>
          <Box>Prioridad</Box>
          <Box>Tipo</Box>
          <Box>Acción</Box>
        </Box>

        {rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">
              {loading ? "Cargando..." : "No hay reclamos para mostrar."}
            </Typography>
          </Box>
        ) : (
          rows.map((row, idx) => (
            <Box key={row.id}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns:
                    "140px 120px 1.2fr 1fr 140px 140px 110px 90px",
                  gap: 1,
                  px: 2,
                  py: 1.5,
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {row.claim_code}
                </Typography>

                <Typography variant="body2">
                  {row.created_at?.slice(0, 10) || ""}
                </Typography>

                <Typography variant="body2">
                  {row.customer_name || `Cliente #${row.customer_id}`}
                </Typography>

                <Typography variant="body2">{row.subject}</Typography>

                <Chip
                  size="small"
                  label={row.status}
                  color={getStatusColor(row.status)}
                />

                <Chip
                  size="small"
                  label={row.priority}
                  color={getPriorityColor(row.priority)}
                  variant="outlined"
                />

                <Typography variant="body2">{row.claim_type}</Typography>

                <Tooltip title="Ver detalle">
                  <IconButton onClick={() => handleOpenDetail(row.id)}>
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              {idx < rows.length - 1 && <Divider />}
            </Box>
          ))
        )}
      </Paper>

      <ClaimAddModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSaved={fetchClaims}
      />

      <ClaimDetailModal
        open={openDetail}
        claimId={selectedClaimId}
        onClose={() => {
          setOpenDetail(false);
          setSelectedClaimId(null);
        }}
        onUpdated={fetchClaims}
      />
    </Box>
  );
}
