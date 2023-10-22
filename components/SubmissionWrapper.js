import { useContext, useRef, useState } from 'react'
import { getApp } from 'firebase/app'
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { getFirestore, setDoc, doc, getDoc } from 'firebase/firestore'
import { logIn } from '../services/AuthService'
import { getFireStorageFileName } from '../lib/utils/queryParams'
import { URL_REGEX } from '../lib/regexes'
import Button from './Button'
import Dialog from './Dialog'
import { getEnrollmentDoc } from '../services/EnrollmentService'
import { AuthContext } from 'contexts/AuthContext'

const storage = getStorage(getApp())
const firestore = getFirestore(getApp())

export default function SubmissionWrapper({
  user,
  submissionUrl,
  submissionDone,
  submissionParams,
  children,
  submitButtonText,
  submitModalTitle = 'Submit',
  enrollmentChanged,
}) {
  const submissionFileElRef = useRef(null)
  const [showSubDialog, setShowSubDialog] = useState(false)
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)
  const [submissionFile, setSubmissionFile] = useState(null)
  const [submissionDemoLink, setSubmissionDemoLink] = useState('')
  const supportedFileTypes = ['image/png', 'image/jpeg']
  const { showLoginPopup } = useContext(AuthContext)

  const newSubmission = async () => {
    if (!user) {
      showLoginPopup(true)
      return
    }
    await getEnrollmentDoc({ course: { slug: submissionParams.courseId }, attendee: user }, true)
    enrollmentChanged?.({ enrolled: true })
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

  const deleteProjectFileIfExists = async (docRef) => {
    const existingDoc = await getDoc(docRef)
    if (existingDoc.exists()) {
      const existingFileUrl = existingDoc.data().screenshotUrl
      const filePath = getFireStorageFileName(existingFileUrl)
      await deleteObject(ref(storage, filePath))
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
      const docRef = doc(firestore, submissionUrl)
      setIsSubmittingProject(true)
      deleteProjectFileIfExists(docRef)
      const url = await uploadFile(file)
      const params = {
        ...(submissionParams || {}),
        by: {
          name: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
        },
        screenshotUrl: url,
        demoLink: link,
        createdAt: Date.now(),
      }
      await setDoc(docRef, params)
      setIsSubmittingProject(false)
      onSubModalClose()
      submissionDone()
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
      <div className="flex items-center justify-end mb-4">
        <Button color="primary" title="Submit your project" onClick={newSubmission}>
          {submitButtonText || '+'}
        </Button>
      </div>

      {children}
      <Dialog
        title={submitModalTitle}
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
              saveSubmission(submissionFile, user, submissionDemoLink)
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
                  Drop screenshot file to attach, or &nbsp;
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
            className="focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none w-full text-sm leading-6 text-slate-900 placeholder-slate-400 rounded-md my-4 py-2 px-4 ring-1 ring-slate-200 shadow-sm"
            type="url"
            onChange={(ev) => {
              setSubmissionDemoLink(ev.target.value)
            }}
            aria-label="Demo link"
            placeholder="Demo link"
          ></input>
        </div>
      </Dialog>
    </>
  )
}
