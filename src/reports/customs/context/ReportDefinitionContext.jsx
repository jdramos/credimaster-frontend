import { createContext, useContext, useMemo, useState } from "react";

const ReportDefinitionContext = createContext(null);

const DEMO_SOURCES = [
  {
    key: "balances",
    label: "Saldos",
    fields: [
      {
        name: "loan_id",
        label: "No. Crédito",
        type: "string",
        format: "text",
        category: "Crédito",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      {
        name: "customer_name",
        label: "Cliente",
        type: "string",
        format: "text",
        category: "Cliente",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      {
        name: "branch_name",
        label: "Sucursal",
        type: "string",
        format: "text",
        category: "Sucursal",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      {
        name: "collector_name",
        label: "Gestor",
        type: "string",
        format: "text",
        category: "Cobranza",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      {
        name: "capital_balance",
        label: "Saldo Capital",
        type: "currency",
        format: "money",
        category: "Saldos",
        filterable: true,
        sortable: true,
        totalable: true,
      },
      {
        name: "interest_balance",
        label: "Saldo Interés",
        type: "currency",
        format: "money",
        category: "Saldos",
        filterable: true,
        sortable: true,
        totalable: true,
      },
      {
        name: "total_balance",
        label: "Saldo Total",
        type: "currency",
        format: "money",
        category: "Saldos",
        filterable: true,
        sortable: true,
        totalable: true,
      },
      {
        name: "defaulted_days",
        label: "Días Mora",
        type: "number",
        format: "number",
        category: "Mora",
        filterable: true,
        sortable: true,
        groupable: true,
      },
    ],
  },
];

const initialDefinition = {
  id: null,
  name: "",
  description: "",
  source: "balances",

  orientation: "landscape",
  paperSize: "letter",
  is_public: 0,
  showRowNumbers: true,

  pageHeader: {
    showCompany: true,
    showLogo: true,
    title: "",
    subtitle: "",
  },

  pageFooter: {
    showDate: true,
    showUser: true,
    showPageNumber: true,
  },

  fields: [],
  filters: [],
  groups: [],
  sorts: [],
  totals: [],
  styles: {},
};

export const ReportDefinitionProvider = ({ children }) => {
  const [definition, setDefinition] = useState(initialDefinition);
  const [sources, setSources] = useState(DEMO_SOURCES);

  const selectedSource = useMemo(() => {
    return sources.find((source) => source.key === definition.source) || null;
  }, [sources, definition.source]);

  const sourceFields = useMemo(() => {
    return selectedSource?.fields || [];
  }, [selectedSource]);

  const fieldMap = useMemo(() => {
    const map = {};
    sourceFields.forEach((field) => {
      map[field.name] = field;
    });
    return map;
  }, [sourceFields]);

  const categories = useMemo(() => {
    const grouped = {};

    sourceFields.forEach((field) => {
      const category = field.category || "General";

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(field);
    });

    return Object.entries(grouped).map(([category, fields]) => ({
      category,
      fields,
    }));
  }, [sourceFields]);

  const selectedFieldNames = useMemo(() => {
    return definition.fields.map((field) => field.name);
  }, [definition.fields]);

  const selectedFields = useMemo(() => {
    return definition.fields.map((field) => ({
      ...fieldMap[field.name],
      ...field,
    }));
  }, [definition.fields, fieldMap]);

  const filterableFields = useMemo(() => {
    return sourceFields.filter((field) => field.filterable !== false);
  }, [sourceFields]);

  const groupableFields = useMemo(() => {
    return sourceFields.filter((field) => field.groupable === true);
  }, [sourceFields]);

  const sortableFields = useMemo(() => {
    return sourceFields.filter((field) => field.sortable !== false);
  }, [sourceFields]);

  const totalableFields = useMemo(() => {
    return sourceFields.filter((field) => field.totalable === true);
  }, [sourceFields]);

  const updateDefinition = (changes) => {
    setDefinition((prev) => ({
      ...prev,
      ...changes,
    }));
  };

  const changeSource = (sourceKey) => {
    setDefinition((prev) => ({
      ...prev,
      source: sourceKey,
      fields: [],
      filters: [],
      groups: [],
      sorts: [],
      totals: [],
    }));
  };

  const updatePageHeader = (changes) => {
    setDefinition((prev) => ({
      ...prev,
      pageHeader: {
        ...prev.pageHeader,
        ...changes,
      },
    }));
  };

  const updatePageFooter = (changes) => {
    setDefinition((prev) => ({
      ...prev,
      pageFooter: {
        ...prev.pageFooter,
        ...changes,
      },
    }));
  };

  const addField = (field) => {
    setDefinition((prev) => {
      if (prev.fields.some((item) => item.name === field.name)) {
        return prev;
      }

      return {
        ...prev,
        fields: [
          ...prev.fields,
          {
            name: field.name,
            label: field.label || field.name,
            visible: true,
            width: field.width || 120,
            align:
              field.type === "number" || field.type === "currency"
                ? "right"
                : "left",
            format: field.format || "text",
            type: field.type || "string",
            totalable: !!field.totalable,
            wrap: false,
          },
        ],
      };
    });
  };

  const removeField = (fieldName) => {
    setDefinition((prev) => ({
      ...prev,
      fields: prev.fields.filter((field) => field.name !== fieldName),
      filters: prev.filters.filter((filter) => filter.field !== fieldName),
      groups: prev.groups.filter((group) => group.field !== fieldName),
      sorts: prev.sorts.filter((sort) => sort.field !== fieldName),
      totals: prev.totals.filter((total) => total.field !== fieldName),
    }));
  };

  const updateField = (index, changes) => {
    setDefinition((prev) => {
      const fields = [...prev.fields];

      fields[index] = {
        ...fields[index],
        ...changes,
      };

      return {
        ...prev,
        fields,
      };
    });
  };

  const moveField = (fromIndex, toIndex) => {
    setDefinition((prev) => {
      const fields = [...prev.fields];

      if (toIndex < 0 || toIndex >= fields.length) {
        return prev;
      }

      const [removed] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, removed);

      return {
        ...prev,
        fields,
      };
    });
  };

  const setFilters = (filters) => {
    setDefinition((prev) => ({
      ...prev,
      filters,
    }));
  };

  const setGroups = (groups) => {
    setDefinition((prev) => ({
      ...prev,
      groups,
    }));
  };

  const setSorts = (sorts) => {
    setDefinition((prev) => ({
      ...prev,
      sorts,
    }));
  };

  const setTotals = (totals) => {
    setDefinition((prev) => ({
      ...prev,
      totals,
    }));
  };

  const resetDefinition = () => {
    setDefinition(initialDefinition);
  };

  const value = {
    definition,
    setDefinition,
    updateDefinition,
    changeSource,

    sources,
    setSources,
    selectedSource,
    sourceFields,
    fieldMap,
    categories,

    selectedFieldNames,
    selectedFields,
    filterableFields,
    groupableFields,
    sortableFields,
    totalableFields,

    updatePageHeader,
    updatePageFooter,

    addField,
    removeField,
    updateField,
    moveField,

    setFilters,
    setGroups,
    setSorts,
    setTotals,

    resetDefinition,
  };

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
