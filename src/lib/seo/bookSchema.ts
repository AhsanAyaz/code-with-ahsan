// Book JSON-LD builders. Centralizes the shape so pages (and any audit script)
// agree on what gets emitted for a book landing page. See:
//   - https://schema.org/Book
//   - https://developers.google.com/search/docs/appearance/structured-data/faqpage

const SITE_NAME = "Code with Ahsan";

export interface BookOfferInput {
  price?: string; // e.g. "29.99"
  priceCurrency?: string; // e.g. "USD"
  url: string;
  availability?: string; // schema.org availability URL or short form
  name?: string; // e.g. "Paperback", "Kindle", "Leanpub (PDF/EPUB)"
}

export interface BookSchemaInput {
  name: string;
  description: string;
  url: string;
  baseUrl: string;
  imageUrl?: string;
  authorName?: string;
  authorUrl?: string;
  isbn?: string;
  datePublished?: string; // ISO date
  inLanguage?: string; // e.g. "en"
  ratingValue?: number; // e.g. 4.6
  reviewCount?: number; // e.g. 15
  offers?: BookOfferInput[];
}

function normalizeAvailability(value?: string): string {
  if (!value) return "https://schema.org/InStock";
  if (value.startsWith("http")) return value;
  return `https://schema.org/${value}`;
}

export function buildBookLd(
  input: BookSchemaInput
): Record<string, unknown> | null {
  const name = (input.name || "").trim();
  const description = (input.description || "").trim();
  if (!name || !description) return null;

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Book",
    name,
    description,
    url: input.url,
    bookFormat: "https://schema.org/Paperback",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: input.baseUrl,
    },
  };

  if (input.imageUrl) ld.image = input.imageUrl;
  if (input.inLanguage) ld.inLanguage = input.inLanguage;
  if (input.isbn) ld.isbn = input.isbn;
  if (input.datePublished) ld.datePublished = input.datePublished;

  if (input.authorName) {
    const author: Record<string, unknown> = {
      "@type": "Person",
      name: input.authorName,
    };
    if (input.authorUrl) author.url = input.authorUrl;
    ld.author = author;
  }

  if (
    typeof input.ratingValue === "number" &&
    typeof input.reviewCount === "number" &&
    input.reviewCount > 0
  ) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.ratingValue,
      reviewCount: input.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (input.offers && input.offers.length > 0) {
    ld.offers = input.offers.map((o) => {
      const offer: Record<string, unknown> = {
        "@type": "Offer",
        url: o.url,
        availability: normalizeAvailability(o.availability),
      };
      if (o.price) offer.price = o.price;
      if (o.priceCurrency) offer.priceCurrency = o.priceCurrency;
      if (o.name) offer.name = o.name;
      return offer;
    });
  }

  return ld;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function buildFaqLd(items: FaqItem[]): Record<string, unknown> | null {
  const valid = (items || []).filter(
    (i) => (i.question || "").trim() && (i.answer || "").trim()
  );
  if (valid.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((i) => ({
      "@type": "Question",
      name: i.question.trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: i.answer.trim(),
      },
    })),
  };
}
