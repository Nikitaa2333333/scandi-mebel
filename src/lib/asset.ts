// Путь к статике с учётом base (GitHub Pages: /dr.chashchina).
// BASE_URL может быть со слэшем на конце и без — нормализуем сами.
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL;
  return (base.endsWith('/') ? base : base + '/') + path.replace(/^\//, '');
}
