import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import RefreshIcon from "@mui/icons-material/Refresh";
import DescriptionIcon from "@mui/icons-material/Description";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import API from "../../api";

const BAC = {
  primary: "#D32F2F",
  primaryDark: "#9A2424",
  accent: "#111827",
  success: "#2E7D32",
  warning: "#ED6C02",
  border: "#E5E7EB",
  bgSoft: "#F9FAFB",
};

function getFileExtension(url = "", fileName = "") {
  const source = (fileName || url || "").toLowerCase();
  const clean = source.split("?")[0];
  const parts = clean.split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function getPreviewType(url = "", fileName = "", mimeType = "") {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("pdf")) return "pdf";

  const ext = getFileExtension(url, fileName);
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";

  return "other";
}

export default function CustomerChecklist({
  customerId,
  customerName,
  readOnly = false,
  title = "Checklist documental del cliente",
  showCompletedSummary = true,
  autoHideCompleted = false,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileInputRef = useRef(null);
  const pendingDocRef = useRef(null);

  const loadChecklist = useCallback(async () => {
    if (!customerId) return;

    setLoading(true);
    setError("");

    try {
      const { data } = await API.get(`/api/customer-files/${customerId}/checklist`);

      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

      const mapped = list.map((item) => ({
        checklist_item_id: item.id,
        customer_file_id: item.customer_file_id,
        code: item.code,
        section: item.section,
        title: item.title,
        is_mandatory: Number(item.is_mandatory) === 1 || item.is_mandatory === true,
        status: item.status || "PENDING",
        notes: item.notes || "",
        validated_by: item.validated_by || "",
        validated_at: item.validated_at || "",
        uploaded_document_id: item.document_id || null,
        uploaded_file_name: item.document_name || "",
        file_url: item.file_url || "",
        mime_type: item.mime_type || "",
        file_size: Number(item.file_size || 0),
        uploaded_at: item.uploaded_at || "",
        is_completed:
          !!item.document_id ||
          ["COMPLETED", "VALIDATED", "OK"].includes(
            String(item.status || "").toUpperCase()
          ),
      }));

      setRows(mapped);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "No se pudo cargar el checklist documental del cliente."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const visibleRows = useMemo(() => {
    if (!autoHideCompleted) return rows;
    return rows.filter((row) => !row.is_completed);
  }, [rows, autoHideCompleted]);

  const summary = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter((r) => r.is_completed).length;
    const pending = total - completed;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, percent };
  }, [rows]);

  const handleClickUpload = (row) => {
    if (readOnly) return;
    setError("");
    setSuccess("");
    pendingDocRef.current = row;
    fileInputRef.current?.click();
  };

  const validateFile = (file) => {
    if (!file) return "No se seleccionó archivo.";

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return "El archivo excede el tamaño máximo permitido de 10 MB.";
    }

    return "";
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    const row = pendingDocRef.current;

    if (!file || !row || !customerId) {
      e.target.value = "";
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = "";
      pendingDocRef.current = null;
      return;
    }

    try {
      setUploadingId(row.checklist_item_id);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("customer_id", customerId);
      formData.append("customer_file_id", row.customer_file_id);
      formData.append("checklist_item_id", row.checklist_item_id);
      formData.append("related_item_code", row.code);
      formData.append("document_name", row.title || "");
      formData.append("notes", row.notes || "");

      await API.post(`/api/customer-files/${customerId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(`Documento "${row.title}" cargado correctamente.`);
      await loadChecklist();
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Ocurrió un error al subir el archivo del documento."
      );
    } finally {
      setUploadingId(null);
      pendingDocRef.current = null;
      e.target.value = "";
    }
  };

  const handleOpenPreview = async (row) => {
    if (!row.uploaded_document_id) return;

    try {
      setPreviewLoading(true);
      setError("");
      setPreviewOpen(true);
      setPreviewFile(null);

      const { data } = await API.get(
        `/api/customer-files/documents/${row.uploaded_document_id}/download-url`
      );

      const fileUrl = data?.url || "";
      const fileName = data?.doc_name || row.uploaded_file_name || row.title || "archivo";
      const mimeType = data?.mime_type || "";

      if (!fileUrl) {
        setError("No se pudo obtener la URL del documento.");
        setPreviewOpen(false);
        return;
      }

      setPreviewFile({
        url: fileUrl,
        name: fileName,
        mime_type: mimeType,
        type: getPreviewType(fileUrl, fileName, mimeType),
      });
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "No se pudo abrir el documento.");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
    setPreviewLoading(false);
  };

  const completionChip = (completed) => {
    if (completed) {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Completo"
          size="small"
          sx={{
            fontWeight: 700,
            color: "#fff",
            bgcolor: BAC.success,
          }}
        />
      );
    }

    return (
      <Chip
        icon={<HourglassBottomIcon />}
        label="Pendiente"
        size="small"
        sx={{
          fontWeight: 700,
          color: "#fff",
          bgcolor: BAC.warning,
        }}
      />
    );
  };

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
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={2}
        mb={2}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 900, color: BAC.accent, lineHeight: 1.2 }}
          >
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Cliente: <strong>{customerId} - {customerName}</strong>
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadChecklist}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          Actualizar
        </Button>
      </Stack>

      {showCompletedSummary && (
        <Box
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 3,
            backgroundColor: BAC.bgSoft,
            border: `1px solid ${BAC.border}`,
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box sx={{ minWidth: 240, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                Avance del expediente
              </Typography>
              <LinearProgress
                variant="determinate"
                value={summary.percent}
                sx={{
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: "#E5E7EB",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    backgroundColor: BAC.primary,
                  },
                }}
              />
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={`Total: ${summary.total}`} />
              <Chip
                label={`Completos: ${summary.completed}`}
                sx={{ bgcolor: "#E8F5E9", color: BAC.success, fontWeight: 700 }}
              />
              <Chip
                label={`Pendientes: ${summary.pending}`}
                sx={{ bgcolor: "#FFF3E0", color: BAC.warning, fontWeight: 700 }}
              />
              <Chip
                label={`${summary.percent}%`}
                sx={{ bgcolor: "#FEE2E2", color: BAC.primaryDark, fontWeight: 800 }}
              />
            </Stack>
          </Stack>
        </Box>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      <TableContainer
        sx={{
          border: `1px solid ${BAC.border}`,
          borderRadius: 3,
          overflowX: "auto",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                bgcolor: "#F9FAFB",
                "& .MuiTableCell-root": {
                  fontWeight: 800,
                  color: BAC.accent,
                  whiteSpace: "nowrap",
                },
              }}
            >
              <TableCell>#</TableCell>
              <TableCell>Sección</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Archivo</TableCell>
              <TableCell>Fecha carga</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {!loading && visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Stack spacing={1} alignItems="center">
                    <DescriptionIcon sx={{ fontSize: 36, color: "text.disabled" }} />
                    <Typography variant="body2" color="text.secondary">
                      No hay documentos para mostrar.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}

            {visibleRows.map((row, index) => {
              const hasUploadedDocument = !!row.uploaded_document_id;
              const canPreview = !!row.uploaded_document_id;
              const isUploading = uploadingId === row.checklist_item_id;

              return (
                <TableRow
                  key={row.checklist_item_id}
                  hover
                  sx={{
                    "&:last-child td": { borderBottom: 0 },
                    opacity: isUploading ? 0.7 : 1,
                  }}
                >
                  <TableCell>{index + 1}</TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.section || "-"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Stack spacing={0.4}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {row.title}
                      </Typography>

                      {row.is_mandatory && (
                        <Typography variant="caption" color="text.secondary">
                          Requerido
                        </Typography>
                      )}

                      {!!row.code && (
                        <Typography variant="caption" color="text.secondary">
                          Código: {row.code}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>

                  <TableCell>{completionChip(row.is_completed)}</TableCell>

                  <TableCell sx={{ maxWidth: 260 }}>
                    {hasUploadedDocument ? (
                      <Tooltip title={row.uploaded_file_name || "Documento cargado"}>
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 240,
                          }}
                        >
                          {row.uploaded_file_name || "Archivo cargado"}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Sin archivo
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.uploaded_at || "-"}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="center"
                      flexWrap="wrap"
                    >
                      {canPreview && (
                        <Tooltip title="Ver documento">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenPreview(row)}
                              disabled={isUploading}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}

                      {!readOnly && (
                        <Tooltip title={hasUploadedDocument ? "Reemplazar archivo" : "Subir archivo"}>
                          <span>
                            <Button
                              size="small"
                              variant={hasUploadedDocument ? "outlined" : "contained"}
                              startIcon={
                                isUploading ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <UploadFileIcon />
                                )
                              }
                              onClick={() => handleClickUpload(row)}
                              disabled={isUploading}
                              sx={{
                                textTransform: "none",
                                borderRadius: 2,
                                fontWeight: 700,
                                minWidth: 130,
                                ...(hasUploadedDocument
                                  ? {}
                                  : {
                                      bgcolor: BAC.primary,
                                      "&:hover": { bgcolor: BAC.primaryDark },
                                    }),
                              }}
                            >
                              {isUploading
                                ? "Subiendo..."
                                : hasUploadedDocument
                                ? "Reemplazar"
                                : "Subir"}
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileSelected}
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
      />

      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: 800,
            color: BAC.accent,
            borderBottom: `1px solid ${BAC.border}`,
            pr: 1,
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              pr: 2,
            }}
          >
            {previewFile?.name || "Vista previa del documento"}
          </Box>

          <IconButton onClick={handleClosePreview}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            p: 0,
            backgroundColor: "#F9FAFB",
            minHeight: "70vh",
          }}
        >
          {previewLoading && (
            <Box
              sx={{
                minHeight: "70vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
                backgroundColor: "#fff",
              }}
            >
              <Stack spacing={2} alignItems="center">
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Cargando documento...
                </Typography>
              </Stack>
            </Box>
          )}

          {!previewLoading && previewFile?.type === "image" && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 2,
                minHeight: "70vh",
                backgroundColor: "#111827",
              }}
            >
              <Box
                component="img"
                src={previewFile.url}
                alt={previewFile.name}
                sx={{
                  maxWidth: "100%",
                  maxHeight: "65vh",
                  objectFit: "contain",
                  borderRadius: 2,
                  boxShadow: 3,
                  backgroundColor: "#fff",
                }}
              />
            </Box>
          )}

          {!previewLoading && previewFile?.type === "pdf" && (
            <Box sx={{ width: "100%", height: "70vh", backgroundColor: "#fff" }}>
              <iframe
                src={previewFile.url}
                title={previewFile.name}
                width="100%"
                height="100%"
                style={{ border: "none" }}
              />
            </Box>
          )}

          {!previewLoading && previewFile?.type === "other" && (
            <Box
              sx={{
                minHeight: "70vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
              }}
            >
              <Stack spacing={2} alignItems="center">
                <DescriptionIcon sx={{ fontSize: 52, color: "text.secondary" }} />
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  Este tipo de archivo no tiene vista previa embebida.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Puedes abrirlo en otra pestaña.
                </Typography>
                <Button
                  variant="contained"
                  href={previewFile?.url}
                  target="_blank"
                  rel="noreferrer"
                  startIcon={<OpenInNewIcon />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                    bgcolor: BAC.primary,
                    "&:hover": { bgcolor: BAC.primaryDark },
                  }}
                >
                  Abrir documento
                </Button>
              </Stack>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            onClick={handleClosePreview}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Cerrar
          </Button>

          {previewFile?.url && !previewLoading && (
            <Button
              variant="contained"
              href={previewFile.url}
              target="_blank"
              rel="noreferrer"
              startIcon={<OpenInNewIcon />}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: BAC.primary,
                "&:hover": { bgcolor: BAC.primaryDark },
              }}
            >
              Abrir en otra pestaña
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Paper>
  );
}