const getStatusColor = (status) => {
  switch (status) {
    case "RECIBIDO":
      return "default";
    case "EN_ANALISIS":
      return "info";
    case "PENDIENTE_CLIENTE":
      return "warning";
    case "RESPONDIDO":
      return "success";
    case "CERRADO":
      return "success";
    case "RECHAZADO":
      return "error";
    default:
      return "default";
  }
};
