import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  TextField,
  MenuItem,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Divider,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import RefreshIcon from "@mui/icons-material/Refresh";
import BAC from "../../styles/bac";
import API from "../../api";

const DOC_TYPES = [
  { value: "ID", label: "Identificación" },
  { value: "DOMICILIO", label: "Comprobante de domicilio" },
  { value: "INGRESOS", label: "Comprobante de ingresos" },
  { value: "LABORAL", label: "Constancia laboral" },
  { value: "NEGOCIO", label: "Documento del negocio" },
  { value: "REFERENCIA", label: "Referencia" },
  { value: "OTRO", label: "Otro" },
];

const DOC_TYPE_TO_CHECKLIST = {
  ID: "ID_DOC",
  DOMICILIO: "ADDRESS_PROOF",
  INGRESOS: "INCOME_PROOF",
  LABORAL: "WORK_PROOF",
  NEGOCIO: "BUSINESS_PROOF",
  REFERENCIA: "REFERENCE_PROOF",
  OTRO: "OTHER_DOC",
};

const formatBytes = (bytes) => {
  const num = Number(bytes || 0);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-NI");
};

const getFileIcon = (mimeType = "", docName = "") => {
  const mime = String(mimeType).toLowerCase();
  const name = String(docName).toLowerCase();

  if (mime.includes("pdf") || name.endsWith(".pdf")) {
    return <PictureAsPdfIcon sx={{ color: BAC.primary }} />;
  }

  if (mime.startsWith("image/")) {
    return <ImageIcon sx={{ color: BAC.primary }} />;
  }

  if (
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("sheet") ||
    mime.includes("document")
  ) {
    return <DescriptionIcon sx={{ color: BAC.primary }} />;
  }

  return <InsertDriveFileIcon sx={{ color: BAC.primary }} />;
};

const getChecklistStatus = (item) => {
  if (!item?.has_document) {
    return {
      label: "Faltante",
      color: "error",
      variant: "outlined",
    };
  }

  if (item?.is_validated) {
    return {
      label: "Validado",
      color: "success",
      variant: "filled",
    };
  }

  return {
    label: "Cargado",
    color: "warning",
    variant: "filled",
  };
};

export default function CustomerDocuments({ customerId }) {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("ID");
  const [docName, setDocName] = useState("");

  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [checklistSummary, setChecklistSummary] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const usedDocTypes = documents.map((doc) => doc.doc_type);
  const availableDocTypes = DOC_TYPES.filter(
    (item) => item.value === "OTRO" || !usedDocTypes.includes(item.value),
  );

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);

      const res = await API.get(
        `/api/customer-files/${customerId}/documents-list`,
      );
      const data = res.data;

      setDocuments(Array.isArray(data) ? data : data?.rows || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Error cargando documentos",
      );
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadChecklist = async () => {
    try {
      setLoadingChecklist(true);

      const res = await API.get(`/api/customer-files/${customerId}/checklist`);
      const data = res.data;

      setChecklist(Array.isArray(data?.rows) ? data.rows : []);
      setChecklistSummary(data?.summary || null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Error cargando checklist documental",
      );
    } finally {
      setLoadingChecklist(false);
    }
  };

  const loadAll = async () => {
    clearMessages();
    await Promise.all([loadDocuments(), loadChecklist()]);
  };

  useEffect(() => {
    if (customerId) {
      loadAll();
    } else {
      setDocuments([]);
      setChecklist([]);
      setChecklistSummary(null);
    }
  }, [customerId]);

  useEffect(() => {
    if (availableDocTypes.length === 0) {
      setDocType("");
      return;
    }

    const exists = availableDocTypes.some((item) => item.value === docType);
    if (!exists) {
      setDocType(availableDocTypes[0].value);
    }
  }, [documents]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectFile = (event) => {
    clearMessages();
    const selected = event.target.files?.[0] || null;
    setFile(selected);

    if (selected) {
      setDocName(selected.name);
    }
  };

  const handleUpload = async () => {
    try {
      clearMessages();

      if (!customerId) {
        setError("Primero debes guardar el cliente");
        return;
      }

      if (!file) {
        setError("Selecciona un archivo");
        return;
      }

      if (!docType) {
        setError("Ya no hay tipos de documentos disponibles");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      formData.append("doc_name", docName || file.name);
      formData.append(
        "related_item_code",
        DOC_TYPE_TO_CHECKLIST[docType] || "OTHER_DOC",
      );

      setUploading(true);

      const res = await API.post(
        `/api/customer-files/${customerId}/documents`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const data = res.data;

      setSuccess("Documento subido correctamente");
      setFile(null);
      setDocName("");

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      await loadAll();

      if (data?.signed_url_120s) {
        window.open(data.signed_url_120s, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Error subiendo documento",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (docId) => {
    try {
      clearMessages();

      const res = await API.get(
        `/api/customer-files/documents/${docId}/download-url`,
      );
      const data = res.data;

      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("La URL firmada no fue generada");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Error abriendo documento",
      );
    }
  };

  const handleDelete = async (docId) => {
    try {
      clearMessages();

      const ok = window.confirm("¿Deseas eliminar este documento?");
      if (!ok) return;

      await API.delete(`/api/customer-files/documents/${docId}`);

      setSuccess("Documento eliminado correctamente");
      await loadAll();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Error eliminando documento",
      );
    }
  };

  const isLoadingAny = loadingDocs || loadingChecklist;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: `1px solid ${BAC.border}`,
        background: "#fff",
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, color: BAC.text, mb: 0.5 }}
          >
            Documentos del cliente
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Adjunta y administra los documentos del expediente del cliente.
          </Typography>
        </Box>

        <Divider />

        {!customerId && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Guarda primero el cliente para poder adjuntar documentos.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            {success}
          </Alert>
        )}

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography sx={{ fontWeight: 700, color: BAC.text }}>
              Checklist documental
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Aquí puedes ver qué documentos faltan, cuáles ya fueron cargados y
              cuáles ya están validados.
            </Typography>
          </Box>

          <Tooltip title="Actualizar">
            <IconButton
              onClick={loadAll}
              disabled={isLoadingAny || !customerId}
              sx={{
                border: `1px solid ${BAC.border}`,
                borderRadius: 2,
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {loadingChecklist ? (
          <LinearProgress sx={{ borderRadius: 999 }} />
        ) : checklistSummary ? (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: `1px solid ${BAC.border}`,
              backgroundColor: "#FAFCFF",
            }}
          >
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <Typography sx={{ fontWeight: 700, color: BAC.text }}>
                  Estado general del expediente
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip
                    size="small"
                    label={`Obligatorios: ${checklistSummary.total_mandatory || 0}`}
                    color="primary"
                    variant="filled"
                  />
                  <Chip
                    size="small"
                    label={`Cargados: ${checklistSummary.uploaded_mandatory || 0}`}
                    color="warning"
                    variant="filled"
                  />
                  <Chip
                    size="small"
                    label={`Validados: ${checklistSummary.validated_mandatory || 0}`}
                    color="success"
                    variant="filled"
                  />
                  <Chip
                    size="small"
                    label={`Faltantes: ${checklistSummary.missing_mandatory || 0}`}
                    color={
                      Number(checklistSummary.missing_mandatory || 0) > 0
                        ? "error"
                        : "success"
                    }
                    variant="outlined"
                  />
                </Stack>
              </Stack>

              {checklist.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  No hay ítems configurados en el checklist.
                </Typography>
              ) : (
                <Stack spacing={1.2}>
                  {checklist.map((item) => {
                    const statusChip = getChecklistStatus(item);

                    return (
                      <Stack
                        key={item.id}
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: `1px solid ${BAC.border}`,
                          backgroundColor: "#fff",
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 700, color: BAC.text }}>
                            {item.title}
                          </Typography>

                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary", display: "block" }}
                          >
                            {item.section} · {item.code}
                          </Typography>

                          {item.document_name ? (
                            <Typography
                              variant="body2"
                              sx={{ color: "text.secondary", mt: 0.5 }}
                            >
                              Archivo: {item.document_name}
                            </Typography>
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{ color: "#B42318", mt: 0.5 }}
                            >
                              No se ha cargado documento para este ítem.
                            </Typography>
                          )}
                        </Box>

                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          sx={{ mt: { xs: 1.5, md: 0 } }}
                        >
                          <Chip
                            size="small"
                            label={
                              item.is_mandatory ? "Obligatorio" : "Opcional"
                            }
                            color={item.is_mandatory ? "primary" : "default"}
                            variant={item.is_mandatory ? "filled" : "outlined"}
                          />

                          <Chip
                            size="small"
                            label={statusChip.label}
                            color={statusChip.color}
                            variant={statusChip.variant}
                          />

                          {Number(item.uploaded_count || 0) > 0 && (
                            <Chip
                              size="small"
                              label={`Archivos: ${item.uploaded_count}`}
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Paper>
        ) : customerId ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            No se pudo cargar el checklist documental.
          </Alert>
        ) : null}

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 1 }}
        >
          <Typography sx={{ fontWeight: 700, color: BAC.text }}>
            Documentos cargados
          </Typography>

          <Tooltip title="Actualizar">
            <IconButton
              onClick={loadAll}
              disabled={isLoadingAny || !customerId}
              sx={{
                border: `1px solid ${BAC.border}`,
                borderRadius: 2,
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {loadingDocs ? (
          <LinearProgress sx={{ borderRadius: 999 }} />
        ) : documents.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              textAlign: "center",
              borderRadius: 3,
              border: `1px solid ${BAC.border}`,
              backgroundColor: "#FAFCFF",
            }}
          >
            <Typography sx={{ color: "text.secondary" }}>
              Este cliente todavía no tiene documentos cargados.
            </Typography>
          </Paper>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${BAC.border}`,
              overflow: "hidden",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: BAC.secondary,
                    "& th": {
                      fontWeight: 800,
                      color: BAC.text,
                      borderBottom: `1px solid ${BAC.border}`,
                    },
                  }}
                >
                  <TableCell>Archivo</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Tamaño</TableCell>
                  <TableCell>Subido por</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {documents.map((doc) => (
                  <TableRow
                    key={doc.id}
                    hover
                    sx={{
                      "& td": {
                        borderBottom: `1px solid ${BAC.border}`,
                      },
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        {getFileIcon(doc.mime_type, doc.doc_name)}
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: BAC.text }}>
                            {doc.doc_name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            {doc.storage_path}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={doc.doc_type}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          backgroundColor: BAC.secondary,
                          color: BAC.primary,
                        }}
                      />
                    </TableCell>

                    <TableCell>{formatBytes(doc.size_bytes)}</TableCell>
                    <TableCell>{doc.uploaded_by || "-"}</TableCell>
                    <TableCell>{formatDateTime(doc.uploaded_at)}</TableCell>

                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                      >
                        <Tooltip title="Ver documento">
                          <IconButton
                            onClick={() => handleView(doc.id)}
                            sx={{
                              border: `1px solid ${BAC.border}`,
                              borderRadius: 2,
                              color: BAC.primary,
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Eliminar documento">
                          <IconButton
                            onClick={() => handleDelete(doc.id)}
                            sx={{
                              border: `1px solid ${BAC.border}`,
                              borderRadius: 2,
                              color: "#B42318",
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            border: `1px dashed ${BAC.primary}`,
            backgroundColor: BAC.secondary,
          }}
        >
          <Stack spacing={2}>
            <Typography sx={{ fontWeight: 700, color: BAC.text }}>
              Subir nuevo documento
            </Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select
                label="Tipo de documento"
                size="small"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                fullWidth
                disabled={!customerId || availableDocTypes.length === 0}
              >
                {availableDocTypes.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Nombre del documento"
                size="small"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                fullWidth
                disabled={!customerId}
              />
            </Stack>

            {availableDocTypes.length === 0 && customerId && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Ya se cargaron todos los tipos de documentos disponibles.
              </Alert>
            )}

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                disabled={!customerId}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: BAC.primary,
                  color: BAC.primary,
                }}
              >
                Seleccionar archivo
                <input
                  ref={inputRef}
                  hidden
                  type="file"
                  onChange={handleSelectFile}
                />
              </Button>

              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ color: BAC.text, fontWeight: 600 }}
                >
                  {file ? file.name : "Ningún archivo seleccionado"}
                </Typography>
                {file && (
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    Tamaño: {formatBytes(file.size)}
                  </Typography>
                )}
              </Box>

              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={uploading || !file || !customerId || !docType}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 800,
                  px: 3,
                  backgroundColor: BAC.primary,
                }}
              >
                Subir documento
              </Button>
            </Stack>

            {uploading && <LinearProgress sx={{ borderRadius: 999 }} />}
          </Stack>
        </Paper>
      </Stack>
    </Paper>
  );
}
