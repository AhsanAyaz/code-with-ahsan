import React from 'react'

const TeamCard = ({ team }) => {
  const { name, description, members } = team
  return (
    <article className="mb-4">
      <h4 className="text-bold mb-2">{name}</h4>
      <p>{description}</p>
      <ul className="list-disc mt-2">
        {members?.map((member) => {
          return <li key={member}>{member}</li>
        })}
      </ul>
    </article>
  )
}

export default TeamCard
