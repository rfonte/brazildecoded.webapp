const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir) {
  const out = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...findHtmlFiles(p));
    else if (it.isFile() && p.endsWith('.html')) out.push(p);
  }
  return out;
}

function extractJsonLd(html) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

function checkObject(obj, fileReport) {
  const type = getObjectType(obj);
  if (!type) {
    fileReport.warnings.push('JSON-LD missing @type');
    return;
  }
  const t = Array.isArray(type) ? type[0] : type;
  const checks = [
    { match: /Website/i, fn: checkWebsite },
    { match: /Organization/i, fn: checkOrganization },
    { match: /Product/i, fn: checkProduct },
    { match: /Offer/i, fn: checkOffer },
    { match: /BreadcrumbList/i, fn: checkBreadcrumbList },
  ];
  for (const entry of checks) {
    if (entry.match.test(t)) {
      entry.fn(obj, fileReport);
    }
  }
}

function analyzeFile(file) {
  const html = fs.readFileSync(file, 'utf8');
  const blocks = extractJsonLd(html);
  const report = { file, blocks: blocks.length, parsed: 0, errors: [], warnings: [] };
  if (blocks.length === 0) {
    report.warnings.push('No JSON-LD blocks found');
    return report;
  }
  for (let i = 0; i < blocks.length; i++) {
    const raw = blocks[i].trim();
    try {
      const parsed = JSON.parse(raw);
      report.parsed++;
      const nodes = normalizeJsonLdNodes(parsed);
      nodes.forEach((node) => checkObject(node, report));
    } catch (err) {
      report.errors.push(`JSON parse error in block ${i + 1}: ${err.message}`);
    }
  }
  return report;
}

function getObjectType(obj) {
  if (obj['@type'] || obj.type) return obj['@type'] || obj.type;
  if (Array.isArray(obj['@graph'])) return 'Graph';
  return undefined;
}

function normalizeJsonLdNodes(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed['@graph'] && Array.isArray(parsed['@graph'])) return parsed['@graph'];
  return [parsed];
}

function checkWebsite(obj, fileReport) {
  if (!obj.name) fileReport.errors.push('WebSite: missing `name`');
  if (!obj.url) fileReport.errors.push('WebSite: missing `url`');
}

function checkOrganization(obj, fileReport) {
  if (!obj.name) fileReport.errors.push('Organization: missing `name`');
  if (!obj.url) fileReport.errors.push('Organization: missing `url`');
  if (!obj.logo) fileReport.warnings.push('Organization: missing `logo` (recommended)');
}

function checkProduct(obj, fileReport) {
  if (!obj.name) fileReport.errors.push('Product: missing `name`');
  if (!obj.description) fileReport.warnings.push('Product: missing `description` (recommended)');
  if (!obj.offers) {
    fileReport.errors.push('Product: missing `offers`');
    return;
  }
  const offer = obj.offers;
  const of = Array.isArray(offer) ? offer[0] : offer;
  checkOffer(of, fileReport);
  if (!of.availability) fileReport.warnings.push('Offer: missing `availability` (recommended)');
}

function checkOffer(obj, fileReport) {
  if ((obj.price === undefined || obj.price === null) && obj.price !== 0) {
    fileReport.errors.push('Offer: missing `price`');
  }
  if (!obj.priceCurrency) fileReport.errors.push('Offer: missing `priceCurrency`');
}

function checkBreadcrumbList(obj, fileReport) {
  if (!obj.itemListElement || !Array.isArray(obj.itemListElement)) {
    fileReport.warnings.push('BreadcrumbList: `itemListElement` should be an array');
  }
}

function run(root) {
  if (!fs.existsSync(root)) {
    console.error('Directory not found:', root);
    process.exit(2);
  }
  const files = findHtmlFiles(root);
  const results = files.map((file) => analyzeFile(file));
  // Print human-friendly report
  console.log('\nStructured Data Report');
  console.log('Root:', root);
  console.log('Scanned files:', files.length, '\n');
  const totals = results.reduce(
    (acc, report) => {
      const counts = printReport(report);
      return {
        errors: acc.errors + counts.errors,
        warnings: acc.warnings + counts.warnings,
      };
    },
    { errors: 0, warnings: 0 }
  );
  printSummary(results.length, totals);
  if (totals.errors > 0) process.exitCode = 3;
}

run(path.join(process.cwd(),'dist'));

function printReport(report) {
  console.log('File:', path.relative(process.cwd(), report.file));
  console.log('  JSON-LD blocks:', report.blocks, 'parsed:', report.parsed);
  for (const e of report.errors) console.log('    ERROR:', e);
  for (const w of report.warnings) console.log('    WARN :', w);
  if (!report.errors.length && !report.warnings.length) {
    console.log('    OK: no issues found');
  }
  console.log('');
  return { errors: report.errors.length, warnings: report.warnings.length };
}

function printSummary(totalFiles, totals) {
  console.log('Summary:');
  console.log('  total files:', totalFiles);
  console.log('  total errors:', totals.errors);
  console.log('  total warnings:', totals.warnings);
}
