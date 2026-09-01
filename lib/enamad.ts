export const PEYVO_ENAMAD = {
  id: "765393",
  code: "Uj7FkrH4Lf9aFbG3HMxRZabxUWYnGBYK",
} as const;

export function enamadQuery(id: string = PEYVO_ENAMAD.id, code: string = PEYVO_ENAMAD.code) {
  return `id=${encodeURIComponent(id)}&Code=${encodeURIComponent(code)}`;
}
