/**
 * Extract 条件筛选 catalogs from dedicated (non-/in) ConditionSearchPanel.js
 * files and 随心汇 data.js. Merged into DBS_FACET_CATALOG by extract-dbs-facets.mjs.
 *
 * Only **rendered** ConditionExpandView queryKeys are included. terms-only
 * (date/tree pickers are skipped, matching the dbs extractor). Hardcoded SPA
 * lists (sales_cn / sales_global) become static_values — no live GET.
 */
import { readFileSync } from "node:fs";

const FRONTEND = "/Users/randyz/Documents/drugsea/frontend/src";

const CUSTOM_PANELS = {
  zhaobiao: "routes/zhaobiao/components/commonSearch/ConditionSearchPanel.js",
  cn_company: "routes/more/CNCompany/components/commonSearch/ConditionSearchPanel.js",
  ct_cn: "routes/ct/CN/components/ConditionSearchPanel.js",
  ct_global: "routes/ct/global/components/ConditionSearchPanel.js",
  shuomingshu: "routes/more/MedInstruct/components/commonSearch/ConditionSearchPanel.js",
  bio_issue: "routes/bioIssue/components/commonSearch/ConditionSearchPanel.js",
  product_eu: "routes/product/EU/components/ConditionSearchPanel.js",
  product_jp: "routes/product/JP/components/ConditionSearchPanel.js",
  product_us: "routes/product/US/components/ConditionSearchPanel.js",
  china_new_drugs: "routes/register/china_new_drugs/components/ConditionSearchPanel.js",
  generic_cn: "routes/product/generic_drugs/components/commonSearch/ConditionSearchPanel.js",
};

function braceBlock(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(openIdx, i + 1);
    }
  }
  return "";
}

function parseRenderedPanel(relPath) {
  const src = readFileSync(`${FRONTEND}/${relPath}`, "utf8");
  const retIdx = src.lastIndexOf("return (");
  if (retIdx < 0) {
    throw new Error(`no return() in ${relPath}`);
  }
  const rendered = new Set(
    [...src.slice(retIdx).matchAll(/\{\.\.\.(\w+)\}/g)].map((m) => m[1]),
  );

  const fields = [];
  const declRe = /const (\w+) = \{/g;
  let m;
  while ((m = declRe.exec(src)) !== null) {
    const name = m[1];
    if (!rendered.has(name)) continue;
    const block = braceBlock(src, src.indexOf("{", m.index));
    const title = block.match(/title:\s*"([^"]+)"/);
    const queryKey = block.match(/queryKey:\s*"([^"]+)"/);
    if (!title || !queryKey) continue;
    const ft = block.match(/filterType:\s*"([^"]+)"/);
    const filterType = ft ? ft[1] : "terms";
    if (filterType !== "terms") continue;
    const urlPath = block.match(/url:\s*`\$\{[A-Z0-9_]+\}([^`]+)`/);
    if (!urlPath) continue;
    fields.push({
      title: title[1],
      queryKey: queryKey[1],
      urlPath: urlPath[1],
      filterType: "terms",
      showSearchBox: /showSearchBox:\s*true/.test(block),
    });
  }
  return fields;
}

function extractDrugregCn() {
  const src = readFileSync(
    `${FRONTEND}/routes/more/aggs/config/data.js`,
    "utf8",
  );
  const start = src.indexOf("drugreg_cn: {");
  if (start < 0) throw new Error("drugreg_cn block missing in aggs data.js");
  const fieldsStart = src.indexOf("fields: [", start);
  const arrOpen = src.indexOf("[", fieldsStart);
  let depth = 0;
  let arrEnd = -1;
  for (let i = arrOpen; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") {
      depth--;
      if (depth === 0) {
        arrEnd = i;
        break;
      }
    }
  }
  const body = src.slice(arrOpen, arrEnd + 1);
  const fields = [];
  const chunks = body.split(/\n\s*\{/).slice(1);
  for (const chunk of chunks) {
    if (!/is_condition:\s*true/.test(chunk)) continue;
    const value = chunk.match(/value:\s*'([^']+)'/);
    const label = chunk.match(/label:\s*'([^']+)'/);
    if (!value || !label) continue;
    const ft = chunk.match(/filterType:\s*"([^"]+)"/);
    if (ft && ft[1] !== "terms") continue;
    fields.push({
      title: label[1],
      queryKey: value[1],
      urlPath: `/drugreg_cn/aggs/filter/${value[1]}`,
      filterType: "terms",
      showSearchBox: /showSearchBox:\s*true/.test(chunk),
    });
  }
  return fields;
}

function parseQuotedList(src, key) {
  const re = new RegExp(`${key}:\\s*"([^"]+)"`, "g");
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

function extractSalesStatic() {
  const constants = readFileSync(`${FRONTEND}/utils/constants.js`, "utf8");
  const util = readFileSync(`${FRONTEND}/utils/Util.js`, "utf8");
  const annual = readFileSync(
    `${FRONTEND}/routes/sales/annualReport/components/commonSearch/ConditionSearchPanel.js`,
    "utf8",
  );

  const yearsStart = constants.indexOf("export const SALES_CN_LIST_CONDITION_YEARS");
  const yearsBlock = constants.slice(yearsStart, constants.indexOf("export const SALES_CN_LIST_CONDITION_QUARTER"));
  const years = parseQuotedList(yearsBlock, "years");

  const quarterStart = constants.indexOf("export const SALES_CN_LIST_CONDITION_QUARTER");
  const quarterBlock = constants.slice(quarterStart, constants.indexOf("export const SALES_CN_LIST_CONDITION_DRUG_TYPE"));
  const quarters = parseQuotedList(quarterBlock, "quarter");

  const drugStart = constants.indexOf("export const SALES_CN_LIST_CONDITION_DRUG_TYPE");
  const drugBlock = constants.slice(drugStart, constants.indexOf("export const SALES_CN_LIST_CONDITION_ROUTES"));
  const drugTypes = parseQuotedList(drugBlock, "drug_type");

  const routeStart = constants.indexOf("export const SALES_CN_LIST_CONDITION_ROUTES");
  const routeBlock = constants.slice(routeStart, constants.indexOf("export const SALES_CN_ATC_CODE"));
  const routes = parseQuotedList(routeBlock, "administration_route");

  const cityStart = constants.indexOf("const cityList = [");
  const cityBlock = constants.slice(cityStart, constants.indexOf("export const SALES_SELECT_CITY_LIST"));
  const cities = [...cityBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  const atcFn = util.slice(util.indexOf("function getATCList()"), util.indexOf("function getApplyTypeList()"));
  const atcValues = [...atcFn.matchAll(/value:\s*"([A-Z])"/g)].map((m) => m[1]);
  const atcLabels = [...atcFn.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  const atc = atcValues.map((v, i) => `${v}:${atcLabels[i]}`);

  const field = (title, queryKey, staticValues) => ({
    title,
    queryKey,
    urlPath: "",
    filterType: "terms",
    showSearchBox: false,
    staticValues,
  });

  const salesCn = [
    field("销售年份", "years", years),
    field("销售季度", "quarter", quarters),
    field("药品类型", "drug_type", drugTypes),
    field("给药途径", "administration_route", routes),
    field("治疗分类", "ATC_code", atc),
    field("市场区域", "city", cities),
  ];

  const globalYears = parseQuotedList(annual, "years");
  const globalSource = parseQuotedList(annual, "source");
  const salesGlobal = [
    field("年份", "years", globalYears),
    field("市场", "source", globalSource),
  ];

  for (const [name, rows] of [
    ["sales_cn years", years],
    ["sales_cn quarters", quarters],
    ["sales_cn drug_type", drugTypes],
    ["sales_cn routes", routes],
    ["sales_cn cities", cities],
    ["sales_cn ATC", atc],
    ["sales_global years", globalYears],
    ["sales_global source", globalSource],
  ]) {
    if (!rows.length) throw new Error(`empty static list: ${name}`);
  }

  return { sales_cn: salesCn, sales_global: salesGlobal };
}

export function extractCustomFacets() {
  const result = {};
  for (const [dbname, rel] of Object.entries(CUSTOM_PANELS)) {
    const fields = parseRenderedPanel(relPath(rel));
    if (!fields.length) {
      throw new Error(`${dbname}: no rendered terms fields in ${rel}`);
    }
    result[dbname] = fields;
  }
  result.drugreg_cn = extractDrugregCn();
  if (!result.drugreg_cn.length) {
    throw new Error("drugreg_cn: no is_condition terms fields");
  }
  Object.assign(result, extractSalesStatic());
  return result;
}

function relPath(rel) {
  return rel;
}

export const CUSTOM_FACET_DBNAMES = [
  ...Object.keys(CUSTOM_PANELS),
  "drugreg_cn",
  "sales_cn",
  "sales_global",
];
