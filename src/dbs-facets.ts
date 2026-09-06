/**
 * Facet (条件筛选) catalog for dbs-route databases — GENERATED FILE.
 *
 * Source of truth: drugsea frontend
 *   frontend/src/routes/more/DBS/components/commonSearch/ConditionSearchPanel.js
 * which hardcodes the per-db condition filters the web UI renders.
 *
 * Regenerate (do not hand-edit):
 *   node scripts/extract-dbs-facets.mjs --emit-ts
 *
 * Scope: `terms` fields only — the ones that return aggregated bucket lists
 * (`content.list[]` with `ct` counts). `date`/`range`/`tree` fields are UI
 * pickers and are excluded, which also drops the two 器械备案 dbs entirely.
 *
 * Note on prefixes: taken verbatim from the frontend URL. They currently equal
 * the catalog `api_path` for all 44 dbs, but the frontend is
 * authoritative — `reg_cn` already demonstrates that a facet prefix can diverge
 * from api_path.
 */

import type { FacetField } from "./fields.js";

export type DbsFacetEntry = {
  /** Chinese database name, for agent-facing output. */
  title: string;
  /** Catalog category, e.g. 市场准入. */
  category: string;
  /** Facet endpoint prefix; append "/{field}" to build the request path. */
  prefix: string;
  /** Aggregatable fields. Keys are what you pass to yaohai-facets. */
  fields: Record<string, FacetField>;
  /** Params the backend requires for this db (merged into every facet query). */
  defaultQuery?: Record<string, string>;
};

export const DBS_FACET_CATALOG: Record<string, DbsFacetEntry> = {
  cde_yfb_registration: {
    title: "原料药、药用辅料和药包材登记信息公示",
    category: "注册情报",
    prefix: "/c/cde_yfb_registration/eslist",
    fields: {
      reg_num_year: { title: "批准年份", filter_type: "multiple" },
      local_or_import: { title: "产品来源", filter_type: "multiple" },
      yfb_type: { title: "原辅包类型", filter_type: "multiple" },
    },
  },
  cmchk_pcm: {
    title: "香港注册中成药",
    category: "上市情报",
    prefix: "/cmchk_pcm/eslist",
    fields: {
      formula_type: { title: "注册类型", filter_type: "multiple" },
      package_label_cn: { title: "药材组成", filter_type: "multiple" },
      pmpw_flag: { title: "PMPW标记", filter_type: "multiple" },
      dosage_form_cn: { title: "剂型", filter_type: "multiple" },
      is_export: { title: "是否出口", filter_type: "multiple" },
      is_coexist_cp: { title: "是否药典收录", filter_type: "multiple" },
    },
  },
  cn_orange_book: {
    title: "中国上市化学药品目录集",
    category: "药政参考",
    prefix: "/c/cn_orange_book/eslist",
    fields: {
      dosage_form: { title: "剂型", filter_type: "multiple" },
      administration_route: { title: "给药途径", filter_type: "multiple" },
      is_reference_drug: { title: "参比制剂", filter_type: "multiple" },
      is_standard_drug: { title: "标准制剂", filter_type: "multiple" },
      category: { title: "收录类别", filter_type: "multiple" },
      marketing_status: { title: "上市销售状态", filter_type: "multiple" },
    },
  },
  cn_reference_drugs: {
    title: "仿制药参比制剂目录",
    category: "药政参考",
    prefix: "/c/cn_reference_drugs/eslist",
    fields: {
      dosage_form: { title: "药品剂型", filter_type: "multiple" },
      batch_no: { title: "公布批次", filter_type: "multiple" },
    },
  },
  cn_reference_drugs_publicity: {
    title: "仿制药参比制剂目录(征求意见稿)",
    category: "药政参考",
    prefix: "/c/cn_reference_drugs_publicity/eslist",
    fields: {
      publicity_type: { title: "公示类型", filter_type: "multiple" },
      dosage_form: { title: "药品剂型", filter_type: "multiple" },
      batch_no: { title: "公布批次", filter_type: "multiple" },
    },
  },
  dpd: {
    title: "加拿大上市药品",
    category: "上市情报",
    prefix: "/dpd/eslist",
    fields: {
      dosage_form: { title: "剂型", filter_type: "multiple" },
      current_status: { title: "最新状态", filter_type: "multiple" },
      route_of_administration: { title: "给药途径", filter_type: "multiple" },
      class: { title: "适用对象", filter_type: "multiple" },
      schedule: { title: "药品类别", filter_type: "multiple" },
      has_sms: { title: "是否有说明书", filter_type: "multiple" },
    },
  },
  drug_law: {
    title: "药品法规知识库",
    category: "药闻速递",
    prefix: "/h/drug_law/eslist",
    fields: {
      source: { title: "法规来源", filter_type: "multiple" },
      main_category: { title: "一级分类", filter_type: "multiple" },
      category: { title: "公告栏目", filter_type: "multiple" },
    },
  },
  drugsales: {
    title: "全终端药品销售",
    category: "市场情报",
    prefix: "/drugsales/eslist",
    defaultQuery: {"groupid":"205"},
    fields: {
      region: { title: "区域", filter_type: "multiple" },
      country: { title: "国家", filter_type: "multiple" },
      dosage_form: { title: "剂型", filter_type: "multiple" },
      year: { title: "年份", filter_type: "multiple" },
      sales_channel: { title: "销售渠道", filter_type: "multiple" },
      drug_type: { title: "药品类型", filter_type: "multiple" },
      administration_route: { title: "给药途径", filter_type: "multiple" },
    },
  },
  fda_dmf: {
    title: "美国DMF数据库",
    category: "上市情报",
    prefix: "/fda_dmf/eslist",
    fields: {
      status: { title: "DMF状态", filter_type: "multiple" },
      type: { title: "DMF类型", filter_type: "multiple" },
    },
  },
  fda_ndc: {
    title: "美国药品NDC数据库",
    category: "上市情报",
    prefix: "/fda_ndc/eslist",
    fields: {
      has_sms: { title: "是否有说明书", filter_type: "multiple" },
      MARKETINGCATEGORYNAME: { title: "市场分类", filter_type: "multiple" },
      PRODUCTTYPENAME: { title: "产品类型", filter_type: "multiple" },
      DOSAGEFORMNAME: { title: "药品剂型", filter_type: "multiple" },
      ROUTENAME: { title: "给药途径", filter_type: "multiple" },
      NDC_EXCLUDE_FLAG: { title: "NDC排除标记", filter_type: "multiple" },
      PHARM_CLASSES: { title: "药理分类", filter_type: "multiple" },
    },
  },
  gov_drugs: {
    title: "政府用药目录",
    category: "药政参考",
    prefix: "/c/gov_drugs/eslist",
    fields: {
      province: { title: "省份", filter_type: "multiple" },
      drug_type: { title: "药品类型", filter_type: "multiple" },
    },
  },
  herb_formulas: {
    title: "中药方剂数据库",
    category: "行业参考",
    prefix: "/herb_formulas/eslist",
    fields: {
      herbs: { title: "组成药材", filter_type: "multiple" },
    },
  },
  herbs: {
    title: "中药材数据库",
    category: "行业参考",
    prefix: "/herbs/eslist",
    fields: {
      efficacy_class: { title: "功效分类", filter_type: "multiple" },
      family_classification: { title: "科属分类", filter_type: "multiple" },
    },
  },
  hk_doh: {
    title: "香港上市药品",
    category: "上市情报",
    prefix: "/hk_doh/eslist",
    fields: {
      legal_classification: { title: "法律分类", filter_type: "multiple" },
      sale_requirement: { title: "销售要求", filter_type: "multiple" },
    },
  },
  hma: {
    title: "欧盟HMA上市药品",
    category: "上市情报",
    prefix: "/hma/eslist",
    fields: {
      Ph_form: { title: "药品剂型", filter_type: "multiple" },
      RMS: { title: "参考成员国", filter_type: "multiple" },
      product_outcome: { title: "市场状态", filter_type: "multiple" },
    },
  },
  isaf_drugs: {
    title: "澳门上市药品",
    category: "上市情报",
    prefix: "/isaf_drugs/eslist",
    fields: {
      dosage_form: { title: "剂型", filter_type: "multiple" },
      administration_route: { title: "给药途径", filter_type: "multiple" },
      ingredients: { title: "活性成分", filter_type: "multiple" },
      type: { title: "法定类别", filter_type: "multiple" },
    },
  },
  isaf_tcm: {
    title: "澳门中成药与天然药物",
    category: "上市情报",
    prefix: "/isaf_tcm/eslist",
    fields: {
      dosage_form: { title: "剂型", filter_type: "multiple" },
      administration_route: { title: "给药途径", filter_type: "multiple" },
      formula: { title: "配方", filter_type: "multiple" },
      type: { title: "法定类别", filter_type: "multiple" },
    },
  },
  japan_dmf: {
    title: "日本DMF数据库",
    category: "上市情报",
    prefix: "/japan_dmf/eslist",
    fields: {
      registration_type_cn: { title: "注册类型", filter_type: "multiple" },
    },
  },
  jicai: {
    title: "国家与地方集采数据库",
    category: "市场情报",
    prefix: "/jicai/eslist",
    fields: {
      jc_type: { title: "集采类型", filter_type: "multiple" },
      jc_project: { title: "集采项目", filter_type: "multiple" },
      region: { title: "中选区域", filter_type: "multiple" },
      execution_status: { title: "执行状态", filter_type: "multiple" },
    },
  },
  jicai_mulu: {
    title: "jicai_mulu",
    category: "其他",
    prefix: "/jicai_mulu/eslist",
    fields: {
      jc_type: { title: "集采类型", filter_type: "multiple" },
      jc_project: { title: "集采项目", filter_type: "multiple" },
    },
  },
  jiyao: {
    title: "基药目录",
    category: "市场准入",
    prefix: "/jiyao/eslist",
    fields: {
      province: { title: "地区", filter_type: "multiple" },
      dosage_form: { title: "剂型", filter_type: "multiple" },
      drug_type: { title: "药品类型", filter_type: "multiple" },
      std_catalog_version: { title: "基药版本", filter_type: "multiple" },
    },
  },
  medical_device: {
    title: "国产器械(注册)",
    category: "NMPA基础库",
    prefix: "/medical_device/eslist",
    fields: {
      std_product_type: { title: "管理类别", filter_type: "multiple" },
    },
  },
  medical_device_jinkou: {
    title: "进口器械(注册)",
    category: "NMPA基础库",
    prefix: "/medical_device_jinkou/eslist",
    fields: {
      std_product_type: { title: "管理类别", filter_type: "multiple" },
    },
  },
  nhsa_code: {
    title: "医保药品分类与代码",
    category: "市场准入",
    prefix: "/c/nhsa_code/eslist",
    fields: {
      insurance_type: { title: "医保类型", filter_type: "multiple" },
      registered_dosage_form: { title: "注册剂型", filter_type: "multiple" },
      min_preparation_unit: { title: "最小制剂单位", filter_type: "multiple" },
      min_package_unit: { title: "最小包装单位", filter_type: "multiple" },
    },
  },
  nhsa_herbs: {
    title: "中药饮片信息",
    category: "市场准入",
    prefix: "/c/nhsa_herbs/eslist",
    fields: {
      efficacy_classification: { title: "功效分类", filter_type: "multiple" },
      region_name: { title: "地区", filter_type: "multiple" },
    },
  },
  nhsa_hospital_prepration: {
    title: "医疗机构制剂信息",
    category: "市场准入",
    prefix: "/c/nhsa_hospital_prepration/eslist",
    fields: {
      preparation_type: { title: "制剂类别", filter_type: "multiple" },
      region: { title: "地区", filter_type: "multiple" },
    },
  },
  nmpa_buchongbeian: {
    title: "境内生产药品备案信息公示",
    category: "NMPA基础库",
    prefix: "/nmpa_buchongbeian/eslist",
    fields: {
      dosage_form: { title: "剂型", filter_type: "multiple" },
      drug_type: { title: "药品类型", filter_type: "multiple" },
      record_office: { title: "备案机关", filter_type: "multiple" },
    },
  },
  nmpa_gmp: {
    title: "GMP认证",
    category: "NMPA基础库",
    prefix: "/nmpa_gmp/eslist",
    fields: {
      std_province: { title: "省市", filter_type: "multiple" },
      std_gmp_status: { title: "证书状态", filter_type: "multiple" },
      in_sfda: { title: "是否有效", filter_type: "multiple" },
    },
  },
  nmpa_guochan: {
    title: "国产药品",
    category: "NMPA基础库",
    prefix: "/f/nmpa_guochan/eslist",
    fields: {
      dosage_form: { title: "药品剂型", filter_type: "multiple" },
      drug_type: { title: "产品类别", filter_type: "multiple" },
      in_sfda: { title: "是否有效", filter_type: "multiple" },
    },
  },
  nmpa_jinkou: {
    title: "进口药品",
    category: "NMPA基础库",
    prefix: "/f/nmpa_jinkou/eslist",
    fields: {
      dosage_form: { title: "药品剂型", filter_type: "multiple" },
      drug_type: { title: "产品类别", filter_type: "multiple" },
      in_sfda: { title: "是否有效", filter_type: "multiple" },
    },
  },
  nmpa_reg_patent: {
    title: "药品注册相关专利信息",
    category: "NMPA基础库",
    prefix: "/f/nmpa_reg_patent/eslist",
    fields: {
      patent_type: { title: "专利类型", filter_type: "multiple" },
    },
  },
  nmpa_tcm_granules: {
    title: "中药配方颗粒备案信息",
    category: "NMPA基础库",
    prefix: "/f/nmpa_tcm_granules/eslist",
    fields: {
      filing_status: { title: "备案状态", filter_type: "multiple" },
      record_province: { title: "备案省局", filter_type: "multiple" },
    },
  },
  nmpa_tcm_protection: {
    title: "中药保护品种",
    category: "NMPA基础库",
    prefix: "/nmpa_tcm_protection/eslist",
    fields: {
      dosage_form: { title: "剂型", filter_type: "multiple" },
      protect_period: { title: "保护期限", filter_type: "multiple" },
    },
  },
  nmpa_tsspxx_gc: {
    title: "国产保健食品注册",
    category: "NMPA基础库",
    prefix: "/f/nmpa_tsspxx_gc/eslist",
    fields: {
      in_sfda: { title: "是否有效", filter_type: "multiple" },
    },
  },
  nmpa_tsspxx_jk: {
    title: "进口保健食品注册",
    category: "NMPA基础库",
    prefix: "/f/nmpa_tsspxx_jk/eslist",
    fields: {
      in_sfda: { title: "是否有效", filter_type: "multiple" },
    },
  },
  se_notice: {
    title: "医药上市公司公告",
    category: "药闻速递",
    prefix: "/h/se_notice/eslist",
    fields: {
      se: { title: "公告来源", filter_type: "multiple" },
      is_transferred_to_references: { title: "文献标记", filter_type: "multiple" },
    },
  },
  targets: {
    title: "药物靶点数据库",
    category: "行业参考",
    prefix: "/targets/eslist",
    fields: {
      target_type: { title: "靶点类型", filter_type: "multiple" },
      kind: { title: "种类", filter_type: "multiple" },
      organism: { title: "生物体", filter_type: "multiple" },
    },
  },
  tw_fda: {
    title: "台湾上市药品",
    category: "上市情报",
    prefix: "/tw_fda/eslist",
    fields: {
      mixture: { title: "单复方", filter_type: "multiple" },
      drug_clasify_code: { title: "药品分类", filter_type: "multiple" },
      lblLicknd: { title: "许可证种类", filter_type: "multiple" },
    },
  },
  uk_emc: {
    title: "英国上市药品",
    category: "上市情报",
    prefix: "/uk_emc/eslist",
    fields: {
      drug_type: { title: "药品类型", filter_type: "multiple" },
      legal_category: { title: "法律类别", filter_type: "multiple" },
      ATC_code: { title: "治疗领域", filter_type: "multiple" },
    },
  },
  yibao: {
    title: "医保目录",
    category: "市场准入",
    prefix: "/yibao/eslist",
    fields: {
      province: { title: "医保地区", filter_type: "multiple" },
      drug_type: { title: "药品类型", filter_type: "multiple" },
      insurance_level: { title: "医保类型", filter_type: "multiple" },
      std_catalog_version: { title: "医保版本", filter_type: "multiple" },
    },
  },
  yzpj_products: {
    title: "一致性评价产品",
    category: "注册情报",
    prefix: "/b/yzpj_products/list",
    fields: {
      latest_status: { title: "最高进展", filter_type: "multiple" },
    },
  },
  zb_news: {
    title: "全国招标动态",
    category: "药闻速递",
    prefix: "/c/zb_news/eslist",
    fields: {
      city: { title: "省份", filter_type: "multiple" },
      website: { title: "网站", filter_type: "multiple" },
    },
  },
  zldj: {
    title: "药品专利信息公示",
    category: "行业参考",
    prefix: "/c/zldj/eslist",
    fields: {
      registration_status: { title: "登记状态", filter_type: "multiple" },
      form_type: { title: "登记表类型", filter_type: "multiple" },
      is_public: { title: "专利信息公开", filter_type: "multiple" },
      drug_type: { title: "药品类型", filter_type: "multiple" },
      dosage_form: { title: "药品剂型", filter_type: "multiple" },
    },
  },
  zlsm: {
    title: "药品专利声明",
    category: "行业参考",
    prefix: "/c/zlsm/eslist",
    fields: {
      drug_type: { title: "药品类型", filter_type: "multiple" },
      dosage_form: { title: "药品剂型", filter_type: "multiple" },
      register_type: { title: "注册分类", filter_type: "multiple" },
    },
  },
};

/** Databases that expose facets, sorted. Handy for validation and tool docs. */
export const DBS_FACET_DBNAME_LIST = Object.keys(DBS_FACET_CATALOG).sort();

