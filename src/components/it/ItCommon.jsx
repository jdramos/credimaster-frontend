import React from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import HelpButton from "../help/HelpButton";
import { STATE_CHIP } from "./itShared";

export function PageHeader({ title, subtitle, helpKey, actions }) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h5" fontWeight={800}>{title}</Typography>
          {helpKey && <HelpButton screenKey={helpKey} />}
        </Stack>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{actions}</Stack>}
    </Stack>
  );
}

export function StateChip({ state, label, suffix }) {
  if (!state) return null;
  const s = STATE_CHIP[state] || { label: state, color: "default" };
  return <Chip size="small" color={s.color} variant={s.color === "default" ? "outlined" : "filled"} label={`${label || s.label}${suffix ? ` ${suffix}` : ""}`} />;
}

export function Kpi({ label, value, hint, color, onClick }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: "100%", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={800} color={color || "text.primary"}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Paper>
  );
}

export const Field = ({ label, children }) => (
  <Box sx={{ mb: 1 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{children || "—"}</Typography>
  </Box>
);
