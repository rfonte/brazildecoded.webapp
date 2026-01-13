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
  const type = obj['@type'] || obj['type'] || (Array.isArray(obj['@graph']) ? 'Graph' : undefined);
  if (!type) {
    fileReport.warnings.push('JSON-LD missing @type');
    return;
  }
  if (Array.isArray(type)) {
    // first type
  }
  const t = Array.isArray(type) ? type[0] : type;
  if (/Website/i.test(t)) {
    if (!obj.name) fileReport.errors.push('WebSite: missing `name`');
    if (!obj.url) fileReport.errors.push('WebSite: missing `url`');
  }
  if (/Organization/i.test(t)) {
    if (!obj.name) fileReport.errors.push('Organization: missing `name`');
    if (!obj.url) fileReport.errors.push('Organization: missing `url`');
    if (!obj.logo) fileReport.warnings.push('Organization: missing `logo` (recommended)');
  }
  if (/Product/i.test(t)) {
    if (!obj.name) fileReport.errors.push('Product: missing `name`');
    if (!obj.description) fileReport.warnings.push('Product: missing `description` (recommended)');
    if (!obj.offers) fileReport.errors.push('Product: missing `offers`');
    else {
      const offer = obj.offers;
      const of = Array.isArray(offer) ? offer[0] : offer;
      if ((of.price === undefined || of.price === null) && of.price !== 0) fileReport.errors.push('Offer: missing `price`');
      if (!of.priceCurrency) fileReport.errors.push('Offer: missing `priceCurrency`');
      if (!of.availability) fileReport.warnings.push('Offer: missing `availability` (recommended)');
    }
  }
  if (/Offer/i.test(t)) {
    if ((obj.price === undefined || obj.price === null) && obj.price !== 0) fileReport.errors.push('Offer: missing `price`');
    if (!obj.priceCurrency) fileReport.errors.push('Offer: missing `priceCurrency`');
  }
  if (/BreadcrumbList/i.test(t)) {
    if (!obj.itemListElement || !Array.isArray(obj.itemListElement)) fileReport.warnings.push('BreadcrumbList: `itemListElement` should be an array');
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
      if (Array.isArray(parsed)) {
        parsed.forEach(p => checkObject(p, report));
      } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        parsed['@graph'].forEach(p => checkObject(p, report));
      } else {
        checkObject(parsed, report);
      }
    } catch (err) {
      report.errors.push(`JSON parse error in block ${i+1}: ${err.message}`);
    }
  }
  return report;
}

function run(root) {
  if (!fs.existsSync(root)) {
    console.error('Directory not found:', root);
    process.exit(2);
  }
  const files = findHtmlFiles(root);
  const results = [];
  for (const f of files) {
    results.push(analyzeFile(f));
  }
  // Print human-friendly report
  console.log('\nStructured Data Report');
  console.log('Root:', root);
  console.log('Scanned files:', files.length, '\n');
  let totalErrors = 0, totalWarnings = 0;
  for (const r of results) {
    console.log('File:', path.relative(process.cwd(), r.file));
    console.log('  JSON-LD blocks:', r.blocks, 'parsed:', r.parsed);
    if (r.errors.length) {
      totalErrors += r.errors.length;
      for (const e of r.errors) console.log('    ERROR:', e);
    }
    if (r.warnings.length) {
      totalWarnings += r.warnings.length;
      for (const w of r.warnings) console.log('    WARN :', w);
    }
    if (!r.errors.length && !r.warnings.length) console.log('    OK: no issues found');
    console.log('');
  }
  console.log('Summary:');
  console.log('  total files:', results.length);
  console.log('  total errors:', totalErrors);
  console.log('  total warnings:', totalWarnings);
  if (totalErrors > 0) process.exitCode = 3;
}

run(path.join(process.cwd(),'dist'));
