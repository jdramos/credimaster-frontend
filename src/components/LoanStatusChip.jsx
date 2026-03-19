const statusConfig = {
  SUBMITTED: {
    label: "Enviado",
    color: "default",
    icon: <AssignmentTurnedInIcon />,
  },
  UNDER_REVIEW: {
    label: "En revisión",
    color: "warning",
    icon: <HourglassEmptyIcon />,
  },
  APPROVED: {
    label: "Aprobado",
    color: "success",
    icon: <CheckCircleIcon />,
  },
  REJECTED: {
    label: "Rechazado",
    color: "error",
    icon: <CancelIcon />,
  },
  DISBURSED: {
    label: "Desembolsado",
    color: "info",
    icon: <PaidIcon />,
  },
  CANCELLED: {
    label: "Cancelado",
    color: "secondary",
    icon: <BlockIcon />,
  },
};