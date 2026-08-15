// src/components/assistant/AssistantChat.jsx
//
// Widget de chat flotante del asistente de IA. Se monta sobre todas las
// pantallas autenticadas. Habla con POST /api/assistant/chat, que resuelve la
// consulta con Claude + herramientas tenant-scoped en el backend.

import React, { useState, useRef, useEffect } from "react";
import {
  Fab,
  Paper,
  Box,
  Typography,
  IconButton,
  TextField,
  CircularProgress,
  Avatar,
  Fade,
  Tooltip,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import PersonIcon from "@mui/icons-material/Person";
import API from "../../api";

const SUGERENCIAS = [
  "¿Cuál es la cartera total y el % de mora de la empresa?",
  "Dame el saldo y los créditos del cliente Juan Pérez",
  "¿Cómo viene pagando el cliente con cédula 001-...?",
  "¿Cuánto se ha desembolsado este mes?",
];

function Burbuja({ role, text }) {
  const esUsuario = role === "user";
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        mb: 1.5,
        flexDirection: esUsuario ? "row-reverse" : "row",
        alignItems: "flex-start",
      }}
    >
      <Avatar
        sx={{
          width: 28,
          height: 28,
          bgcolor: esUsuario ? "secondary.main" : "primary.main",
        }}
      >
        {esUsuario ? (
          <PersonIcon sx={{ fontSize: 18 }} />
        ) : (
          <SmartToyIcon sx={{ fontSize: 18 }} />
        )}
      </Avatar>
      <Box
        sx={{
          maxWidth: "78%",
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: esUsuario ? "primary.main" : "action.hover",
          color: esUsuario ? "primary.contrastText" : "text.primary",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 14,
          lineHeight: 1.45,
        }}
      >
        {text}
      </Box>
    </Box>
  );
}

export default function AssistantChat() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]); // {role, content}
  const [entrada, setEntrada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const finRef = useRef(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  const enviar = async (textoManual) => {
    const texto = (textoManual ?? entrada).trim();
    if (!texto || cargando) return;

    setError("");
    const nuevos = [...mensajes, { role: "user", content: texto }];
    setMensajes(nuevos);
    setEntrada("");
    setCargando(true);

    try {
      const { data } = await API.post("/api/assistant/chat", {
        messages: nuevos,
      });
      setMensajes((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "No se pudo contactar al asistente. Intenta de nuevo.";
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <>
      {/* Botón flotante */}
      {!abierto && (
        <Tooltip title="Asistente IA" placement="left">
          <Fab
            color="primary"
            onClick={() => setAbierto(true)}
            sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1300 }}
          >
            <SmartToyIcon />
          </Fab>
        </Tooltip>
      )}

      {/* Panel de chat */}
      <Fade in={abierto} unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1300,
            width: { xs: "calc(100vw - 32px)", sm: 400 },
            height: 560,
            maxHeight: "calc(100vh - 48px)",
            display: "flex",
            flexDirection: "column",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          {/* Encabezado */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <SmartToyIcon />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ lineHeight: 1.1 }}>
                Asistente IA
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Consulta datos del negocio
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setAbierto(false)}
              sx={{ color: "inherit" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Cuerpo de mensajes */}
          <Box sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "background.default" }}>
            {mensajes.length === 0 && (
              <Box sx={{ color: "text.secondary" }}>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  Hola 👋 Pregúntame sobre clientes, saldos, comportamiento de
                  pago, gestores o métricas de la empresa.
                </Typography>
                {SUGERENCIAS.map((s) => (
                  <Box
                    key={s}
                    onClick={() => enviar(s)}
                    sx={{
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      px: 1.25,
                      py: 0.75,
                      mb: 0.75,
                      fontSize: 13,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    {s}
                  </Box>
                ))}
              </Box>
            )}

            {mensajes.map((m, i) => (
              <Burbuja key={i} role={m.role} text={m.content} />
            ))}

            {cargando && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                <CircularProgress size={16} />
                <Typography variant="caption">Consultando…</Typography>
              </Box>
            )}

            {error && (
              <Typography variant="caption" color="error">
                {error}
              </Typography>
            )}

            <div ref={finRef} />
          </Box>

          {/* Entrada */}
          <Box
            sx={{
              p: 1.5,
              borderTop: "1px solid",
              borderColor: "divider",
              display: "flex",
              gap: 1,
              alignItems: "flex-end",
            }}
          >
            <TextField
              fullWidth
              size="small"
              multiline
              maxRows={4}
              placeholder="Escribe tu pregunta…"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={cargando}
            />
            <IconButton
              color="primary"
              onClick={() => enviar()}
              disabled={cargando || !entrada.trim()}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      </Fade>
    </>
  );
}
