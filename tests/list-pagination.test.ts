import test from "node:test";
import assert from "node:assert/strict";
import { listPagination } from "../lib/list-pagination";
test("pagination defaults and caps unsafe inputs", () => {
  assert.deepEqual(listPagination(new URLSearchParams()), { page: 1, pageSize: 25, skip: 0, take: 25 });
  assert.equal(listPagination(new URLSearchParams("page=2&pageSize=25")).skip, 25);
  for (const page of ["-1", "0", "NaN", "1.2", "Infinity", "9007199254740992"]) assert.equal(listPagination(new URLSearchParams({ page })).page, 1);
  assert.equal(listPagination(new URLSearchParams("pageSize=99999")).take, 100);
});
