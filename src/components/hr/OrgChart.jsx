import React, { useEffect, useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PersonIcon from "@mui/icons-material/Person";
import API from "../../api";
import BAC from "../../styles/bac";

// Organigrama: sin librería de árbol/diagramación instalada en el proyecto
// (ni react-flow, ni react-d3-tree, ni dagre) -- se arma un árbol recursivo
// con Box/Card de MUI puro a partir de supervisor_id, reusando
// GET /api/hr/employees (ya trae supervisor_id/supervisor_name/
// department_name/position_title en un solo array plano, sin necesidad de
// un endpoint nuevo).
const NodeCard = ({ employee, children }) => (
  <Stack alignItems="center" sx={{ px: 1 }}>
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${BAC.border}`,
        bgcolor: BAC.white,
        minWidth: 200,
        textAlign: "center",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
        <PersonIcon sx={{ color: BAC.primary, fontSize: 20 }} />
        <Typography sx={{ fontWeight: 800, color: BAC.text }}>{employee.full_name}</Typography>
      </Stack>
      {employee.position_title && (
        <Typography variant="caption" color="text.secondary" display="block">
          {employee.position_title}
        </Typography>
      )}
      {employee.department_name && (
        <Chip label={employee.department_name} size="small" variant="outlined" sx={{ mt: 0.5 }} />
      )}
    </Paper>

    {children.length > 0 && (
      <>
        <Box sx={{ width: 2, height: 20, bgcolor: BAC.border }} />
        <Stack direction="row" spacing={3} sx={{ pt: 0 }} alignItems="flex-start">
          {children}
        </Stack>
      </>
    )}
  </Stack>
);

export default function OrgChart() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await API.get("/api/hr/employees", { params: { status: "ACTIVO" } });
        setEmployees(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "No se pudo cargar el organigrama.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const { roots, childrenByBoss } = useMemo(() => {
    const idSet = new Set(employees.map((e) => e.id));
    const byBoss = new Map();
    const rootList = [];

    employees.forEach((e) => {
      // Huérfano defensivo: si supervisor_id no resuelve a otro activo
      // (inactivo/eliminado), se muestra como raíz en vez de descartarse.
      const bossId = e.supervisor_id && idSet.has(e.supervisor_id) ? e.supervisor_id : null;
      if (bossId === null) {
        rootList.push(e);
      } else {
        if (!byBoss.has(bossId)) byBoss.set(bossId, []);
        byBoss.get(bossId).push(e);
      }
    });

    return { roots: rootList, childrenByBoss: byBoss };
  }, [employees]);

  const renderNode = (employee, visited) => {
    if (visited.has(employee.id)) return null; // salvaguarda extra ante un ciclo inesperado
    const nextVisited = new Set(visited).add(employee.id);
    const kids = (childrenByBoss.get(employee.id) || []).map((child) => renderNode(child, nextVisited));
    return (
      <NodeCard key={employee.id} employee={employee}>
        {kids.filter(Boolean)}
      </NodeCard>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <AccountTreeIcon sx={{ color: BAC.primary }} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>
                Organigrama
              </Typography>
              <HelpButton screenKey="rrhh.organigrama" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Estructura jerárquica según jefe inmediato de cada empleado activo.
            </Typography>
          </Box>
        </Box>

        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && roots.length === 0 && (
          <Alert severity="info">No hay empleados activos para mostrar.</Alert>
        )}

        {!loading && !error && roots.length > 0 && (
          <Box sx={{ overflowX: "auto", pb: 2 }}>
            <Stack direction="row" spacing={4} alignItems="flex-start" sx={{ minWidth: "fit-content", px: 2 }}>
              {roots.map((r) => renderNode(r, new Set()))}
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
