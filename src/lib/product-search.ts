export type SearchableProduct = { id: string; name: string; slug: string; categories?: { name: string } | null; brands?: { name: string } | null };
export function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function distance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
    previous = row;
  }
  return previous[b.length];
}
export function searchProducts<T extends SearchableProduct>(products: T[], input: string): T[] {
  const query = normalizeSearch(input).slice(0, 100);
  if (query.length < 2) return [];
  const tokens = query.split(' ');
  return products.map(product => {
    const name = normalizeSearch(product.name), words = name.split(' ');
    let score = name === query ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2 : Infinity;
    if (!Number.isFinite(score)) {
      let cost = 0;
      for (const token of tokens) {
        const best = Math.min(...words.map(word => word.startsWith(token) ? 0 : token.length >= 4 ? distance(token, word) : Infinity));
        if (best > (token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0)) { cost = Infinity; break; }
        cost += best;
      }
      score = Number.isFinite(cost) ? 3 + cost : Infinity;
    }
    if (!Number.isFinite(score) && normalizeSearch(`${product.brands?.name || ''} ${product.categories?.name || ''}`).includes(query)) score = 10;
    return { product, score };
  }).filter(row => Number.isFinite(row.score)).sort((a, b) => a.score - b.score || a.product.name.localeCompare(b.product.name)).map(row => row.product);
}
