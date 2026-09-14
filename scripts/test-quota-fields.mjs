#!/usr/bin/env node
import {
  attachQuotaFields,
  countFacetHttpCalls,
  pickQuotaFields,
} from "../dist/api.js";

function assertEq(got, want, msg) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) {
    console.error(`FAIL ${msg}\n  got  ${g}\n  want ${w}`);
    process.exit(1);
  }
}

assertEq(
  pickQuotaFields({ dbname: "product_cn", quota_cost: 1, quota_remain: 19 }),
  { quota_cost: 1, quota_remain: 19 },
  "picks quota from search content"
);
assertEq(
  pickQuotaFields({ total: 3 }, { quota_cost: 1, quota_remain: 18, quota_remain_route: 47 }),
  { quota_cost: 1, quota_remain: 18, quota_remain_route: 47 },
  "fills from envelope when content omits"
);
assertEq(
  pickQuotaFields({ quota_cost: 12 }, { quota_cost: 1, quota_remain: 8 }),
  { quota_cost: 12, quota_remain: 8 },
  "content quota_cost wins over envelope"
);

const rebuilt = {
  dbname: "product_cn",
  via: "mcp",
  ...pickQuotaFields({ quota_cost: 1, quota_remain: 19, quota_remain_route: 49, items: [] }),
};
assertEq(rebuilt.quota_cost, 1, "rebuilt search keeps quota_cost");
assertEq(rebuilt.quota_remain, 19, "rebuilt search keeps remain");
assertEq(rebuilt.quota_remain_route, 49, "rebuilt search keeps remain_route");

assertEq(
  attachQuotaFields(
    { common_search: ["item"] },
    0,
    { quota_cost: 0, quota_remain: 19, quota_remain_route: 49 }
  ),
  {
    common_search: ["item"],
    quota_cost: 0,
    quota_remain: 19,
    quota_remain_route: 49,
  },
  "fields payload keeps cost 0 and remain"
);
assertEq(
  attachQuotaFields({ distributions: {} }, 3, { quota_cost: 0, quota_remain: 16 }),
  { distributions: {}, quota_cost: 3, quota_remain: 16 },
  "facets cost overwrites snapshot cost 0"
);
assertEq(
  countFacetHttpCalls(
    ["source", "static_only"],
    {
      source: { title: "国产进口", filter_type: "multiple" },
      static_only: { title: "静态", filter_type: "multiple", static_values: ["a"] },
    }
  ),
  1,
  "static facet fields do not count as HTTP quota"
);

console.log("ok");
