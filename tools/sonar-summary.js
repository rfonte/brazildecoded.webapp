const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");

const projectRoot = process.cwd();
const propsPath = path.join(projectRoot, "sonar-project.properties");

function readProperties(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return content.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return acc;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return acc;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    acc[key] = value;
    return acc;
  }, {});
}

function requestJson(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${token}:`).toString("base64"),
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(
              new Error(`Sonar API ${res.statusCode}: ${data}`)
            );
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function fetchAllIssues(baseUrl, token) {
  const results = [];
  let page = 1;
  while (true) {
    const pageUrl = `${baseUrl}&p=${page}`;
    const payload = await requestJson(pageUrl, token);
    const issues = payload.issues || [];
    results.push(...issues);
    const paging = payload.paging || {};
    const total = paging.total || results.length;
    const pageSize = paging.pageSize || issues.length;
    if (!issues.length || results.length >= total || pageSize === 0) break;
    page += 1;
  }
  return results;
}

async function fetchAllHotspots(baseUrl, token) {
  const results = [];
  let page = 1;
  while (true) {
    const pageUrl = `${baseUrl}&p=${page}`;
    const payload = await requestJson(pageUrl, token);
    const hotspots = payload.hotspots || [];
    results.push(...hotspots);
    const paging = payload.paging || {};
    const total = paging.total || results.length;
    const pageSize = paging.pageSize || hotspots.length;
    if (!hotspots.length || results.length >= total || pageSize === 0) break;
    page += 1;
  }
  return results;
}

function formatMarkdown(summary) {
  const metrics = summary.metrics || {};
  const issues = summary.issues || [];
  const codeSmells = summary.codeSmells || [];
  const hotspots = summary.hotspots || [];
  return [
    "# SonarCloud Summary",
    "",
    `Project: ${summary.projectKey}`,
    `Generated: ${summary.generatedAt}`,
    "",
    "## Metrics",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Bugs | ${metrics.bugs || "0"} |`,
    `| Vulnerabilities | ${metrics.vulnerabilities || "0"} |`,
    `| Security Hotspots | ${metrics.security_hotspots || "0"} |`,
    `| Code Smells | ${metrics.code_smells || "0"} |`,
    `| Coverage | ${metrics.coverage || "0"}% |`,
    `| Duplications | ${metrics.duplicated_lines_density || "0"}% |`,
    "",
    "## Top Issues",
    "",
    issues.length
      ? issues
          .map(
            (issue) =>
              `- [${issue.severity}] ${issue.rule} - ${issue.component}:${issue.line} - ${issue.message}`
          )
          .join("\n")
      : "- No open issues returned.",
    "",
    `Total issues listed: ${issues.length}`,
    "",
    "## Code Smells",
    "",
    codeSmells.length
      ? codeSmells
          .map(
            (issue) =>
              `- [${issue.severity}] ${issue.rule} - ${issue.component}:${issue.line} - ${issue.message}`
          )
          .join("\n")
      : "- No open code smells returned.",
    "",
    `Total code smells listed: ${codeSmells.length}`,
    "",
    "## Security Hotspots (To Review)",
    "",
    hotspots.length
      ? hotspots
          .map(
            (hotspot) =>
              `- [${hotspot.vulnerabilityProbability}] ${hotspot.securityCategory} - ${hotspot.component}:${hotspot.line} - ${hotspot.message}`
          )
          .join("\n")
      : "- No security hotspots returned.",
    "",
    `Total hotspots listed: ${hotspots.length}`,
    "",
  ].join("\n");
}

async function main() {
  if (!fs.existsSync(propsPath)) {
    throw new Error("sonar-project.properties not found.");
  }
  const props = readProperties(propsPath);
  const token = process.env.SONAR_TOKEN;
  if (!token) {
    throw new Error("SONAR_TOKEN is not set.");
  }
  const projectKey = props["sonar.projectKey"];
  const hostUrl = props["sonar.host.url"] || "https://sonarcloud.io";
  if (!projectKey) {
    throw new Error("sonar.projectKey not found in properties.");
  }
  const apiBase = new URL("/api", hostUrl).toString().replace(/\/$/, "");
  const measuresUrl = `${apiBase}/measures/component?component=${encodeURIComponent(
    projectKey
  )}&metricKeys=bugs,vulnerabilities,security_hotspots,code_smells,coverage,duplicated_lines_density`;
  const issuesUrl = `${apiBase}/issues/search?componentKeys=${encodeURIComponent(
    projectKey
  )}&statuses=OPEN&ps=500&s=SEVERITY`;
  const hotspotsUrl = `${apiBase}/hotspots/search?projectKey=${encodeURIComponent(
    projectKey
  )}&status=TO_REVIEW&ps=500`;

  const measures = await requestJson(measuresUrl, token);
  const issues = await fetchAllIssues(issuesUrl, token);
  const hotspots = await fetchAllHotspots(hotspotsUrl, token);

  const metricMap = {};
  const measuresList = measures.component?.measures || [];
  measuresList.forEach((m) => {
    metricMap[m.metric] = m.value || "0";
  });

  const summary = {
    projectKey,
    generatedAt: new Date().toISOString(),
    metrics: metricMap,
    issues: issues.map((issue) => ({
      key: issue.key,
      rule: issue.rule,
      severity: issue.severity,
      component: issue.component,
      line: issue.line || 0,
      message: issue.message,
      type: issue.type,
    })),
    codeSmells: issues
      .filter((issue) => issue.type === "CODE_SMELL")
      .map((issue) => ({
        key: issue.key,
        rule: issue.rule,
        severity: issue.severity,
        component: issue.component,
        line: issue.line || 0,
        message: issue.message,
        type: issue.type,
      })),
    hotspots: hotspots.map((hotspot) => ({
      key: hotspot.key,
      component: hotspot.component,
      line: hotspot.line || 0,
      message: hotspot.message,
      securityCategory: hotspot.securityCategory,
      vulnerabilityProbability: hotspot.vulnerabilityProbability,
    })),
  };

  const reportsDir = path.join(projectRoot, "reports", "sonar");
  fs.mkdirSync(reportsDir, { recursive: true });
  const outJson = path.join(reportsDir, "sonar-summary.json");
  const outMd = path.join(reportsDir, "sonar-summary.md");
  await writeReportFiles(outJson, outMd, summary);
}

async function writeReportFiles(outJson, outMd, summary) {
  await fs.promises.writeFile(outJson, JSON.stringify(summary, null, 2));
  await fs.promises.writeFile(outMd, formatMarkdown(summary));
  console.log(`Saved ${outJson}`);
  console.log(`Saved ${outMd}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

