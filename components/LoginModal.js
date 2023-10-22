import { AuthContext } from 'contexts/AuthContext'
import { ProviderId } from 'firebase/auth'
import { useContext } from 'react'
import { logIn } from 'services/AuthService'

export default function LoginModal({ show }) {
  const { setShowLoginPopup } = useContext(AuthContext)
  const withGitHub = async () => {
    await logIn(ProviderId.GITHUB)
    setShowLoginPopup(false)
  }

  const withGoogle = async () => {
    await logIn(ProviderId.GOOGLE)
    setShowLoginPopup(false)
  }

  if (!show) {
    return <></>
  }

  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 mx-auto sm:px-6 lg:px-8 w-full bg-slate-900 bg-opacity-50 z-10">
      <div className="mx-auto max-w-lg bg-white px-4 py-16 my-24 shadow-lg rounded-lg relative">
        <button
          onClick={() => {
            setShowLoginPopup(false)
          }}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md absolute top-4 right-4"
        >
          x
        </button>
        <h1 className="text-center text-2xl font-bold text-indigo-600 sm:text-3xl">
          Get started today
        </h1>

        <p className="mx-auto mt-4 max-w-md text-center text-gray-500">
          Log in to get access to all the courses
        </p>

        <section className="mb-0 mt-6 space-y-4 p-4 sm:p-6 lg:p-8">
          <button
            onClick={withGoogle}
            className="block w-full rounded-lg bg-red-600 px-5 py-3 text-sm font-medium text-white"
          >
            Sign in with Google
          </button>

          <button
            onClick={withGitHub}
            className="block w-full rounded-lg bg-slate-600 px-5 py-3 text-sm font-medium text-white"
          >
            Sign in with GitHub
          </button>
        </section>
      </div>
    </div>
  )
}
