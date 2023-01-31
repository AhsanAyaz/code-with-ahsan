import { getFirestore, setDoc, doc, getDoc } from 'firebase/firestore'
import { getApp } from 'firebase/app'

export const getEnrollmentRef = async ({ course, attendee }, create = true) => {
  const firestore = getFirestore(getApp())
  const enrollmentRef = doc(firestore, `enrollment/${course.slug}_${attendee.uid}`)
  const enrollment = await getDoc(enrollmentRef)
  if (!enrollment.exists() && create) {
    await setDoc(enrollmentRef, {
      userId: attendee.uid,
      userEmail: attendee.email,
      userName: attendee.displayName,
      courseId: course.slug,
      marked: {},
    })
  }
  return enrollmentRef
}
