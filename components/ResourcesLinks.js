const ResourcesLinks = ({ noHeading, heading, resources, headingClasses = 'mb-4 text-center' }) => {
  return (
    <>
      {!noHeading && <h4 className={headingClasses}>{heading || 'Resources'}</h4>}
      <div className="flex flex-col gap-2">
        {resources.map((resource, index) => {
          return (
            <a
              key={index}
              className={`flex break-words items-center gap-4 justify-between px-4 py-2 dark:bg-gray-700 dark:text-white dark:hover:bg-primary-800 cursor-pointer bg-gray-100 rounded-md hover:bg-primary-500 hover:text-white`}
              href={resource.url}
              target={'_blank'}
              rel="noreferrer"
            >
              {resource.label}
            </a>
          )
        })}
      </div>
    </>
  )
}

export default ResourcesLinks
