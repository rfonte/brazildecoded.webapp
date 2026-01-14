const fs = require("fs");
const https = require("https");
const path = require("path");

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

function formatMarkdown(summary) {
  const metrics = summary.metrics || {};
  const issues = summary.issues || [];
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
              `- [${issue.severity}] ${issue.rule} — ${issue.component}:${issue.line} — ${issue.message}`
          )
          .join("\n")
      : "- No open issues returned.",
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
  )}&statuses=OPEN&ps=10&s=SEVERITY`;

  const measures = await requestJson(measuresUrl, token);
  const issues = await requestJson(issuesUrl, token);

  const metricMap = {};
  const measuresList = (measures.component && measures.component.measures) || [];
  measuresList.forEach((m) => {
    metricMap[m.metric] = m.value || "0";
  });

  const summary = {
    projectKey,
    generatedAt: new Date().toISOString(),
    metrics: metricMap,
    issues: (issues.issues || []).map((issue) => ({
      key: issue.key,
      rule: issue.rule,
      severity: issue.severity,
      component: issue.component,
      line: issue.line || 0,
      message: issue.message,
      type: issue.type,
    })),
  };

  const reportsDir = path.join(projectRoot, "reports", "sonar");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const outJson = path.join(reportsDir, "sonar-summary.json");
  const outMd = path.join(reportsDir, "sonar-summary.md");
  fs.writeFileSync(outJson, JSON.stringify(summary, null, 2));
  fs.writeFileSync(outMd, formatMarkdown(summary));
  console.log(`Saved ${outJson}`);
  console.log(`Saved ${outMd}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
