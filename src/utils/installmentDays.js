import dayjs from "dayjs";

// Días de pago de una cuota del estado de cuenta, para mostrar junto a
// "Pagado el" (pantalla, impresión y Excel calculan igual):
//   - pagada:            días entre el vencimiento y el pago (+ tarde, - antes)
//   - vencida sin pagar: días que lleva vencida a la fecha de corte
//   - por vencer:        sin valor
// Mismo criterio que el "pago promedio" de /api/loans/:id/payment-profile.
export const installmentDays = (row = {}, cutDate) => {
  const due = row.payment_date ? dayjs(String(row.payment_date).slice(0, 10)) : null;
  if (!due || !due.isValid()) return { days: null, kind: "none" };

  if (row.paid_at) {
    const paid = dayjs(String(row.paid_at).slice(0, 10));
    if (paid.isValid()) return { days: paid.diff(due, "day"), kind: "paid" };
  }

  const cut = dayjs(cutDate || undefined).startOf("day");
  if (due.isBefore(cut, "day")) return { days: cut.diff(due, "day"), kind: "overdue" };

  return { days: null, kind: "pending" };
};

// Texto corto: "+3", "-2", "0", "+15 venc." o "—".
export const installmentDaysLabel = (info) => {
  if (!info || info.days === null) return "—";
  if (info.kind === "overdue") return `+${info.days} venc.`;
  if (info.days > 0) return `+${info.days}`;
  return String(info.days);
};
