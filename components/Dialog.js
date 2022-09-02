// <!DOCTYPE html>
// <html lang="en">
//   <head>
//   <title>Tailwind CSS Modal</title>
//   <link href="https://cdn.jsdelivr.net/npm/tailwindcss/dist/tailwind.min.css" rel="stylesheet">
//   <style>
//     .modal {
//       transition: opacity 0.25s ease;
//     }
//     body.modal-active {
//       overflow-x: hidden;
//       overflow-y: visible !important;
//     }
//   </style>
// </head>

// <body className="bg-gray-200 flex items-center justify-center h-screen">

//   <button className="modal-open bg-transparent border border-gray-500 hover:border-indigo-500 text-gray-500 hover:text-indigo-500 font-bold py-2 px-4 rounded-full">Open Modal</button>

//   <!--Modal-->

//   <script>
//     var openmodal = document.querySelectorAll('.modal-open')
//     for (var i = 0; i < openmodal.length; i++) {
//       openmodal[i].addEventListener('click', function(event){
//     	event.preventDefault()
//     	toggleModal()
//       })
//     }

//     const overlay = document.querySelector('.modal-overlay')
//     overlay.addEventListener('click', toggleModal)

//     var closemodal = document.querySelectorAll('.modal-close')
//     for (var i = 0; i < closemodal.length; i++) {
//       closemodal[i].addEventListener('click', toggleModal)
//     }

//     document.onkeydown = function(evt) {
//       evt = evt || window.event
//       var isEscape = false
//       if ("key" in evt) {
//     	isEscape = (evt.key === "Escape" || evt.key === "Esc")
//       } else {
//     	isEscape = (evt.keyCode === 27)
//       }
//       if (isEscape && document.body.classList.contains('modal-active')) {
//     	toggleModal()
//       }
//     };

//     function toggleModal () {
//       const body = document.querySelector('body')
//       const modal = document.querySelector('.modal')
//       modal.classList.toggle('opacity-0')
//       modal.classList.toggle('pointer-events-none')
//       body.classList.toggle('modal-active')
//     }

//   </script>
// </body>
// </html>

import React, { useEffect } from 'react'

const Dialog = ({ show }) => {
  useEffect(() => {
    toggleModal()
  }, [show])

  const toggleModal = () => {
    const body = document.querySelector('body')
    const modal = document.querySelector('.modal')
    modal.classList.toggle('opacity-0')
    modal.classList.toggle('pointer-events-none')
    body.classList.toggle('modal-active')
  }
  return (
    <div className="modal opacity-0 pointer-events-none fixed w-full h-full top-0 left-0 flex items-center justify-center">
      <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50"></div>

      <div className="modal-container bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto">
        <button
          onClick={toggleModal}
          className="modal-close absolute top-0 right-0 cursor-pointer flex flex-col items-center mt-4 mr-4 text-white text-sm z-50"
        >
          <svg
            className="fill-current text-white"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 18 18"
          >
            <path d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"></path>
          </svg>
          <span className="text-sm">(Esc)</span>
        </button>

        <div className="modal-content py-4 text-left px-6">
          <div className="flex justify-between items-center pb-3">
            <p className="text-2xl font-bold">Simple Modal!</p>
            <div className="modal-close cursor-pointer z-50">
              <svg
                className="fill-current text-black"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 18 18"
              >
                <path d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"></path>
              </svg>
            </div>
          </div>

          <p>Modal content can go here</p>
          <p>...</p>
          <p>...</p>
          <p>...</p>
          <p>...</p>

          <div className="flex justify-end pt-2">
            <button className="px-4 bg-transparent p-3 rounded-lg text-indigo-500 hover:bg-gray-100 hover:text-indigo-400 mr-2">
              Action
            </button>
            <button
              onClick={toggleModal}
              className="modal-close px-4 bg-indigo-500 p-3 rounded-lg text-white hover:bg-indigo-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dialog
