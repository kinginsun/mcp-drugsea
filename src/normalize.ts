/** Flatten DrugSea UI cell objects `{ text, title, url }` into plain values. */

/**
 * Strip MCP-irrelevant fields from result rows (lists and details alike).
 * These are internal join keys, ETL timestamps, request-echo flags, and the
 * `related_drug_names` synonym dump (100+ pipe-separated aliases) — they cost
 * tokens but carry no signal for an agent. Mirrors `yaohai_mcp_strip_fields`
 * in the drugsea_api backend (`src/routes/ai_mcp/mcp.php`); the two layers are
 * idempotent with each other.
 */
const STRIP_ALWAYS = [
  "related_drug_names",
  // internal ids / join keys
  "dp2_id", "gcid", "ProductID", "XUI", "DrugUID", "UniqueID", "es_index_key", "company_for_count",
  // maintenance timestamps
  "created_at", "updated_at", "in_sfda_updated_at",
  // request-echo / internal flags
  "rows_excluded", "has_new_data", "has_sms", "is_47", "linked_to_xui", "is_filing_ref_drug", "2018yizhi", "has_detail",
  // raw change-log dump in product detail (semicolon-delimited ETL diffs)
  "timeline",
];

/** Stale index column that contradicts is_guojia_jicai (skill docs: ignore it). */
const STRIP_PRODUCT_CN = ["is_jicai"];

/** Backup / duplicate copies of conclusion / transact_status / slh. */
const STRIP_REG_CN = ["conclusion_bak", "orig_transact_status", "slh2"];

/** Labelled insert text: useless HTML blobs in list rows, informative in detail. */
const STRIP_PRODUCT_CN_LIST_ONLY = [
  "indications",
  "dosage_and_administration",
  "pharmacological_and_toxicological",
];

export function stripMcpFields(
  row: Record<string, unknown>,
  opts: { dbname?: string; isDetail?: boolean } = {}
): Record<string, unknown> {
  const { dbname = "", isDetail = false } = opts;
  const strip = new Set<string>(STRIP_ALWAYS);
  if (dbname === "product_cn") {
    for (const f of STRIP_PRODUCT_CN) strip.add(f);
    if (!isDetail) {
      for (const f of STRIP_PRODUCT_CN_LIST_ONLY) strip.add(f);
    }
  } else if (dbname === "reg_cn") {
    for (const f of STRIP_REG_CN) strip.add(f);
  }
  for (const f of strip) {
    delete row[f];
  }
  return row;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

const URL_FIELD_RE = /(_url|Url|URL)$/;
const URL_FIELD_NAMES = new Set([
  "source_url",
  "detail_url",
  "url",
  "original_source_url",
  "oss_url",
  "download_url",
]);
const URL_LABELS = new Set(["原文链接", "详情", "查看", "链接", "附件", "下载"]);

function looksLikeUrlField(field?: string): boolean {
  if (!field) {
    return false;
  }
  return URL_FIELD_NAMES.has(field) || URL_FIELD_RE.test(field);
}

function cellDisplayValue(
  cell: Record<string, unknown>,
  field?: string
): unknown {
  const url = cell.url;
  const text = cell.text;
  const preferUrl =
    looksLikeUrlField(field) ||
    (typeof text === "string" && URL_LABELS.has(text.trim()) && url);
  if (preferUrl && url !== undefined && url !== null && url !== "") {
    return normalizeValue(url, field);
  }
  if (text !== undefined) {
    return normalizeValue(text, field);
  }
  return normalizeValue(url, field);
}

/** Drop list-cell placeholders such as https://db.drugsea.cn/api/disabled. */
export function usableDetailUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }
  if (url.includes("/api/disabled") || /\/disabled\/?$/.test(url)) {
    return undefined;
  }
  return url;
}

export function normalizeValue(v: unknown, field?: string): unknown {
  if (v === null || v === undefined) {
    return v;
  }
  if (typeof v === "boolean" || typeof v === "number") {
    return v;
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed && (trimmed[0] === "[" || trimmed[0] === "{")) {
      try {
        return normalizeValue(JSON.parse(trimmed), field);
      } catch {
        // keep original string
      }
    }
    return v;
  }
  if (isPlainObject(v)) {
    if ("text" in v && !("0" in v)) {
      return cellDisplayValue(v, field);
    }
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      out[k] = normalizeValue(val, k);
    }
    return out;
  }
  if (Array.isArray(v)) {
    const texts: string[] = [];
    for (const part of v) {
      const t =
        isPlainObject(part) && "text" in part
          ? cellDisplayValue(part, field)
          : normalizeValue(part, field);
      if (t === null || t === undefined || t === "") {
        continue;
      }
      texts.push(String(t));
    }
    if (texts.length === 0) {
      return "";
    }
    return texts.length === 1 ? texts[0] : texts.join("; ");
  }
  return String(v);
}

export function flattenRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (k === "detail") {
      continue;
    }
    out[k] = normalizeValue(v, k);
  }
  return out;
}

export function normalizeRecord(record: unknown): unknown {
  if (Array.isArray(record)) {
    return record.map((row) =>
      isPlainObject(row) ? flattenRecord(row) : row
    );
  }
  if (!isPlainObject(record)) {
    return record;
  }
  const keys = Object.keys(record);
  if (
    keys.length > 0 &&
    keys.every((k, i) => k === String(i))
  ) {
    return keys.map((k) => {
      const row = record[k];
      return isPlainObject(row) ? flattenRecord(row) : row;
    });
  }
  return flattenRecord(record);
}

function parseMaybeDict(item: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(item) as unknown;
    if (isPlainObject(parsed)) {
      return parsed;
    }
  } catch {
    // try python-ish single quotes
  }
  try {
    const parsed = JSON.parse(item.replace(/'/g, '"')) as unknown;
    if (isPlainObject(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function parseFacetList(
  raw: unknown,
  field: string
): { value: unknown; count: number }[] {
  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === "string") {
    items = raw.split(";").map((p) => p.trim()).filter(Boolean);
  } else {
    return [];
  }

  const out: { value: unknown; count: number; raw: Record<string, unknown> }[] = [];
  for (const item of items) {
    let row: Record<string, unknown> | null = null;
    if (isPlainObject(item)) {
      row = item;
    } else if (typeof item === "string") {
      row = parseMaybeDict(item);
    }
    if (!row) {
      continue;
    }
    let value: unknown = row[field] ?? row.value ?? "";
    if (isPlainObject(value)) {
      value = value.title ?? value.value ?? value;
    }
    let count: unknown = row.ct ?? row.count ?? 0;
    const n = typeof count === "number" ? count : Number.parseInt(String(count), 10);
    out.push({
      value,
      count: Number.isFinite(n) ? n : 0,
      raw: row,
    });
  }
  out.sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
  return out.map(({ value, count }) => ({ value, count }));
}
