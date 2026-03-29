import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = (process.env.PERF_BASE_URL || process.env.API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const TARGET_MS = Number(process.env.PERF_TARGET_MS || 1000);
const ITERATIONS = Number(process.env.PERF_ITERATIONS || 2);
const REPORT_DIR = path.resolve(
  __dirname,
  "..",
  process.env.PERF_REPORT_DIR || "test-reports/perf",
);

const ADMIN_EMAIL = process.env.PERF_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.PERF_ADMIN_PASSWORD || "";
const MANAGER_EMAIL = process.env.PERF_MANAGER_EMAIL || "";
const MANAGER_PASSWORD = process.env.PERF_MANAGER_PASSWORD || "";
const SCHOLAR_EMAIL = process.env.PERF_SCHOLAR_EMAIL || "";
const SCHOLAR_PASSWORD = process.env.PERF_SCHOLAR_PASSWORD || "";

const required = [
  ["PERF_ADMIN_EMAIL", ADMIN_EMAIL],
  ["PERF_ADMIN_PASSWORD", ADMIN_PASSWORD],
  ["PERF_SCHOLAR_EMAIL", SCHOLAR_EMAIL],
  ["PERF_SCHOLAR_PASSWORD", SCHOLAR_PASSWORD],
];

const missing = required.filter(([, value]) => !String(value).trim()).map(([key]) => key);

if (missing.length > 0) {
  console.error(`Missing perf env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const timedFetch = async (label, url, options = {}) => {
  const startedAt = performance.now();
  const response = await fetch(url, options);
  const durationMs = Math.round(performance.now() - startedAt);

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    label,
    url,
    ok: response.ok,
    status: response.status,
    durationMs,
    data,
  };
};

const login = async (email, password, roleLabel) => {
  const result = await timedFetch(
    `${roleLabel}: login`,
    `${BASE_URL}/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );

  if (!result.ok) {
    throw new Error(`${roleLabel} login failed with ${result.status}: ${result.data?.message || "Unknown error"}`);
  }

  const accessToken = result.data?.data?.user?.accessToken;
  if (!accessToken) {
    throw new Error(`${roleLabel} login succeeded but no access token was returned`);
  }

  return {
    loginResult: result,
    accessToken,
    user: result.data?.data?.user || null,
  };
};

const authHeaders = (accessToken) => ({
  Authorization: `Bearer ${accessToken}`,
});

const firstItem = (items) => (Array.isArray(items) && items.length > 0 ? items[0] : null);

const runAdminFlow = async () => {
  const { loginResult, accessToken } = await login(ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
  const results = [loginResult];

  const profile = await timedFetch("admin: profile", `${BASE_URL}/me`, {
    headers: authHeaders(accessToken),
  });
  results.push(profile);

  results.push(
    await timedFetch("admin: summary", `${BASE_URL}/admin/summary`, {
      headers: authHeaders(accessToken),
    }),
  );
  const users = await timedFetch("admin: users", `${BASE_URL}/admin/users`, {
    headers: authHeaders(accessToken),
  });
  results.push(users);
  const programmes = await timedFetch("admin: programmes", `${BASE_URL}/admin/programmes`, {
    headers: authHeaders(accessToken),
  });
  results.push(programmes);
  results.push(
    await timedFetch("admin: settings", `${BASE_URL}/admin/settings`, {
      headers: authHeaders(accessToken),
    }),
  );
  results.push(
    await timedFetch("admin: wishlist", `${BASE_URL}/wishlist/admin/all`, {
      headers: authHeaders(accessToken),
    }),
  );
  results.push(
    await timedFetch("admin: scholar report", `${BASE_URL}/admin/reports?type=scholar`, {
      headers: authHeaders(accessToken),
    }),
  );
  results.push(
    await timedFetch("admin: programme report", `${BASE_URL}/admin/reports?type=programme`, {
      headers: authHeaders(accessToken),
    }),
  );
  results.push(
    await timedFetch("admin: notifications", `${BASE_URL}/notifications/me`, {
      headers: authHeaders(accessToken),
    }),
  );
  results.push(
    await timedFetch("admin: announcements", `${BASE_URL}/announcements`, {
      headers: authHeaders(accessToken),
    }),
  );
  results.push(
    await timedFetch("admin: queries", `${BASE_URL}/queries`, {
      headers: authHeaders(accessToken),
    }),
  );
  const firstAdminQuery = firstItem(results[results.length - 1]?.data?.data?.queries);
  if (firstAdminQuery?.id) {
    results.push(
      await timedFetch("admin: query detail", `${BASE_URL}/queries/${firstAdminQuery.id}`, {
        headers: authHeaders(accessToken),
      }),
    );
  }

  return results;
};

const runManagerFlow = async () => {
  if (!MANAGER_EMAIL || !MANAGER_PASSWORD) {
    return [];
  }

  const { loginResult, accessToken } = await login(
    MANAGER_EMAIL,
    MANAGER_PASSWORD,
    "programme_manager",
  );
  const results = [loginResult];

  results.push(
    await timedFetch("manager: profile", `${BASE_URL}/me`, {
      headers: authHeaders(accessToken),
    }),
  );

  const managedProgrammes = await timedFetch(
    "manager: programmes",
    `${BASE_URL}/programmes/managed/me`,
    {
      headers: authHeaders(accessToken),
    },
  );
  results.push(managedProgrammes);

  results.push(
    await timedFetch("manager: notifications", `${BASE_URL}/notifications/me`, {
      headers: authHeaders(accessToken),
    }),
  );
  results.push(
    await timedFetch("manager: announcements", `${BASE_URL}/announcements`, {
      headers: authHeaders(accessToken),
    }),
  );

  results.push(
    await timedFetch("manager: queries", `${BASE_URL}/queries`, {
      headers: authHeaders(accessToken),
    }),
  );
  const firstManagerQuery = firstItem(results[results.length - 1]?.data?.data?.queries);
  if (firstManagerQuery?.id) {
    results.push(
      await timedFetch("manager: query detail", `${BASE_URL}/queries/${firstManagerQuery.id}`, {
        headers: authHeaders(accessToken),
      }),
    );
  }

  const firstProgramme = firstItem(managedProgrammes.data?.data?.programmes);
  if (firstProgramme?.id) {
    results.push(
      await timedFetch(
        "manager: programme detail",
        `${BASE_URL}/programmes/${firstProgramme.id}`,
        {
          headers: authHeaders(accessToken),
        },
      ),
    );

    const firstAssignment = firstItem(firstProgramme.assignments);
    if (firstAssignment?.id) {
      results.push(
        await timedFetch(
          "manager: assignment submissions",
          `${BASE_URL}/assignments/managed/submissions?programmeId=${encodeURIComponent(firstProgramme.id)}&assignmentId=${encodeURIComponent(firstAssignment.id)}`,
          {
            headers: authHeaders(accessToken),
          },
        ),
      );
    }

    results.push(
      await timedFetch(
        "manager: programme report",
        `${BASE_URL}/programmes/managed/${firstProgramme.id}/report`,
        {
          headers: authHeaders(accessToken),
        },
      ),
    );
  }

  return results;
};

const runScholarFlow = async () => {
  const { loginResult, accessToken } = await login(SCHOLAR_EMAIL, SCHOLAR_PASSWORD, "scholar");
  const results = [loginResult];

  results.push(
    await timedFetch("scholar: profile", `${BASE_URL}/me`, {
      headers: authHeaders(accessToken),
    }),
  );

  const notifications = await timedFetch("scholar: notifications", `${BASE_URL}/notifications/me`, {
    headers: authHeaders(accessToken),
  });
  results.push(notifications);

  results.push(
    await timedFetch("scholar: assignments", `${BASE_URL}/assignments/my-assignments`, {
      headers: authHeaders(accessToken),
    }),
  );

  results.push(
    await timedFetch("scholar: programme schedule", `${BASE_URL}/programmes/my-programmes-schedule`, {
      headers: authHeaders(accessToken),
    }),
  );
  results.push(
    await timedFetch("scholar: discover programmes", `${BASE_URL}/programmes/discover`, {
      headers: authHeaders(accessToken),
    }),
  );
  results.push(
    await timedFetch("scholar: wishlist", `${BASE_URL}/wishlist/me`, {
      headers: authHeaders(accessToken),
    }),
  );
  results.push(
    await timedFetch("scholar: announcements", `${BASE_URL}/announcements`, {
      headers: authHeaders(accessToken),
    }),
  );

  const programmesResult = await timedFetch("scholar: programmes", `${BASE_URL}/programmes/my-programmes`, {
    headers: authHeaders(accessToken),
  });
  results.push(programmesResult);

  const firstProgrammeId = firstItem(programmesResult.data?.data?.programmes)?.id;
  if (firstProgrammeId) {
    results.push(
      await timedFetch(
        "scholar: programme detail",
        `${BASE_URL}/programmes/${firstProgrammeId}`,
        {
          headers: authHeaders(accessToken),
        },
      ),
    );
  }

  const unreadIds = notifications.data?.data?.notifications
    ?.filter((notification) => !notification.isRead)
    ?.slice(0, 5)
    ?.map((notification) => notification.id);

  if (Array.isArray(unreadIds) && unreadIds.length > 0) {
    results.push(
      await timedFetch("scholar: notifications read", `${BASE_URL}/notifications/read`, {
        method: "POST",
        headers: {
          ...authHeaders(accessToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: unreadIds }),
      }),
    );
  }

  results.push(
    await timedFetch("scholar: queries", `${BASE_URL}/queries`, {
      headers: authHeaders(accessToken),
    }),
  );
  const firstScholarQuery = firstItem(results[results.length - 1]?.data?.data?.queries);
  if (firstScholarQuery?.id) {
    results.push(
      await timedFetch("scholar: query detail", `${BASE_URL}/queries/${firstScholarQuery.id}`, {
        headers: authHeaders(accessToken),
      }),
    );
  }

  return results;
};

const summarizeResults = (results) => {
  const grouped = new Map();

  for (const result of results) {
    if (!grouped.has(result.label)) {
      grouped.set(result.label, []);
    }
    grouped.get(result.label).push(result);
  }

  return Array.from(grouped.entries()).map(([label, entries]) => {
    const durations = entries.map((entry) => entry.durationMs);
    const avg = Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
    const max = Math.max(...durations);
    const min = Math.min(...durations);
    const failed = entries.some((entry) => !entry.ok);
    const status = failed ? "FAIL" : max > TARGET_MS ? "SLOW" : "OK";

    return {
      label,
      runs: entries.length,
      min,
      avg,
      max,
      status,
    };
  });
};

const printSummary = (summary) => {
  const rows = summary
    .sort((left, right) => right.max - left.max)
    .map((entry) => ({
      endpoint: entry.label,
      runs: entry.runs,
      minMs: entry.min,
      avgMs: entry.avg,
      maxMs: entry.max,
      status: entry.status,
    }));

  console.table(rows);
};

const printDetailedFailures = (results) => {
  const failures = results.filter((result) => !result.ok || result.durationMs > TARGET_MS);
  if (failures.length === 0) {
    return;
  }

  console.log("\nDetailed slow/failing calls:");
  console.table(
    failures.map((result) => ({
      label: result.label,
      statusCode: result.status,
      durationMs: result.durationMs,
      ok: result.ok,
      message: result.data?.message || "",
    })),
  );
};

const toSlug = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildMarkdownReport = ({ startedAt, finishedAt, summary, results }) => {
  const slowResults = results.filter((result) => !result.ok || result.durationMs > TARGET_MS);
  const lines = [
    "# Perf Smoke Report",
    "",
    `- Base URL: ${BASE_URL}`,
    `- Target threshold: ${TARGET_MS}ms`,
    `- Iterations: ${ITERATIONS}`,
    `- Started at: ${startedAt}`,
    `- Finished at: ${finishedAt}`,
    "",
    "## Summary",
    "",
    "| Endpoint | Runs | Min (ms) | Avg (ms) | Max (ms) | Status |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...summary
      .sort((left, right) => right.max - left.max)
      .map(
        (entry) =>
          `| ${entry.label} | ${entry.runs} | ${entry.min} | ${entry.avg} | ${entry.max} | ${entry.status} |`,
      ),
    "",
    "## Slow Or Failing Calls",
    "",
  ];

  if (slowResults.length === 0) {
    lines.push("All calls stayed within the configured threshold.");
  } else {
    lines.push("| Label | Status Code | Duration (ms) | Message |");
    lines.push("| --- | ---: | ---: | --- |");
    lines.push(
      ...slowResults.map(
        (result) =>
          `| ${result.label} | ${result.status} | ${result.durationMs} | ${String(
            result.data?.message || "",
          ).replace(/\|/g, "\\|")} |`,
      ),
    );
  }

  return `${lines.join("\n")}\n`;
};

const saveReport = async ({ startedAt, finishedAt, summary, results }) => {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const stamp = toSlug(new Date(finishedAt).toISOString());
  const payload = {
    baseUrl: BASE_URL,
    targetMs: TARGET_MS,
    iterations: ITERATIONS,
    startedAt,
    finishedAt,
    summary,
    results,
  };

  const jsonPath = path.join(REPORT_DIR, `${stamp}.json`);
  const mdPath = path.join(REPORT_DIR, `${stamp}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  await fs.writeFile(mdPath, buildMarkdownReport(payload), "utf8");

  return { jsonPath, mdPath };
};

const main = async () => {
  const allResults = [];
  const startedAt = new Date().toISOString();

  console.log(`Running perf smoke against ${BASE_URL}`);
  console.log(`Target threshold: ${TARGET_MS}ms`);
  console.log(`Iterations: ${ITERATIONS}`);
  if (MANAGER_EMAIL && MANAGER_PASSWORD) {
    console.log("Programme manager flow: enabled");
  } else {
    console.log("Programme manager flow: skipped (set PERF_MANAGER_EMAIL/PERF_MANAGER_PASSWORD to enable)");
  }

  for (let iteration = 1; iteration <= ITERATIONS; iteration += 1) {
    console.log(`\nIteration ${iteration}/${ITERATIONS}`);
    allResults.push(...(await runAdminFlow()));
    await sleep(300);
    allResults.push(...(await runManagerFlow()));
    await sleep(300);
    allResults.push(...(await runScholarFlow()));
    await sleep(500);
  }

  const summary = summarizeResults(allResults);
  printSummary(summary);
  printDetailedFailures(allResults);
  const finishedAt = new Date().toISOString();
  const reportFiles = await saveReport({
    startedAt,
    finishedAt,
    summary,
    results: allResults,
  });

  console.log(`\nSaved reports:`);
  console.log(`- ${reportFiles.jsonPath}`);
  console.log(`- ${reportFiles.mdPath}`);

  const failures = summary.filter((entry) => entry.status !== "OK");

  if (failures.length > 0) {
    console.error(
      `\nPerf smoke found ${failures.length} slow/failing endpoint group(s) over ${TARGET_MS}ms.`,
    );
    process.exit(1);
  }

  console.log(`\nAll measured endpoint groups stayed within ${TARGET_MS}ms.`);
};

main().catch((error) => {
  console.error("\nPerf smoke failed:", error.message);
  process.exit(1);
});
