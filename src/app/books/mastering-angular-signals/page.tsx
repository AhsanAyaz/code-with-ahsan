import { Metadata } from "next";
// @ts-ignore
import siteMetadata from "@/data/siteMetadata";
import Image from "next/image";
import { buildBookLd, buildFaqLd, FaqItem } from "@/lib/seo/bookSchema";

const BOOK_TITLE = "Mastering Angular Signals";
const BOOK_SUBTITLE =
  "A Practical Guide to Modern Reactivity, Performance, and Migration";
const AUTHOR_NAME = "Muhammad Ahsan Ayaz";
const AUTHOR_CREDS =
  "Google Developer Expert (GDE) in AI & Angular, Speaker, Software Architect, author of four books";
const AUTHOR_URL = "https://codewithahsan.dev";
const GITHUB_REPO = "https://github.com/AhsanAyaz/modern-angular-signals-book";
const AMAZON_LINK = "https://www.amazon.com/dp/B0FF9LSHJN/";
// Default to the clean Leanpub URL (suggested price). For a time-boxed launch,
// temporarily swap to a coupon link, e.g. `.../mastering-angular-signals/c/V22LAUNCH`.
const LEANPUB_LINK = "https://leanpub.com/mastering-angular-signals";
const BOOK_IMAGE = "/static/images/books/mastering-angular-signals-3d.png";
const PAGE_PATH = "/books/mastering-angular-signals";

const SITE_URL: string = siteMetadata.siteUrl || "https://codewithahsan.dev";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_DESCRIPTION =
  "Mastering Angular Signals by Muhammad Ahsan Ayaz — the definitive, hands-on guide to Angular v22 Signals: signal/computed/effect, linkedSignal, resource & httpResource, Signal Forms, zoneless change detection, testing, and migrating RxJS/NgRx codebases.";

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Which version of Angular does the book cover?",
    answer:
      "The book is updated for Angular v22 and covers the now-stable Signals APIs — including signal(), computed(), effect(), linkedSignal(), resource()/rxResource()/httpResource(), and Signal Forms — along with zoneless change detection and OnPush-by-default.",
  },
  {
    question: "Is this book good for migrating from RxJS or NgRx?",
    answer:
      "Yes. Migration is a core focus. A dedicated chapter walks through interoperability (toSignal/toObservable, takeUntilDestroyed) and a practical, step-by-step plan for moving RxJS- and NgRx-heavy applications to a signal-based architecture.",
  },
  {
    question: "Do I need prior experience with Angular Signals?",
    answer:
      "No. The book starts from the fundamentals (signal, computed, effect) and progressively builds to advanced patterns, testing strategies, and performance optimization, so it works for both newcomers to Signals and experienced Angular developers.",
  },
  {
    question: "What formats are available and where can I buy it?",
    answer:
      "It is available as a DRM-free PDF/EPUB on Leanpub, and as a Kindle eBook and paperback on Amazon. Both editions are kept up to date for Angular v22.",
  },
  {
    question: "Is the example code available?",
    answer:
      "Yes. A complete, runnable code repository accompanies the book on GitHub, with one app per chapter so you can follow along and experiment.",
  },
];

const REVIEWS: { name: string; quote: string }[] = [
  {
    name: "Gary Brock",
    quote:
      "A transformative resource for Angular developers, demystifying Signals with clear, practical explanations and real-world examples — plus a comprehensive migration roadmap that saves invaluable time.",
  },
  {
    name: "Quincy",
    quote:
      "I finally understand how to replace my messy RxJS code with simpler, cleaner logic. The migration roadmap alone saved me hours.",
  },
  {
    name: "duncan faulkner",
    quote:
      "A really great book on Angular Signals — really good explanations of what the methods and properties do, with great code examples. If you want to learn signals, this is a must-read.",
  },
];

export const metadata: Metadata = {
  title: `Mastering Angular Signals (Angular v22) by ${AUTHOR_NAME}`,
  description: PAGE_DESCRIPTION,
  keywords: [
    "Angular Signals",
    "Angular Signals book",
    "Angular v22",
    "RxJS to Signals migration",
    "Angular zoneless",
    "Signal Forms",
    "Angular resource API",
    "Muhammad Ahsan Ayaz",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: `Mastering Angular Signals — ${BOOK_SUBTITLE}`,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "book",
    images: [{ url: BOOK_IMAGE, width: 250, height: 350, alt: BOOK_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Mastering Angular Signals (Angular v22)`,
    description: PAGE_DESCRIPTION,
    images: [BOOK_IMAGE],
  },
};

export default function MasteringAngularSignalsBookPage() {
  const bookLd = buildBookLd({
    name: `${BOOK_TITLE}: ${BOOK_SUBTITLE}`,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    baseUrl: SITE_URL,
    imageUrl: `${SITE_URL}${BOOK_IMAGE}`,
    authorName: AUTHOR_NAME,
    authorUrl: AUTHOR_URL,
    isbn: "9798289015785",
    datePublished: "2025-06-20",
    inLanguage: "en",
    ratingValue: 4.6,
    reviewCount: 15,
    offers: [
      { name: "Leanpub (PDF/EPUB)", url: LEANPUB_LINK },
      {
        name: "Paperback",
        price: "24.99",
        priceCurrency: "USD",
        url: AMAZON_LINK,
      },
      {
        name: "Kindle",
        price: "9.99",
        priceCurrency: "USD",
        url: AMAZON_LINK,
      },
    ],
  });
  const faqLd = buildFaqLd(FAQ_ITEMS);

  const ctaButtons = () => (
    <div className="not-prose flex flex-col sm:flex-row gap-3 justify-center items-center">
      <a
        href={LEANPUB_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center px-6 py-3 border border-transparent !font-medium rounded-md shadow !text-white bg-primary hover:brightness-90"
      >
        Get it on Leanpub
      </a>
      <a
        href={AMAZON_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center px-6 py-3 !font-medium rounded-md border border-primary !text-primary hover:bg-primary hover:!text-white"
      >
        Also on Amazon
      </a>
    </div>
  );

  return (
    <div className="page-padding">
      {bookLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(bookLd) }}
        />
      ) : null}
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-primary">
            Updated for Angular v22
          </p>
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-base-content sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 text-center">
            {BOOK_TITLE}
          </h1>
          <p className="text-center text-lg leading-7 text-gray-500 dark:text-gray-400">
            {BOOK_SUBTITLE}
          </p>
          <p className="text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
            By {AUTHOR_NAME} — {AUTHOR_CREDS}.
          </p>
          <div className="not-prose flex flex-wrap justify-center gap-2 pt-1">
            {[
              "Foreword by the Angular team at Google",
              "Edited by GDE Sonu Kapoor",
              "★ 4.6 on Amazon",
              "14M+ install library author",
            ].map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="flex justify-center mt-6">{ctaButtons()}</div>
        </div>

        <div className="prose dark:prose-invert max-w-none pt-8 pb-8">
          <div className="flex flex-col items-center md:flex-row md:items-start md:space-x-8">
            <div className="flex-shrink-0 mb-4 md:mb-0">
              <Image
                src={BOOK_IMAGE}
                alt={BOOK_TITLE}
                width={250}
                height={350}
                className="rounded-md shadow-lg"
              />
            </div>
            <div className="flex-grow">
              <h2>End state-management headaches in Angular</h2>
              <p>
                Tired of wrestling with{" "}
                <code>ExpressionChangedAfterItHasBeenChecked</code>, tangled
                RxJS chains, and slow, unpredictable change detection? Angular
                Signals are the fix — and this book is your complete, practical
                path to mastering them.
              </p>
              <p>
                Authored by <strong>{AUTHOR_NAME}</strong>, a Google Developer
                Expert in AI &amp; Angular and seasoned Software Architect,{" "}
                <em>Mastering Angular Signals</em> distills years of real-world
                experience into a hands-on guide — with a foreword from the
                Angular team at Google.
              </p>

              <h3>This book is for you if you:</h3>
              <ul>
                <li>
                  Are struggling to understand when and how to use Angular
                  Signals effectively.
                </li>
                <li>
                  Want to build modern, <strong>zoneless applications</strong>{" "}
                  but don&apos;t know where to start.
                </li>
                <li>
                  Need a clear, practical plan to{" "}
                  <strong>migrate an existing RxJS or NgRx codebase</strong>.
                </li>
                <li>
                  Are ready to write simpler, cleaner, and dramatically more
                  performant Angular code.
                </li>
              </ul>

              <div className="flex justify-center my-6">{ctaButtons()}</div>

              <h3>New &amp; stable in Angular v22 — and covered in depth</h3>
              <p>
                The APIs that make Angular v22 different aren&apos;t previews
                here — they&apos;re taught with runnable examples:
              </p>
              <div className="not-prose flex flex-wrap gap-2 my-4">
                {[
                  "Signal Forms (no ControlValueAccessor)",
                  "Angular Aria (headless a11y)",
                  "@Service() decorator",
                  "injectAsync()",
                  "stable resource() / httpResource()",
                  "linkedSignal()",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center rounded-md bg-base-200 px-3 py-1 text-sm font-medium text-base-content"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <h3>What you will learn</h3>
              <ul>
                <li>
                  The core building blocks: <code>signal()</code>,{" "}
                  <code>computed()</code>, and <code>effect()</code> — with the
                  mental model that makes them click.
                </li>
                <li>
                  Writable derived state with <code>linkedSignal()</code> and
                  async data — <code>resource()</code>, <code>rxResource()</code>,
                  and <code>httpResource()</code> — for loading, errors, and
                  refetch, without RxJS boilerplate.
                </li>
                <li>
                  Signal-driven components: <code>input()</code>,{" "}
                  <code>output()</code>, <code>model()</code>, and signal queries
                  (<code>viewChild</code>/<code>viewChildren</code>).
                </li>
                <li>
                  <strong>Signal Forms &amp; Angular Aria</strong> (new and
                  stable in v22) — type-safe, declarative forms with no{" "}
                  <code>ControlValueAccessor</code>, plus headless, accessible UI
                  primitives.
                </li>
                <li>
                  The new v22 dependency injection — the <code>@Service()</code>{" "}
                  decorator and <code>injectAsync()</code> for code-split, lazy
                  services.
                </li>
                <li>
                  A step-by-step strategy for migrating{" "}
                  <strong>RxJS/NgRx</strong> code to Signals (
                  <code>toSignal</code>/<code>toObservable</code>,{" "}
                  <code>takeUntilDestroyed</code>).
                </li>
                <li>
                  Testing Signal-based code, plus zoneless and OnPush
                  performance best practices.
                </li>
              </ul>

              <h3>What readers are saying</h3>
              {REVIEWS.map((r) => (
                <blockquote key={r.name}>
                  <p>“{r.quote}”</p>
                  <p>
                    <strong>— {r.name}</strong> (Amazon review)
                  </p>
                </blockquote>
              ))}

              <h3>Follow along with real code</h3>
              <p>
                Every example is backed by a complete, runnable repository, with
                one app per chapter:
              </p>
              <p>
                <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
                  {GITHUB_REPO}
                </a>
              </p>

              <h3>Frequently asked questions</h3>
              {FAQ_ITEMS.map((f) => (
                <div key={f.question}>
                  <h4>{f.question}</h4>
                  <p>{f.answer}</p>
                </div>
              ))}

              <div className="flex justify-center my-6">{ctaButtons()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
