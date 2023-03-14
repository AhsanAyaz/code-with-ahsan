import {
  getFirestore,
  setDoc,
  doc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { deleteObject, getStorage, ref } from 'firebase/storage'
import { getFireStorageFileName } from '../lib/utils/queryParams'

export const getIsEnrolled = async (courseSlug, userId) => {
  const firestore = getFirestore(getApp())
  const enrollmentRef = doc(firestore, `enrollment/${courseSlug}_${userId}`)
  const existingCourse = await getDoc(enrollmentRef)
  return existingCourse.exists()
}

export const getEnrollmentDoc = async ({ course, attendee }, create = false) => {
  const firestore = getFirestore(getApp())
  const enrollmentRef = doc(firestore, `enrollment/${course.slug}_${attendee.uid}`)
  const enrollmentDoc = await getDoc(enrollmentRef)
  if (!enrollmentDoc.exists() && create) {
    await setDoc(enrollmentRef, {
      userId: attendee.uid,
      userEmail: attendee.email,
      userName: attendee.displayName,
      courseId: course.slug,
      marked: {},
    })
  }
  return enrollmentDoc
}

export const unEnroll = async ({ course, attendee }) => {
  const firestore = getFirestore(getApp())
  const enrollmentRef = doc(firestore, `enrollment/${course.slug}_${attendee.uid}`)
  const assignmentRef = collection(firestore, `assignments/${course.slug}/${attendee.uid}`)
  const assignmentsSnapshot = await getDocs(assignmentRef)
  for (let i = 0; i < assignmentsSnapshot.docs.length; i++) {
    const assignmentDoc = assignmentsSnapshot.docs[i]
    try {
      await deleteSreenshotForDoc(assignmentDoc)
      console.log('deleted assignment submission screenshot')
    } catch (e) {
      console.log('error deleting file', e)
    }
    try {
      await deleteDoc(assignmentDoc.ref)
      console.log('deleted assignment object')
    } catch (e) {
      console.log('error deleting assignment doc', e)
    }
  }
  const projectSubmissionRef = doc(
    firestore,
    `cwa-web/project-submissions/${course.slug}/${attendee.uid}`
  )
  try {
    const docEl = await getDoc(projectSubmissionRef)
    await deleteSreenshotForDoc(docEl)
    console.log('deleted course project submission screenshot')
  } catch (e) {
    console.log('error deleting project submission screenshot', e)
  }
  try {
    await deleteDoc(projectSubmissionRef)
    console.log('deleted project submission doc')
  } catch (e) {
    console.log('error deleting project submission firestore object', e)
  }
  try {
    await deleteDoc(enrollmentRef)
    console.log('deleted enrollment doc')
  } catch (e) {
    console.log('error deleting enrollment firestore object', e)
  }
  window.location.reload()
}

const deleteSreenshotForDoc = async (doc) => {
  const storage = getStorage(getApp())
  const data = doc.data()
  if (!data) {
    return
  }
  const { screenshotUrl } = data
  const filePath = getFireStorageFileName(screenshotUrl)
  const result = await deleteObject(ref(storage, filePath))
  return result
}
