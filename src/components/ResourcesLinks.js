const ResourcesLinks = ({
  noHeading,
  heading,
  resources,
  headingClasses = "mb-4 text-center",
}) => {
  return (
    <>
      {!noHeading && (
        <h4 className={headingClasses}>{heading || "Resources"}</h4>
      )}
      <div className="flex flex-col gap-2">
        {resources.map((resource, index) => {
          return (
            <a
              key={index}
              className={`flex break-words items-center gap-4 justify-between px-4 py-2 backdrop-blur border border-primary/20 dark:border-primary/30 hover:border-primary/40 dark:hover:border-primary/50 transition-colors rounded-lg shadow-lg cursor-pointer ${
                resource.active
                  ? "bg-primary text-primary-content"
                  : "bg-gray-100 dark:bg-gray-800/50"
              }`}
              href={resource.url}
              target={"_blank"}
              rel="noreferrer"
            >
              <span className="text-gray-800 dark:text-gray-200">
                {resource.label}
              </span>
            </a>
          );
        })}
      </div>
    </>
  );
};

export default ResourcesLinks;
