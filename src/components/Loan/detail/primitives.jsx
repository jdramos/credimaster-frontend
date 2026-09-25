import React from "react";
import {
  Typography,
  Chip,
  Stack,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export const HeaderBar = styled("div")(({ theme }) => ({
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(1.25, 2),
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}));

export const HeaderLeft = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.25),
}));

export const Muted = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const CompactCard = ({ children, sx = {} }) => (
  <Card
    elevation={0}
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 2,
      ...sx,
    }}
  >
    <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
      {children}
    </CardContent>
  </Card>
);

// `onChange` es opcional y solo lo usa la sección de historial de pagos
// (carga perezosa al expandir). Sin él, el acordeón se comporta exactamente
// igual que antes (no controlado).
export const CompactAccordion = ({
  title,
  chip,
  defaultExpanded = false,
  onChange,
  children,
}) => (
  <Accordion
    defaultExpanded={defaultExpanded}
    onChange={onChange}
    disableGutters
    elevation={0}
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: "10px !important",
      overflow: "hidden",
      mb: 1,
      "&::before": { display: "none" },
    }}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      sx={{
        minHeight: 44,
        px: 1.5,
        "& .MuiAccordionSummary-content": {
          my: 0.75,
          alignItems: "center",
        },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography sx={{ fontWeight: 900, fontSize: 14 }}>{title}</Typography>
        {chip}
      </Stack>
    </AccordionSummary>

    <AccordionDetails sx={{ p: 1.5, pt: 0 }}>{children}</AccordionDetails>
  </Accordion>
);

export const formatMoney = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const Pill = ({ status }) => {
  const s = String(status || "").toUpperCase();

  if (s === "APPROVED") {
    return (
      <Chip
        icon={<CheckCircleIcon fontSize="small" />}
        label="Aprobado"
        color="success"
        size="small"
        variant="filled"
      />
    );
  }

  if (s === "REJECTED") {
    return (
      <Chip
        icon={<CancelIcon fontSize="small" />}
        label="Rechazado"
        color="error"
        size="small"
        variant="filled"
      />
    );
  }

  return (
    <Chip
      icon={<HourglassEmptyIcon fontSize="small" />}
      label="Pendiente"
      color="warning"
      size="small"
      variant="filled"
    />
  );
};

export const ComplianceChip = ({ ok, label, icon }) => (
  <Chip
    icon={ok ? <CheckCircleIcon /> : icon || <CancelIcon />}
    label={label}
    color={ok ? "success" : "error"}
    variant={ok ? "filled" : "outlined"}
    size="small"
    sx={{
      width: "100%",
      justifyContent: "flex-start",
      "& .MuiChip-label": {
        width: "100%",
        textAlign: "left",
        fontSize: 12,
      },
    }}
  />
);
