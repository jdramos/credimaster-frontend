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
  { value: "CENTRAL_RIESGO", label: "Central de riesgo" },
  { value: "INGRESOS", label: "Comprobante de ingresos" },
  { value: "DOMICILIO", label: "Comprobante de domicilio" },
  { value: "GARANTIA", label: "Garantía" },
  { value: "ANALISIS", label: "Análisis crediticio" },
  { value: "OTRO", label: "Otro" },
];

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

export default function LoanDocuments({ loanId }) {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("ID");
  const [docName, setDocName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const loadDocuments = async () => {
    try {
      clearMessages();
      setLoadingDocs(true);

      const res = await API.get(`/api/credit-files/${loanId}/documents-list`);
      const data = res.data;

      setDocuments(Array.isArray(data) ? data : data?.rows || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Error cargando documentos");
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (loanId) {
      loadDocuments();
    }
  }, [loanId]);

  useEffect(() => {
  if (availableDocTypes.length === 0) {
    setDocType("");
    return;
  }

  const stillExists = availableDocTypes.some((item) => item.value === docType);
  if (!stillExists) {
    setDocType(availableDocTypes[0].value);
  }
}, [documents]);

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

      if (!loanId) {
        setError("No se recibió el ID del crédito");
        return;
      }

      if (!file) {
        setError("Selecciona un archivo");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      formData.append("doc_name", docName || file.name);

      setUploading(true);

      const res = await API.post(`/api/credit-files/${loanId}/documents`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = res.data;

      setSuccess("Documento subido correctamente");
      setFile(null);
      setDocName("");

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      await loadDocuments();

      if (data?.signed_url_120s) {
        window.open(data.signed_url_120s, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Error subiendo documento");
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (docId) => {
    try {
      clearMessages();

      const res = await API.get(`/api/credit-files/documents/${docId}/download-url`);
      const data = res.data;

      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("La URL firmada no fue generada");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Error abriendo documento");
    }
  };

  const handleDelete = async (docId) => {
    try {
      clearMessages();

      const ok = window.confirm("¿Deseas eliminar este documento?");
      if (!ok) return;

      await API.delete(`/api/credit-files/documents/${docId}`);

      setSuccess("Documento eliminado correctamente");
      await loadDocuments();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Error eliminando documento");
    }
  };

  const usedDocTypes = documents.map((doc) => doc.doc_type);

    const availableDocTypes = DOC_TYPES.filter(
        (item) => item.value === "OTRO" || !usedDocTypes.includes(item.value)
        );

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
            Documentos del crédito
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Adjunta y administra los documentos del expediente del crédito.
          </Typography>
        </Box>

        <Divider />

        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ borderRadius: 2 }}>{success}</Alert>}

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
              />
            </Stack>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
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
                <Typography variant="body2" sx={{ color: BAC.text, fontWeight: 600 }}>
                  {file ? file.name : "Ningún archivo seleccionado"}
                </Typography>
                {file && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Tamaño: {formatBytes(file.size)}
                  </Typography>
                )}
              </Box>

              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={uploading || !file || !docType}
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
              onClick={loadDocuments}
              disabled={loadingDocs}
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
              Este crédito todavía no tiene documentos cargados.
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
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
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
                      <Stack direction="row" spacing={1} justifyContent="center">
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
      </Stack>
    </Paper>
  );
}