import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableFieldItem = ({ field, index, onSelectField, onRemoveField }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.name,
  });

  return (
    <Stack
      ref={setNodeRef}
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        p: 1,
        borderRadius: 1,
        border: "1px solid",
        borderColor: isDragging ? "primary.main" : "divider",
        bgcolor: isDragging ? "action.selected" : "background.paper",
        cursor: "pointer",
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      onClick={() => onSelectField(field, index)}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          {...attributes}
          {...listeners}
          sx={{
            display: "flex",
            cursor: "grab",
            color: "text.secondary",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={700}>
            {index + 1}. {field.label}
          </Typography>

          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
            <Chip label={field.format || "text"} size="small" />
            {field.totalable && <Chip label="Totalizable" size="small" />}
          </Stack>
        </Box>
      </Stack>

      <Button
        size="small"
        color="error"
        onClick={(e) => {
          e.stopPropagation();
          onRemoveField(field.name);
        }}
      >
        Quitar
      </Button>
    </Stack>
  );
};

export default SortableFieldItem;
