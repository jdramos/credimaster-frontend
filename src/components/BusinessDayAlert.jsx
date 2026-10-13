import React, { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Chip, Tooltip, Typography } from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import dayjs from "dayjs";
import API from "../api";
import { UserContext } from "../contexts/UserContext";

const REFRESH_MS = 5 * 60 * 1000;

// Mismo criterio que la app móvil (useBusinessDayAlerts): una sucursal está
// operativa solo si su día de hoy ya se abrió y está pendiente de cierre.
// Cualquier otro estado bloquea pagos y desembolsos con HTTP 423 en el
// backend (middleware/businessDay.js).
const describe = (st) => {
  const date = dayjs(st.pending_date).format("DD/MM/YYYY");
  if (st.pending_action === "CLOSE" && st.is_backlog) return `Día no aperturado (falta cerrar el ${date})`;
  if (st.pending_action === "OPEN" && st.is_backlog) return `Día no aperturado (pendiente desde el ${date})`;
  return "Día no aperturado";
};

export default function BusinessDayAlert() {
  const { userBranches = [] } = useContext(UserContext) || {};
  const location = useLocation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const branchKey = (userBranches || []).map(Number).sort().join(",");

  useEffect(() => {
    let cancelled = false;

    // Mismo alcance que BranchSelect (Día operativo, pagos, créditos): solo
    // las sucursales asignadas al usuario, aunque sea administrador -- así
    // todo lo que avisa se puede resolver desde el selector. Mientras la
    // sesión aún no carga sus sucursales no se avisa nada.
    if (!branchKey) {
      setAlerts([]);
      return undefined;
    }

    (async () => {
      try {
        // /accessible solo pide sesión válida (a diferencia de /api/branches,
        // que exige permiso de configuración) -- se usa para los nombres.
        const { data } = await API.get("/api/branches/accessible");
        const own = branchKey.split(",").map(Number);
        const branches = (Array.isArray(data?.data) ? data.data : []).filter((b) => own.includes(Number(b.id)));

        const results = await Promise.allSettled(
          branches.map((b) => API.get(`/api/business-day/status/${b.id}`)),
        );
        if (cancelled) return;

        const found = [];
        results.forEach((r, i) => {
          if (r.status !== "fulfilled") return; // sin permiso dia.ver o error: no se avisa
          const st = r.value.data;
          if (!st || (st.pending_action === "CLOSE" && !st.is_backlog)) return;
          found.push({ branch: branches[i].name, text: describe(st) });
        });
        setAlerts(found);
      } catch {
        if (!cancelled) setAlerts([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchKey, location.pathname, tick]);

  if (!alerts.length) return null;

  const label =
    alerts.length === 1
      ? `${alerts[0].text} — ${alerts[0].branch}`
      : `Día no aperturado en ${alerts.length} sucursales`;

  return (
    <Tooltip
      arrow
      title={
        <Box sx={{ p: 0.5 }}>
          {alerts.map((a) => (
            <Typography key={a.branch} fontSize={12}>
              <b>{a.branch}:</b> {a.text}
            </Typography>
          ))}
          <Typography fontSize={11} sx={{ mt: 0.75, opacity: 0.85 }}>
            No se pueden registrar pagos ni desembolsos hasta abrir el día. Clic para ir a Día operativo.
          </Typography>
        </Box>
      }
    >
      <Chip
        icon={<WarningAmberRoundedIcon />}
        label={label}
        color="warning"
        onClick={() => navigate("/cierre-del-dia")}
        sx={{
          fontWeight: 800,
          maxWidth: { xs: 180, sm: 360 },
          "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
        }}
      />
    </Tooltip>
  );
}
