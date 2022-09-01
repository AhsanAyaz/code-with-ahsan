import React from 'react'

import { getAuth } from 'firebase/auth'
import { getApp } from 'firebase/app'
import { useEffect, useState } from 'react'

const ProfileMenu = () => {
  const auth = getAuth(getApp())
  const [currentUser, setCurrentUser] = useState(null)
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
    })

    return () => {
      unsub()
    }
  })
  const showDropDown = () => {
    const menu = document.querySelector('.profile-dd')
    menu.classList.add('profile-dd--shown')
    menu.classList.remove('profile-dd--hidden')
    document.addEventListener('click', hideDropDown)
  }

  const hideDropDown = () => {
    const menu = document.querySelector('.profile-dd')
    menu.classList.add('profile-dd--hidden')
    menu.classList.remove('profile-dd--shown')
    document.removeEventListener('click', hideDropDown)
  }

  if (!currentUser) {
    return <></>
  }

  return (
    <div
      onMouseEnter={showDropDown}
      role="button"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') {
          return
        }
        hideDropDown()
      }}
      className="profile-dd profile-dd--hidden flex justify-center items-center"
    >
      <div className="w-64 shadow flex justify-center items-center">
        <div className="relative profile-dd__inner border-b-4 border-transparent py-3 transform transition duration-300">
          <div className="flex justify-center items-center space-x-3 cursor-pointer">
            <div className="ml-3 w-12 h-12 rounded-full overflow-hidden border-2 dark:border-white border-gray-900">
              <img
                src={currentUser?.photoURL}
                alt={currentUser?.displayName}
                className="w-full h-full object-cover"
              ></img>
            </div>
            <div className="mr-3 flex-1 font-semibold dark:text-white text-gray-900 text-lg">
              <div className="cursor-pointer">{currentUser?.displayName}</div>
            </div>
          </div>
          <div className="profile-dd__inner__menu hidden absolute right-0 w-60 px-5 py-3 dark:bg-gray-800 bg-white rounded-lg shadow border dark:border-transparent mt-5">
            <ul className="space-y-3 dark:text-white">
              <li className="font-medium">
                <button
                  onClick={() => {
                    auth.signOut()
                  }}
                  className="w-full flex items-center transform transition-colors duration-200 border-r-4 border-transparent hover:border-red-600"
                >
                  <div className="mr-3 text-red-600">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      ></path>
                    </svg>
                  </div>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileMenu
