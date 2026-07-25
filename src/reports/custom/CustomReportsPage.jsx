import React, { useState } from "react";
import API from "../../api";

import CustomReportsList from "./CustomReportsList";
import CustomReportDesigner from "./CustomReportDesigner";
import CustomReportRunner from "./CustomReportRunner";

const CustomReportsPage = () => {
  const [mode, setMode] = useState("list");
  const [selectedReport, setSelectedReport] = useState(null);

  const handleNew = () => {
    setSelectedReport(null);
    setMode("designer");
  };

  const loadFullReport = async (report) => {
    const response = await API.get(`/api/custom-reports/${report.id}`);
    return response.data?.data || report;
  };

  const handleEdit = async (report) => {
    try {
      setSelectedReport(await loadFullReport(report));
      setMode("designer");
    } catch (error) {
      window.alert(error.response?.data?.message || "No se pudo abrir el reporte.");
    }
  };

  const handleRun = (report) => {
    setSelectedReport(report);
    setMode("runner");
  };

  const handleDuplicate = async (report) => {
    try {
      const fullReport = await loadFullReport(report);
      setSelectedReport({
        ...fullReport,
        id: null,
        name: `${fullReport.name} - Copia`,
        duplicateFromId: report.id,
      });
      setMode("designer");
    } catch (error) {
      window.alert(error.response?.data?.message || "No se pudo duplicar el reporte.");
    }
  };

  const handleBack = () => {
    setSelectedReport(null);
    setMode("list");
  };

  return (
    <>
      {mode === "list" && (
        <CustomReportsList
          onNew={handleNew}
          onEdit={handleEdit}
          onRun={handleRun}
          onDuplicate={handleDuplicate}
        />
      )}

      {mode === "designer" && (
        <CustomReportDesigner report={selectedReport} onBack={handleBack} />
      )}

      {mode === "runner" && (
        <CustomReportRunner report={selectedReport} onBack={handleBack} />
      )}
    </>
  );
};

export default CustomReportsPage;
