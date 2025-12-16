import { ReactNode } from 'react'

export default function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-2xl font-extrabold leading-9 tracking-tight text-base-content sm:text-2xl sm:leading-10 md:text-3xl">
      {children}
    </h1>
  )
}
