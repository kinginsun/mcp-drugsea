import { z } from "zod";

export const QueryValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number()])),
]);

export const QueryObjectSchema = z.record(QueryValueSchema);

export type QueryValue = z.infer<typeof QueryValueSchema>;
export type QueryObject = z.infer<typeof QueryObjectSchema>;

export const YaohaiCatalogSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

export const YaohaiSearchSchema = z.object({
  dbname: z.string().min(1),
  query: QueryObjectSchema.optional(),
  limit: z.coerce.number().int().optional(),
  offset: z.coerce.number().int().optional(),
});

export const YaohaiDetailSchema = z.object({
  dbname: z.string().min(1),
  id: z.string().min(1),
});

/**
 * Facet request for a dbs-route database.
 *
 * Dual-mode, so one tool covers both discovery and fetching:
 *   - `fields` omitted  -> return the facet catalog (available fields). Add
 *     `dbname` to narrow to one database, omit it to list all facet-capable dbs.
 *   - `fields` given    -> fetch those facet distributions for `dbname`.
 *
 * Discovery mode exists because agents otherwise have to guess field names and
 * would hit "Unknown facet fields". Fetching requires `fields` to be explicit:
 * one HTTP request fires per field, so an implicit "all of them" would be a slow
 * 209-request fan-out.
 */
export const YaohaiFacetsSchema = z.object({
  dbname: z.string().optional(),
  query: QueryObjectSchema.optional(),
  fields: z.array(z.string().min(1)).min(1).optional(),
});

export const YaohaiGlobalSearchSchema = z.object({
  q: z.string().optional(),
  query: QueryObjectSchema.optional(),
  limit: z.coerce.number().int().optional(),
  offset: z.coerce.number().int().optional(),
});

export const ProductViewTypeSchema = z.enum([
  "eslist",
  "list_by_drug_name",
  "list_by_manufacture",
]);

export const RegViewTypeSchema = z.enum([
  "eslist",
  "list_by_drug_name",
  "list_by_enterprise",
]);

export const ProductCnSearchSchema = z.object({
  query: QueryObjectSchema.optional(),
  limit: z.coerce.number().int().optional(),
  offset: z.coerce.number().int().optional(),
  view_type: ProductViewTypeSchema.optional(),
});

export const ProductCnFacetsSchema = z.object({
  query: QueryObjectSchema.optional(),
  facets: z.array(z.string().min(1)).min(1),
});

export const ProductCnDetailSchema = z.object({
  id: z.string().min(1),
});

export const RegCnSearchSchema = z.object({
  query: QueryObjectSchema.optional(),
  limit: z.coerce.number().int().optional(),
  offset: z.coerce.number().int().optional(),
  view_type: RegViewTypeSchema.optional(),
});

export const RegCnFacetsSchema = z.object({
  query: QueryObjectSchema.optional(),
  facets: z.array(z.string().min(1)).min(1),
});

export const RegCnDetailSchema = z.object({
  id: z.string().min(1),
});

export const EmptyObjectSchema = z.object({}).passthrough();
