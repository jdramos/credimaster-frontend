import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  CircularProgress,
  ClickAwayListener,
  InputAdornment,
  Paper,
  Popper,
  TextField,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import API from "../api";
import LoanDetailsModal from "./Loan/detail/LoanDetailsModal";

// Búsqueda general de la barra superior (backend: GET /api/search).
// Busca a la vez clientes (nombre, cédula, código, teléfono), créditos
// (número, código, cliente), pagos (número de pago), proveedores y
// empleados -- cada grupo solo aparece si el usuario tiene permiso.
// Atajo: Ctrl+K (o Cmd+K) enfoca el buscador.

const LOAN_STATUS = {
  PENDING: { label: "En revisión", color: "warning" },
  APPROVED: { label: "Aprobado", color: "success" },
  A: { label: "Aprobado", color: "success" },
  REJECTED: { label: "Rechazado", color: "error" },
  DISBURSED: { label: "Desembolsado", color: "info" },
  CANCELLED: { label: "Cancelado", color: "default" },
  DRAFT: { label: "Borrador", color: "warning" },
  WRITTEN_OFF: { label: "Castigado", color: "error" },
};

const GROUP_ICON = {
  customer: <PersonRoundedIcon fontSize="small" />,
  loan: <RequestQuoteRoundedIcon fontSize="small" />,
  payment: <ReceiptLongRoundedIcon fontSize="small" />,
  provider: <StorefrontRoundedIcon fontSize="small" />,
  employee: <BadgeRoundedIcon fontSize="small" />,
};

const money = (v) =>
  `C$ ${Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const normalizeLoanResponse = (resp) => {
  const body = resp?.data;
  if (Array.isArray(body)) return body[0] || null;
  return body?.data || body || null;
};

// Texto principal / secundario / etiqueta de cada resultado.
const describe = (type, it) => {
  switch (type) {
    case "customer":
      return {
        primary: it.customer_name,
        secondary: [it.identification && `Cédula ${it.identification}`, it.cellphone && `Tel. ${it.cellphone}`]
          .filter(Boolean)
          .join(" · "),
        chip: it.active_loans > 0 ? { label: `${it.active_loans} crédito(s) activo(s)`, color: "info" } : null,
      };
    case "loan":
      return {
        primary: `Crédito #${it.credit_code || it.id} — ${it.customer_name || "Sin cliente"}`,
        secondary: [it.identification && `Cédula ${it.identification}`, `Monto ${money(it.amount)}`, `Saldo ${money(it.current_balance)}`]
          .filter(Boolean)
          .join(" · "),
        chip: LOAN_STATUS[it.status] || { label: it.status, color: "default" },
      };
    case "payment":
      return {
        primary: `Pago #${it.id} — ${it.customer_name || "Sin cliente"}`,
        secondary: `${String(it.payment_date || "").slice(0, 10)} · ${money(it.total)} · Crédito #${it.loan_id}`,
        chip: it.payment_status === "A" ? { label: "Activo", color: "success" } : { label: "Anulado", color: "default" },
      };
    case "provider":
      return {
        primary: it.name,
        secondary: [it.ruc && `RUC ${it.ruc}`, it.telephone && `Tel. ${it.telephone}`].filter(Boolean).join(" · "),
        chip: it.is_active ? null : { label: "Inactivo", color: "default" },
      };
    case "employee":
      return {
        primary: it.full_name,
        secondary: [it.position, it.id_card && `Cédula ${it.id_card}`].filter(Boolean).join(" · "),
        chip: it.status === "ACTIVO" ? null : { label: "De baja", color: "default" },
      };
    default:
      return { primary: "", secondary: "" };
  }
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const anchorRef = useRef(null);
  const requestSeq = useRef(0);

  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const [loanModal, setLoanModal] = useState({ open: false, loading: false, loan: null, guarantees: [], client: {} });

  // Lista plana para navegar con flechas.
  const flat = useMemo(() => groups.flatMap((g) => g.items.map((it) => ({ type: g.type, item: it }))), [groups]);

  // Búsqueda con espera de 300 ms; se descartan respuestas viejas.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setGroups([]);
      setLoading(false);
      setError("");
      return undefined;
    }
    setLoading(true);
    const seq = ++requestSeq.current;
    const t = setTimeout(async () => {
      try {
        const { data } = await API.get("/api/search", { params: { q } });
        if (seq !== requestSeq.current) return;
        setGroups(data?.groups || []);
        setError("");
        setActive(0);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        setGroups([]);
        setError(err.response?.data?.message || "No se pudo realizar la búsqueda.");
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Ctrl+K / Cmd+K enfoca el buscador; también "/" cuando no se está
  // escribiendo en un campo.
  useEffect(() => {
    const onKey = (e) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable || /^(input|textarea|select)$/i.test(e.target.tagName));
      const slash = e.key === "/" && !e.ctrlKey && !e.altKey && !e.metaKey && !typing;
      if (slash || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openLoan = useCallback(async (loanId, customerId, identification) => {
    setLoanModal({ open: true, loading: true, loan: null, guarantees: [], client: { id: customerId, identification } });
    try {
      const [loanRes, gRes] = await Promise.all([
        API.get(`/api/loans/${loanId}`),
        customerId ? API.get(`/api/guarantees/${customerId}`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      const loan = normalizeLoanResponse(loanRes);
      if (!loan) throw new Error("No se encontró información del crédito.");
      setLoanModal((m) => ({ ...m, loading: false, loan, guarantees: gRes.data || [] }));
    } catch (err) {
      setLoanModal({ open: false, loading: false, loan: null, guarantees: [], client: {} });
      setError(err.response?.data?.message || err.message || "No se pudo abrir el crédito.");
      setOpen(true);
    }
  }, []);

  const select = useCallback(
    ({ type, item }) => {
      setOpen(false);
      inputRef.current?.blur();
      switch (type) {
        case "customer":
          navigate(`/clientes/ver/${item.id}`);
          break;
        case "loan":
          openLoan(item.id, item.customer_id, item.identification);
          break;
        case "payment":
          openLoan(item.loan_id, item.customer_id, item.identification);
          break;
        case "provider":
          navigate(`/proveedores?buscar=${encodeURIComponent(item.name)}`);
          break;
        case "employee":
          navigate(`/rrhh/empleados?empleado=${item.id}`);
          break;
        default:
      }
    },
    [navigate, openLoan],
  );

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[active]) select(flat[active]);
    }
  };

  const showPanel = open && query.trim().length >= 2;
  let flatIndex = -1;

  return (
    <>
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Box ref={anchorRef} sx={{ display: { xs: "none", sm: "block" } }}>
          <TextField
            inputRef={inputRef}
            size="small"
            type="search"
            placeholder="Buscar cliente, cédula, crédito… (Ctrl+K)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            inputProps={{ "aria-label": "Búsqueda general", autoComplete: "off" }}
            sx={{
              width: { sm: 300, md: 380 },
              "& .MuiOutlinedInput-root": {
                height: 38,
                borderRadius: 2.5,
                bgcolor: "#F8FAFC",
                fontSize: 13,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: loading || loanModal.loading ? (
                <InputAdornment position="end">
                  <CircularProgress size={16} />
                </InputAdornment>
              ) : null,
            }}
          />

          <Popper
            open={showPanel}
            anchorEl={anchorRef.current}
            placement="bottom-end"
            sx={{ zIndex: (t) => t.zIndex.modal + 1 }}
          >
            <Paper
              elevation={8}
              sx={{ mt: 0.75, width: { sm: 420, md: 520 }, maxHeight: "70vh", overflowY: "auto", borderRadius: 2.5, py: 1 }}
            >
              {error && (
                <Typography sx={{ px: 2, py: 1.5 }} color="error" fontSize={13}>
                  {error}
                </Typography>
              )}

              {!error && !loading && !groups.length && (
                <Typography sx={{ px: 2, py: 1.5 }} color="text.secondary" fontSize={13}>
                  Sin resultados para “{query.trim()}”.
                </Typography>
              )}

              {groups.map((g) => (
                <Box key={g.type} sx={{ pb: 0.5 }}>
                  <Typography
                    sx={{ px: 2, pt: 1, pb: 0.5, fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" }}
                    color="text.secondary"
                  >
                    {g.label}
                  </Typography>
                  {g.items.map((it) => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    const d = describe(g.type, it);
                    const isActive = idx === active;
                    return (
                      <Box
                        key={`${g.type}-${it.id}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActive(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => select({ type: g.type, item: it })}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          px: 2,
                          py: 1,
                          cursor: "pointer",
                          bgcolor: isActive ? "action.hover" : "transparent",
                        }}
                      >
                        <Box sx={{ color: "primary.main", display: "flex" }}>{GROUP_ICON[g.type]}</Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontSize={13.5} fontWeight={700} noWrap>
                            {d.primary}
                          </Typography>
                          {d.secondary && (
                            <Typography fontSize={12} color="text.secondary" noWrap>
                              {d.secondary}
                            </Typography>
                          )}
                        </Box>
                        {d.chip && <Chip size="small" label={d.chip.label} color={d.chip.color} variant="outlined" />}
                      </Box>
                    );
                  })}
                </Box>
              ))}

              {!!flat.length && (
                <Typography sx={{ px: 2, pt: 1, fontSize: 11 }} color="text.secondary">
                  ↑ ↓ para moverse · Enter para abrir · Esc para cerrar
                </Typography>
              )}
            </Paper>
          </Popper>
        </Box>
      </ClickAwayListener>

      {loanModal.open && loanModal.loan && (
        <LoanDetailsModal
          open={loanModal.open}
          loan={loanModal.loan}
          guarantees={loanModal.guarantees}
          loading={loanModal.loading}
          clientId={loanModal.client.id}
          clientIdentification={loanModal.client.identification}
          onClose={() => setLoanModal({ open: false, loading: false, loan: null, guarantees: [], client: {} })}
        />
      )}
    </>
  );
}
