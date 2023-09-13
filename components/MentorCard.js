import React from 'react'
import Image from './Image'

const MentorCard = ({ mentor }) => {
  const { imageUrl, name, company, designation } = mentor
  return (
    <article className="flex flex-col gap-4 items-center w-72">
      <div className="w-40 h-40 relative shadow-md shadow-slate-900 dark:shadow-red-700 rounded-full">
        <Image
          className={'rounded-full'}
          objectFit={'cover'}
          src={imageUrl}
          alt={name}
          layout={'fill'}
        />
      </div>
      <h3 className="text-bold text-xl text-slate-900 dark:text-white">{name}</h3>
      <h4 className="text-lg text-slate-600 flex flex-col items-center dark:text-slate-400">
        <span>{designation}</span>
        <span>@ {company}</span>
      </h4>
    </article>
  )
}

export default MentorCard
