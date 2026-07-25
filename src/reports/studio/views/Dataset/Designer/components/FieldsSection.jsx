import { Stack, Typography } from "@mui/material";

import { DndContext, closestCenter } from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import SortableFieldItem from "./SortableFieldItem";

const FieldsSection = ({
  fields = [],
  onSelectField,
  onRemoveField,
  onMoveField,
}) => {
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((field) => field.name === active.id);
    const newIndex = fields.findIndex((field) => field.name === over.id);

    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(fields, oldIndex, newIndex);

    onMoveField?.(reordered);
  };

  return (
    <Stack spacing={1}>
      <Typography fontWeight={800}>Campos del reporte</Typography>

      {!fields.length && (
        <Typography variant="body2" color="text.secondary">
          Agrega campos desde el panel izquierdo.
        </Typography>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={fields.map((field) => field.name)}
          strategy={verticalListSortingStrategy}
        >
          <Stack spacing={1}>
            {fields.map((field, index) => (
              <SortableFieldItem
                key={field.name}
                field={field}
                index={index}
                onSelectField={onSelectField}
                onRemoveField={onRemoveField}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
    </Stack>
  );
};

export default FieldsSection;
