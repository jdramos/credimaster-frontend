import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableHead, TableBody, TableRow, TableCell,
  Typography, CircularProgress, Box, Chip, Tabs, Tab,
  Grid, TextField, MenuItem, Autocomplete, Divider,
  IconButton, Tooltip, List, ListItem, ListItemIcon, ListItemText, Alert, Snackbar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DescriptionIcon from "@mui/icons-material/Description";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import dayjs from "dayjs";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { UserContext } from "../../contexts/UserContext";
import { printEmployeeContractReport } from "../../reports/printEmployeeContractReport";
import { printWorkCertificateReport } from "../../reports/printWorkCertificateReport";
import { printSalaryCertificateReport } from "../../reports/printSalaryCertificateReport";

const MOTIVO_LABELS = {
  RENUNCIA: "Renuncia voluntaria",
  DESPIDO_JUSTIFICADO: "Despido con causa justificada",
  DESPIDO_INJUSTIFICADO: "Despido sin causa justificada",
  MUTUO_ACUERDO: "Mutuo acuerdo",
};

const MOVEMENT_TYPE_LABELS = {
  AUMENTO_SALARIO: "Aumento de salario",
  CAMBIO_PUESTO: "Cambio de puesto",
  AMONESTACION: "Amonestación",
  SUBSIDIO: "Subsidio",
  OTRO: "Otro",
};

const DOCUMENT_TYPE_OPTIONS = [
  "Cédula", "Contrato Laboral", "Carta Salarial", "Carta Laboral", "Título", "CV", "Otro",
];

const fmtDate = (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "-");
const money = (value) => Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fileIconFor = (mimeType) => {
  if (mimeType === "application/pdf") return <PictureAsPdfIcon color="error" />;
  if (mimeType?.startsWith("image/")) return <ImageIcon color="primary" />;
  return <InsertDriveFileIcon />;
};

const emptyMovementForm = () => ({
  movement_type: "AUMENTO_SALARIO",
  movement_date: dayjs().format("YYYY-MM-DD"),
  new_salary: "",
  department: null,
  positionRef: null,
  description: "",
});

const emptyBeneficiaryRow = { full_name: "", relationship: "", birth_date: "", id_card: "", phone: "", percentage: "" };

// Detalle consolidado de un empleado — un solo modal con pestañas
// (Períodos de empleo, Movimientos, Beneficiarios, Documentos) y los 3
// botones de impresión (Contrato/Constancia/Carta Salarial) siempre
// visibles en el pie, en vez de 3 diálogos separados + 3 ítems de menú
// aparte, a pedido del usuario. Reemplaza EmployeeHistoryDialog.jsx,
// EmployeeBeneficiariesDialog.jsx y EmployeeDocumentsDialog.jsx (fusionados
// acá, no quedan huérfanos — se eliminan del árbol de componentes).
export default function EmployeeDetailDialog({ open, onClose, employee }) {
  const { tenant } = useAuth();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const { role, permissions = [] } = useContext(UserContext) || {};
  const canManage = role === 1 || permissions.includes("rrhh.empleados.gestionar");

  const employeeId = employee?.id;
  const employeeName = employee?.full_name;

  const [tab, setTab] = useState(0);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  // --- Períodos de empleo ---
  const [periods, setPeriods] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);

  // --- Movimientos ---
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [movementFormOpen, setMovementFormOpen] = useState(false);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [movementSaving, setMovementSaving] = useState(false);
  const [movementError, setMovementError] = useState("");

  // --- Beneficiarios ---
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [beneficiariesLoading, setBeneficiariesLoading] = useState(false);
  const [newBeneficiary, setNewBeneficiary] = useState(emptyBeneficiaryRow);
  const [savingBeneficiary, setSavingBeneficiary] = useState(false);

  // --- Documentos ---
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentType, setDocumentType] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const fileInputRef = useRef(null);

  // --- Impresión ---
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open || !employeeId) return;
    setTab(0);
    setMovementFormOpen(false);
    setMovementForm(emptyMovementForm());
    setMovementError("");
    setNewBeneficiary(emptyBeneficiaryRow);

    setPeriodsLoading(true);
    API.get(`/api/hr/employees/${employeeId}/history`)
      .then((res) => setPeriods(res.data?.data || []))
      .catch(() => setPeriods([]))
      .finally(() => setPeriodsLoading(false));

    loadMovements();
    loadBeneficiaries();
    loadDocuments();
    API.get("/api/hr/departments").then((res) => setDepartments(res.data?.data || [])).catch(() => {});
    API.get("/api/hr/positions").then((res) => setPositions(res.data?.data || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeId]);

  const loadMovements = () => {
    if (!employeeId) return;
    setMovementsLoading(true);
    API.get(`/api/hr/employees/${employeeId}/movements`)
      .then((res) => setMovements(res.data?.data || []))
      .catch(() => setMovements([]))
      .finally(() => setMovementsLoading(false));
  };

  const loadBeneficiaries = () => {
    if (!employeeId) return;
    setBeneficiariesLoading(true);
    API.get(`/api/hr/employees/${employeeId}/beneficiaries`)
      .then((res) => setBeneficiaries(res.data?.data || []))
      .catch(() => setBeneficiaries([]))
      .finally(() => setBeneficiariesLoading(false));
  };

  const loadDocuments = () => {
    if (!employeeId) return;
    setDocumentsLoading(true);
    API.get(`/api/hr/employees/${employeeId}/documents`)
      .then((res) => setDocuments(res.data?.data || []))
      .catch(() => setDocuments([]))
      .finally(() => setDocumentsLoading(false));
  };

  const positionOptions = useMemo(
    () => (movementForm.department ? positions.filter((p) => p.department_id === movementForm.department.id) : positions),
    [positions, movementForm.department],
  );

  const handleSaveMovement = async () => {
    if (!movementForm.movement_date) {
      setMovementError("Indique la fecha del movimiento");
      return;
    }
    if (movementForm.movement_type === "AUMENTO_SALARIO" && !movementForm.new_salary) {
      setMovementError("Indique el nuevo salario");
      return;
    }
    if (movementForm.movement_type === "CAMBIO_PUESTO" && !movementForm.department && !movementForm.positionRef) {
      setMovementError("Indique el nuevo departamento y/o puesto");
      return;
    }

    try {
      setMovementSaving(true);
      setMovementError("");
      await API.post(`/api/hr/employees/${employeeId}/movements`, {
        movement_type: movementForm.movement_type,
        movement_date: movementForm.movement_date,
        new_salary: movementForm.movement_type === "AUMENTO_SALARIO" ? Number(movementForm.new_salary) : undefined,
        new_department_id: movementForm.movement_type === "CAMBIO_PUESTO" ? (movementForm.department?.id || null) : undefined,
        new_position_id: movementForm.movement_type === "CAMBIO_PUESTO" ? (movementForm.positionRef?.id || null) : undefined,
        description: movementForm.description || null,
      });
      setMovementForm(emptyMovementForm());
      setMovementFormOpen(false);
      loadMovements();
    } catch (err) {
      setMovementError(err?.response?.data?.message || "Error al registrar el movimiento");
    } finally {
      setMovementSaving(false);
    }
  };

  const renderMovementDetail = (m) => {
    if (m.movement_type === "AUMENTO_SALARIO") {
      return `C$ ${money(m.previous_salary)} → C$ ${money(m.new_salary)}`;
    }
    if (m.movement_type === "CAMBIO_PUESTO") {
      const from = [m.previous_department_name, m.previous_position_name].filter(Boolean).join(" / ") || "-";
      const to = [m.new_department_name, m.new_position_name || m.new_position_text].filter(Boolean).join(" / ") || "-";
      return `${from} → ${to}`;
    }
    return "-";
  };

  const handleAddBeneficiary = async () => {
    if (!newBeneficiary.full_name || !newBeneficiary.relationship) {
      showAlert("Nombre y parentesco son requeridos", "error");
      return;
    }
    try {
      setSavingBeneficiary(true);
      await API.post(`/api/hr/employees/${employeeId}/beneficiaries`, {
        ...newBeneficiary,
        birth_date: newBeneficiary.birth_date || null,
        percentage: newBeneficiary.percentage || null,
      });
      setNewBeneficiary(emptyBeneficiaryRow);
      loadBeneficiaries();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al agregar el beneficiario", "error");
    } finally {
      setSavingBeneficiary(false);
    }
  };

  const handleDeleteBeneficiary = async (row) => {
    if (!window.confirm(`¿Eliminar a "${row.full_name}" de los beneficiarios?`)) return;
    try {
      await API.delete(`/api/hr/employees/${employeeId}/beneficiaries/${row.id}`);
      loadBeneficiaries();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al eliminar el beneficiario", "error");
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (documentType) formData.append("document_type", documentType);
      await API.post(`/api/hr/employees/${employeeId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocumentType(null);
      loadDocuments();
    } catch (error) {
      showAlert(error?.response?.data?.message || "No se pudo subir el documento", "error");
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("¿Eliminar este documento?")) return;
    try {
      await API.delete(`/api/hr/employees/documents/${documentId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (error) {
      showAlert(error?.response?.data?.message || "No se pudo eliminar el documento", "error");
    }
  };

  const runPrint = async (printFn, label) => {
    try {
      setPrinting(true);
      await printFn({ company: tenant, user: currentUser, employee });
    } catch (error) {
      showAlert(`Error al generar ${label}`, "error");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight={700}>Detalle — {employeeName}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
          <Tab label="Períodos de empleo" />
          <Tab label="Movimientos" />
          <Tab label="Beneficiarios" />
          <Tab label="Documentos" />
        </Tabs>

        {tab === 0 && (
          <>
            {periodsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                    <TableCell>Ingreso</TableCell>
                    <TableCell>Salida</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell>Comentario</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {periods.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{fmtDate(row.entry_date)}</TableCell>
                      <TableCell>
                        {row.exit_date ? fmtDate(row.exit_date) : <Chip size="small" color="success" label="Activo" />}
                      </TableCell>
                      <TableCell>{row.motivo_salida ? (MOTIVO_LABELS[row.motivo_salida] || row.motivo_salida) : "-"}</TableCell>
                      <TableCell sx={{ whiteSpace: "pre-wrap" }}>{row.comment || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!periodsLoading && !periods.length && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                Sin períodos de empleo registrados.
              </Typography>
            )}
          </>
        )}

        {tab === 1 && (
          <>
            {canManage && (
              <Box sx={{ mb: 2 }}>
                {!movementFormOpen ? (
                  <Button variant="outlined" size="small" sx={{ textTransform: "none" }} onClick={() => setMovementFormOpen(true)}>
                    Registrar movimiento
                  </Button>
                ) : (
                  <Box sx={{ border: "1px solid #E5E7EB", borderRadius: 2, p: 2 }}>
                    {movementError && <Typography variant="body2" color="error" sx={{ mb: 1 }}>{movementError}</Typography>}
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select fullWidth size="small" label="Tipo de movimiento"
                          value={movementForm.movement_type}
                          onChange={(e) => setMovementForm((f) => ({ ...f, movement_type: e.target.value }))}
                        >
                          {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
                          value={movementForm.movement_date}
                          onChange={(e) => setMovementForm((f) => ({ ...f, movement_date: e.target.value }))}
                        />
                      </Grid>

                      {movementForm.movement_type === "AUMENTO_SALARIO" && (
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth size="small" type="number" label="Nuevo salario mensual (C$)"
                            value={movementForm.new_salary}
                            onChange={(e) => setMovementForm((f) => ({ ...f, new_salary: e.target.value }))}
                          />
                        </Grid>
                      )}

                      {movementForm.movement_type === "CAMBIO_PUESTO" && (
                        <>
                          <Grid item xs={12} sm={6}>
                            <Autocomplete
                              size="small"
                              options={departments}
                              value={movementForm.department}
                              getOptionLabel={(o) => o.name || ""}
                              isOptionEqualToValue={(o, v) => o.id === v.id}
                              onChange={(_, value) => setMovementForm((f) => ({ ...f, department: value }))}
                              renderInput={(params) => <TextField {...params} label="Nuevo departamento" />}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Autocomplete
                              size="small"
                              options={positionOptions}
                              value={movementForm.positionRef}
                              getOptionLabel={(o) => o.title || ""}
                              isOptionEqualToValue={(o, v) => o.id === v.id}
                              onChange={(_, value) => setMovementForm((f) => ({ ...f, positionRef: value }))}
                              renderInput={(params) => <TextField {...params} label="Nuevo puesto" />}
                            />
                          </Grid>
                        </>
                      )}

                      <Grid item xs={12}>
                        <TextField
                          fullWidth size="small" multiline minRows={2} label="Descripción (opcional)"
                          value={movementForm.description}
                          onChange={(e) => setMovementForm((f) => ({ ...f, description: e.target.value }))}
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
                      <Button size="small" sx={{ textTransform: "none" }} onClick={() => { setMovementFormOpen(false); setMovementError(""); }}>
                        Cancelar
                      </Button>
                      <Button size="small" variant="contained" sx={{ textTransform: "none" }} onClick={handleSaveMovement} disabled={movementSaving}>
                        {movementSaving ? "Guardando..." : "Guardar movimiento"}
                      </Button>
                    </Box>
                  </Box>
                )}
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {movementsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Detalle</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Registrado por</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell>{fmtDate(m.movement_date)}</TableCell>
                      <TableCell>{MOVEMENT_TYPE_LABELS[m.movement_type] || m.movement_type}</TableCell>
                      <TableCell>{renderMovementDetail(m)}</TableCell>
                      <TableCell sx={{ whiteSpace: "pre-wrap" }}>{m.description || "-"}</TableCell>
                      <TableCell>{m.created_by_name || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!movementsLoading && !movements.length && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                Sin movimientos registrados.
              </Typography>
            )}
          </>
        )}

        {tab === 2 && (
          <>
            {beneficiariesLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Parentesco</TableCell>
                    <TableCell>Fecha nac.</TableCell>
                    <TableCell>Cédula</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>%</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {beneficiaries.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.full_name}</TableCell>
                      <TableCell>{row.relationship}</TableCell>
                      <TableCell>{row.birth_date ? fmtDate(row.birth_date) : "-"}</TableCell>
                      <TableCell>{row.id_card || "-"}</TableCell>
                      <TableCell>{row.phone || "-"}</TableCell>
                      <TableCell>{row.percentage != null ? `${row.percentage}%` : "-"}</TableCell>
                      <TableCell align="center">
                        {canManage && (
                          <Tooltip title="Eliminar">
                            <IconButton size="small" onClick={() => handleDeleteBeneficiary(row)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {canManage && (
                    <TableRow>
                      <TableCell>
                        <TextField
                          size="small" placeholder="Nombre completo" fullWidth
                          value={newBeneficiary.full_name}
                          onChange={(e) => setNewBeneficiary((r) => ({ ...r, full_name: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small" placeholder="Cónyuge, hijo/a..." fullWidth
                          value={newBeneficiary.relationship}
                          onChange={(e) => setNewBeneficiary((r) => ({ ...r, relationship: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small" type="date" InputLabelProps={{ shrink: true }}
                          value={newBeneficiary.birth_date}
                          onChange={(e) => setNewBeneficiary((r) => ({ ...r, birth_date: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small" placeholder="Cédula" sx={{ width: 110 }}
                          value={newBeneficiary.id_card}
                          onChange={(e) => setNewBeneficiary((r) => ({ ...r, id_card: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small" placeholder="Teléfono" sx={{ width: 100 }}
                          value={newBeneficiary.phone}
                          onChange={(e) => setNewBeneficiary((r) => ({ ...r, phone: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small" type="number" sx={{ width: 70 }}
                          value={newBeneficiary.percentage}
                          onChange={(e) => setNewBeneficiary((r) => ({ ...r, percentage: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Agregar">
                          <span>
                            <IconButton size="small" color="primary" onClick={handleAddBeneficiary} disabled={savingBeneficiary}>
                              {savingBeneficiary ? <CircularProgress size={16} /> : <AddIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            {!beneficiariesLoading && !beneficiaries.length && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1, textAlign: "center" }}>
                Sin beneficiarios registrados aún.
              </Typography>
            )}
          </>
        )}

        {tab === 3 && (
          <>
            {documentsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : documents.length === 0 ? (
              <Alert severity="info">Este empleado no tiene documentos adjuntos.</Alert>
            ) : (
              <List dense>
                {documents.map((doc) => (
                  <ListItem
                    key={doc.id}
                    secondaryAction={
                      canManage && (
                        <IconButton edge="end" size="small" onClick={() => handleDeleteDocument(doc.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemIcon>{fileIconFor(doc.mime_type)}</ListItemIcon>
                    <ListItemText
                      primary={
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          {doc.document_type ? `${doc.document_type} — ` : ""}{doc.file_name || "Documento"}
                        </a>
                      }
                      secondary={`Subido ${dayjs(doc.uploaded_at).format("DD/MM/YYYY HH:mm")} por ${doc.uploaded_by || "-"}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}

            {canManage && (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2 }}>
                <Autocomplete
                  size="small"
                  freeSolo
                  options={DOCUMENT_TYPE_OPTIONS}
                  value={documentType}
                  onChange={(_, value) => setDocumentType(value)}
                  onInputChange={(_, value) => setDocumentType(value)}
                  sx={{ minWidth: 220 }}
                  renderInput={(params) => <TextField {...params} label="Tipo de documento (opcional)" />}
                />
                <Button
                  variant="contained"
                  startIcon={uploadingDocument ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                  onClick={handlePickFile}
                  disabled={uploadingDocument}
                  sx={{ textTransform: "none" }}
                >
                  {uploadingDocument ? "Subiendo..." : "Subir documento"}
                </Button>
              </Box>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              hidden
              onChange={handleFileSelected}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexWrap: "wrap", gap: 1 }}>
        <Button
          size="small" startIcon={<DescriptionIcon />} sx={{ textTransform: "none" }}
          disabled={printing} onClick={() => runPrint(printEmployeeContractReport, "el contrato")}
        >
          Imprimir contrato
        </Button>
        <Button
          size="small" startIcon={<BadgeOutlinedIcon />} sx={{ textTransform: "none" }}
          disabled={printing} onClick={() => runPrint(printWorkCertificateReport, "la constancia laboral")}
        >
          Imprimir constancia laboral
        </Button>
        <Button
          size="small" startIcon={<RequestQuoteIcon />} sx={{ textTransform: "none" }}
          disabled={printing} onClick={() => runPrint(printSalaryCertificateReport, "la carta salarial")}
        >
          Imprimir carta salarial
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cerrar</Button>
      </DialogActions>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))} sx={{ width: "100%" }}>{alert.message}</Alert>
      </Snackbar>
    </Dialog>
  );
}
