import React, { useCallback, useEffect } from 'react'
import Spinner from './Spinner'

const Dialog = ({ show, onClose, actions, children, isLoading, title }) => {
  const toggleModal = useCallback(() => {
    const body = document.querySelector('body')
    const modal = document.querySelector('.modal')
    if (!show) {
      modal.classList.add('opacity-0')
      modal.classList.add('pointer-events-none')
      body.classList.remove('modal-active')
    } else {
      modal.classList.remove('opacity-0')
      modal.classList.remove('pointer-events-none')
      body.classList.add('modal-active')
    }
  }, [show])

  useEffect(() => {
    toggleModal()
  }, [show, toggleModal])

  return (
    <div className="modal z-50 opacity-0 pointer-events-none fixed w-full h-full top-0 left-0 flex items-center justify-center">
      <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50"></div>

      <div className="modal-container bg-white text-black w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto">
        <div className="modal-content py-4 text-left px-6">
          <div className="flex justify-between items-center pb-3">
            <header>
              <h2 className="text-2xl font-bold">{title || 'I am a dialog'}</h2>
              <p className="text-sm my-1 pr-4">
                Paste the link of your project (GitHub, CodePen, etc) and attach the screenshot of
                the running project
              </p>
            </header>
            <button
              className="modal-close cursor-pointer z-50 text-lg"
              onClick={() => {
                onClose()
              }}
            >
              <svg
                className="fill-current text-black hover:text-slate-600 duration-300 hover:scale-110"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 18 18"
              >
                <path d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"></path>
              </svg>
            </button>
          </div>

          <div className="modal-content">
            {isLoading ? (
              <div className="flex w-full justify-center mb-10">
                <Spinner></Spinner>
              </div>
            ) : (
              children
            )}
          </div>

          {!isLoading && actions && (
            <div className="flex justify-end gap-2 pt-2">
              {actions.map((action) => {
                const styles =
                  action.type !== 'primary'
                    ? 'disabled:bg-gray-300 disabled:cursor-not-allowed px-4 bg-transparent p-3 rounded-lg text-primary-500 hover:bg-gray-100 hover:text-primary-400'
                    : 'disabled:bg-gray-300 disabled:cursor-not-allowed modal-close px-4 bg-primary-500 p-3 rounded-lg text-white hover:bg-primary-400'

                return (
                  <button
                    disabled={action.disabled}
                    key={action.label}
                    onClick={action.onClick}
                    className={styles}
                  >
                    {action.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dialog
