import { buildReportHeader } from "./reportHeader";
import { buildReportFooter } from "./reportFooter";

export const buildReportLayout = ({
  company,
  user,
  title,
  subtitle,
  content,
}) => {
  return `
  <html>

    <head>

      <style>

        body{
          font-family:Arial,sans-serif;
          margin:20px;
          color:#0F172A;
        }

        .report-header{
          display:flex;
          gap:15px;
          align-items:center;
          border-bottom:2px solid #005AA7;
          padding-bottom:10px;
        }

        .company-logo{
          width:80px;
        }

        .company-name{
          font-size:20px;
          font-weight:900;
          color:#005AA7;
        }

        .report-title{
          margin-top:10px;
          text-align:center;
          font-size:18px;
          font-weight:900;
        }

        .report-subtitle{
          text-align:center;
          margin-bottom:15px;
          color:#64748B;
        }

        .report-footer{
          margin-top:20px;
          border-top:1px solid #CBD5E1;
          padding-top:5px;
          font-size:10px;
          color:#64748B;
        }

      </style>

    </head>

    <body>

      ${buildReportHeader({
        company,
        title,
        subtitle,
      })}

      ${content}

      ${buildReportFooter({
        user,
      })}

    </body>

  </html>
  `;
};
