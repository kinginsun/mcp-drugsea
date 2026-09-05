import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import type { QueryObject } from "./types.js";
import { normalizeRecord, parseFacetList } from "./normalize.js";
import type { FacetField } from "./fields.js";

export class MissingTokenError extends Error {
  constructor(message?: string) {
    super(
      message ??
        "Set YAOHAI_MCP_TOKEN to your personal DrugSea token (ysk_ + 32 hex chars)"
    );
    this.name = "MissingTokenError";
  }
}

/** @deprecated Use MissingTokenError */
export const MissingApiKeyError = MissingTokenError;

const USER_TOKEN_RE = /^ysk_[0-9a-f]{32}$/i;

export function getUserToken(): string {
  const token = process.env.YAOHAI_MCP_TOKEN?.trim() || "";
  if (!token) {
    throw new MissingTokenError();
  }
  if (!USER_TOKEN_RE.test(token)) {
    throw new MissingTokenError(
      "YAOHAI_MCP_TOKEN must be a personal user token: ysk_ + 32 hex chars"
    );
  }
  return token;
}

/** @deprecated Use getUserToken */
export const getApiKey = getUserToken;

export function getAuthHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  const token = getUserToken();
  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly raw: unknown;

  constructor(message: string, status = 0, raw?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.raw = raw;
  }
}

export function getBaseUrl(): string {
  return (
    process.env.YAOHAI_BASE_URL || "https://db3.drugsea.cn/api"
  ).replace(/\/$/, "");
}

/** db3 serves list/facet GET as encrypted payloads; use POST /g/mcp/yaohai/search instead. */
export function prefersMcpListApi(): boolean {
  const flag = process.env.YAOHAI_USE_MCP_LIST?.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(flag ?? "")) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(flag ?? "")) {
    return false;
  }
  return getBaseUrl().includes("db3.drugsea.cn");
}

export function getVerifySsl(): boolean {
  const v = process.env.YAOHAI_VERIFY_SSL;
  if (v === undefined || v === "") {
    return true;
  }
  return !["0", "false", "no", "off"].includes(v.trim().toLowerCase());
}

export function flattenQuery(params: QueryObject): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") {
      continue;
    }
    if (Array.isArray(v)) {
      for (const item of v) {
        sp.append(k, String(item));
      }
    } else if (typeof v === "boolean") {
      sp.append(k, v ? "1" : "0");
    } else {
      sp.append(k, String(v));
    }
  }
  return sp;
}

export function clampLimit(limit: number | undefined, fallback: number, max: number): number {
  const n = limit ?? fallback;
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.trunc(n), max));
}

export function clampOffset(offset: number | undefined): number {
  if (offset === undefined || !Number.isFinite(offset)) {
    return 0;
  }
  return Math.max(0, Math.trunc(offset));
}

function httpRequest(
  method: string,
  urlStr: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === "https:" ? https : http;
    const options: https.RequestOptions = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers,
      timeout: 60_000,
    };
    if (url.protocol === "https:" && !getVerifySsl()) {
      options.agent = new https.Agent({ rejectUnauthorized: false });
    }

    const req = lib.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          text: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error("API request timed out after 60s"));
    });
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

type ApiSuccess = {
  ok: true;
  status: number;
  content: unknown;
  raw: Record<string, unknown>;
};

type ApiFailure = {
  ok: false;
  status: number;
  error: string;
  raw?: unknown;
};

export type ApiResult = ApiSuccess | ApiFailure;

function parseApiJson(status: number, text: string): ApiResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      status,
      error: `Failed to parse API response: ${String(error)}`,
    };
  }

  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    !("api_status" in data)
  ) {
    return {
      ok: false,
      status,
      error:
        "Encrypted or non-JSON API payload (db3 list/facet GET). Use YAOHAI_BASE_URL=https://db3.drugsea.cn/api so product-cn-search/reg-cn-search route via MCP POST, or set YAOHAI_USE_MCP_LIST=true.",
      raw: data,
    };
  }

  if (status < 200 || status >= 300) {
    // The DrugSea gateway answers every rejected credential with a generic
    // "invalid or missing X-Yaohai-Api-Key" string, even though this client
    // only ever sends `Authorization: Bearer <YAOHAI_MCP_TOKEN>`. Translate
    // that misleading 401 into actionable advice instead of leaking the
    // backend's wording.
    if (status === 401 || status === 403) {
      return {
        ok: false,
        status,
        error:
          `YAOHAI_MCP_TOKEN was rejected by the DrugSea API (HTTP ${status}). ` +
          "The token is missing, expired, or revoked — regenerate it at " +
          "db.drugsea.cn (personal center → API Token) and update YAOHAI_MCP_TOKEN. " +
          "This client authenticates with `Authorization: Bearer` only; the backend's " +
          "'X-Yaohai-Api-Key' wording is a generic message and does not apply here.",
        raw: data,
      };
    }
    return {
      ok: false,
      status,
      error: `API request failed with status ${status}: ${JSON.stringify(data)}`,
      raw: data,
    };
  }

  if (
    data &&
    typeof data === "object" &&
    "api_status" in data &&
    (data as { api_status?: string }).api_status !== "success"
  ) {
    const payload = data as { content?: unknown };
    const content = payload.content;
    const message =
      typeof content === "string" ? content : JSON.stringify(content ?? data);
    return { ok: false, status, error: message, raw: data };
  }

  const content =
    data && typeof data === "object" && "content" in data
      ? (data as { content?: unknown }).content
      : data;

  return {
    ok: true,
    status,
    content,
    raw: (data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : { content: data }),
  };
}

function unwrap(result: ApiResult): unknown {
  if (!result.ok) {
    throw new ApiError(result.error, result.status, result.raw);
  }
  return result.content;
}

export async function yaohaiPost(
  path: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const payload = JSON.stringify(body);
  const url = `${getBaseUrl()}${path}`;
  const { status, text } = await httpRequest(
    "POST",
    url,
    getAuthHeaders({
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(payload)),
    }),
    payload
  );
  return unwrap(parseApiJson(status, text));
}

export async function yaohaiGet(
  path: string,
  query: QueryObject = {}
): Promise<ApiResult> {
  const qs = flattenQuery(query).toString();
  const url = `${getBaseUrl()}${path}${qs ? `?${qs}` : ""}`;
  const { status, text } = await httpRequest("GET", url, getAuthHeaders());
  return parseApiJson(status, text);
}

export async function mcpDbSearch(opts: {
  dbname: string;
  query: QueryObject;
  limit: number;
  offset: number;
  viewType?: string;
}): Promise<Record<string, unknown>> {
  const query: QueryObject = { ...opts.query };
  if (opts.viewType && opts.viewType !== "eslist") {
    query.view_type = opts.viewType;
  }
  const content = (await yaohaiPost("/g/mcp/yaohai/search", {
    dbname: opts.dbname,
    query,
    limit: opts.limit,
    offset: opts.offset,
  })) as Record<string, unknown>;

  const rawItems = content.items;
  const items = Array.isArray(rawItems)
    ? rawItems.map((item) => {
        if (item && typeof item === "object" && "fields" in item) {
          const row = item as { fields?: unknown; detail_url?: string };
          const flat = normalizeRecord(row.fields);
          if (
            row.detail_url &&
            flat &&
            typeof flat === "object" &&
            !Array.isArray(flat)
          ) {
            return { ...(flat as Record<string, unknown>), detail_url: row.detail_url };
          }
          return flat;
        }
        return normalizeRecord(item);
      })
    : rawItems;

  return {
    dbname: content.dbname,
    title: content.title,
    category: content.category,
    view_type: opts.viewType ?? "eslist",
    total: content.total,
    offset: opts.offset,
    limit: opts.limit,
    count: Array.isArray(items) ? items.length : undefined,
    items,
    query_applied: opts.query,
    field_labels: content.field_labels,
    via: "mcp",
  };
}

export async function mcpDbDetail(
  dbname: string,
  id: string
): Promise<Record<string, unknown>> {
  const content = (await yaohaiPost("/g/mcp/yaohai/detail", {
    dbname,
    id,
  })) as Record<string, unknown>;
  return { dbname, id, ...content };
}

export async function listSearch(opts: {
  path: string;
  query: QueryObject;
  limit: number;
  offset: number;
  viewType: string;
}): Promise<Record<string, unknown>> {
  const params: QueryObject = {
    ...opts.query,
    limit: opts.limit,
    offset: opts.offset,
  };
  const result = await yaohaiGet(opts.path, params);
  if (!result.ok) {
    throw new ApiError(result.error, result.status, result.raw);
  }
  const raw = result.raw;
  const content = raw.content ?? result.content;
  const items = normalizeRecord(content);
  const totalRaw = raw.tnum;
  const total =
    typeof totalRaw === "number"
      ? totalRaw
      : Array.isArray(items)
        ? items.length
        : 0;
  return {
    view_type: opts.viewType,
    total,
    offset: opts.offset,
    limit: opts.limit,
    count: Array.isArray(items) ? items.length : undefined,
    items,
    query_applied: opts.query,
  };
}

export async function fetchDetail(path: string, id: string): Promise<Record<string, unknown>> {
  const result = await yaohaiGet(path, {});
  if (!result.ok) {
    throw new ApiError(result.error, result.status, result.raw);
  }
  return {
    id,
    detail: normalizeRecord(result.content),
  };
}

export async function fetchFacets(opts: {
  prefix: string;
  query: QueryObject;
  fields: string[];
  catalog: Record<string, FacetField>;
}): Promise<Record<string, unknown>> {
  const unknown = opts.fields.filter((f) => !(f in opts.catalog));
  if (unknown.length > 0) {
    throw new ApiError(`Unknown facet fields: ${unknown.join(", ")}`);
  }

  const distributions: Record<string, unknown> = {};
  for (const field of opts.fields) {
    const meta = opts.catalog[field];
    const facetQuery: QueryObject = { ...opts.query };
    delete facetQuery[field];
    const result = await yaohaiGet(`${opts.prefix}/${encodeURIComponent(field)}`, facetQuery);
    if (!result.ok) {
      distributions[field] = {
        success: false,
        error: result.error,
        title: meta.title,
      };
      continue;
    }
    const data = isRecord(result.content) ? result.content : {};
    const list = data.list;
    distributions[field] = {
      success: true,
      title: meta.title,
      filter_type: data.type ?? meta.filter_type,
      items: parseFacetList(list, field),
    };
  }

  return {
    query_applied: opts.query,
    total_fields: opts.fields.length,
    distributions,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
