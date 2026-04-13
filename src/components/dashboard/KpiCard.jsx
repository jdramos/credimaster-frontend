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

export default function KpiCard({
  title,
  value,
  type = "currency",
  subtitle,
  growth,
}) {
  const renderValue = () => {
    if (type === "percent") return formatPercent(value);
    if (type === "number")
      return new Intl.NumberFormat("es-NI").format(Number(value || 0));
    return formatCurrency(value);
  };

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
        height: "100%",
      }}
    >
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>

        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {renderValue()}
        </Typography>

        <Box display="flex" alignItems="center" gap={1}>
          {typeof growth === "number" && (
            <>
              <GrowthIcon sx={{ fontSize: 18, color: growthColor }} />
              <Typography
                variant="body2"
                sx={{ color: growthColor, fontWeight: 600 }}
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
