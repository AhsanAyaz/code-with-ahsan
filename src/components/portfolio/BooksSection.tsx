import Image from "next/image";
import Link from "next/link";
import booksData from "@/data/booksData.js";

export default function BooksSection() {
  return (
    <section className="border-t border-base-300 bg-base-200 py-16">
      <div className="page-padding">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-base-content mb-8">
            Published Books
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {booksData.map((book) => {
              const href = book.link || book.amazonLink || "#";
              const btnLabel = book.btnText || "Get on Amazon";
              return (
                <div
                  key={book.id}
                  className="bg-base-100 border border-base-300 rounded-xl shadow-sm flex flex-col overflow-hidden"
                >
                  {/* Cover */}
                  <div className="relative w-full aspect-[3/4] bg-base-200">
                    <Image
                      src={book.imageUrl}
                      alt={book.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 p-4 gap-2">
                    <div>
                      <h3 className="font-bold text-base-content leading-tight">
                        {book.title}
                      </h3>
                      {book.edition && (
                        <span className="text-xs text-base-content/50">
                          {book.edition}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-base-content/70 leading-relaxed flex-1">
                      {book.description}
                    </p>
                    {href !== "#" && (
                      <Link
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm mt-2 w-full"
                      >
                        {btnLabel}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
