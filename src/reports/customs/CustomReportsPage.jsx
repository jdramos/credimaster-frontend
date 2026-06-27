import React, { useState } from "react";

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

  const handleEdit = (report) => {
    setSelectedReport(report);
    setMode("designer");
  };

  const handleRun = (report) => {
    setSelectedReport(report);
    setMode("runner");
  };

  const handleDuplicate = (report) => {
    setSelectedReport({
      ...report,
      id: null,
      name: `${report.name} - Copia`,
      duplicateFromId: report.id,
    });

    setMode("designer");
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
