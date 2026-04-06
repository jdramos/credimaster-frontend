import React, { useState } from "react";
import { Box, Button, Divider, Stack, Tab, Tabs } from "@mui/material";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";

import LoanModificationModal from "./LoanModificationModal";
import LoanModificationHistory from "./LoanModificationHistory";

export default function LoanModificationSection({ loan, user }) {
  const [tab, setTab] = useState(0);

  const [openCreate, setOpenCreate] = useState(false);
  const [openReview, setOpenReview] = useState(false);

  const [selectedModification, setSelectedModification] = useState(null);

  // 🔄 para refrescar historial
  const [reloadKey, setReloadKey] = useState(0);

  const handleReload = () => {
    setReloadKey((k) => k + 1);
  };

  return (
    <Box>
      {/* HEADER */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Historial de modificaciones" />
        </Tabs>

        <Button
          variant="contained"
          startIcon={<EditNoteOutlinedIcon />}
          onClick={() => setOpenCreate(true)}
        >
          Nueva modificación
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* HISTORIAL */}
      {tab === 0 && (
        <LoanModificationHistory
          key={reloadKey}
          loanId={loan?.id}
          onView={(row) => {
            setSelectedModification(row);
            setOpenReview(true);
          }}
        />
      )}

      {/* MODAL CREAR */}
      <LoanModificationModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        loan={loan}
        user={user}
        mode="create"
        onSaved={() => {
          setOpenCreate(false);
          handleReload();
        }}
      />

      {/* MODAL REVISAR / APROBAR */}
      <LoanModificationModal
        open={openReview}
        onClose={() => setOpenReview(false)}
        loan={loan}
        user={user}
        selectedModification={selectedModification}
        mode="review"
        onSaved={() => {
          handleReload();
        }}
      />
    </Box>
  );
}
