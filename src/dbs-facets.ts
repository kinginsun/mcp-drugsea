/**
 * Facet (条件筛选) catalog — GENERATED FILE.
 *
 * Source of truth: drugsea frontend ConditionSearchPanel.js
 *   /in dbs: more/DBS/components/commonSearch/ConditionSearchPanel.js
 *   dedicated pages: scripts/extract-custom-facets.mjs
 *   随心汇 drugreg_cn: more/aggs/config/data.js is_condition
 *
 * Regenerate (do not hand-edit):
 *   node scripts/extract-dbs-facets.mjs --emit-ts
 *
 * Scope: `terms` fields only (bucket lists), plus hardcoded SPA lists as
 * `static_values`. `date`/`range`/`tree` pickers are excluded.
 * Prefixes come from the frontend URL. Static-list dbs have prefix "".
 */

import type { FacetField } from "./fields.js";

export type DbsFacetEntry = {
  /** Chinese database name, for agent-facing output. */
  title: string;
  /** Catalog category, e.g. 市场准入. */
  category: string;
  /** Facet endpoint prefix; append "/{field}". Empty for static lists. */
  prefix: string;
  /** Aggregatable fields. Keys are what you pass to yaohai-facets. */
  fields: Record<string, FacetField>;
  /** Params the backend requires for this db (merged into every facet query). */
  defaultQuery?: Record<string, string>;
  /** static = hardcoded SPA list (no live GET). */
  source?: "http" | "static";
};

export const DBS_FACET_CATALOG: Record<string, DbsFacetEntry> = {
  bio_issue: {
    title: "生物制品批签发",
    category: "市场情报",
    prefix: "/c/pqf/eslist",
    fields: {
      issue_conclusion: { title: "签发结论", filter_type: "multiple" },
      source: { title: "来源", filter_type: "multiple" },
    },
  },
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
  china_new_drugs: {
    title: "中国新药",
    category: "注册情报",
    prefix: "/b/drugreg/cn/list",
    fields: {
      rd_status: { title: "研发状态", filter_type: "multiple" },
      drug_type: { title: "药品类型", filter_type: "multiple" },
      dosage_form: { title: "药品剂型", filter_type: "multiple" },
      apply_type: { title: "申请类型", filter_type: "multiple" },
      transact_status: { title: "办理状态", filter_type: "multiple" },
      conclusion: { title: "审评结论", filter_type: "multiple" },
      special_list: { title: "特殊品种", filter_type: "multiple" },
      register_type: { title: "注册分类", filter_type: "multiple" },
      slh_types: { title: "申报类型", filter_type: "multiple" },
      prov_abs: { title: "来源省份", filter_type: "multiple" },
      ATC_code: { title: "ATC分类", filter_type: "multiple" },
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
  cn_company: {
    title: "中国医药企业",
    category: "行业参考",
    prefix: "/enterprise/eslist",
    fields: {
      province: { title: "所在省份", filter_type: "multiple" },
      std_classification: { title: "分类码", filter_type: "multiple" },
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
  ct_cn: {
    title: "国内临床试验",
    category: "临床试验",
    prefix: "/c/cde/ct/eslist",
    fields: {
      reg_type: { title: "申报类型", filter_type: "multiple" },
      ct_status: { title: "招募状态", filter_type: "multiple" },
      study_phase: { title: "临床阶段", filter_type: "multiple" },
      drug_type: { title: "药品类型", filter_type: "multiple" },
      study_type: { title: "试验分类", filter_type: "multiple" },
      source: { title: "数据来源", filter_type: "multiple" },
    },
  },
  ct_global: {
    title: "全球临床试验",
    category: "临床试验",
    prefix: "/us/ct/eslist",
    fields: {
      ct_status: { title: "招募状态", filter_type: "multiple" },
      study_phase: { title: "临床阶段", filter_type: "multiple" },
      has_result: { title: "研究结果", filter_type: "multiple" },
      study_type: { title: "研究类型", filter_type: "multiple" },
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
  drugreg_cn: {
    title: "【随心汇】药品注册审评",
    category: "注册情报",
    prefix: "/drugreg_cn/aggs/filter",
    fields: {
      is_yizhipingjia: { title: "是否一致评价", filter_type: "multiple" },
      drug_type: { title: "药品类型", filter_type: "multiple" },
      drug_category: { title: "药品小类", filter_type: "multiple" },
      dosage_form: { title: "剂型", filter_type: "multiple" },
      yibao_dosage: { title: "医保剂型", filter_type: "multiple" },
      administration_route: { title: "给药途径", filter_type: "multiple" },
      innovation_degree: { title: "创新程度", filter_type: "multiple" },
      apply_type: { title: "申请类型", filter_type: "multiple" },
      register_type: { title: "注册分类", filter_type: "multiple" },
      slh_types: { title: "申报类型", filter_type: "multiple" },
      prov_abs: { title: "省份简称", filter_type: "multiple" },
      province: { title: "省份", filter_type: "multiple" },
      transact_status: { title: "办理状态", filter_type: "multiple" },
      conclusion: { title: "审评结论", filter_type: "multiple" },
      rd_status: { title: "研发状态", filter_type: "multiple" },
      ATC_code: { title: "治疗领域", filter_type: "multiple" },
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
  generic_cn: {
    title: "一致性评价产品",
    category: "注册情报",
    prefix: "/generic/cn/list",
    fields: {
      dosage_form: { title: "药品剂型", filter_type: "multiple" },
      drug_type: { title: "药品类型", filter_type: "multiple" },
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
  product_eu: {
    title: "欧盟EMA上市药品",
    category: "上市情报",
    prefix: "/ema_drugs/eslist",
    fields: {
      drug_type: { title: "药品类型", filter_type: "multiple" },
      status: { title: "审评状态", filter_type: "multiple" },
      year: { title: "上市年份", filter_type: "multiple" },
      ATC_code: { title: "ATC分类", filter_type: "multiple" },
      tags: { title: "审评标签", filter_type: "multiple" },
      therapeutic_area: { title: "治疗领域", filter_type: "multiple" },
    },
  },
  product_jp: {
    title: "日本上市药品",
    category: "上市情报",
    prefix: "/jp_drugs/eslist",
    fields: {
      year: { title: "上市年份", filter_type: "multiple" },
      category_cn: { title: "产品类别", filter_type: "multiple" },
      drug_type: { title: "药品类别", filter_type: "multiple" },
      is_effect: { title: "是否有效", filter_type: "multiple" },
      ATC_code: { title: "治疗领域", filter_type: "multiple" },
    },
  },
  product_us: {
    title: "美国上市药品(含橙皮书)",
    category: "上市情报",
    prefix: "/fda_drugs/eslist",
    fields: {
      drug_type: { title: "药品类型", filter_type: "multiple" },
      RLD: { title: "参比类型", filter_type: "multiple" },
      MarketingStatus: { title: "市场状态", filter_type: "multiple" },
      ApplyType: { title: "申请类型", filter_type: "multiple" },
      SubmissionClassification: { title: "化学类型", filter_type: "multiple" },
      ReviewPriorityOrphanStatus: { title: "评审类型", filter_type: "multiple" },
      year: { title: "上市年份", filter_type: "multiple" },
      InnovatorOrGeneric: { title: "创仿类别", filter_type: "multiple" },
    },
  },
  sales_cn: {
    title: "国内医院药品销售",
    category: "市场情报",
    prefix: "",
    source: "static",
    fields: {
      years: { title: "销售年份", filter_type: "multiple", static_values: ["2025","2024","2023","2022","2021","2020","2019","2018","2017","2016","2015","2014","2013","2012","2011","2010","2009","2008","2007","2006","2005"] },
      quarter: { title: "销售季度", filter_type: "multiple", static_values: ["1季度","2季度","3季度","4季度"] },
      drug_type: { title: "药品类型", filter_type: "multiple", static_values: ["化药","中药","生物制品","药用辅料","其他"] },
      administration_route: { title: "给药途径", filter_type: "multiple", static_values: ["口服","注射","口颊用药","舌下","耳用","滴耳","眼用","滴眼","吸入","鼻用","滴鼻","直肠","阴道","植入","外用","冲洗","诊断剂","透析","辅料","不易直接使用或非用于人体者"] },
      ATC_code: { title: "治疗分类", filter_type: "multiple", static_values: ["A:消化道及代谢","B:血液和造血器官","C:心血管系统","D:皮肤病用药","E:辅料","G:生殖泌尿系统和性激素","H:非性激素和胰岛素类的激素","J:系统用抗感染药","L:抗肿瘤药和免疫调节药","M:肌肉-骨骼系统","N:神经系统","P:抗寄生虫药、杀虫药和驱虫药","R:呼吸系统","S:感觉器官","V:杂类","W:原料药","Z:中药"] },
      city: { title: "市场区域", filter_type: "multiple", static_values: ["福建省","江苏省","新疆维吾尔自治区","浙江省","湖北省","黑龙江省","吉林省","广东省","河北省","重庆市","安徽省","山西省","上海市","河南省","湖南省","山东省","云南省","陕西省","内蒙古自治区","辽宁省","四川省","天津市","北京市","贵州省"] },
    },
  },
  sales_global: {
    title: "年报药品销售",
    category: "市场情报",
    prefix: "",
    source: "static",
    fields: {
      years: { title: "年份", filter_type: "multiple", static_values: ["2019","2018","2017","2016","2015","2014","2013","2012","2011","2010","2009","2008","2007","2006","2005"] },
      source: { title: "市场", filter_type: "multiple", static_values: ["中国","全球"] },
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
  shuomingshu: {
    title: "药品说明书",
    category: "行业参考",
    prefix: "/sms/eslist",
    fields: {
      source: { title: "批准国家", filter_type: "multiple" },
      has_sms: { title: "全文附件", filter_type: "multiple" },
      has_package_pics: { title: "包装图片", filter_type: "multiple" },
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
  zhaobiao: {
    title: "国内药品中标",
    category: "市场情报",
    prefix: "/es/zhaobiao/list",
    fields: {
      bid_type: { title: "中标类别", filter_type: "multiple" },
      province: { title: "中标省份", filter_type: "multiple" },
      notice_year: { title: "中标年份", filter_type: "multiple" },
      execute_status: { title: "执行状态", filter_type: "multiple" },
      unit: { title: "最小包装单位", filter_type: "multiple" },
      min_unit: { title: "最小制剂单位", filter_type: "multiple" },
      category: { title: "中标项目", filter_type: "multiple" },
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

