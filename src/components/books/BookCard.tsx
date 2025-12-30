"use client";

import React from "react";
import Image from "next/image";
import Button from "../Button";

import BookInterestModal from "./BookInterestModal";
import { useState } from "react";

export interface Book {
  discount?: string;
  imageUrl: string | null;
  title: string;
  edition?: string;
  description: string;
  link?: string | null;
  amazonLink?: string | null;
  btnText?: string;
  actionType?: "link" | "interest-form";
}

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (book.actionType === "interest-form") {
      setIsModalOpen(true);
    } else {
      window.open(book.link || book.amazonLink || "", "_blank");
    }
  };

  return (
    <>
      <article className="h-full">
        <div className="flex flex-col relative h-full p-3 sm:p-4 overflow-hidden border transition-all duration-200 border-gray-600 rounded-lg shadow-md hover:shadow-xl hover:border-primary">
          {book.discount && (
            <div className="absolute top-0 right-0 z-10 bg-red-600 text-white font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg shadow-sm">
              {book.discount}
            </div>
          )}
          <div className="relative mb-3 mx-auto w-full max-w-[240px] aspect-[3/4]">
            {book.imageUrl ? (
              <Image
                src={book.imageUrl}
                alt={`${book.title} cover`}
                className="object-contain"
                fill
                sizes="(max-width: 640px) 100vw, 240px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-gray-500 rounded-lg">
                <span>Coming Soon</span>
              </div>
            )}
          </div>
          <h5 className="text-lg sm:text-xl mb-1 sm:mb-2 line-clamp-1 text-center font-bold text-base-content">
            {book.title}
          </h5>
          <h6 className="text-sm sm:text-base mb-3 text-center text-base-content/70">
            {book.edition}
          </h6>
          <div className="text-sm text-center sm:text-base line-clamp-3 text-ellipsis mb-4 flex-grow">
            {book.description}
          </div>
          <Button
            onClick={handleClick}
            color="primary"
            className="px-4 uppercase py-2 sm:py-3 w-full rounded-md hover:opacity-90"
          >
            {book.btnText || "Get your copy"}
          </Button>
        </div>
      </article>

      <BookInterestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bookTitle={book.title}
      />
    </>
  );
};

export default BookCard;
