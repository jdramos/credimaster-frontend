import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import API from "../../api";

const CustomReportsList = ({ onNew, onEdit, onRun, onDuplicate }) => {
  const [reports, setReports] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/api/custom-reports");

      const data = res.data?.data || [];

      setReports(data);
      setFiltered(data);
    } catch (error) {
      console.error("Error cargando reportes:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "No se pudieron cargar los reportes.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();

    const next = reports.filter((report) =>
      `${report.name || ""} ${report.description || ""} ${
        report.source_key || ""
      }`
        .toLowerCase()
        .includes(term),
    );

    setFiltered(next);
  }, [search, reports]);

  const handleDelete = async (report) => {
    const ok = window.confirm(
      `¿Seguro que deseas eliminar el reporte "${report.name}"?`,
    );

    if (!ok) return;

    try {
      await API.delete(`/api/custom-reports/${report.id}`);
      await loadReports();
    } catch (error) {
      console.error("Error eliminando reporte:", error);
      alert(
        error.response?.data?.message ||
          error.message ||
          "No se pudo eliminar el reporte.",
      );
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={2}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Reportes personalizados
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Administra reportes creados por el usuario.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Buscar reporte"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Button variant="contained" startIcon={<AddIcon />} onClick={onNew}>
              Nuevo
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ overflow: "hidden" }}>
        {loading ? (
          <Stack alignItems="center" sx={{ p: 4 }}>
            <CircularProgress />
          </Stack>
        ) : filtered.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            No hay reportes personalizados registrados.
          </Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Fuente</TableCell>
                <TableCell>Visibilidad</TableCell>
                <TableCell>Orientación</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {report.name}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      ID: {report.id}
                    </Typography>
                  </TableCell>

                  <TableCell>{report.description || "-"}</TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={report.source_key || "-"}
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      color={report.is_public ? "success" : "default"}
                      label={report.is_public ? "Público" : "Privado"}
                    />
                  </TableCell>

                  <TableCell>{report.orientation || "-"}</TableCell>

                  <TableCell align="right">
                    <Tooltip title="Ejecutar">
                      <IconButton onClick={() => onRun?.(report)}>
                        <PlayArrowIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Editar">
                      <IconButton onClick={() => onEdit?.(report)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Duplicar">
                      <IconButton onClick={() => onDuplicate?.(report)}>
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Eliminar">
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(report)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default CustomReportsList;
