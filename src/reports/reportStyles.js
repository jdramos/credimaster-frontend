export const reportStyles = `
<style>
  @page {
    size: letter;
    margin: 10mm;
  }

  * {
    box-sizing: border-box;
  }

  body {
    font-family: Arial, sans-serif;
    color: #0F172A;
    font-size: 10px;
    margin: 0;
  }

  .report-header {
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 2px solid #005AA7;
    padding-bottom: 5px;
    margin-bottom: 6px;
  }

  .logo-box {
    width: 58px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .company-logo {
    max-width: 56px;
    max-height: 44px;
    object-fit: contain;
  }

  .company-info {
    flex: 1;
    line-height: 1.2;
  }

  .company-name {
    color: #005AA7;
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .company-legal {
    font-size: 9px;
    font-weight: 700;
    color: #334155;
  }

  .company-line {
    font-size: 8.5px;
    color: #475569;
  }

  .report-title-box {
    text-align: right;
    min-width: 180px;
  }

  .report-title {
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
    color: #0F172A;
  }

  .report-subtitle {
    margin-top: 2px;
    color: #475569;
    font-size: 9px;
  }

  .report-meta {
    margin-top: 2px;
    color: #64748B;
    font-size: 8.5px;
  }

  .report-filters {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
    margin: 6px 0;
  }

  .filter-item {
    border: 1px solid #D8E2F0;
    padding: 4px 5px;
  }

  .filter-label {
    font-size: 8px;
    color: #64748B;
  }

  .filter-value {
    font-size: 9px;
    font-weight: 700;
  }

  .report-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
    margin: 6px 0;
  }

  .summary-item {
    border: 1px solid #D8E2F0;
    padding: 5px;
  }

  .summary-label {
    font-size: 8px;
    color: #64748B;
  }

  .summary-value {
    font-size: 11px;
    font-weight: 900;
  }

  .report-section {
    margin-top: 7px;
  }

  .section-header {
    margin-bottom: 3px;
  }

  .section-title {
    font-size: 10px;
    font-weight: 800;
    color: #111827;
    border-bottom: 1px solid #CBD5E1;
    padding-bottom: 2px;
    text-transform: uppercase;
  }

  .section-subtitle {
    font-size: 8.5px;
    color: #64748B;
    margin-top: 1px;
  }

  .section-content {
    margin-top: 3px;
  }

  table.report-table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: auto;
  }

  .report-table thead {
    display: table-header-group;
  }

  .report-table tfoot {
    display: table-row-group;
  }

  .report-table tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  .report-table th {
    background: #005AA7;
    color: white;
    font-weight: 800;
    font-size: 8.5px;
    padding: 4px;
    border: 1px solid #CBD5E1;
  }

  .report-table td {
    font-size: 8.5px;
    padding: 3.5px 4px;
    border: 1px solid #CBD5E1;
    vertical-align: top;
  }

  .report-table tbody tr:nth-child(even) td {
    background: #F8FAFC;
  }

  .report-table tfoot td {
    background: #EAF2FF;
    font-weight: 900;
  }

  .group-row td {
    background: #DCEEFF !important;
    font-weight: 900;
    color: #0F172A;
  }

  .group-total-row td {
    background: #F1F5F9 !important;
    font-weight: 900;
  }

  .total-label {
    font-weight: 900;
  }

  .empty-row {
    color: #64748B;
    padding: 10px !important;
  }

  .right {
    text-align: right;
  }

  .center {
    text-align: center;
  }

  .nowrap {
    white-space: nowrap;
  }

  .note {
    padding: 6px;
    line-height: 1.35;
    text-align: justify;
  }

  .signatures {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 25px;
    margin-top: 40px;
  }

  .signature {
    text-align: center;
    border-top: 1px solid #1F2937;
    padding-top: 5px;
  }

  .report-footer {
    margin-top: 8px;
    padding-top: 5px;
    border-top: 1px solid #CBD5E1;
    font-size: 8.5px;
    color: #64748B;
    text-align: right;
  }

  .page-break {
    page-break-before: always;
  }


  .branch-row td {
  background: #DCEEFF !important;
  font-weight: 900;
}

.vendor-row td {
  background: #F1F5F9 !important;
  font-weight: 800;
}

.customer-row td {
  background: #FFFFFF;
}

.payments-table th,
.payments-table td {
  font-size: 8px;
  padding: 3px;
}

.customer-cell {
  min-width: 150px;
}

.group-row td {
  background: #EAF2FF !important;
  border-top: 2px solid #005AA7;
  border-bottom: 2px solid #005AA7;
  padding: 5px 6px !important;
}

.group-title {
  font-size: 9.5px;
  font-weight: 900;
  color: #003E8A;
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.group-total-row td {
  background: #F1F5F9 !important;
  font-weight: 900;
  border-top: 1.5px solid #94A3B8;
  border-bottom: 1.5px solid #94A3B8;
}

.report-context {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 8.8px;
  color: #475569;
}

.report-context div {
  white-space: nowrap;
}

.report-fields {
  display: grid;
  gap: 4px;
  margin-top: 4px;
}

.report-field {
  border: 1px solid #D8E2F0;
  padding: 4px 6px;
  min-height: 34px;
}

.report-field-label {
  font-size: 8px;
  color: #64748B;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.report-field-value {
  font-size: 10px;
  font-weight: 700;
  color: #111827;
}

.report-fields.compact .report-field {
  min-height: 28px;
  padding: 3px 5px;
}

.report-fields.compact .report-field-label {
  font-size: 7.5px;
}

.report-fields.compact .report-field-value {
  font-size: 9px;
}

.report-field.right {
    text-align:right;
}

.report-field.center {
    text-align:center;
}

.report-field.success .report-field-value{
    color:#15803D;
}

.report-field.warning .report-field-value{
    color:#D97706;
}

.report-field.danger .report-field-value{
    color:#DC2626;
}

.report-field.primary .report-field-value{
    color:#005AA7;
}

</style>
`;
