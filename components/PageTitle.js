export default function PageTitle({ children }) {
  return (
    <h1 className="text-2xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-2xl sm:leading-10 md:text-3xl">
      {children}
    </h1>
  )
}
