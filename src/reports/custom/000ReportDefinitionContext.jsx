import React, { createContext, useContext, useMemo, useState } from "react";

const ReportDefinitionContext = createContext(null);

const EMPTY_DEFINITION = {
  fields: [],
  filters: [],
  groups: [],
  sorts: [],
  totals: [],
  styles: {},
};

export const createEmptyReport = () => ({
  id: null,
  name: "",
  description: "",
  module: "reports",
  source_key: "balances",
  title: "",
  subtitle: "",
  orientation: "landscape",
  page_size: "letter",
  is_public: 0,
  definition: EMPTY_DEFINITION,
});

export const ReportDefinitionProvider = ({ initialReport, children }) => {
  const [report, setReport] = useState(initialReport || createEmptyReport());

  const updateReport = (patch) => {
    setReport((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const updateDefinition = (patch) => {
    setReport((prev) => ({
      ...prev,
      definition: {
        ...prev.definition,
        ...patch,
      },
    }));
  };

  const setFields = (fields) => updateDefinition({ fields });
  const setFilters = (filters) => updateDefinition({ filters });
  const setGroups = (groups) => updateDefinition({ groups });
  const setSorts = (sorts) => updateDefinition({ sorts });
  const setTotals = (totals) => updateDefinition({ totals });

  const value = useMemo(
    () => ({
      report,
      definition: report.definition || EMPTY_DEFINITION,

      updateReport,
      updateDefinition,

      setFields,
      setFilters,
      setGroups,
      setSorts,
      setTotals,
    }),
    [report],
  );

  return (
    <ReportDefinitionContext.Provider value={value}>
      {children}
    </ReportDefinitionContext.Provider>
  );
};

export const useReportDefinition = () => {
  const context = useContext(ReportDefinitionContext);

  if (!context) {
    throw new Error(
      "useReportDefinition debe usarse dentro de ReportDefinitionProvider",
    );
  }

  return context;
};
