import { useMemo, useState } from "react";
import { Box } from "@mui/material";

import { useReportDefinition } from "../../../../custom/context/ReportDefinitionContext";
import { useStudio } from "../../../context/StudioContext";

import SearchField from "../../../components/SearchField";
import AvailableFieldsPanel from "./AvailableFieldsPanel";
import DatasetDesigner from "./DatasetDesigner";

const DatasetDesignerWorkspace = () => {
  const {
    sourceFields,
    selectedFields,
    selectedFieldNames,
    addField,
    removeField,
  } = useReportDefinition();

  const { setSelectedObject } = useStudio();

  const [search, setSearch] = useState("");

  const availableFields = useMemo(() => {
    return sourceFields.filter((field) => {
      const term = search.toLowerCase();

      return (
        field.label?.toLowerCase().includes(term) ||
        field.name?.toLowerCase().includes(term) ||
        field.category?.toLowerCase().includes(term)
      );
    });
  }, [sourceFields, search]);

  const handleSelectField = (field) => {
    setSelectedObject({
      ...field,
      type: "field",
      objectType: "selectedField",
    });
  };

  const handleAddField = (field) => {
    addField(field);
    handleSelectField(field);
  };

  return (
    <Box>
      <SearchField value={search} onChange={setSearch} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 2,
          mt: 2,
        }}
      >
        <AvailableFieldsPanel
          fields={availableFields}
          selectedFieldNames={selectedFieldNames}
          onAddField={handleAddField}
          onSelectField={handleSelectField}
        />

        <DatasetDesigner
          fields={selectedFields}
          onSelectField={handleSelectField}
          onRemoveField={removeField}
        />
      </Box>
    </Box>
  );
};

export default DatasetDesignerWorkspace;
