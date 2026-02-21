import { Metadata } from "next";
// @ts-ignore
import siteMetadata from "@/data/siteMetadata";
// @ts-ignore
import BooksList from "@/components/books/BooksList";
// @ts-ignore
import NewsletterForm from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: `Books - ${siteMetadata.title}`,
  description:
    "Explore books to accelerate your programming journey, authored by Ahsan.",
  openGraph: {
    type: "website",
    title: `Books - ${siteMetadata.title}`,
    description:
      "Explore books to accelerate your programming journey, authored by Ahsan.",
    images: ["/images/books-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `Books - ${siteMetadata.title}`,
    description:
      "Explore books to accelerate your programming journey, authored by Ahsan.",
    images: ["/images/books-og.png"],
  },
};

export default function Books() {
  return (
    <div className="page-padding">
      <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-base-content sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 text-center mt-4 mb-4 md:mb-8">
        Books
      </h1>
      <BooksList />

      <section className="text-center mt-16">
        <h2 className="text-2xl pb-4">
          Want to get notified when new books come out? 🔔
          <br />
          Subscribe to the newsletter 👇🏽
        </h2>
        <div className="flex items-center justify-center">
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}
