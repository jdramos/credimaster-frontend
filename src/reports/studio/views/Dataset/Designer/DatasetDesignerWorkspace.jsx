import { useMemo, useState } from "react";
import { Box } from "@mui/material";

import { useReportDefinition } from "../../../../custom/context/ReportDefinitionContext";
import { useStudio } from "../../../context/StudioContext";

import SearchField from "../../../components/SearchField";
import AvailableFieldsPanel from "./panels/AvailableFieldsPanel";
import DatasetDesigner from "./panels/DatasetDesigner";
import CalculatedFieldsPanel from "./panels/CalculatedFieldsPanel";

const DatasetDesignerWorkspace = () => {
  const {
    sourceFields,
    selectedFields,
    selectedFieldNames,
    addField,
    removeField,
    moveField,
  } = useReportDefinition();

  const { setSelectedObject } = useStudio();

  const [search, setSearch] = useState("");

  const availableFields = useMemo(() => {
    const term = search.toLowerCase();

    return sourceFields.filter((field) => {
      return (
        field.label?.toLowerCase().includes(term) ||
        field.name?.toLowerCase().includes(term) ||
        field.category?.toLowerCase().includes(term)
      );
    });
  }, [sourceFields, search]);

  const handleSelectField = (field, index) => {
    setSelectedObject({
      type: "field",
      index,
      name: field.name,
    });
  };

  const handleAddField = (field) => {
    addField(field);

    setSelectedObject({
      type: "field",
      index: selectedFields.length,
      name: field.name,
    });
  };

  const handleMoveFields = ({ fromIndex, toIndex }) => {
    moveField(fromIndex, toIndex);
  };

  return (
    <Box>
      <SearchField value={search} onChange={setSearch} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr 1fr",
          gap: 2,
          mt: 2,
          alignItems: "stretch",
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
          onMoveField={handleMoveFields}
        />

        <CalculatedFieldsPanel />
      </Box>
    </Box>
  );
};

export default DatasetDesignerWorkspace;
