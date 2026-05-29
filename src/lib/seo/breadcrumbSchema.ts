// BreadcrumbList JSON-LD builder.
// See https://developers.google.com/search/docs/appearance/structured-data/breadcrumb

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbLd(
  items: BreadcrumbItem[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
