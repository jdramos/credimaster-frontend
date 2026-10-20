import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { toast } from "react-toastify";
import { UserContext } from "../contexts/UserContext";
import MfaEnrollPanel from "../components/security/MfaEnrollPanel";
import RecoveryCodesPanel from "../components/security/RecoveryCodesPanel";
import {
  apiErrorMessage,
  confirmEnrollment,
  disableMfa,
  getMfaPolicy,
  getMfaStatus,
  getMfaUsers,
  regenerateRecoveryCodes,
  resetUserMfa,
  revokeAllTrustedDevices,
  revokeTrustedDevice,
  startEnrollment,
  updateMfaPolicy,
} from "../api/mfa";

const ADMIN_ROLE_ID = 1;

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("es-NI", { dateStyle: "medium", timeStyle: "short" });
};

// Diálogo que pide el código de la app (y opcionalmente la contraseña).
function CodeDialog({ open, title, description, askPassword, confirmLabel, onClose, onSubmit }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCode("");
      setPassword("");
      setError(null);
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ code: code.trim(), password });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {description && (
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
              {description}
            </Typography>
          )}
          {askPassword && (
            <TextField
              label="Contraseña actual"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="dense"
              autoComplete="current-password"
            />
          )}
          <TextField
            label={askPassword ? "Código de la app o de recuperación" : "Código de la app (6 dígitos)"}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            fullWidth
            margin="dense"
            autoComplete="one-time-code"
            inputProps={{ "aria-label": "Código de verificación" }}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={saving || !code.trim() || (askPassword && !password)}>
            {confirmLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// "Mi cuenta": estado, configuración, códigos, equipos de confianza.
export function MyMfaPanel({ platform = false }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [newCodes, setNewCodes] = useState(null);
  const [dialog, setDialog] = useState(null); // 'regenerate' | 'disable'

  const load = useCallback(async () => {
    try {
      setError(null);
      setStatus(await getMfaStatus(platform));
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo cargar el estado de seguridad."));
    }
  }, [platform]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!status) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (newCodes) {
    return (
      <Card variant="outlined" sx={{ maxWidth: 520 }}>
        <CardContent>
          <RecoveryCodesPanel
            codes={newCodes}
            doneLabel="Listo"
            onDone={() => {
              setNewCodes(null);
              load();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (enrolling) {
    return (
      <Card variant="outlined" sx={{ maxWidth: 520 }}>
        <CardContent>
          <MfaEnrollPanel
            start={() => startEnrollment(platform)}
            confirm={(code) => confirmEnrollment(platform, code)}
            onEnrolled={(data) => {
              setEnrolling(false);
              setNewCodes(data.recovery_codes);
              toast.success("Verificación en dos pasos activada");
            }}
            onCancel={() => setEnrolling(false)}
          />
        </CardContent>
      </Card>
    );
  }

  const canEnroll = status.feature_enabled && status.server_configured && !status.exempt_reason;

  return (
    <Stack spacing={2} sx={{ maxWidth: 720 }}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Verificación en dos pasos (aplicación autenticadora)
            </Typography>
            {status.enrolled ? (
              <Chip size="small" color="success" label="Activa" />
            ) : (
              <Chip size="small" label="No configurada" />
            )}
            {status.required && <Chip size="small" color="warning" variant="outlined" label="Obligatoria para su rol" />}
          </Stack>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            Además de su contraseña, al iniciar sesión se le pedirá un código de 6 dígitos de Google Authenticator,
            Microsoft Authenticator o Authy.
          </Typography>

          {status.exempt_reason === "COLLECTOR" && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Su usuario está vinculado a un cobrador (app móvil): no usa verificación en dos pasos.
            </Alert>
          )}
          {!platform && !status.feature_enabled && !status.exempt_reason && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Su empresa aún no tiene habilitada la verificación en dos pasos. Un administrador puede activarla en la
              pestaña “Política de la empresa”.
            </Alert>
          )}
          {!status.server_configured && !status.enrolled && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              El servidor no tiene configurada la llave de cifrado de 2FA. Contacte a soporte.
            </Alert>
          )}
          {status.locked && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Su verificación está bloqueada temporalmente por códigos incorrectos.
            </Alert>
          )}

          {status.enrolled ? (
            <>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Activa desde: <b>{formatDate(status.enrolled_at)}</b>
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Códigos de recuperación disponibles: <b>{status.recovery_codes_remaining}</b>
              </Typography>
              {status.recovery_codes_remaining <= 3 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Le quedan pocos códigos de recuperación. Genere nuevos y guárdelos.
                </Alert>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
                <Button variant="outlined" onClick={() => setDialog("regenerate")}>
                  Generar nuevos códigos de recuperación
                </Button>
                <Tooltip title={status.required ? "Su rol la requiere; un administrador puede restablecerla." : ""}>
                  <span>
                    <Button color="error" variant="outlined" disabled={status.required} onClick={() => setDialog("disable")}>
                      Desactivar
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </>
          ) : (
            <Button variant="contained" sx={{ mt: 2 }} disabled={!canEnroll} onClick={() => setEnrolling(true)}>
              Configurar ahora
            </Button>
          )}
        </CardContent>
      </Card>

      {status.enrolled && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Equipos de confianza
              </Typography>
              {status.trusted_devices.length > 0 && (
                <Button
                  size="small"
                  color="error"
                  onClick={async () => {
                    try {
                      await revokeAllTrustedDevices(platform);
                      toast.success("Se revocaron todos los equipos");
                      load();
                    } catch (err) {
                      toast.error(apiErrorMessage(err));
                    }
                  }}
                >
                  Revocar todos
                </Button>
              )}
            </Stack>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Equipos donde marcó “Recordar este equipo”: no piden código durante {status.remember_device_days} días.
            </Typography>
            {status.trusted_devices.length === 0 ? (
              <Typography variant="body2" sx={{ mt: 1 }}>
                No hay equipos de confianza.
              </Typography>
            ) : (
              <List dense>
                {status.trusted_devices.map((d) => (
                  <ListItem
                    key={d.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="Revocar equipo"
                        onClick={async () => {
                          try {
                            await revokeTrustedDevice(platform, d.id);
                            load();
                          } catch (err) {
                            toast.error(apiErrorMessage(err));
                          }
                        }}
                      >
                        <DeleteOutlineRoundedIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={d.label || "Equipo"}
                      secondary={`Último uso: ${formatDate(d.last_used_at)} · IP ${d.ip_address || "—"} · vence ${formatDate(d.expires_at)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      <CodeDialog
        open={dialog === "regenerate"}
        title="Nuevos códigos de recuperación"
        description="Los códigos anteriores dejarán de funcionar. Ingrese el código actual de su app."
        confirmLabel="Generar"
        onClose={() => setDialog(null)}
        onSubmit={async ({ code }) => {
          const data = await regenerateRecoveryCodes(platform, code);
          setDialog(null);
          setNewCodes(data.recovery_codes);
        }}
      />
      <CodeDialog
        open={dialog === "disable"}
        title="Desactivar verificación en dos pasos"
        description="Su cuenta quedará protegida solo con la contraseña."
        askPassword
        confirmLabel="Desactivar"
        onClose={() => setDialog(null)}
        onSubmit={async ({ code, password }) => {
          await disableMfa(platform, { code, password });
          setDialog(null);
          toast.success("Verificación en dos pasos desactivada");
          load();
        }}
      />
    </Stack>
  );
}

// Política de la empresa. La usa el administrador de la empresa (Seguridad)
// y el superadmin (Empresas > Editar), que pasa loadPolicy/savePolicy de esa
// empresa y asSuperadmin para los textos.
export function MfaPolicyPanel({ loadPolicy = getMfaPolicy, savePolicy = updateMfaPolicy, asSuperadmin = false }) {
  const [policy, setPolicy] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await loadPolicy();
      setPolicy(data);
      setForm({
        enabled: data.enabled,
        required_role_ids: data.required_role_ids ?? data.suggested_role_ids,
        remember_device_days: data.remember_device_days,
      });
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo cargar la política."));
    }
  }, [loadPolicy]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!policy || !form) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const blocked = !policy.server_configured || !policy.tables_ready || !policy.license_columns_ready;
  const toggleRole = (id) =>
    setForm((f) => ({
      ...f,
      required_role_ids: f.required_role_ids.includes(id)
        ? f.required_role_ids.filter((r) => r !== id)
        : [...f.required_role_ids, id],
    }));

  const save = async () => {
    setSaving(true);
    setResult(null);
    try {
      await savePolicy(form);
      setResult({ severity: "success", message: "Política de verificación en dos pasos guardada." });
      load();
    } catch (err) {
      setResult({ severity: "error", message: apiErrorMessage(err, "No se pudo guardar la política.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ maxWidth: 720 }}>
      <CardContent>
        {!policy.server_configured && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Falta configurar la llave de cifrado (TOTP_ENC_KEY) en el servidor.{asSuperadmin ? "" : " Contacte a soporte."}
          </Alert>
        )}
        {(!policy.tables_ready || !policy.license_columns_ready) && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {asSuperadmin
              ? "Falta aplicar la migración de 2FA en la base de esta empresa (20261019_01_create_user_mfa)."
              : "Falta aplicar la actualización de base de datos de 2FA para su empresa. Contacte a soporte."}
          </Alert>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={form.enabled}
              disabled={blocked && !form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
          }
          label={<b>Habilitar verificación en dos pasos en la empresa</b>}
        />
        <Typography variant="body2" sx={{ color: "text.secondary", ml: 6 }}>
          Apagada, el inicio de sesión funciona como siempre (solo contraseña) para todos.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Obligatoria para estos roles
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Los usuarios de estos roles deberán configurarla en su próximo inicio de sesión. Para el resto es opcional.
          Los usuarios cobradores (app móvil) nunca la requieren.
        </Typography>
        <FormGroup sx={{ mt: 1, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          {policy.roles.map((r) => (
            <FormControlLabel
              key={r.id}
              control={<Checkbox checked={form.required_role_ids.includes(r.id)} onChange={() => toggleRole(r.id)} />}
              label={r.role_name}
            />
          ))}
        </FormGroup>

        <TextField
          label="Recordar equipo (días, 0 = no ofrecer)"
          type="number"
          value={form.remember_device_days}
          onChange={(e) => setForm((f) => ({ ...f, remember_device_days: Number(e.target.value) }))}
          inputProps={{ min: 0, max: 90 }}
          size="small"
          sx={{ mt: 2, width: 280 }}
        />

        {form.enabled && !asSuperadmin && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Si su propio rol queda como obligatorio y aún no configuró la verificación, se le pedirá en su próximo inicio de
            sesión. Puede configurarla ahora en “Mi cuenta”.
          </Alert>
        )}

        {result && (
          <Alert severity={result.severity} sx={{ mt: 2 }} onClose={() => setResult(null)}>
            {result.message}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={save} disabled={saving || (blocked && form.enabled)}>
            Guardar política
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

const userStatusChip = (u) => {
  if (u.exempt_reason) return <Chip size="small" variant="outlined" label="Exento (cobrador)" />;
  if (u.locked) return <Chip size="small" color="error" label="Bloqueada" />;
  if (u.enrolled) return <Chip size="small" color="success" label="Activa" />;
  if (u.required) return <Chip size="small" color="warning" label="Obligatoria, pendiente" />;
  return <Chip size="small" label="No configurada" />;
};

// Usuarios y su estado de 2FA; restablecer (perdió el teléfono).
export function MfaUsersPanel({ canReset, currentUserId }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await getMfaUsers());
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo cargar la lista de usuarios."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!users) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const confirmReset = async () => {
    setSaving(true);
    try {
      await resetUserMfa(target.id, reason.trim() || null);
      toast.success(`Se restableció la verificación de ${target.full_name}`);
      setTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "No se pudo restablecer."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Usuario</TableCell>
            <TableCell>Nombre</TableCell>
            <TableCell>Rol</TableCell>
            <TableCell>2FA</TableCell>
            <TableCell>Desde</TableCell>
            {canReset && <TableCell align="right">Acción</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} sx={{ opacity: u.active ? 1 : 0.55 }}>
              <TableCell>{u.user_name}</TableCell>
              <TableCell>{u.full_name}</TableCell>
              <TableCell>{u.role_name}</TableCell>
              <TableCell>{userStatusChip(u)}</TableCell>
              <TableCell>{u.enrolled ? formatDate(u.enrolled_at) : "—"}</TableCell>
              {canReset && (
                <TableCell align="right">
                  {(u.enrolled || u.locked) && Number(u.id) !== Number(currentUserId) && (
                    <Button
                      size="small"
                      color="warning"
                      onClick={() => {
                        setReason("");
                        setTarget(u);
                      }}
                    >
                      Restablecer
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!target} onClose={saving ? undefined : () => setTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Restablecer verificación en dos pasos</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Se eliminará la configuración de <b>{target?.full_name}</b> (app, códigos de recuperación y equipos de
            confianza). Si su rol la requiere, deberá configurarla de nuevo en su próximo inicio de sesión. Queda
            registrado en la bitácora.
          </Typography>
          <TextField
            label="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)} disabled={saving}>
            Cancelar
          </Button>
          <Button color="warning" variant="contained" onClick={confirmReset} disabled={saving}>
            Restablecer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function SecurityPage({ platform = false }) {
  const { permissions = [], role, user } = useContext(UserContext) || {};
  const isAdmin = Number(role) === ADMIN_ROLE_ID;
  const canConfigure = !platform && (isAdmin || permissions.includes("seguridad.2fa.configurar"));
  const canReset = !platform && (isAdmin || permissions.includes("usuarios.restablecer_2fa"));
  const [tab, setTab] = useState("me");

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <SecurityRoundedIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Seguridad
        </Typography>
      </Stack>

      {(canConfigure || canReset) && (
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab value="me" label="Mi cuenta" />
          {canConfigure && <Tab value="policy" label="Política de la empresa" />}
          <Tab value="users" label="Usuarios" />
        </Tabs>
      )}

      {tab === "me" && <MyMfaPanel platform={platform} />}
      {tab === "policy" && canConfigure && <MfaPolicyPanel />}
      {tab === "users" && (canConfigure || canReset) && <MfaUsersPanel canReset={canReset} currentUserId={user} />}
    </Box>
  );
}
