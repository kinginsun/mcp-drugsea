import { DBS_FACET_CATALOG } from "./dbs-facets.js";
import {
  PRODUCT_CN_COMMON_FIELDS,
  PRODUCT_CN_FACET_FIELDS,
  REG_CN_COMMON_FIELDS,
  REG_CN_FACET_FIELDS,
} from "./fields.js";
import type { QueryObject, QueryValue } from "./types.js";

/** Keys that change match behaviour but are not result filters. */
export const CONTROL_KEYS = new Set([
  "search_mode",
  "rows_excluded",
  "only_active",
  "exact",
  "view_type",
  "action",
  "maxSize",
  "order_by",
  "direction",
  "limit",
  "offset",
  "tnum",
  "noDetail",
  "noCache",
  "groupid",
  "uid",
]);

/**
 * Common wrong keys → the key the backend actually reads.
 * Applied only when the target key is not already set.
 */
export const QUERY_ALIASES: Record<string, Record<string, string>> = {
  product_cn: { enterprise: "manufacture", company: "manufacture" },
  reg_cn: { manufacture: "enterprise", company: "enterprise" },
  ct_cn: { sponsor: "study_sponsor" },
  ct_global: { sponsor: "study_sponsor", intervention: "interventions" },
  product_eu: { substance: "active_substance", company: "manufacture" },
  global_search: { item: "term" },
  zhaobiao: { company: "manufacture" },
  shuomingshu: { company: "manufacture" },
  cn_company: { company: "manufacture", enterprise: "manufacture" },
  generic_cn: { project_id: "XUI", year: "first_approve_year" },
};

const PRODUCT_CN_EXTRA = [
  "brand_name",
  "gj_passed_yizhi",
  "in_sfda",
  "general_name_en",
  "drug_name_en",
  "orig_drug_name",
] as const;

const REG_CN_EXTRA = ["general_name"] as const;

const KNOWN_FILTERS: Record<string, readonly string[]> = {
  product_cn: [
    ...PRODUCT_CN_COMMON_FIELDS,
    ...Object.keys(PRODUCT_CN_FACET_FIELDS),
    ...PRODUCT_CN_EXTRA,
  ],
  reg_cn: [
    ...REG_CN_COMMON_FIELDS,
    ...Object.keys(REG_CN_FACET_FIELDS),
    ...REG_CN_EXTRA,
  ],
  ct_cn: [
    "item",
    "PI",
    "PI_company",
    "title",
    "drug_name",
    "study_sponsor",
    "indication",
    "register_num",
    "announce_date",
  ],
  ct_global: [
    "item",
    "title",
    "interventions",
    "study_sponsor",
    "identifier",
    "first_received_date",
  ],
  product_eu: [
    "item",
    "drug_name",
    "manufacture",
    "brand_name",
    "active_substance",
    "product_number",
    "authorisation_date",
    "drug_type",
    "review_type",
    "status",
    "condition_approval",
    "exceptional_circumstance",
    "is_orphan",
    "is_generic",
    "biosimilar",
    "year",
    "ATC_code",
    "therapeutic_area",
    "tags",
  ],
  // 仿制药立项调研. Rows are 原研剂型产品, not 批文.
  // PHP also accepts year as first_approve_year and project_id as XUI.
  generic_cn: [
    "drug_name",
    "dosage_form",
    "general_name",
    "XUI",
    "project_id",
    "market",
    "target",
    "indication",
    "is_nme",
    "first_approve_year",
    "year",
    "patent_expire_date",
    "ATC_code",
  ],
  // 创新药研究报告. Rows are XUI 实体（单成分化药/生物创新药）.
  china_new_drugs: [
    "drug_name",
    "enterprise",
    "slh",
    "indication",
    "target",
    "XUI",
    "kind",
    "drug_type",
    "rd_status",
    "market",
  ],
  global_search: [
    "term",
    "drug_name",
    "target",
    "brand_name",
    "indication",
    "brief_introduction",
    "drug_type",
    "rd_status",
    "year",
    "ATC_code",
  ],
  zhaobiao: [
    "item",
    "category",
    "drug_name",
    "manufacture",
    "auth_num",
    "dosage_form",
    "specification",
    "quality_level",
    "switch",
    "bid_price",
  ],
  shuomingshu: ["drug_name", "manufacture", "indication", "brand_name", "auth_num", "source"],
  cn_company: [
    "manufacture",
    "legal_representative",
    "CreditCode",
    "classification",
    "serial_num",
    "production_range",
    "province",
  ],
};

export type SanitizedQuery = {
  query: QueryObject;
  query_aliases: Record<string, string>;
  query_ignored: string[];
  warnings: string[];
};

function knownFieldsFor(dbname: string): Set<string> | undefined {
  const hardcoded = KNOWN_FILTERS[dbname];
  if (!hardcoded) {
    return undefined;
  }
  const set = new Set<string>(hardcoded);
  const facets = DBS_FACET_CATALOG[dbname];
  if (facets) {
    for (const key of Object.keys(facets.fields)) {
      set.add(key);
    }
  }
  return set;
}

function isEmptyValue(v: QueryValue): boolean {
  if (v === "" || v === undefined || v === null) {
    return true;
  }
  if (Array.isArray(v)) {
    return v.length === 0 || v.every((item) => item === "" || item === undefined || item === null);
  }
  return false;
}

/** Copy top-level search_mode / rows_excluded into query when the query omits them. */
export function hoistQueryFlags(
  query: QueryObject,
  extras: { search_mode?: QueryValue; rows_excluded?: QueryValue }
): QueryObject {
  const next: QueryObject = { ...query };
  if (
    (next.search_mode === undefined || next.search_mode === "") &&
    extras.search_mode !== undefined &&
    extras.search_mode !== ""
  ) {
    next.search_mode = extras.search_mode;
  }
  if (
    (next.rows_excluded === undefined || next.rows_excluded === "") &&
    extras.rows_excluded !== undefined &&
    extras.rows_excluded !== ""
  ) {
    next.rows_excluded = extras.rows_excluded;
  }
  return next;
}

/**
 * Rewrite known aliases, drop empty values, and refuse a query that looks
 * filtered but would hit the whole database (every user key unknown).
 *
 * Databases without a hardcoded whitelist only get aliases — we cannot know
 * every valid ES key (e.g. brand_name on product_cn is listed).
 */
export function sanitizeQuery(dbname: string, query: QueryObject): SanitizedQuery {
  const aliases = QUERY_ALIASES[dbname] ?? {};
  const known = knownFieldsFor(dbname);
  const rewritten: QueryObject = {};
  const query_aliases: Record<string, string> = {};
  const query_ignored: string[] = [];
  const warnings: string[] = [];
  let userFilterCount = 0;

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (isEmptyValue(value)) {
      warnings.push(`Empty value for "${key}" was dropped.`);
      continue;
    }
    const mapped = aliases[key] ?? key;
    if (mapped !== key) {
      query_aliases[key] = mapped;
    }
    if (!CONTROL_KEYS.has(mapped) && !CONTROL_KEYS.has(key)) {
      userFilterCount += 1;
    }
    if (known && !CONTROL_KEYS.has(mapped) && !known.has(mapped)) {
      query_ignored.push(key);
      continue;
    }
    if (rewritten[mapped] === undefined) {
      rewritten[mapped] = value;
    }
  }

  const appliedFilters = Object.keys(rewritten).filter((key) => !CONTROL_KEYS.has(key));
  if (userFilterCount > 0 && appliedFilters.length === 0) {
    const valid = known ? [...known].sort().join(", ") : "(see catalog search_fields)";
    throw new Error(
      `All query keys were ignored for ${dbname}: ${query_ignored.join(", ") || "(empty values)"}. ` +
        `This would return the entire database. Valid keys include: ${valid}.`
    );
  }

  if (query_ignored.length > 0) {
    warnings.push(
      `Unknown query key(s) ignored for ${dbname}: ${query_ignored.join(", ")}. ` +
        `Results are unfiltered on those keys.`
    );
  }
  if (Object.keys(query_aliases).length > 0) {
    const pairs = Object.entries(query_aliases)
      .map(([from, to]) => `${from}→${to}`)
      .join(", ");
    warnings.push(`Rewrote query keys: ${pairs}.`);
  }
  if (query.item !== undefined && query.item !== "" && dbname === "product_cn") {
    warnings.push(
      "item is a broad synonym search; for a trade name use brand_name (e.g. 立普妥)."
    );
  }
  if (dbname === "global_search") {
    warnings.push(
      "china_drug_num / usa_drug_num / *_ct_num on global_search rows are often 0 (ETL not backfilled) — do not cite them."
    );
  }

  return { query: rewritten, query_aliases, query_ignored, warnings };
}

export type LimitMeta = {
  limit: number;
  offset: number;
  limit_requested: number;
  max_retrieve: number;
  warnings: string[];
};

export function limitMeta(
  requested: number | undefined,
  applied: number,
  offset: number,
  fallback: number,
  max: number
): LimitMeta {
  const warnings: string[] = [];
  if (requested !== undefined && requested > max) {
    warnings.push(`limit ${requested} was clamped to ${applied} (max ${max}).`);
  }
  return {
    limit: applied,
    offset,
    limit_requested: requested ?? fallback,
    max_retrieve: 1000,
    warnings,
  };
}

export function attachSearchMeta(
  content: unknown,
  sanitized: SanitizedQuery,
  limits?: LimitMeta
): unknown {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return content;
  }
  const out: Record<string, unknown> = { ...(content as Record<string, unknown>) };
  out.query_applied = sanitized.query;
  if (Object.keys(sanitized.query_aliases).length > 0) {
    out.query_aliases = sanitized.query_aliases;
  }
  if (sanitized.query_ignored.length > 0) {
    out.query_ignored = sanitized.query_ignored;
  }
  const warnings = [...sanitized.warnings, ...(limits?.warnings ?? [])];
  if (warnings.length > 0) {
    out.warnings = warnings;
  }
  if (limits) {
    out.limit = limits.limit;
    out.offset = limits.offset;
    out.limit_requested = limits.limit_requested;
    out.max_retrieve = limits.max_retrieve;
  }
  return out;
}
