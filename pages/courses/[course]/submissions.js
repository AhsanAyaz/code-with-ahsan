import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'
import axios from 'axios'
import qs from 'qs'
import Course from '../../../classes/Course.class'
import PostsList from '../../../components/courses/PostsList'
import STRAPI_CONFIG from '../../../lib/strapiConfig'
import { useReducer, useEffect, useState, useRef, useCallback } from 'react'
import { postsReducer } from '../../../services/PostService'
import logAnalyticsEvent from '../../../lib/utils/logAnalyticsEvent'
import getCoursesForStaticPaths from '../../../services/CourseService'
import Button from '../../../components/Button'
import { getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import Dialog from '../../../components/Dialog'
import { logIn } from '../../../services/AuthService'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { getFirestore, getDocs, collection, setDoc, doc } from 'firebase/firestore'
import { URL_REGEX } from '../../../lib/regexes'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY
const auth = getAuth(getApp())
const storage = getStorage(getApp())
const firestore = getFirestore(getApp())

export async function getStaticPaths() {
  return getCoursesForStaticPaths()
}

export async function getStaticProps({ params }) {
  const { course: courseId } = params

  const query = qs.stringify(
    {
      populate: ['authors', 'authors.avatar', 'chapters', 'chapters.posts', 'resources'],
      publicationState: STRAPI_CONFIG.publicationState,
    },
    {
      encodeValuesOnly: true,
    }
  )
  const url = `${strapiUrl}/api/courses/${courseId}?${query}`
  const coursesResp = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  })
  const course = new Course(coursesResp.data.data)
  return { props: { courseStr: JSON.stringify(course) } }
}

export default function CourseSubmissionsPage({ courseStr }) {
  const course = JSON.parse(courseStr)
  const submissionFileElRef = useRef(null)
  const [state, dispatch] = useReducer(postsReducer, { completedPosts: {} })
  const [showSubDialog, setShowSubDialog] = useState(false)
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)
  const [submissionFile, setSubmissionFile] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [submissionDemoLink, setSubmissionDemoLink] = useState('')
  const supportedFileTypes = ['image/png', 'image/jpeg']

  const getSubmissions = useCallback(async () => {
    const querySnapshot = await getDocs(
      collection(firestore, `cwa-web/project-submissions/${course.slug}`)
    )
    const submissionsList = []
    querySnapshot.forEach((doc) => {
      submissionsList.push(doc.data())
    })
    setSubmissions(submissionsList)
  }, [course.slug])

  useEffect(() => {
    dispatch({
      type: 'RETRIEVE_COMPLETED_POSTS',
    })
    logAnalyticsEvent('course_submissions_viewed', {
      courseSlug: course.slug,
    })
    getSubmissions()
  }, [course.slug, getSubmissions])

  const newSubmission = async () => {
    if (!auth.currentUser) {
      const user = await logIn()
      if (!user) {
        return
      }
    }
    setShowSubDialog(true)
  }

  function handleFileSelect(evt) {
    evt.stopPropagation()
    evt.preventDefault()
    const file = evt.target.files[0]
    setSubmissionFile(file)
  }

  function dropHandler(ev) {
    ev.preventDefault()
    if (ev.dataTransfer.items) {
      const items = [...ev.dataTransfer.items].filter((item) => item.kind === 'file')
      if (items.length > 1) {
        return alert('Please only select one file')
      } else {
        const file = items[0].getAsFile()
        console.log(`${file.name}`)
        console.log(file)
        setSubmissionFile(file)
      }
    } else {
      const items = [...ev.dataTransfer.files]
      // Use DataTransfer interface to access the file(s)
      if (items.length > 1) {
        return alert('Please only select one file')
      } else {
        setSubmissionFile(items[0])
      }
    }
  }

  function dragOverHandler(ev) {
    ev.preventDefault()
  }

  const onSubModalClose = () => {
    setSubmissionFile(null)
    setSubmissionDemoLink('')
    setShowSubDialog(false)
    if (submissionFileElRef.current) {
      submissionFileElRef.current.value = ''
    }
  }

  const saveSubmission = async (file, user, link) => {
    if (!file || !user || !link) {
      return
    }
    if (!URL_REGEX.test(link)) {
      return alert('Invalid URL')
    }
    try {
      setIsSubmittingProject(true)
      const url = await uploadFile(file)
      const params = {
        courseId: course.slug,
        by: {
          name: user.displayName,
          photoURL: user.photoURL,
        },
        screenshotUrl: url,
        demoLink: link,
        createdAt: Date.now(),
      }
      const docRef = doc(firestore, `cwa-web/project-submissions/${course.slug}/${user.uid}`)
      await setDoc(docRef, params)
      setIsSubmittingProject(false)
      onSubModalClose()
      getSubmissions()
    } catch (e) {
      setIsSubmittingProject(false)
      console.log('Failed to submit project', e)
      alert('Failed to submit project')
    }
  }

  const uploadFile = async (file) => {
    const metadata = {
      contentType: file.type,
    }
    const fileRef = ref(storage, `project-submissions/${file.name}`)
    await uploadBytes(fileRef, file, metadata)
    const url = await getDownloadURL(fileRef)
    return url
  }

  return (
    <>
      <PageSEO
        title={`${course.name} - Project Submissions`}
        description={course.description || siteMetadata.description}
      />
      <div className="flex gap-12 flex-col-reverse md:grid md:grid-cols-3 md:gap-4">
        <article className="chapters col-span-1">
          {course &&
            course.chapters.map((chapter, index) => {
              return (
                <section key={index} className="mb-2">
                  {chapter.showName && (
                    <div className="mb-4 text-left md:text-center text-base font-bold">
                      {chapter.name}
                    </div>
                  )}
                  <PostsList
                    chapter={chapter}
                    courseSlug={course.slug}
                    completedPosts={state.completedPosts}
                  />
                </section>
              )
            })}
        </article>
        <main className="flex-1 md:min-h-[300px] col-span-2">
          <header className="flex items-center justify-end">
            <Button onClick={newSubmission}>Submit</Button>
          </header>
          <div className="submissions mt-8 flex flex-wrap gap-5">
            {submissions &&
              submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="max-w-xs bg-white rounded-lg border border-gray-200 shadow-md dark:bg-gray-800 dark:border-gray-700"
                >
                  <a
                    href={sub.demoLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="overflow-hidden rounded-t-lg flex items-center justify-center aspect-square bg-black/80"
                  >
                    <img src={sub.screenshotUrl} alt="" />
                  </a>
                  <div className="p-5">
                    <div className="flex items-center gap-4">
                      <img src={sub.by.photoURL} className="rounded-full w-12 h-12" />
                      <a href={sub.demoLink} target="_blank" rel="noreferrer noopener">
                        <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                          {sub.by.name}
                        </h5>
                      </a>
                    </div>

                    {/* <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">
                    Here are the biggest enterprise technology acquisitions of 2021 so far, in
                    reverse chronological order.
                  </p> */}
                  </div>
                </div>
              ))}
          </div>
        </main>
        <Dialog
          title={'Submit project'}
          show={showSubDialog}
          onClose={onSubModalClose}
          isLoading={isSubmittingProject}
          actions={[
            {
              label: 'Cancel',
              onClick: onSubModalClose,
            },
            {
              label: 'Save',
              disabled: !(submissionFile && submissionDemoLink),
              onClick: () => {
                saveSubmission(submissionFile, auth.currentUser, submissionDemoLink)
              },
              type: 'primary',
            },
          ]}
        >
          <div className="max-w-xl">
            <label
              onDrop={dropHandler}
              onDragOver={dragOverHandler}
              className="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
            >
              <span className="flex items-center space-x-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                {submissionFile ? (
                  <span className="font-medium text-gray-600 break-all">{submissionFile.name}</span>
                ) : (
                  <span className="font-medium text-gray-600">
                    Drop files to Attach, or &nbsp;
                    <span className="text-blue-600 underline">browse</span>
                  </span>
                )}
              </span>
              <input
                ref={submissionFileElRef}
                type="file"
                accept={supportedFileTypes.join(', ')}
                onChange={handleFileSelect}
                name="file_upload"
                className="hidden"
                multiple={false}
              />
            </label>
            <input
              className="focus:ring-2 text-black focus:ring-blue-500 focus:outline-none appearance-none w-full text-sm leading-6 text-slate-900 placeholder-slate-400 rounded-md my-4 py-2 px-4 ring-1 ring-slate-200 shadow-sm"
              type="url"
              onChange={(ev) => {
                setSubmissionDemoLink(ev.target.value)
              }}
              aria-label="Demo link"
              placeholder="Demo link"
            ></input>
          </div>
        </Dialog>
      </div>
    </>
  )
}

CourseSubmissionsPage.showAds = true
