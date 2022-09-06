import React from 'react'

const Spinner = ({ color }) => {
  color = color || '#333'
  return (
    <div className="lds-ring">
      <div
        className={`border-t-[${color}] border-r-transparent border-b-transparent border-l-transparent`}
      ></div>
      <div
        className={`border-t-[${color}] border-r-transparent border-b-transparent border-l-transparent`}
      ></div>
      <div
        className={`border-t-[${color}] border-r-transparent border-b-transparent border-l-transparent`}
      ></div>
      <div
        className={`border-t-[${color}] border-r-transparent border-b-transparent border-l-transparent`}
      ></div>
    </div>
  )
}

export default Spinner
