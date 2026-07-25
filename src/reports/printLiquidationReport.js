import { createReport } from "./createReport";
import { openReport } from "./reportViewer";
import { date, money } from "./reportUtils";

const MOTIVO_LABELS = {
  RENUNCIA: "Renuncia voluntaria",
  DESPIDO_JUSTIFICADO: "Despido con causa justificada",
  DESPIDO_INJUSTIFICADO: "Despido sin causa justificada",
  MUTUO_ACUERDO: "Mutuo acuerdo",
};

// Documento de liquidación (finiquito) — desglosa cada componente por
// separado (salario pendiente, vacaciones, aguinaldo, indemnización) para
// que quede claro cuáles llevan IR/INSS (salario y vacaciones) y cuáles no
// (aguinaldo e indemnización), tal como exige la legislación laboral.
export const printLiquidationReport = ({ company = {}, user = {}, liquidation = {} }) => {
  const fmt = (value) => money(value, "C$");

  const conceptos = [
    { label: "Salario pendiente", detalle: `${liquidation.pending_days} día(s)`, monto: liquidation.salario_pendiente, gravable: true },
    { label: "Vacaciones no gozadas", detalle: `${liquidation.vacaciones_dias} día(s)`, monto: liquidation.vacaciones_monto, gravable: true },
    { label: "Aguinaldo proporcional", detalle: "No gravable", monto: liquidation.aguinaldo_monto, gravable: false },
    { label: "Indemnización por antigüedad (Art. 45)", detalle: "No gravable", monto: liquidation.indemnizacion_monto, gravable: false },
  ].filter((c) => Number(c.monto) > 0);

  const deducciones = [
    { label: "IR sobre componentes gravables", monto: liquidation.ir },
    { label: "INSS laboral sobre componentes gravables", monto: liquidation.inss_laboral },
    { label: "Préstamo/anticipo de empleado (saldo total)", monto: liquidation.prestamo_deduccion },
  ].filter((d) => Number(d.monto) > 0);

  const html = createReport({
    company,
    user,
    title: "Liquidación Laboral (Finiquito)",
    subtitle: `${liquidation.employee_name} · Terminación: ${date(liquidation.termination_date)}`,
    orientation: "portrait",

    summary: [
      { label: "Total bruto", value: fmt(liquidation.total_bruto) },
      { label: "Total deducciones", value: fmt(Number(liquidation.ir || 0) + Number(liquidation.inss_laboral || 0) + Number(liquidation.prestamo_deduccion || 0)) },
      { label: "Neto a pagar", value: fmt(liquidation.total_neto) },
    ],

    sections: [
      {
        title: "Empleado",
        fields: {
          columns: 3,
          compact: true,
          items: [
            { label: "Nombre", value: liquidation.employee_name, span: 2 },
            { label: "Cédula", value: liquidation.id_card || "-" },
            { label: "Puesto", value: liquidation.position || "-" },
            { label: "Fecha de ingreso", value: date(liquidation.hire_date) },
            { label: "Fecha de terminación", value: date(liquidation.termination_date) },
            { label: "Motivo", value: MOTIVO_LABELS[liquidation.motivo] || liquidation.motivo },
            { label: "Años de servicio", value: `${liquidation.years_of_service || "-"} años` },
            { label: "Comprobante", value: liquidation.entry_no || "-" },
          ],
        },
      },
      {
        title: "Componentes de la liquidación",
        table: {
          rows: conceptos,
          columns: [
            { title: "Concepto", field: "label" },
            { title: "Detalle", field: "detalle" },
            { title: "Monto", field: "monto", formatter: (v) => fmt(v), total: true, width: "110px" },
          ],
          footer: { label: "Total bruto", autoTotals: true },
        },
      },
      {
        title: "Deducciones",
        table: {
          rows: deducciones,
          emptyMessage: "Sin deducciones.",
          columns: [
            { title: "Concepto", field: "label" },
            { title: "Monto", field: "monto", formatter: (v) => fmt(v), total: true, width: "110px" },
          ],
          footer: { label: "Total deducciones", autoTotals: true },
        },
      },
    ],
  });

  openReport(html);
};

export default printLiquidationReport;
