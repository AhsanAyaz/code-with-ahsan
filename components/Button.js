const Button = ({ onClick, children, color = 'primary', title, className }) => {
  let colorClass = ''
  switch (color) {
    case 'primary':
      colorClass = `hover:bg-primary-700 dark:hover:bg-primary-700 ring-primary-500 bg-primary-500 dark:bg-primary-800 dark:ring-primary-800 text-white hover:text-white`
      break
    case 'accent':
      colorClass = `hover:bg-yellow-600 dark:hover:bg-yellow-800 ring-yellow-500 bg-yellow-500 dark:bg-yellow-700 text-white hover:text-white`
      break
  }
  return (
    <button
      onClick={onClick}
      title={title || ''}
      className={`px-4 py-2 ring-1 dark:ring-offset-black dark:hover:ring-offset-2 ${colorClass} rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  )
}

export default Button
