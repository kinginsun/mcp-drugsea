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
