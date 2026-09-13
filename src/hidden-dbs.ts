/** MCP-hidden databases: not in catalog, search, detail, or facets. Website routes unchanged. */
export const MCP_HIDDEN_DBNAMES = ["china_new_drugs", "generic_cn"] as const;

const HIDDEN = new Set<string>(MCP_HIDDEN_DBNAMES);

export function isMcpHiddenDb(dbname: string | undefined | null): boolean {
  return typeof dbname === "string" && HIDDEN.has(dbname);
}

export function mcpHiddenDbMessage(dbname: string): string {
  return (
    `Database "${dbname}" is hidden from MCP. Do not query china_new_drugs or generic_cn. ` +
    "For 仿制药 use yzpj_products or product_cn (is_passed_yizhi); for 创新药 pipeline use reg_cn."
  );
}

export function stripHiddenCatalogDatabases(content: unknown): unknown {
  if (!content || typeof content !== "object") {
    return content;
  }
  const obj = content as Record<string, unknown>;
  if (!Array.isArray(obj.databases)) {
    return content;
  }
  const databases = (obj.databases as Array<Record<string, unknown>>).filter(
    (row) => !isMcpHiddenDb(String(row.id ?? ""))
  );
  return { ...obj, databases, total: databases.length };
}
