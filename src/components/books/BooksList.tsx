"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import BookCard from "./BookCard";
import BookInterestModal from "./BookInterestModal";
// @ts-ignore
import booksData from "@/data/booksData";

const ZERO_TO_WEBSITE_SLUG = "zero-to-website";

function BooksListContent() {
  const searchParams = useSearchParams();
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);

  const zeroToWebsiteBook = booksData.find(
    (book: any) => book.title === "Zero to Website"
  );

  useEffect(() => {
    const bookParam = searchParams.get("book");
    if (bookParam === ZERO_TO_WEBSITE_SLUG && zeroToWebsiteBook) {
      setIsDirectModalOpen(true);
    }
  }, [searchParams, zeroToWebsiteBook]);

  const handleModalClose = () => {
    setIsDirectModalOpen(false);
    // Clean up the URL by removing the query parameter
    const url = new URL(window.location.href);
    url.searchParams.delete("book");
    window.history.replaceState({}, "", url.pathname);
  };

  return (
    <>
      <div className="max-w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {booksData.map((book: any) => (
          <BookCard book={book} key={book.id} />
        ))}
      </div>

      {zeroToWebsiteBook && (
        <BookInterestModal
          isOpen={isDirectModalOpen}
          onClose={handleModalClose}
          bookTitle={zeroToWebsiteBook.title}
        />
      )}
    </>
  );
}

export default function BooksList() {
  return (
    <Suspense
      fallback={
        <div className="max-w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Skeleton loading state */}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-96 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg"
            />
          ))}
        </div>
      }
    >
      <BooksListContent />
    </Suspense>
  );
}
