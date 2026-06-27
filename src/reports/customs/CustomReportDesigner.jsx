// src/reports/customs/CustomReportDesigner.jsx

import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Button,
  Stack,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import {
  ReportDefinitionProvider,
  useReportDefinition,
} from "./context/ReportDefinitionContext";

import API from "../../api";

import GeneralTab from "../tabs/GeneralTab";
import FieldsTab from "../tabs/FieldsTab";
import FiltersTab from "../tabs/FiltersTab";
import GroupsTab from "../tabs/GroupsTab";
import SortsTab from "../tabs/SortsTab";
import TotalsTab from "../tabs/TotalsTab";
import PreviewTab from "../tabs/PreviewTab";

const buildDefinitionFromReport = (report) => {
  if (!report) return null;

  const rawDefinition =
    typeof report.definition === "string"
      ? JSON.parse(report.definition || "{}")
      : report.definition || {};

  return {
    ...rawDefinition,

    id: report.id || null,
    name: report.name || rawDefinition.name || "",
    description: report.description || rawDefinition.description || "",

    source:
      rawDefinition.source ||
      rawDefinition.source_key ||
      report.source_key ||
      "",

    source_key:
      rawDefinition.source_key ||
      rawDefinition.source ||
      report.source_key ||
      "",

    orientation: rawDefinition.orientation || report.orientation || "landscape",

    paperSize:
      rawDefinition.paperSize ||
      rawDefinition.page_size ||
      report.page_size ||
      "letter",

    is_public: Number(report.is_public ?? rawDefinition.is_public ?? 0),

    pageHeader: {
      ...(rawDefinition.pageHeader || {}),
      title:
        rawDefinition.pageHeader?.title || report.title || report.name || "",
      subtitle: rawDefinition.pageHeader?.subtitle || report.subtitle || "",
    },

    pageFooter: {
      showDate: true,
      showUser: true,
      showPageNumber: true,
      ...(rawDefinition.pageFooter || {}),
    },

    fields: rawDefinition.fields || [],
    filters: rawDefinition.filters || [],
    groups: rawDefinition.groups || [],
    sorts: rawDefinition.sorts || [],
    totals: rawDefinition.totals || [],
    styles: rawDefinition.styles || {},
  };
};

const CustomReportDesignerContent = ({ report, onBack }) => {
  const [tab, setTab] = useState(0);
  const { definition, setDefinition } = useReportDefinition();

  const isEdit = Boolean(report?.id && !report?.duplicateFromId);

  useEffect(() => {
    const nextDefinition = buildDefinitionFromReport(report);

    if (nextDefinition) {
      setDefinition(nextDefinition);
    }
  }, [report, setDefinition]);

  const buildPayload = () => {
    const sourceKey = definition.source || definition.source_key;

    return {
      name: definition.name,
      description: definition.description || null,
      module: "reports",
      source_key: sourceKey,

      title:
        definition.pageHeader?.title ||
        definition.name ||
        "Reporte personalizado",

      subtitle: definition.pageHeader?.subtitle || null,
      orientation: definition.orientation || "landscape",
      page_size: definition.paperSize || "letter",
      is_public: Number(definition.is_public || 0),

      definition: {
        ...definition,
        source: sourceKey,
        source_key: sourceKey,
      },
    };
  };

  const handleSave = async () => {
    try {
      if (!definition.name) {
        alert("Escribe el nombre del reporte.");
        return;
      }

      if (!definition.source && !definition.source_key) {
        alert("Selecciona una fuente de datos.");
        return;
      }

      if (!definition.fields?.length) {
        alert("Selecciona al menos un campo.");
        return;
      }

      const payload = buildPayload();

      const res = isEdit
        ? await API.put(`/api/custom-reports/${report.id}`, payload)
        : await API.post("/api/custom-reports", payload);

      alert(res.data?.data?.message || "Reporte guardado correctamente.");

      if (onBack) onBack();
    } catch (error) {
      console.error("Error guardando reporte:", error);

      alert(
        error.response?.data?.message ||
          error.message ||
          "No se pudo guardar el reporte.",
      );
    }
  };

  const handlePreview = () => {
    setTab(6);
  };

  const tabs = [
    "General",
    "Campos",
    "Filtros",
    "Agrupaciones",
    "Orden",
    "Totales",
    "Vista previa",
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            {onBack && (
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={onBack}
              >
                Volver
              </Button>
            )}

            <Box>
              <Typography variant="h6" fontWeight="bold">
                {isEdit ? "Editar Reporte" : "Diseñador de Reportes"}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {isEdit
                  ? "Modifica la definición del reporte personalizado."
                  : "Construye reportes personalizados usando datasets del sistema."}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleSave}>
              {isEdit ? "Actualizar" : "Guardar"}
            </Button>

            <Button variant="contained" onClick={handlePreview}>
              Generar vista previa
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((label) => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>

        <Box sx={{ p: 2 }}>
          {tab === 0 && <GeneralTab />}
          {tab === 1 && <FieldsTab />}
          {tab === 2 && <FiltersTab />}
          {tab === 3 && <GroupsTab />}
          {tab === 4 && <SortsTab />}
          {tab === 5 && <TotalsTab />}
          {tab === 6 && <PreviewTab />}
        </Box>
      </Paper>
    </Box>
  );
};

const CustomReportDesigner = ({ report = null, onBack }) => {
  return (
    <ReportDefinitionProvider>
      <CustomReportDesignerContent report={report} onBack={onBack} />
    </ReportDefinitionProvider>
  );
};

export default CustomReportDesigner;
