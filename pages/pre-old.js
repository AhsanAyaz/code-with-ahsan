import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock } from '@fortawesome/free-solid-svg-icons'
export default function AngularCookbookReader() {
  return <MainPage />
}
import React, { useState } from 'react'
import { PRE_COURSE_OUTLINE } from '../data/pre-course-outline'

export const CourseModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl w-full m-4">
        <button onClick={onClose} className="float-right text-gray-400 hover:text-white">
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
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h2 className="text-3xl font-bold text-primary-300 mb-6">Ready to Your React Journey?</h2>
        <section className="flex flex-col gap-4 text-gray-200">
          <h4 className="text-xl font-semibold">
            Interested in the{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://codewithahsan.teachable.com/p/practical-react-essentials"
              className="text-primary-400 hover:text-primary-300 underline"
            >
              Practical React Essentials course
            </a>
            ?{' '}
          </h4>
          <p>You've made an excellent choice! 🎉</p>
          <p>Choose your preferred payment method:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => {
                window.open(
                  'https://codewithahsan.teachable.com/purchase?product_id=5463466',
                  '_blank'
                )
              }}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Pay with Card/PayPal ($USD)
            </button>
            <button
              onClick={() => {
                window.open(
                  'https://www.notion.so/Buy-the-Practical-React-Essentials-in-Urdu-Hindi-Course-b34e1f48adbe4eb2a7d95c948068930a',
                  '_blank'
                )
              }}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Pay with Bank Transfer (PKR)
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function MainPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const courseStructure = PRE_COURSE_OUTLINE

  const getTotalDuration = () => {
    let total = 0
    courseStructure.forEach((section) => {
      section.lessons.forEach((lesson) => {
        const match = lesson.text.match(/(\d+):(\d+)/)
        if (match) {
          total += parseInt(match[1]) * 60 + parseInt(match[2])
        }
      })
    })
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getTotalLessons = () => {
    return courseStructure.reduce((total, section) => total + section.lessons.length, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-primary-900 to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-blue-400">
            Practical React Essentials
          </h1>
          <h2 className="text-3xl md:text-5xl">in Urdu/Hindi</h2>
          <p className="text-xl text-gray-300">
            A comprehensive journey from React basics to advanced concepts in Urdu/Hindi
          </p>
          <div className="flex items-center justify-center gap-4 text-gray-300">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{getTotalDuration()}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span>{getTotalLessons()} Lessons</span>
            </div>
          </div>
          <button
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-6 text-lg rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            onClick={() => setIsModalOpen(true)}
          >
            Start Learning Now
          </button>
        </div>
      </div>

      {/* Course Content */}
      <div className="container mx-auto px-4 pb-20">
        <div className="space-y-12 max-w-4xl mx-auto">
          {courseStructure.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-6">
              <h2 className="text-3xl font-bold text-primary-300">{section.title}</h2>
              <div className="grid gap-4">
                {section.lessons.map((lesson, lessonIndex) => {
                  const [title, duration] = lesson.text.split('(')
                  return (
                    <a
                      href={lesson.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      key={lessonIndex}
                      onClick={(ev) => {
                        if (!lesson.previewAvailable) {
                          ev.preventDefault()
                        }
                      }}
                      className={`${
                        !lesson.previewAvailable
                          ? 'opacity-60 cursor-not-allowed'
                          : 'bg-gray-800/50 hover:border-primary-500/40 cursor-pointer'
                      } backdrop-blur border border-primary-500/20  transition-colors rounded-lg shadow-lg`}
                    >
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-primary-400 font-mono">
                            {(lessonIndex + 1).toString().padStart(2, '0')}
                          </span>
                          <span className="text-gray-200 hover:text-primary-300">{title}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          {duration && (
                            <span className="text-gray-400">{'(' + duration.replace('', '')}</span>
                          )}
                          {lesson.previewAvailable ? (
                            <svg
                              className="w-5 h-5 text-primary-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          ) : (
                            <FontAwesomeIcon
                              icon={faLock}
                              className={'dark:text-gray-300 text-gray-400'}
                            />
                          )}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
              <div className="flex justify-center !mt-16">
                <button
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 text-lg rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  onClick={() => setIsModalOpen(true)}
                >
                  Start Learning Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CourseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

const CourseEmbed = () => {
  const handleTeachableBuyButtonClick = (event) => {
    event.preventDefault()
    const radio = document.querySelector('.teachable-pricing-plan-course-2506574:checked')
    if (radio) {
      const isNotFree = radio.getAttribute('data-plan-type')?.toLowerCase() !== 'free'
      if (isNotFree) {
        window.location.href = radio.value
      }
    }
  }

  return (
    <div
      className="teachable-embed-course-2506574"
      style={{
        color: 'rgb(43, 54, 54)',
        width: '488px',
        borderRadius: '8px',
        border: '1px solid rgb(228, 228, 228)',
        backgroundColor: 'rgb(255, 255, 255)',
        paddingBottom: '16px',
        wordBreak: 'break-word',
      }}
    >
      <img
        src="https://process.fs.teachablecdn.com/ADNupMnWyR7kCWRvm76Laz/resize=width:705/https://cdn.filestackcontent.com/bB8TxOp5T66QbDrqE8Ii"
        alt="Practical React Essentials in Urdu/Hindi"
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '274.5px',
          borderRadius: '8px 8px 0 0',
        }}
      />
      <h1
        style={{
          fontWeight: 400,
          fontSize: '32px',
          fontStyle: 'normal',
          fontFamily: 'Metropolis',
          padding: '16px 16px 0',
        }}
      >
        Practical React Essentials in Urdu/Hindi
      </h1>
      <form>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: '16px',
            borderRadius: '0',
            margin: '16px',
            border: '1px solid rgb(167, 167, 167)',
          }}
        >
          <label
            htmlFor="pricing-plan-5463466"
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: 'sans-serif',
              fontWeight: 400,
              fontSize: '16px',
              fontStyle: 'normal',
              color: 'rgb(43, 54, 54)',
              maxWidth: 'calc(80%)',
            }}
          >
            <input
              className="teachable-pricing-plan-course-2506574"
              id="pricing-plan-5463466"
              name="pricing-plan"
              type="radio"
              data-plan-type="One-Time Purchase"
              value="https://codewithahsan.teachable.com/purchase?product_id=5463466&user_src=embed_buy_button&embed=true"
              defaultChecked
              style={{ display: 'none' }}
            />
            <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', paddingRight: '8px' }}>
              One-Time Purchase
            </span>
          </label>
          <span style={{ fontFamily: 'Metropolis', textAlign: 'end' }}>$5</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column-reverse', margin: '16px' }}>
          <button
            className="teachable-buy-button-course-2506574"
            type="button"
            onClick={handleTeachableBuyButtonClick}
            style={{
              border: '1px solid rgb(9, 165, 154)',
              borderRadius: '0',
              backgroundColor: 'rgb(9, 165, 154)',
              padding: '16px',
              fontFamily: 'sans-serif',
              fontWeight: 600,
              fontSize: '16px',
              fontStyle: 'normal',
              color: 'rgb(43, 54, 54)',
              cursor: 'pointer',
            }}
          >
            Buy now
          </button>
        </div>
      </form>
    </div>
  )
}
