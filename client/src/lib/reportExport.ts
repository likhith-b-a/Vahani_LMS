export interface TabularReport {
  type: string;
  generatedAt: string;
  rows: Array<Record<string, string | number | null>>;
}

export const getReportHeaders = (rows: Array<Record<string, string | number | null>>) => {
  const headers: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      headers.push(key);
    }
  }

  return headers;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const downloadCsvReport = (report: TabularReport, filePrefix = "report") => {
  if (!report.rows.length) return;

  const headers = getReportHeaders(report.rows);
  const csv = [
    headers.join(","),
    ...report.rows.map((row) =>
      headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportReportAsPdf = (
  report: TabularReport,
  title: string,
  filePrefix = "report",
) => {
  if (!report.rows.length) return;

  const headers = getReportHeaders(report.rows);
  const tableRows = report.rows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${escapeHtml(String(row[header] ?? ""))}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
      h1 { font-size: 20px; margin: 0 0 8px; }
      p { color: #4b5563; font-size: 12px; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>Generated on ${escapeHtml(new Date(report.generatedAt).toLocaleString("en-IN"))}</p>
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    <script>
      window.onload = () => {
        document.title = "${escapeHtml(filePrefix)}";
        window.print();
      };
    </script>
  </body>
</html>`;

  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
