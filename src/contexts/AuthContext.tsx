import { createContext } from 'react'

export interface AuthContextType {
  showLoginPopup: boolean
  setShowLoginPopup: (show: boolean) => void
}

export const AuthContext = createContext<AuthContextType>({
  showLoginPopup: false,
  setShowLoginPopup: () => {},
})
