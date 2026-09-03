#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  ApiError,
  clampLimit,
  clampOffset,
  fetchDetail,
  fetchFacets,
  listSearch,
  mcpDbDetail,
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
  YaohaiGlobalSearchSchema,
  YaohaiSearchSchema,
  YaohaiSmartSearchSchema,
} from "./types.js";

const PACKAGE_VERSION = "0.2.0";

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

const ROUTING_HINT =
  "Already-marketed China products (国药准字, 批准文号, 上市, 医保/集采) → product-cn-* tools. R&D / CDE pipeline (在研, 受理号, 审评, 尚未上市) → reg-cn-* tools. Other DBs (医保 yibao, 基药 jiyao, 集采 jicai, trials, global) → yaohai-*. Do not use yaohai-search with dbname product_cn or reg_cn when the dedicated tools apply.";

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
    name: "mcp-drugsea",
    version: PACKAGE_VERSION,
  },
  {
    capabilities: {
      resources: {},
      tools: {},
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
          "Use query fields from the catalog's search_fields. " +
          ROUTING_HINT +
          " " +
          PRESENTATION_HINT,
        inputSchema: {
          type: "object",
          properties: {
            dbname: {
              type: "string",
              description:
                "Database id, e.g. yibao, jiyao, jicai, jicai_mulu, fda_dmf. Prefer product-cn-search / reg-cn-search instead of product_cn / reg_cn.",
            },
            query: QUERY_PROP,
            limit: {
              type: "number",
              description: `Row cap (default ${YAOHAI_LIMIT_DEFAULT}, max ${YAOHAI_LIMIT_MAX})`,
            },
            offset: { type: "number", description: "Pagination offset (default 0)" },
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
        name: "yaohai-global-search",
        description:
          "Global drug panorama search (global_search). Pass q as the search term, or query.term. " +
          PRESENTATION_HINT,
        inputSchema: {
          type: "object",
          properties: {
            q: { type: "string", description: "Search term (maps to query.term)" },
            query: QUERY_PROP,
            limit: {
              type: "number",
              description: `Row cap (default ${YAOHAI_LIMIT_DEFAULT}, max ${YAOHAI_LIMIT_MAX})`,
            },
            offset: { type: "number", description: "Pagination offset (default 0)" },
          },
        },
      },
      {
        name: "yaohai-smart-search",
        description:
          "Natural-language Yaohai search: auto-routes the question to up to 3 databases. Use when the user question is broad or the target DB is unclear. " +
          "Falls back to global search when the router matches nothing or finds no rows. " +
          ROUTING_HINT,
        inputSchema: {
          type: "object",
          properties: {
            q: { type: "string", description: "Natural language question" },
            query: QUERY_PROP,
            limit: {
              type: "number",
              description: `Row cap (default ${YAOHAI_LIMIT_DEFAULT}, max ${YAOHAI_LIMIT_MAX})`,
            },
          },
          required: ["q"],
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
          "Not for R&D pipeline — use reg-cn-search. " +
          PRESENTATION_HINT,
        inputSchema: {
          type: "object",
          properties: {
            query: {
              ...QUERY_PROP,
              description:
                QUERY_PROP.description +
                " Common: item, drug_name, manufacture, license_holder, specification, std_specification, auth_num, indication, general_name_cn, only_active (1), search_mode (1/2/3). Condition examples: ATC_code, national_yibao, std_dosage_form, source, first_approve_date.",
            },
            limit: {
              type: "number",
              description: `Row cap (default ${CN_LIMIT_DEFAULT}, max ${CN_LIMIT_MAX})`,
            },
            offset: { type: "number", description: "Pagination offset (default 0)" },
            view_type: {
              type: "string",
              enum: [...PRODUCT_CN_VIEW_TYPES],
              description: "eslist (by approval, default), list_by_drug_name, list_by_manufacture",
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
          "Detail for one product_cn row. id is the encrypted id from product-cn-search items (not the raw 批准文号).",
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
          " Default limit 20, max 100. Not for already-marketed products — use product-cn-search. " +
          PRESENTATION_HINT,
        inputSchema: {
          type: "object",
          properties: {
            query: {
              ...QUERY_PROP,
              description:
                QUERY_PROP.description +
                " Common: item, drug_name, enterprise, slh, indication, rows_excluded, search_mode. Condition examples: ATC_code, rd_status, transact_status, register_type, drug_type, undertake_date.",
            },
            limit: {
              type: "number",
              description: `Row cap (default ${CN_LIMIT_DEFAULT}, max ${CN_LIMIT_MAX})`,
            },
            offset: { type: "number", description: "Pagination offset (default 0)" },
            view_type: {
              type: "string",
              enum: [...REG_CN_VIEW_TYPES],
              description: "eslist (default), list_by_drug_name, list_by_enterprise",
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
          "Detail for one reg_cn acceptance/review row. id is the encrypted id from reg-cn-search items (not the raw 受理号).",
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

async function globalSearchContent(
  q: string,
  query: QueryObject | undefined,
  limit: number
): Promise<Record<string, unknown>> {
  const gquery = asQuery(query);
  if (q && (gquery.term === undefined || gquery.term === "")) {
    gquery.term = q;
  }
  const content = await yaohaiPost("/g/mcp/yaohai/global-search", {
    query: gquery,
    limit,
    offset: 0,
  });
  return content as Record<string, unknown>;
}

function allSmartResultsEmpty(content: unknown): boolean {
  if (!content || typeof content !== "object") {
    return true;
  }
  const results = (content as { results?: unknown }).results;
  if (!Array.isArray(results) || results.length === 0) {
    return true;
  }
  return results.every((entry) => {
    const result = (entry as { result?: unknown })?.result;
    if (!result || typeof result !== "object") {
      return true;
    }
    const total = (result as { total?: unknown }).total;
    return typeof total === "number" ? total === 0 : true;
  });
}

/**
 * The backend router searches the entire question string in one field per DB,
 * which rarely matches (e.g. item="医保目录 阿司匹林" → 0 rows), and sometimes
 * picks a field the DB does not support (e.g. `item` on jicai). Retry each
 * empty matched DB with the individual tokens of the question across the
 * router's field plus the catalog's search_fields for that DB.
 */
async function retrySmartResultsWithTokens(
  content: Record<string, unknown>,
  q: string,
  limit: number
): Promise<Record<string, unknown> | null> {
  const results = content.results;
  if (!Array.isArray(results)) {
    return null;
  }
  const tokens = q.split(/\s+/).filter((t) => t && t !== q);
  if (tokens.length === 0) {
    return null;
  }

  const catalogFields = new Map<string, string[]>();
  async function searchFieldsFor(dbname: string): Promise<string[]> {
    if (catalogFields.has(dbname)) {
      return catalogFields.get(dbname)!;
    }
    let keys: string[] = [];
    try {
      const cat = (await yaohaiPost("/g/mcp/yaohai/catalog", { q: dbname })) as {
        databases?: Array<{ id?: string; search_fields?: Array<{ key?: string }> }>;
      };
      const db = (cat.databases ?? []).find((d) => d.id === dbname);
      keys = (db?.search_fields ?? [])
        .map((f) => f.key)
        .filter((k): k is string => typeof k === "string");
    } catch {
      keys = [];
    }
    catalogFields.set(dbname, keys);
    return keys;
  }

  let changed = false;
  const patched: unknown[] = [];
  for (const entry of results) {
    const inner = (entry as { result?: unknown })?.result;
    if (!inner || typeof inner !== "object") {
      patched.push(entry);
      continue;
    }
    const r = inner as Record<string, unknown>;
    if (r.total !== 0 || typeof r.dbname !== "string") {
      patched.push(entry);
      continue;
    }
    const queryApplied = r.query_applied as Record<string, unknown> | undefined;
    const appliedKeys = queryApplied ? Object.keys(queryApplied) : [];
    const singleFieldWholeQuestion =
      appliedKeys.length === 1 && queryApplied![appliedKeys[0]] === q;
    if (!singleFieldWholeQuestion) {
      patched.push(entry);
      continue;
    }
    const routerField = appliedKeys[0];
    const fields = [routerField, ...(await searchFieldsFor(r.dbname))];
    const uniqueFields = [...new Set(fields)].slice(0, 6);
    let replaced = false;
    outer: for (const token of tokens.slice(0, 3)) {
      for (const field of uniqueFields) {
        try {
          const retry = (await yaohaiPost("/g/mcp/yaohai/search", {
            dbname: r.dbname,
            query: { [field]: token },
            limit,
            offset: 0,
          })) as Record<string, unknown>;
          if (typeof retry.total === "number" && retry.total > 0) {
            patched.push({
              ...(entry as Record<string, unknown>),
              result: { ...retry, retry: { token, field } },
            });
            changed = true;
            replaced = true;
            break outer;
          }
        } catch {
          // ignore per-token retry errors; try next field/token
        }
      }
    }
    if (!replaced) {
      patched.push(entry);
    }
  }
  if (!changed) {
    return null;
  }
  return { ...content, results: patched };
}

/**
 * Last resort when the router matched databases but every search came back
 * empty (e.g. the question is just a DB keyword like 集采): browse the matched
 * databases without a query so the caller still sees representative rows.
 */
async function browseMatchedDatabases(
  content: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown> | null> {
  const matched = content.matched_databases;
  if (!Array.isArray(matched) || matched.length === 0) {
    return null;
  }
  const results: unknown[] = [];
  for (const db of matched.slice(0, 3)) {
    const id = (db as { id?: unknown })?.id;
    if (typeof id !== "string") {
      continue;
    }
    try {
      const browse = (await yaohaiPost("/g/mcp/yaohai/search", {
        dbname: id,
        query: {},
        limit,
        offset: 0,
      })) as Record<string, unknown>;
      if (typeof browse.total === "number" && browse.total > 0) {
        results.push({
          score: (db as { score?: unknown }).score,
          result: { ...browse, browse: true },
        });
      }
    } catch {
      // DB not browsable — skip
    }
  }
  if (results.length === 0) {
    return null;
  }
  return {
    ...content,
    results,
    note: "Smart-search found no rows for the full question; showing sample rows from the matched databases instead.",
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
        const content = await yaohaiPost("/g/mcp/yaohai/search", {
          dbname: validated.dbname,
          query: asQuery(validated.query),
          limit: clampLimit(validated.limit, YAOHAI_LIMIT_DEFAULT, YAOHAI_LIMIT_MAX),
          offset: clampOffset(validated.offset),
        });
        return ok(content);
      }
      case "yaohai-detail": {
        const validated = YaohaiDetailSchema.parse(args);
        const content = await yaohaiPost("/g/mcp/yaohai/detail", {
          dbname: validated.dbname,
          id: validated.id,
        });
        return ok(content);
      }
      case "yaohai-global-search": {
        const validated = YaohaiGlobalSearchSchema.parse(args ?? {});
        const query = asQuery(validated.query);
        if (validated.q && (query.term === undefined || query.term === "")) {
          query.term = validated.q;
        }
        const content = await yaohaiPost("/g/mcp/yaohai/global-search", {
          query,
          limit: clampLimit(validated.limit, YAOHAI_LIMIT_DEFAULT, YAOHAI_LIMIT_MAX),
          offset: clampOffset(validated.offset),
        });
        return ok(content);
      }
      case "yaohai-smart-search": {
        const validated = YaohaiSmartSearchSchema.parse(args);
        const limit = clampLimit(validated.limit, YAOHAI_LIMIT_DEFAULT, YAOHAI_LIMIT_MAX);
        const body: Record<string, unknown> = { q: validated.q, limit };
        if (validated.query) {
          body.query = validated.query;
        }
        try {
          const content = await yaohaiPost("/g/mcp/yaohai/smart-search", body);
          if (allSmartResultsEmpty(content)) {
            // Router matched DBs but searched the whole question in one field
            // (or picked an unsupported field). Retry with individual tokens
            // across the router's field + the DB's catalog search_fields.
            const retried = await retrySmartResultsWithTokens(
              content as Record<string, unknown>,
              validated.q,
              limit
            );
            if (retried) {
              return ok(retried);
            }
            // Keyword-only question (e.g. "集采"): show sample rows from the
            // matched databases.
            const browsed = await browseMatchedDatabases(
              content as Record<string, unknown>,
              limit
            );
            if (browsed) {
              return ok(browsed);
            }
            // Still nothing — try the global panorama.
            const fallback = await globalSearchContent(validated.q, validated.query, limit);
            return ok({
              question: validated.q,
              matched_databases: (content as Record<string, unknown>).matched_databases,
              fallback: "global-search",
              note: "Smart-search router matched databases but returned no rows; fell back to global search.",
              ...fallback,
            });
          }
          return ok(content);
        } catch (error) {
          if (error instanceof ApiError) {
            // Backend router could not match any database (e.g. plain drug-name
            // question) — fall back to the global panorama search.
            const fallback = await globalSearchContent(validated.q, validated.query, limit);
            return ok({
              question: validated.q,
              fallback: "global-search",
              note: `Smart-search router failed (${error.message}); fell back to global search.`,
              ...fallback,
            });
          }
          throw error;
        }
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
        const query = applyProductCnDefaults(asQuery(validated.query)) as QueryObject;
        const limit = clampLimit(validated.limit, CN_LIMIT_DEFAULT, CN_LIMIT_MAX);
        const offset = clampOffset(validated.offset);
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
            });
        return ok(content);
      }
      case "product-cn-facets": {
        const validated = ProductCnFacetsSchema.parse(args);
        const query = applyProductCnDefaults(asQuery(validated.query)) as QueryObject;
        const content = await fetchFacets({
          prefix: PRODUCT_CN_FACET_PREFIX,
          query,
          fields: validated.facets,
          catalog: PRODUCT_CN_FACET_FIELDS,
        });
        return ok(content);
      }
      case "product-cn-detail": {
        const validated = ProductCnDetailSchema.parse(args);
        const content = prefersMcpListApi()
          ? await mcpDbDetail("product_cn", validated.id)
          : await fetchDetail(
              `${PRODUCT_CN_DETAIL_PATH}/${encodeId(validated.id)}`,
              validated.id
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
        const query = applyRegCnDefaults(asQuery(validated.query)) as QueryObject;
        const limit = clampLimit(validated.limit, CN_LIMIT_DEFAULT, CN_LIMIT_MAX);
        const offset = clampOffset(validated.offset);
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
            });
        return ok(content);
      }
      case "reg-cn-facets": {
        const validated = RegCnFacetsSchema.parse(args);
        const query = applyRegCnDefaults(asQuery(validated.query)) as QueryObject;
        const content = await fetchFacets({
          prefix: REG_CN_FACET_PREFIX,
          query,
          fields: validated.facets,
          catalog: REG_CN_FACET_FIELDS,
        });
        return ok(content);
      }
      case "reg-cn-detail": {
        const validated = RegCnDetailSchema.parse(args);
        const content = prefersMcpListApi()
          ? await mcpDbDetail("reg_cn", validated.id)
          : await fetchDetail(
              `${REG_CN_DETAIL_PATH}/${encodeId(validated.id)}`,
              validated.id
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
