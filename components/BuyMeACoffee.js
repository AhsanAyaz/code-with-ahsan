import React from 'react'
import Image from 'next/image'

const BuyMeACoffee = () => {
  return (
    <div className="bmac-wrapper relative">
      <a
        title="Like Ahsan's work? Buy him a coffee"
        className="bmac"
        target="_blank"
        rel="noopener noreferrer"
        href="https://www.buymeacoffee.com/codewithahsan"
      >
        <Image
          className="my-16 mx-auto"
          alt="bmc-button"
          layout="fill"
          objectFit="contain"
          src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=codewithahsan&button_colour=BD5FFF&font_colour=ffffff&font_family=Comic&outline_colour=000000&coffee_colour=FFDD00"
        />
      </a>
    </div>
  )
}

export default BuyMeACoffee
