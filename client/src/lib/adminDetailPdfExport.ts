import type { AdminProgrammeDetail, AdminUserDetail } from "@/api/admin";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "--";

const roleLabel = (role: AdminUserDetail["role"]) =>
  role === "programme_manager"
    ? "Programme manager"
    : role === "admin"
      ? "Admin"
      : "Scholar";

const openPrintWindow = (title: string, filePrefix: string, body: string) => {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1300,height=900");
  if (!printWindow) return;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 24px;
        font-family: Arial, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .page {
        max-width: 1100px;
        margin: 0 auto;
      }
      .section {
        background: #ffffff;
        border: 1px solid #dbe5f0;
        border-radius: 22px;
        padding: 20px;
        margin-bottom: 20px;
      }
      .hero {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }
      .title {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      }
      .subtle {
        color: #64748b;
        font-size: 13px;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
        margin-top: 10px;
        color: #64748b;
        font-size: 14px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 8px;
      }
      .badge.dark {
        background: #0f172a;
        color: #ffffff;
        border-color: #0f172a;
      }
      .badge.soft {
        background: #f8fafc;
        color: #0f172a;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-top: 18px;
      }
      .stat {
        border: 1px solid #dbe5f0;
        border-radius: 18px;
        padding: 14px 16px;
      }
      .stat-label {
        color: #64748b;
        font-size: 13px;
      }
      .stat-value {
        margin-top: 8px;
        font-size: 18px;
        font-weight: 700;
      }
      .section-title {
        margin: 0 0 16px;
        font-size: 20px;
        font-weight: 700;
      }
      .programme-card {
        border: 1px solid #dbe5f0;
        border-radius: 18px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .programme-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }
      .programme-name {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
      }
      .programme-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-top: 10px;
        color: #64748b;
        font-size: 12px;
      }
      .grid-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 14px;
      }
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border: 1px solid #dbe5f0;
        border-radius: 14px;
        overflow: hidden;
        font-size: 13px;
      }
      th, td {
        padding: 12px 14px;
        border-bottom: 1px solid #e5edf5;
        text-align: left;
        vertical-align: top;
      }
      th {
        color: #64748b;
        font-weight: 600;
        background: #ffffff;
      }
      tr:last-child td {
        border-bottom: 0;
      }
      .right {
        text-align: right;
      }
      @media print {
        body {
          background: #ffffff;
          padding: 0;
        }
        .section {
          break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <div class="page">${body}</div>
    <script>
      window.onload = () => {
        document.title = "${escapeHtml(filePrefix)}";
        window.print();
      };
    </script>
  </body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

export const exportAdminUserDetailPdf = (userDetail: AdminUserDetail) => {
  const topStats =
    userDetail.role === "scholar"
      ? [
          ["Programme history", String(userDetail.programmeHistory.length)],
          ["Certificates", String(userDetail.certificates.length)],
          ["Credits earned", String(userDetail.creditsEarned)],
        ]
      : userDetail.role === "programme_manager"
        ? [
            ["Managed programmes", String(userDetail.managedProgrammes.length)],
            ["Certificates issued", String(userDetail.certificates.length)],
            [
              "Completed scholars",
              String(
                userDetail.managedProgrammes.reduce(
                  (sum, programme) => sum + programme.completedScholarCount,
                  0,
                ),
              ),
            ],
          ]
        : [["Created on", formatDate(userDetail.createdAt)], ["Role", roleLabel(userDetail.role)], ["Email", userDetail.email]];

  const scholarProgrammeHistory =
    userDetail.role === "scholar"
      ? `
      <div class="section">
        <h2 class="section-title">Programme history</h2>
        ${userDetail.programmeHistory
          .map(
            (entry) => `
            <div class="programme-card">
              <div class="programme-head">
                <div>
                  <h3 class="programme-name">${escapeHtml(entry.programme.title)}</h3>
                  <div class="subtle">Programme manager: ${escapeHtml(entry.programme.programmeManager?.name || "--")}</div>
                </div>
                <div>
                  <span class="badge soft">${escapeHtml(entry.status)}</span>
                  ${entry.certificate ? `<span class="badge dark">Certified</span>` : ""}
                </div>
              </div>
              <div class="programme-meta">
                <span>Enrolled: ${escapeHtml(formatDate(entry.enrolledAt))}</span>
                <span>Completed: ${escapeHtml(formatDate(entry.completedAt))}</span>
                <span>Credits awarded: ${escapeHtml(String(entry.creditsAwarded))}</span>
                <span>Attendance: ${escapeHtml(String(entry.attendanceSummary.attendancePercent ?? "--"))}%</span>
                <span>Overall: ${escapeHtml(String(entry.overallPercent ?? "--"))}%</span>
              </div>
              <div class="grid-2">
                <table>
                  <thead>
                    <tr><th>Assignment</th><th>Status</th><th class="right">Marks</th></tr>
                  </thead>
                  <tbody>
                    ${entry.assignments
                      .map(
                        (assignment) => `
                          <tr>
                            <td>${escapeHtml(assignment.title)}</td>
                            <td>${escapeHtml(assignment.status.replaceAll("_", " "))}</td>
                            <td class="right">${escapeHtml(String(assignment.score ?? "--"))}${assignment.maxScore ? ` / ${escapeHtml(String(assignment.maxScore))}` : ""}</td>
                          </tr>`,
                      )
                      .join("")}
                  </tbody>
                </table>
                <table>
                  <thead>
                    <tr><th>Interactive session</th><th>Attendance</th><th class="right">Marks</th></tr>
                  </thead>
                  <tbody>
                    ${entry.interactiveSessions
                      .map(
                        (session) => `
                          <tr>
                            <td>${escapeHtml(session.title)}</td>
                            <td>${escapeHtml(session.attendanceStatus)}</td>
                            <td class="right">${escapeHtml(String(session.score ?? "--"))}${session.maxScore ? ` / ${escapeHtml(String(session.maxScore))}` : ""}</td>
                          </tr>`,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>`,
          )
          .join("")}
      </div>`
      : "";

  const certificatesSection =
    userDetail.certificates.length > 0
      ? `
      <div class="section">
        <h2 class="section-title">${userDetail.role === "programme_manager" ? "Issued certificates" : "Certificates"}</h2>
        <table>
          <thead>
            <tr>
              ${userDetail.role === "programme_manager" ? "<th>Scholar</th>" : ""}
              <th>Programme</th>
              <th>Credential ID</th>
              <th>Issued on</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${userDetail.certificates
              .map(
                (certificate) => `
                <tr>
                  ${userDetail.role === "programme_manager" ? `<td>${escapeHtml(certificate.scholarName || "--")}</td>` : ""}
                  <td>${escapeHtml(certificate.programmeTitle)}</td>
                  <td>${escapeHtml(certificate.credentialId)}</td>
                  <td>${escapeHtml(formatDate(certificate.issuedAt))}</td>
                  <td>${escapeHtml(certificate.status)}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const managedProgrammesSection =
    userDetail.role === "programme_manager"
      ? `
      <div class="section">
        <h2 class="section-title">Managed programmes</h2>
        <table>
          <thead>
            <tr>
              <th>Programme</th>
              <th>Created</th>
              <th class="right">Scholars</th>
              <th class="right">Completed</th>
              <th class="right">Assignments</th>
              <th class="right">Sessions</th>
              <th class="right">Certificates</th>
            </tr>
          </thead>
          <tbody>
            ${userDetail.managedProgrammes
              .map(
                (programme) => `
                <tr>
                  <td>${escapeHtml(programme.title)}</td>
                  <td>${escapeHtml(formatDate(programme.createdAt))}</td>
                  <td class="right">${escapeHtml(String(programme.scholarCount))}</td>
                  <td class="right">${escapeHtml(String(programme.completedScholarCount))}</td>
                  <td class="right">${escapeHtml(String(programme.assignmentCount))}</td>
                  <td class="right">${escapeHtml(String(programme.interactiveSessionCount))}</td>
                  <td class="right">${escapeHtml(String(programme.certificatesIssuedCount))}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const body = `
    <div class="section">
      <div class="hero">
        <div>
          <h1 class="title">${escapeHtml(userDetail.name)} <span class="badge soft">${escapeHtml(roleLabel(userDetail.role))}</span></h1>
          <div class="meta">
            <span>${escapeHtml(userDetail.email)}</span>
            <span>${escapeHtml(userDetail.phoneNumber || "No phone")}</span>
            ${userDetail.batch ? `<span>Batch: ${escapeHtml(userDetail.batch)}</span>` : ""}
          </div>
        </div>
        <div class="subtle">Joined on ${escapeHtml(formatDate(userDetail.createdAt))}</div>
      </div>
      <div class="stats">
        ${topStats
          .map(
            ([label, value]) => `
            <div class="stat">
              <div class="stat-label">${escapeHtml(label)}</div>
              <div class="stat-value">${escapeHtml(value)}</div>
            </div>`,
          )
          .join("")}
      </div>
    </div>
    ${scholarProgrammeHistory}
    ${managedProgrammesSection}
    ${certificatesSection}
  `;

  openPrintWindow(
    `${userDetail.name} details`,
    `${userDetail.name.replace(/\s+/g, "-").toLowerCase()}-detail`,
    body,
  );
};

export const exportAdminProgrammeDetailPdf = (programme: AdminProgrammeDetail) => {
  const body = `
    <div class="section">
      <div class="hero">
        <div>
          <h1 class="title">${escapeHtml(programme.title)} <span class="badge ${programme.resultsPublishedAt ? "dark" : "soft"}">${programme.resultsPublishedAt ? "Completed" : "Active"}</span></h1>
          <div class="subtle" style="max-width:800px; margin-top:10px;">${escapeHtml(programme.description || "No programme description added yet.")}</div>
          <div class="meta">
            <span>Handled by: ${escapeHtml(programme.programmeManager?.name || "Not assigned")}</span>
            <span>Enrolled ${escapeHtml(formatDate(programme.createdAt))}</span>
            <span>${escapeHtml(String(programme.assignments.filter((item) => item.pendingCount > 0).length))} pending</span>
          </div>
        </div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-label">Enrolled scholars</div><div class="stat-value">${escapeHtml(String(programme.enrolledScholars.length))}</div></div>
        <div class="stat"><div class="stat-label">Assignments</div><div class="stat-value">${escapeHtml(String(programme.assignments.length))}</div></div>
        <div class="stat"><div class="stat-label">Interactive sessions</div><div class="stat-value">${escapeHtml(String(programme.interactiveSessions.length))}</div></div>
      </div>
    </div>
    <div class="section">
      <h2 class="section-title">Enrolled scholars and results</h2>
      <table>
        <thead>
          <tr>
            <th>Scholar</th>
            <th>Batch</th>
            <th class="right">Assignment score</th>
            <th class="right">Session score</th>
            <th class="right">Overall</th>
            <th>Status</th>
            <th>Certificate</th>
          </tr>
        </thead>
        <tbody>
          ${programme.enrolledScholars
            .map(
              (scholar) => `
              <tr>
                <td>${escapeHtml(scholar.user.name)}<div class="subtle">${escapeHtml(scholar.user.email)}</div></td>
                <td>${escapeHtml(scholar.user.batch || "--")}</td>
                <td class="right">${escapeHtml(String(scholar.assignmentScore))}</td>
                <td class="right">${escapeHtml(String(scholar.sessionScore))}</td>
                <td class="right">${escapeHtml(String(scholar.totalScore))}/${escapeHtml(String(scholar.totalPossibleScore))} (${escapeHtml(String(scholar.overallPercent ?? "--"))}%)</td>
                <td>${escapeHtml(scholar.status)}</td>
                <td>${escapeHtml(scholar.certificate?.credentialId || "--")}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="section">
      <h2 class="section-title">Assignments and sessions</h2>
      <div class="grid-2">
        <table>
          <thead>
            <tr><th>Assignment</th><th>Type</th><th class="right">Submission progress</th></tr>
          </thead>
          <tbody>
            ${programme.assignments
              .map(
                (assignment) => `
                <tr>
                  <td>${escapeHtml(assignment.title)}</td>
                  <td>${escapeHtml(assignment.assignmentType)}</td>
                  <td class="right">${escapeHtml(String(assignment.submissionCount))}/${escapeHtml(String(assignment.totalScholars))}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <table>
          <thead>
            <tr><th>Interactive session</th><th>Date</th><th class="right">Attendance</th></tr>
          </thead>
          <tbody>
            ${programme.interactiveSessions
              .map(
                (session) => `
                <tr>
                  <td>${escapeHtml(session.title)}</td>
                  <td>${escapeHtml(formatDate(session.scheduledAt))}</td>
                  <td class="right">${escapeHtml(String(session.attendanceCount))} marked / ${escapeHtml(String(session.absentCount))} absent</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  openPrintWindow(
    `${programme.title} details`,
    `${programme.title.replace(/\s+/g, "-").toLowerCase()}-detail`,
    body,
  );
};
