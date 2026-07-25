import { Divider, Paper, Stack, Typography } from "@mui/material";

import FieldsBuilder from "../builders/FieldsBuilder";
import GroupsBuilder from "../builders/GroupsBuilder";
import SortsBuilder from "../builders/SortsBuilder";
import TotalsBuilder from "../builders/TotalsBuilder";
import CalculatedBuilder from "../builders/CalculatedBuilder";

const DatasetDesigner = ({
  fields = [],
  onSelectField,
  onRemoveField,
  onMoveField,
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={800} sx={{ mb: 2 }}>
        Diseño del dataset
      </Typography>

      <Stack spacing={2}>
        <FieldsBuilder
          fields={fields}
          onSelectField={onSelectField}
          onRemoveField={onRemoveField}
          onMoveField={onMoveField}
        />

        <Divider />

        <GroupsBuilder />

        <Divider />

        <SortsBuilder />

        <Divider />

        <TotalsBuilder />

        <Divider />

        <CalculatedBuilder />
      </Stack>
    </Paper>
  );
};

export default DatasetDesigner;
