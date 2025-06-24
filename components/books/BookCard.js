import React from 'react'
import Image from 'next/image'
import Button from '../Button'

const BookCard = ({ book }) => {
  return (
    <article className="h-full">
      <div className="flex flex-col h-full p-3 sm:p-4 overflow-hidden border transition-all duration-200 border-gray-600 rounded-lg shadow-md hover:shadow-xl hover:border-primary-500 dark:hover:border-primary-400">
        <div className="relative mb-3 mx-auto w-full max-w-[240px] aspect-[3/4]">
          <Image
            src={book.imageUrl}
            alt={`${book.title} cover`}
            className="object-contain"
            layout="fill"
            sizes="(max-width: 640px) 100vw, 240px"
          />
        </div>
        <h5 className="text-lg sm:text-xl mb-1 sm:mb-2 line-clamp-1 text-center font-bold text-gray-900 dark:text-gray-200">
          {book.title}
        </h5>
        <h6 className="text-sm sm:text-base mb-3 text-center text-gray-600 dark:text-gray-400">
          {book.edition}
        </h6>
        <div className="text-sm text-center sm:text-base line-clamp-3 text-ellipsis mb-4 flex-grow">
          {book.description}
        </div>
        <Button
          onClick={() => window.open(book.link || book.amazonLink, '_blank')}
          color="primary"
          className="px-4 uppercase py-2 sm:py-3 w-full rounded-md hover:opacity-90"
        >
          {book.btnText || 'Get your copy'}
        </Button>
      </div>
    </article>
  )
}

export default BookCard
