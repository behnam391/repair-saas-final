export function listPagination(params: URLSearchParams) {
  const integer = (key: string, fallback: number, max: number) => { const value = Number(params.get(key)); return Number.isSafeInteger(value) && value > 0 ? Math.min(value, max) : fallback; };
  const page = integer("page", 1, 100000);
  const pageSize = integer("pageSize", 25, 100);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
