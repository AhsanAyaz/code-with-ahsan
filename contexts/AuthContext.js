import { createContext } from 'react'

export const AuthContext = createContext({
  showLoginPopup: false,
  setShowLoginPopup: (show) => {},
})
