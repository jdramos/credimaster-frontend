import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Chip, Tooltip } from "@mui/material";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import API from "../../api";
import { BASE } from "./itRiskShared";

const REFRESH_MS = 5 * 60 * 1000;

// Aviso en la barra superior cuando hay incidentes de TI con el aviso a
// CONAMI (Art. 28) pendiente, vencido o por vencer. Lo monta AppLayoutMenu
// solo si el tenant tiene el módulo it_risk y el usuario puede verlo.
export default function ItRiskDeadlineAlert() {
  const location = useLocation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    API.get(`${BASE}/incidents/alerts`)
      .then(({ data }) => {
        if (!cancelled) setAlerts(data);
      })
      .catch(() => {
        if (!cancelled) setAlerts(null);
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, tick]);

  if (!alerts?.total) return null;
  const urgent = alerts.overdue + alerts.initial_pending;
  const label = urgent
    ? `Aviso CONAMI de TI vencido o pendiente (${urgent})`
    : `Aviso CONAMI de TI por vencer (${alerts.due_soon + alerts.detail_pending})`;
  return (
    <Tooltip title={alerts.items.map((a) => `${a.incident_number}: ${a.title}`).join(" · ")}>
      <Chip
        size="small"
        icon={<ReportProblemIcon />}
        color={urgent ? "error" : "warning"}
        label={label}
        onClick={() => navigate("/ti/riesgo/incidentes")}
        sx={{ fontWeight: 700, mx: 0.5 }}
      />
    </Tooltip>
  );
}
