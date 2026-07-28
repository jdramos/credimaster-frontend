import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RemoveIcon from "@mui/icons-material/Remove";

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

const PALETTE = {
  primary: { main: "#1565C0", bg: "#E8F1FC" },
  success: { main: "#2E7D32", bg: "#E9F6EB" },
  warning: { main: "#EF6C00", bg: "#FDF0E3" },
  error: { main: "#C62828", bg: "#FBEAEA" },
  info: { main: "#00838F", bg: "#E3F4F5" },
  purple: { main: "#6A1B9A", bg: "#F1E7F7" },
};

export default function KpiCard({
  title,
  value,
  type = "currency",
  subtitle,
  growth,
  icon: Icon,
  color = "primary",
}) {
  const renderValue = () => {
    if (type === "percent") return formatPercent(value);
    if (type === "number")
      return new Intl.NumberFormat("es-NI").format(Number(value || 0));
    return formatCurrency(value);
  };

  const palette = PALETTE[color] || PALETTE.primary;

  const GrowthIcon =
    growth > 0 ? TrendingUpIcon : growth < 0 ? TrendingDownIcon : RemoveIcon;

  const growthColor =
    growth > 0 ? "success.main" : growth < 0 ? "error.main" : "text.secondary";

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        borderLeft: "4px solid",
        borderLeftColor: palette.main,
        height: "100%",
        transition: "box-shadow .15s ease, transform .15s ease",
        "&:hover": {
          boxShadow: "0 6px 18px rgba(15,23,42,.08)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              fontSize: 11,
            }}
          >
            {title}
          </Typography>

          {Icon && (
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                bgcolor: palette.bg,
                color: palette.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon sx={{ fontSize: 18 }} />
            </Box>
          )}
        </Box>

        <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
          {renderValue()}
        </Typography>

        <Box display="flex" alignItems="center" gap={1} sx={{ minHeight: 20 }}>
          {typeof growth === "number" && (
            <>
              <GrowthIcon sx={{ fontSize: 16, color: growthColor }} />
              <Typography
                variant="caption"
                sx={{ color: growthColor, fontWeight: 700 }}
              >
                {formatPercent(growth)}
              </Typography>
            </>
          )}

          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
