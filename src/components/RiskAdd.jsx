import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

const baseUrl = process.env.REACT_APP_API_BASE_URL + "/api/risks";
const token = process.env.REACT_APP_API_TOKEN;

export default function RiskForm() {
  const { riskId } = useParams();          // si existe → EDIT
  const isEdit = Boolean(riskId);
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [fromRange, setFromRange] = useState("");
  const [toRange, setToRange] = useState("");
  const [value, setValue] = useState("");
  const [color, setColor] = useState("#00ff00");

  /* ===============================
     CARGA DE DATOS (EDIT)
     =============================== */

  // 1) Si viene desde el listado con state
  useEffect(() => {
    if (isEdit && location.state?.risk) {
      const r = location.state.risk;
      setName(r.risk_name ?? r.name ?? "");
      setFromRange(r.from_range ?? "");
      setToRange(r.to_range ?? "");
      setValue(r.value ?? "");
      setColor(r.color ?? "#00ff00");
    }
  }, [isEdit, location.state]);

  // 2) Si entra directo por URL
  useEffect(() => {
    const fetchRisk = async () => {
      if (!isEdit) return;
      if (location.state?.risk) return;

      try {
        setLoading(true);
        const resp = await fetch(`${baseUrl}/${riskId}`, {
          headers: { Authorization: token },
        });

        if (!resp.ok) throw new Error(await resp.text());

        const data = await resp.json();
        const r = Array.isArray(data) ? data[0] : data;

        if (!r) {
          setError("Riesgo no encontrado");
          return;
        }

        setName(r.risk_name ?? r.name ?? "");
        setFromRange(r.from_range ?? "");
        setToRange(r.to_range ?? "");
        setValue(r.value ?? "");
        setColor(r.color ?? "#00ff00");
      } catch (e) {
        console.error(e);
        setError("Error cargando el riesgo");
      } finally {
        setLoading(false);
      }
    };

    fetchRisk();
  }, [riskId, isEdit, location.state]);

  /* ===============================
     SUBMIT (INSERT / UPDATE)
     =============================== */

  const onSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!name) return setError("El nombre es requerido");
    if (fromRange === "" || toRange === "" || value === "")
      return setError("Desde, Hasta y Valor son requeridos");

    if (Number(fromRange) > Number(toRange)) {
      return setError("El rango 'Desde' no puede ser mayor que 'Hasta'");
    }

    try {
      setLoading(true);
      setError(null);

      const method = isEdit ? "PUT" : "POST";
      const endpoint = isEdit ? `${baseUrl}/${riskId}` : baseUrl;

      const body = {
        name,
        from_range: Number(fromRange),
        to_range: Number(toRange),
        value: Number(value),
        color,
      };

      const resp = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error(await resp.text());

      navigate("/riesgos");
    } catch (e) {
      console.error(e);
      setError("No se pudo guardar el riesgo");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     UI
     =============================== */

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", mt: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {isEdit ? "Editar riesgo" : "Agregar riesgo"}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <Box sx={{ display: "grid", gap: 2 }}>
            <TextField
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />

            <TextField
              label="Desde"
              value={fromRange}
              onChange={(e) => setFromRange(e.target.value)}
              required
              inputMode="numeric"
              fullWidth
            />

            <TextField
              label="Hasta"
              value={toRange}
              onChange={(e) => setToRange(e.target.value)}
              required
              inputMode="numeric"
              fullWidth
            />

            <TextField
              label="Valor"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              inputMode="decimal"
              fullWidth
            />

            {/* 🎨 SELECTOR DE COLOR (MISMO PARA INSERT Y EDIT) */}
            <TextField
              label="Color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{
                "& input": {
                  height: 48,
                  padding: 0,
                  cursor: "pointer",
                },
              }}
            />

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 1 }}>
              <Button
                variant="outlined"
                onClick={() => navigate("/riesgos")}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {isEdit ? "Guardar cambios" : "Crear"}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
