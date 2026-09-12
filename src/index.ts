#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  clampLimit,
  clampOffset,
  enforceRetrievalWindow,
  fetchDetail,
  fetchFacets,
  listSearch,
  mcpDbDetail,
  mcpDbOutput,
  mcpDbSearch,
  prefersMcpListApi,
  yaohaiPost,
} from "./api.js";
import {
  ATC_HINT,
  PRODUCT_CN_COMMON_FIELDS,
  PRODUCT_CN_DETAIL_PATH,
  PRODUCT_CN_FACET_FIELDS,
  PRODUCT_CN_FACET_PREFIX,
  PRODUCT_CN_VIEW_TYPES,
  REG_CN_COMMON_FIELDS,
  REG_CN_DETAIL_PATH,
  REG_CN_FACET_FIELDS,
  REG_CN_FACET_PREFIX,
  REG_CN_VIEW_TYPES,
  applyProductCnDefaults,
  applyRegCnDefaults,
  productCnSearchPath,
  regCnSearchPath,
} from "./fields.js";
import type { QueryObject } from "./types.js";
import {
  EmptyObjectSchema,
  ProductCnDetailSchema,
  ProductCnFacetsSchema,
  ProductCnSearchSchema,
  RegCnDetailSchema,
  RegCnFacetsSchema,
  RegCnSearchSchema,
  YaohaiCatalogSchema,
  YaohaiDetailSchema,
  YaohaiFacetsSchema,
  YaohaiGlobalSearchSchema,
  YaohaiSearchSchema,
} from "./types.js";
import {
  attachSearchMeta,
  hoistQueryFlags,
  limitMeta,
  sanitizeQuery,
} from "./query.js";
import { DBS_FACET_CATALOG } from "./dbs-facets.js";
import {
  checkForUpdate,
  formatUpdateMessage,
} from "./update-check.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "./environment.js";

const YAOHAI_LIMIT_MAX = 50;
const YAOHAI_LIMIT_DEFAULT = 10;
const CN_LIMIT_MAX = 100;
const CN_LIMIT_DEFAULT = 20;

const QUERY_PROP = {
  type: "object",
  additionalProperties: true,
  description:
    "Search/filter fields. Values may be string, number, or string[] (repeat the key for ConditionSearch multiple). Date: \"YYYY-MM-DD to YYYY-MM-DD\". Range: \"min to max\".",
} as const;

const PRESENTATION_HINT =
  "If total > 20, summarize in chat (about 5–10 sample rows) instead of dumping the full table. Include frontend source links when present.";

const RETRIEVAL_CAP_HINT =
  "One distinct query condition can return at most 1000 rows total (offset+limit window cap, anti-scraping): paginate within that window, or narrow the filters (date / province / ATC / enterprise) to reach deeper slices — a too-large offset is rejected.";

const OUTPUT_HINT =
  "To export Excel: first search and read total; if total is 1–999, call again with action=output. The server counts first, generates xlsx via the list API, uploads it to OSS, and returns download_url (never binary). If total ≥ 1000, narrow the query instead.";

const ROUTING_HINT =
  "Already-marketed China products (国药准字, 批准文号, 上市, 医保/集采) → product-cn-* tools. R&D / CDE pipeline (在研, 受理号, 审评, 尚未上市) → reg-cn-* tools. Other DBs (医保 yibao, 基药 jiyao, 集采 jicai, trials, global) → yaohai-*. Do not use yaohai-search with dbname product_cn or reg_cn when the dedicated tools apply.";

/**
 * Derived from the generated facet catalog so the tool descriptions can never
 * drift from the data they describe.
 */
const DBS_FACET_DBS = Object.keys(DBS_FACET_CATALOG).sort();
const DBS_FACET_DB_COUNT = DBS_FACET_DBS.length;
const DBS_FACET_FIELD_COUNT = DBS_FACET_DBS.reduce(
  (n, db) => n + Object.keys(DBS_FACET_CATALOG[db].fields).length,
  0,
);
/** A few well-known dbs, used to hint coverage without listing all of them. */
const DBS_FACET_EXAMPLES = ["zhaobiao", "ct_cn", "yibao", "jiyao", "jicai", "product_us", "uk_emc"]
  .filter((db) => db in DBS_FACET_CATALOG)
  .join(", ");

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

const server = new Server(
  {
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      // Declared so clients accept the notifications/message we emit when a
      // newer version of this package is published.
      logging: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "yaohai-catalog",
        description:
          "List Yaohai / DrugSea databases (60+). Filter by category or keyword to pick a dbname for yaohai-search. " +
          ROUTING_HINT,
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description:
                "Optional category, e.g. 市场准入, 上市情报, 注册情报, 临床试验, NMPA基础库",
            },
            q: {
              type: "string",
              description: "Optional keyword filter on title, id, or keywords",
            },
          },
        },
      },
      {
        name: "yaohai-search",
        description:
          "Search a single Yaohai database by dbname (from yaohai-catalog). Default limit 10, max 50. " +
          RETRIEVAL_CAP_HINT +
          " " +
          "Use query fields from the catalog's search_fields. " +
          ROUTING_HINT +
          " " +
          PRESENTATION_HINT +
          " " +
          OUTPUT_HINT,
        inputSchema: {
          type: "object",
          properties: {
            dbname: {
              type: "string",
              description:
                "Database id, e.g. yibao, jiyao, jicai, jicai_mulu, fda_dmf. Prefer product-cn-search / reg-cn-search instead of product_cn / reg_cn.",
            },
            query: QUERY_PROP,
            search_mode: {
              type: "number",
              description: "Optional. Hoisted into query.search_mode if query omits it (1/2/3).",
            },
            limit: {
              type: "number",
              description: `Row cap (default ${YAOHAI_LIMIT_DEFAULT}, max ${YAOHAI_LIMIT_MAX})`,
            },
            offset: { type: "number", description: "Pagination offset (default 0); offset+limit is capped at 1000 rows per query condition" },
            action: {
              type: "string",
              enum: ["output"],
              description:
                "Set to output to export the current query as Excel. Server returns an OSS download_url, not a binary file.",
            },
          },
          required: ["dbname"],
        },
      },
      {
        name: "yaohai-detail",
        description:
          "Fetch one record's detail from a Yaohai database. Requires dbname + encrypted id from yaohai-search items. Skip if catalog says has_detail is false (use list fields instead).",
        inputSchema: {
          type: "object",
          properties: {
            dbname: { type: "string", description: "Database id" },
            id: { type: "string", description: "Record id from search results" },
          },
          required: ["dbname", "id"],
        },
      },
      {
        name: "yaohai-facets",
        description:
          "Facet distributions (条件筛选) — aggregated value+count buckets for filterable fields. " +
          `Works for ${DBS_FACET_DB_COUNT} databases reached via yaohai-search (${DBS_FACET_EXAMPLES}, …), including dedicated-route pages (zhaobiao, ct_cn, product_us, sales_cn, …). ` +
          `DISCOVERY MODE: omit \`fields\` to list available facet fields (add \`dbname\` for one db, omit it for all ${DBS_FACET_DB_COUNT}). ` +
          "FETCH MODE: pass `fields` (required with `dbname`) to get buckets for those fields. One HTTP request fires per field, so request only the 2–4 you need. " +
          "Pass the same `query` filters you used in yaohai-search to facet within that result set. " +
          "sales_cn / sales_global return hardcoded SPA lists (count is null). " +
          "Not available for product_cn / reg_cn — use product-cn-facets / reg-cn-facets instead.",
        inputSchema: {
          type: "object",
          properties: {
            dbname: {
              type: "string",
              description:
                "Database id from yaohai-catalog, e.g. zhaobiao, yibao, ct_cn, product_us. Required when `fields` is given. Omit to list all facet-capable databases.",
            },
            query: QUERY_PROP,
            fields: {
              type: "array",
              items: { type: "string" },
              description:
                "Facet field keys (see discovery mode). Omit to get the catalog instead of buckets. Example for yibao: [\"province\", \"drug_type\"].",
            },
          },
        },
      },
      {
        name: "yaohai-global-search",
        description:
          "Global drug panorama search (global_search). Use q or query.term / query.drug_name — item is not a key (it is rewritten to term). " +
          "brand_name filters the trade-name column after the API fix; do not treat *_drug_num / *_ct_num as populated. " +
          RETRIEVAL_CAP_HINT +
          " " +
          PRESENTATION_HINT +
          " " +
          OUTPUT_HINT,
        inputSchema: {
          type: "object",
          properties: {
            q: { type: "string", description: "Search term (maps to query.term)" },
            query: QUERY_PROP,
            limit: {
              type: "number",
              description: `Row cap (default ${YAOHAI_LIMIT_DEFAULT}, max ${YAOHAI_LIMIT_MAX})`,
            },
            offset: { type: "number", description: "Pagination offset (default 0); offset+limit is capped at 1000 rows per query condition" },
            action: {
              type: "string",
              enum: ["output"],
              description:
                "Set to output to export the current query as Excel. Server returns an OSS download_url, not a binary file.",
            },
          },
        },
      },
      {
        name: "product-cn-fields",
        description:
          "List CommonSearch and ConditionSearch field keys for 国内上市药品 (product_cn). Call before product-cn-search / product-cn-facets if unsure which filters exist.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "product-cn-search",
        description:
          "Search already-marketed China drugs (product_cn / 国药准字 / 批准文号 / NMPA listed). " +
          "Default search_mode=3 (partial). first_approve_date = first listing date; approve_date = latest re-registration (not first listing). " +
          ATC_HINT +
          " Default limit 20, max 100. " +
          RETRIEVAL_CAP_HINT +
          " " +
          "Not for R&D pipeline — use reg-cn-search. " +
          PRESENTATION_HINT +
          " " +
          OUTPUT_HINT,
        inputSchema: {
          type: "object",
          properties: {
            query: {
              ...QUERY_PROP,
              description:
                QUERY_PROP.description +
                " Common: item, drug_name, brand_name, manufacture, license_holder, specification, std_specification, auth_num, indication, general_name_cn, only_active (1), search_mode (1/2/3). Condition examples: ATC_code, national_yibao, std_dosage_form, source, first_approve_date.",
            },
            search_mode: {
              type: "number",
              description: "Optional. Same as query.search_mode (1/2/3). Top-level value is merged into query if omitted there.",
            },
            limit: {
              type: "number",
              description: `Row cap (default ${CN_LIMIT_DEFAULT}, max ${CN_LIMIT_MAX})`,
            },
            offset: { type: "number", description: "Pagination offset (default 0); offset+limit is capped at 1000 rows per query condition" },
            view_type: {
              type: "string",
              enum: [...PRODUCT_CN_VIEW_TYPES],
              description: "eslist (by approval, default), list_by_drug_name, list_by_manufacture",
            },
            action: {
              type: "string",
              enum: ["output"],
              description:
                "Set to output to export the current query as Excel. Server returns an OSS download_url, not a binary file.",
            },
          },
        },
      },
      {
        name: "product-cn-facets",
        description:
          "Facet distributions for 国内上市药品 after a keyword query. facets is required (do not request all 22 — slow). " +
          "Recommended: ATC_code, drug_type, national_yibao, std_dosage_form, source. " +
          ATC_HINT,
        inputSchema: {
          type: "object",
          properties: {
            query: QUERY_PROP,
            facets: {
              type: "array",
              items: { type: "string" },
              description:
                "Facet field keys to fetch. Recommended: ATC_code, drug_type, national_yibao, std_dosage_form, source.",
            },
          },
          required: ["facets"],
        },
      },
      {
        name: "product-cn-detail",
        description:
          "Detail for one product_cn row. Prefer the encrypted id from product-cn-search items; a raw 批准文号 is accepted as a fallback.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "Encrypted record id from search results" },
          },
          required: ["id"],
        },
      },
      {
        name: "reg-cn-fields",
        description:
          "List CommonSearch and ConditionSearch field keys for 药品注册审评 (reg_cn / CDE). Call before reg-cn-search / reg-cn-facets if unsure which filters exist.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "reg-cn-search",
        description:
          "Search China drug registration / CDE review (reg_cn): 在研, 受理号, 申报, 审评进度, not-yet-listed. " +
          "Default rows_excluded=1 (drop 备案), search_mode=1. " +
          ATC_HINT +
          " Default limit 20, max 100. " +
          RETRIEVAL_CAP_HINT +
          " " +
          "Not for already-marketed products — use product-cn-search. " +
          PRESENTATION_HINT +
          " " +
          OUTPUT_HINT,
        inputSchema: {
          type: "object",
          properties: {
            query: {
              ...QUERY_PROP,
              description:
                QUERY_PROP.description +
                " Common: item, drug_name, enterprise, slh, indication, rows_excluded, search_mode. Condition examples: ATC_code, rd_status, transact_status, register_type, drug_type, undertake_date.",
            },
            search_mode: {
              type: "number",
              description: "Optional. Same as query.search_mode (1/2/3). Top-level value is merged into query if omitted there.",
            },
            rows_excluded: {
              type: "number",
              description: "Optional. Same as query.rows_excluded (1 drop 备案, 0 include). Top-level value is merged into query if omitted there.",
            },
            limit: {
              type: "number",
              description: `Row cap (default ${CN_LIMIT_DEFAULT}, max ${CN_LIMIT_MAX})`,
            },
            offset: { type: "number", description: "Pagination offset (default 0); offset+limit is capped at 1000 rows per query condition" },
            view_type: {
              type: "string",
              enum: [...REG_CN_VIEW_TYPES],
              description: "eslist (default), list_by_drug_name, list_by_enterprise",
            },
            action: {
              type: "string",
              enum: ["output"],
              description:
                "Set to output to export the current query as Excel. Server returns an OSS download_url, not a binary file.",
            },
          },
        },
      },
      {
        name: "reg-cn-facets",
        description:
          "Facet distributions for 药品注册审评. facets is required (do not request all dimensions — slow). " +
          "Recommended: ATC_code, rd_status, drug_type, transact_status, register_type. " +
          ATC_HINT,
        inputSchema: {
          type: "object",
          properties: {
            query: QUERY_PROP,
            facets: {
              type: "array",
              items: { type: "string" },
              description:
                "Facet field keys to fetch. Recommended: ATC_code, rd_status, drug_type, transact_status, register_type.",
            },
          },
          required: ["facets"],
        },
      },
      {
        name: "reg-cn-detail",
        description:
          "Detail for one reg_cn acceptance/review row. Prefer the encrypted id from reg-cn-search items; a raw 受理号 is accepted as a fallback.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "Encrypted record id from search results" },
          },
          required: ["id"],
        },
      },
    ],
  };
});

function encodeId(id: string): string {
  return encodeURIComponent(id).replace(/!/g, "%21");
}

function asQuery(query: QueryObject | undefined): QueryObject {
  return { ...(query ?? {}) };
}

/**
 * Structured "not facet-capable" response.
 *
 * Returned as a normal (non-error) payload so an agent can self-correct in one
 * step instead of having to parse an exception message. Covers the common cases:
 * a dbname that is not in the catalog at all, and one that exists but has no
 * terms 条件筛选 (product_cn / reg_cn have dedicated facet tools).
 */
function facetDbUnknown(dbname: string): Record<string, unknown> {
  const near = DBS_FACET_DBS.filter((db) => db.includes(dbname) || dbname.includes(db)).slice(0, 5);
  return {
    dbname,
    supported: false,
    error: `No facet fields known for dbname "${dbname}".`,
    hint:
      "Only databases with SPA 条件筛选 terms fields are in yaohai-facets. " +
      "For product_cn use product-cn-facets; for reg_cn use reg-cn-facets. " +
      `Call yaohai-facets with no arguments to list all ${DBS_FACET_DB_COUNT} facet-capable databases.`,
    ...(near.length > 0 ? { did_you_mean: near } : {}),
  };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "yaohai-catalog": {
        const validated = YaohaiCatalogSchema.parse(args ?? {});
        const body: Record<string, unknown> = {};
        if (validated.category) body.category = validated.category;
        if (validated.q) body.q = validated.q;
        const content = await yaohaiPost("/g/mcp/yaohai/catalog", body);
        return ok(content);
      }
      case "yaohai-search": {
        const validated = YaohaiSearchSchema.parse(args);
        const sanitized = sanitizeQuery(
          validated.dbname,
          hoistQueryFlags(asQuery(validated.query), validated)
        );
        if (validated.action === "output") {
          const content = await mcpDbOutput({
            dbname: validated.dbname,
            query: sanitized.query,
          });
          return ok(attachSearchMeta(content, sanitized));
        }
        const window = enforceRetrievalWindow(
          clampLimit(validated.limit, YAOHAI_LIMIT_DEFAULT, YAOHAI_LIMIT_MAX),
          clampOffset(validated.offset)
        );
        const content = await yaohaiPost("/g/mcp/yaohai/search", {
          dbname: validated.dbname,
          query: sanitized.query,
          limit: window.limit,
          offset: window.offset,
        });
        return ok(
          attachSearchMeta(
            content,
            sanitized,
            limitMeta(
              validated.limit,
              window.limit,
              window.offset,
              YAOHAI_LIMIT_DEFAULT,
              YAOHAI_LIMIT_MAX
            )
          )
        );
      }
      case "yaohai-detail": {
        const validated = YaohaiDetailSchema.parse(args);
        const content = await yaohaiPost("/g/mcp/yaohai/detail", {
          dbname: validated.dbname,
          id: validated.id,
        });
        return ok(content);
      }
      case "yaohai-facets": {
        const validated = YaohaiFacetsSchema.parse(args ?? {});

        // Discovery mode: no `fields` -> describe what can be facetted.
        // Without this, agents would have to guess field names and would hit
        // "Unknown facet fields" from fetchFacets.
        if (!validated.fields) {
          if (validated.dbname) {
            const entry = DBS_FACET_CATALOG[validated.dbname];
            if (!entry) {
              return ok(facetDbUnknown(validated.dbname));
            }
            return ok({
              dbname: validated.dbname,
              title: entry.title,
              category: entry.category,
              facet_prefix: entry.prefix || null,
              source: entry.source ?? "http",
              facet_count: Object.keys(entry.fields).length,
              facets: entry.fields,
            });
          }
          return ok({
            facet_capable_databases: DBS_FACET_DB_COUNT,
            total_facet_fields: DBS_FACET_FIELD_COUNT,
            note:
              "Call yaohai-facets with a dbname to list its fields, or pass dbname + fields to fetch buckets. " +
              "product_cn and reg_cn use product-cn-facets / reg-cn-facets instead. " +
              "sales_cn / sales_global are hardcoded SPA lists (count is null).",
            databases: DBS_FACET_DBS.map((db) => ({
              dbname: db,
              title: DBS_FACET_CATALOG[db].title,
              category: DBS_FACET_CATALOG[db].category,
              source: DBS_FACET_CATALOG[db].source ?? "http",
              facet_count: Object.keys(DBS_FACET_CATALOG[db].fields).length,
              fields: Object.keys(DBS_FACET_CATALOG[db].fields),
            })),
          });
        }

        // Fetch mode: both dbname and fields are required.
        if (!validated.dbname) {
          throw new Error(
            "dbname is required when fetching facets. Omit `fields` to list facet-capable databases."
          );
        }
        const entry = DBS_FACET_CATALOG[validated.dbname];
        if (!entry) {
          return ok(facetDbUnknown(validated.dbname));
        }

        // Report unknown fields up front with the valid list, rather than letting
        // fetchFacets throw on the first one and lose the rest.
        const known = Object.keys(entry.fields);
        const unknown = validated.fields.filter((f) => !known.includes(f));
        if (unknown.length > 0) {
          throw new Error(
            `Unknown facet field(s) for ${validated.dbname}: ${unknown.join(", ")}. ` +
              `Valid fields: ${known.join(", ")}.`
          );
        }

        // Per-db required params (e.g. drugsales needs groupid=205) go first so
        // caller-supplied values can still override them. Merge before sanitize
        // so query_applied reports the same object fetchFacets actually sends.
        const sanitized = sanitizeQuery(validated.dbname, {
          ...(entry.defaultQuery ?? {}),
          ...asQuery(validated.query),
        });

        const content = await fetchFacets({
          prefix: entry.prefix,
          query: sanitized.query,
          fields: validated.fields,
          catalog: entry.fields,
        });
        return ok(
          attachSearchMeta(
            {
              dbname: validated.dbname,
              title: entry.title,
              ...content,
            },
            sanitized
          )
        );
      }
      case "yaohai-global-search": {
        const validated = YaohaiGlobalSearchSchema.parse(args ?? {});
        const hoisted = hoistQueryFlags(asQuery(validated.query), validated);
        if (validated.q && (hoisted.term === undefined || hoisted.term === "")) {
          hoisted.term = validated.q;
        }
        const sanitized = sanitizeQuery("global_search", hoisted);
        if (validated.action === "output") {
          const content = await mcpDbOutput({
            dbname: "global_search",
            query: sanitized.query,
          });
          return ok(attachSearchMeta(content, sanitized));
        }
        const window = enforceRetrievalWindow(
          clampLimit(validated.limit, YAOHAI_LIMIT_DEFAULT, YAOHAI_LIMIT_MAX),
          clampOffset(validated.offset)
        );
        const content = await yaohaiPost("/g/mcp/yaohai/global-search", {
          query: sanitized.query,
          limit: window.limit,
          offset: window.offset,
        });
        return ok(
          attachSearchMeta(
            content,
            sanitized,
            limitMeta(
              validated.limit,
              window.limit,
              window.offset,
              YAOHAI_LIMIT_DEFAULT,
              YAOHAI_LIMIT_MAX
            )
          )
        );
      }
      case "product-cn-fields": {
        EmptyObjectSchema.parse(args ?? {});
        return ok({
          common_search: [...PRODUCT_CN_COMMON_FIELDS],
          condition_search: PRODUCT_CN_FACET_FIELDS,
          view_types: [...PRODUCT_CN_VIEW_TYPES],
        });
      }
      case "product-cn-search": {
        const validated = ProductCnSearchSchema.parse(args ?? {});
        const viewType = validated.view_type ?? "eslist";
        const sanitized = sanitizeQuery(
          "product_cn",
          hoistQueryFlags(asQuery(validated.query), validated)
        );
        const query = applyProductCnDefaults(sanitized.query) as QueryObject;
        sanitized.query = query;
        if (validated.action === "output") {
          const content = await mcpDbOutput({
            dbname: "product_cn",
            query,
            viewType,
          });
          return ok(attachSearchMeta(content, sanitized));
        }
        const window = enforceRetrievalWindow(
          clampLimit(validated.limit, CN_LIMIT_DEFAULT, CN_LIMIT_MAX),
          clampOffset(validated.offset)
        );
        const limit = window.limit;
        const offset = window.offset;
        const content = prefersMcpListApi()
          ? await mcpDbSearch({
              dbname: "product_cn",
              query,
              limit,
              offset,
              viewType,
            })
          : await listSearch({
              path: productCnSearchPath(viewType),
              query,
              limit,
              offset,
              viewType,
              dbname: "product_cn",
            });
        return ok(
          attachSearchMeta(
            content,
            sanitized,
            limitMeta(validated.limit, limit, offset, CN_LIMIT_DEFAULT, CN_LIMIT_MAX)
          )
        );
      }
      case "product-cn-facets": {
        const validated = ProductCnFacetsSchema.parse(args);
        const sanitized = sanitizeQuery("product_cn", asQuery(validated.query));
        const query = applyProductCnDefaults(sanitized.query) as QueryObject;
        sanitized.query = query;
        const content = await fetchFacets({
          prefix: PRODUCT_CN_FACET_PREFIX,
          query,
          fields: validated.facets,
          catalog: PRODUCT_CN_FACET_FIELDS,
        });
        return ok(attachSearchMeta(content, sanitized));
      }
      case "product-cn-detail": {
        const validated = ProductCnDetailSchema.parse(args);
        const content = prefersMcpListApi()
          ? await mcpDbDetail("product_cn", validated.id)
          : await fetchDetail(
              `${PRODUCT_CN_DETAIL_PATH}/${encodeId(validated.id)}`,
              validated.id,
              "product_cn"
            );
        return ok(content);
      }
      case "reg-cn-fields": {
        EmptyObjectSchema.parse(args ?? {});
        return ok({
          common_search: [...REG_CN_COMMON_FIELDS],
          condition_search: REG_CN_FACET_FIELDS,
          view_types: [...REG_CN_VIEW_TYPES],
        });
      }
      case "reg-cn-search": {
        const validated = RegCnSearchSchema.parse(args ?? {});
        const viewType = validated.view_type ?? "eslist";
        const sanitized = sanitizeQuery(
          "reg_cn",
          hoistQueryFlags(asQuery(validated.query), validated)
        );
        const query = applyRegCnDefaults(sanitized.query) as QueryObject;
        sanitized.query = query;
        if (validated.action === "output") {
          const content = await mcpDbOutput({
            dbname: "reg_cn",
            query,
            viewType,
          });
          return ok(attachSearchMeta(content, sanitized));
        }
        const window = enforceRetrievalWindow(
          clampLimit(validated.limit, CN_LIMIT_DEFAULT, CN_LIMIT_MAX),
          clampOffset(validated.offset)
        );
        const limit = window.limit;
        const offset = window.offset;
        const content = prefersMcpListApi()
          ? await mcpDbSearch({
              dbname: "reg_cn",
              query,
              limit,
              offset,
              viewType,
            })
          : await listSearch({
              path: regCnSearchPath(viewType),
              query,
              limit,
              offset,
              viewType,
              dbname: "reg_cn",
            });
        return ok(
          attachSearchMeta(
            content,
            sanitized,
            limitMeta(validated.limit, limit, offset, CN_LIMIT_DEFAULT, CN_LIMIT_MAX)
          )
        );
      }
      case "reg-cn-facets": {
        const validated = RegCnFacetsSchema.parse(args);
        const sanitized = sanitizeQuery("reg_cn", asQuery(validated.query));
        const query = applyRegCnDefaults(sanitized.query) as QueryObject;
        sanitized.query = query;
        const content = await fetchFacets({
          prefix: REG_CN_FACET_PREFIX,
          query,
          fields: validated.facets,
          catalog: REG_CN_FACET_FIELDS,
        });
        return ok(attachSearchMeta(content, sanitized));
      }
      case "reg-cn-detail": {
        const validated = RegCnDetailSchema.parse(args);
        const content = prefersMcpListApi()
          ? await mcpDbDetail("reg_cn", validated.id)
          : await fetchDetail(
              `${REG_CN_DETAIL_PATH}/${encodeId(validated.id)}`,
              validated.id,
              "reg_cn"
            );
        return ok(content);
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: message }],
      isError: true,
    };
  }
});

function ok(content: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(content) }],
    isError: false,
  };
}

/**
 * Tell the user a newer version is published, on both channels we have:
 *  - stderr, which MCP clients surface in their server log panel and which is
 *    safe for a stdio server (stdout carries JSON-RPC and must stay clean);
 *  - a `notifications/message` log notification, which reaches clients that
 *    render MCP log messages to the user.
 *
 * Never throws: diagnostics must not take the server down.
 */
async function announceUpdateIfAvailable(): Promise<void> {
  try {
    const result = await checkForUpdate(PACKAGE_VERSION);
    if (!result.updateAvailable) return;

    const message = formatUpdateMessage(result);
    if (!message) return;

    console.error(`[mcp-drugsea] ${message.split("\n").join("\n[mcp-drugsea] ")}`);

    try {
      await server.sendLoggingMessage({
        level: "warning",
        logger: "update-check",
        data: message,
      });
    } catch {
      // Client may not have declared logging support; stderr line still landed.
    }
  } catch {
    // Swallow everything: an update check is never worth surfacing.
  }
}

async function main() {
  const transport = new StdioServerTransport();
  // Fire only after the initialize handshake completes, so the notification is
  // never emitted before the client is ready to receive it. Deliberately not
  // awaited: startup latency must not depend on registry reachability.
  server.oninitialized = () => {
    void announceUpdateIfAvailable();
  };
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
