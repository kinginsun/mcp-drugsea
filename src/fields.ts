export type FacetField = {
  title: string;
  filter_type: "multiple" | "date" | "range";
  /** Hardcoded SPA list. When present, yaohai-facets returns these without a GET. */
  static_values?: string[];
};

export const PRODUCT_CN_COMMON_FIELDS = [
  "item",
  "drug_name",
  "manufacture",
  "license_holder",
  "specification",
  "std_specification",
  "auth_num",
  "indication",
  "brand_name",
  "general_name_cn",
  "only_active",
  "search_mode",
] as const;

export const PRODUCT_CN_FACET_FIELDS: Record<string, FacetField> = {
  listing_date: { title: "上市年份", filter_type: "multiple" },
  source: { title: "国产进口", filter_type: "multiple" },
  province: { title: "省份", filter_type: "multiple" },
  drug_type: { title: "药品类型", filter_type: "multiple" },
  register_type: { title: "注册分类", filter_type: "multiple" },
  national_yibao: { title: "医保类型", filter_type: "multiple" },
  national_jiyao: { title: "基药类型", filter_type: "multiple" },
  state_OTC: { title: "非处方药", filter_type: "multiple" },
  std_dosage_form: { title: "药品剂型", filter_type: "multiple" },
  administration_route: { title: "给药途径", filter_type: "multiple" },
  new_drug_type: { title: "新药类型", filter_type: "multiple" },
  ATC_code: { title: "ATC分类", filter_type: "multiple" },
  is_orange_book: { title: "目录集收录", filter_type: "multiple" },
  is_passed_yizhi: { title: "通过一致性评价", filter_type: "multiple" },
  is_guojia_jicai: { title: "是否已国家集采", filter_type: "multiple" },
  related_jc_projects: { title: "国家集采相关项目", filter_type: "multiple" },
  approve_date: { title: "最近再注册批准日期", filter_type: "date" },
  first_approve_date: { title: "品种首次上市日期", filter_type: "date" },
  general_name_count: { title: "同成分厂家数", filter_type: "range" },
  product_count: { title: "同品种厂家数", filter_type: "range" },
  dosage_count: { title: "同规格厂家数", filter_type: "range" },
  in_sfda: { title: "是否有效", filter_type: "multiple" },
};

export const PRODUCT_CN_VIEW_TYPES = [
  "eslist",
  "list_by_drug_name",
  "list_by_manufacture",
] as const;

export const REG_CN_COMMON_FIELDS = [
  "item",
  "drug_name",
  "enterprise",
  "slh",
  "indication",
  "rows_excluded",
  "search_mode",
] as const;

export const REG_CN_FACET_FIELDS: Record<string, FacetField> = {
  rd_status: { title: "研发状态", filter_type: "multiple" },
  innovation_degree: { title: "创新程度", filter_type: "multiple" },
  first_generic_drug: { title: "首仿状态", filter_type: "multiple" },
  apply_type: { title: "申请类型", filter_type: "multiple" },
  conclusion: { title: "审评结论", filter_type: "multiple" },
  transact_status: { title: "办理状态", filter_type: "multiple" },
  register_type: { title: "注册分类", filter_type: "multiple" },
  special_list: { title: "特殊品种", filter_type: "multiple" },
  applyTypeCde: { title: "审评序列", filter_type: "multiple" },
  drug_type: { title: "药品类型", filter_type: "multiple" },
  drug_category: { title: "药品小类", filter_type: "multiple" },
  std_dosage_form: { title: "药品剂型", filter_type: "multiple" },
  yibao_dosage: { title: "医保剂型", filter_type: "multiple" },
  administration_route: { title: "给药途径", filter_type: "multiple" },
  slh_types: { title: "申报类型", filter_type: "multiple" },
  ATC_code: { title: "ATC一级分类", filter_type: "multiple" },
  provinces: { title: "来源省份", filter_type: "multiple" },
  undertake_date: { title: "承办日期", filter_type: "date" },
  status_start_date: { title: "状态日期", filter_type: "date" },
  apply_ctc_num: { title: "申报临床厂家数", filter_type: "range" },
  apply_listing_num: { title: "申报生产厂家数", filter_type: "range" },
  market_num: { title: "已上市厂家数", filter_type: "range" },
};

export const REG_CN_VIEW_TYPES = [
  "eslist",
  "list_by_drug_name",
  "list_by_enterprise",
] as const;

export const PRODUCT_CN_SEARCH_PATH = "/product/cn/eslist";
export const PRODUCT_CN_DETAIL_PATH = "/product/cn/detail";
export const PRODUCT_CN_FACET_PREFIX = "/product/cn/eslist";

export const REG_CN_SEARCH_PATH = "/b/drugreg/cn/eslist";
export const REG_CN_DETAIL_PATH = "/b/drugreg/cn/detail";
export const REG_CN_FACET_PREFIX = "/b/es/drugreg/cn/list";

export const ATC_HINT =
  "For disease/therapeutic-class queries prefer ConditionSearch ATC_code (letter): L=oncology, C=cardiovascular, J=anti-infectives, N=nervous system, R=respiratory, A=alimentary/metabolism (e.g. diabetes), H=hormones, G=genito-urinary, M=musculo-skeletal, D=dermatologicals, B=blood, S=sensory, P=antiparasitic, V=various. DrugSea extensions (not WHO): Z=中药 (largest bucket), W=原料药, E=辅料.";

/** List rows often store the Chinese class name in ATC_code; filters need the letter. */
export const ATC_LETTER_BY_NAME: Record<string, string> = {
  "消化道及代谢": "A",
  "血液和造血器官": "B",
  "心血管系统": "C",
  "皮肤病用药": "D",
  "辅料": "E",
  "生殖泌尿系统和性激素": "G",
  "非性激素和胰岛素类的激素类系统用药": "H",
  "系统用抗感染药": "J",
  "抗肿瘤药和免疫机能调节药": "L",
  "肌肉-骨骼系统": "M",
  "神经系统": "N",
  "抗寄生虫药、杀虫药和驱虫药": "P",
  "呼吸系统": "R",
  "感觉器官": "S",
  "杂类": "V",
  "原料药": "W",
  "中药": "Z",
};

export function attachAtcLetter(row: Record<string, unknown>): Record<string, unknown> {
  const code = row.ATC_code;
  if (typeof code !== "string" || code === "") {
    return row;
  }
  if (/^[A-Z]$/.test(code)) {
    row.ATC_letter = code;
    return row;
  }
  const letter = ATC_LETTER_BY_NAME[code];
  if (letter) {
    row.ATC_letter = letter;
  }
  return row;
}

export function productCnSearchPath(viewType: string): string {
  if (viewType === "eslist") {
    return PRODUCT_CN_SEARCH_PATH;
  }
  return `/product/cn/${viewType}`;
}

export function regCnSearchPath(viewType: string): string {
  if (viewType === "eslist") {
    return REG_CN_SEARCH_PATH;
  }
  return `/b/drugreg/cn/${viewType}`;
}

export function applyProductCnDefaults(query: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...query };
  if (merged.search_mode === undefined || merged.search_mode === "") {
    merged.search_mode = "3";
  }
  return merged;
}

export function applyRegCnDefaults(query: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...query };
  if (merged.rows_excluded === undefined || merged.rows_excluded === "") {
    merged.rows_excluded = 1;
  }
  if (merged.search_mode === undefined || merged.search_mode === "") {
    merged.search_mode = "1";
  }
  return merged;
}
