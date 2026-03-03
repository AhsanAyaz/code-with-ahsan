"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
  type DocumentReference,
  type DocumentData,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth, type User } from "firebase/auth";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { useParams } from "next/navigation";
import SubmissionWrapper from "@/components/SubmissionWrapper";
import ProfileAvatar from "@/components/ProfileAvatar";
import Course from "@/classes/Course.class";
import Spinner from "@/components/Spinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { getFireStorageFileName } from "@/lib/utils/queryParams";
import { getLocalCourseBySlug } from "@/lib/content/localContent";

interface SubmissionItem {
  screenshotUrl: string;
  demoLink: string;
  by: {
    uid: string;
    name: string;
    photoURL?: string;
  };
}

function getFirebaseServices() {
  const app = getApp();
  return {
    auth: getAuth(app),
    storage: getStorage(app),
    firestore: getFirestore(app),
  };
}

export default function SubmissionsPage() {
  const params = useParams<{ course: string }>();
  const courseSlug = params.course;

  const [course, setCourse] = useState<Course | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);

  useEffect(() => {
    const { auth } = getFirebaseServices();
    setUser(auth.currentUser);
    const sub = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
    });
    return () => sub();
  }, []);

  useEffect(() => {
    if (!courseSlug) return;
    const courseData = getLocalCourseBySlug(courseSlug);
    if (courseData) {
      setCourse(new Course(courseData));
    }
  }, [courseSlug]);

  const getSubmissions = useCallback(async () => {
    if (!courseSlug) return;
    const { firestore } = getFirebaseServices();
    const querySnapshot = await getDocs(
      collection(firestore, `cwa-web/project-submissions/${courseSlug}`)
    );
    const submissionsList: SubmissionItem[] = [];
    querySnapshot.forEach((submissionDoc) => {
      submissionsList.push(submissionDoc.data() as SubmissionItem);
    });
    setSubmissions(submissionsList);
    setLoading(false);
  }, [courseSlug]);

  useEffect(() => {
    getSubmissions();
  }, [getSubmissions]);

  const deleteProjectFileIfExists = async (
    docRef: DocumentReference<DocumentData>
  ) => {
    const existingDoc = await getDoc(docRef);
    if (existingDoc.exists()) {
      const { storage } = getFirebaseServices();
      const existingFileUrl = existingDoc.data()?.screenshotUrl as string | undefined;
      const filePath = getFireStorageFileName(existingFileUrl);
      await deleteObject(ref(storage, filePath));
    }
  };

  const deleteSubmission = async () => {
    if (!user) return;
    setIsDeletingSubmission(true);
    try {
      const { firestore } = getFirebaseServices();
      const docRef = doc(
        firestore,
        `cwa-web/project-submissions/${courseSlug}/${user.uid}`
      );
      await deleteProjectFileIfExists(docRef);
      await deleteDoc(docRef);
      getSubmissions();
    } catch (e) {
      console.log(e);
    } finally {
      setIsDeletingSubmission(false);
    }
  };

  if (loading && !course) {
    return (
      <div className="flex justify-center p-10">
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <div className="page-padding">
      <header className="mb-6">
        <h1 className="text-4xl text-center">Submissions</h1>
        {course && (
          <h2 className="text-xl mt-2 text-center text-base-content/70">
            {course.name}
          </h2>
        )}
      </header>

      <SubmissionWrapper
        user={user}
        submissionUrl={`cwa-web/project-submissions/${courseSlug}/${user?.uid}`}
        submissionDone={getSubmissions}
        submissionParams={{
          courseId: courseSlug,
        }}
        submitButtonText="Submit Project"
        enrollmentChanged={() => {}}
      >
        {submissions?.length > 0 ? (
          <ul className="submissions mt-8 flex flex-wrap gap-5 justify-center">
            {submissions.map((sub) => (
              <li
                key={sub.screenshotUrl}
                className="max-w-xs w-full transition ease-in-out duration-150 rounded-md shadow-md relative hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer bg-base-100 border border-base-200"
              >
                {sub.by.uid === user?.uid && !isDeletingSubmission && (
                  <button
                    onClick={deleteSubmission}
                    className="hover:opacity-50 cursor-pointer absolute top-3 right-3 z-10 bg-white rounded-full p-1"
                  >
                    <FontAwesomeIcon icon={faTrash} color={"red"} />
                  </button>
                )}
                {isDeletingSubmission ? (
                  <div className="flex items-center justify-center h-48">
                    <Spinner color="primary" />
                  </div>
                ) : (
                  <div
                    onClick={() => window.open(sub.demoLink, "_blank")}
                    className="overflow-hidden rounded-t-md flex items-center justify-center aspect-video bg-black/80 w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sub.screenshotUrl}
                      alt={`Submission by ${sub.by.name}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}

                <div className="p-5 border-t border-base-200">
                  <div className="flex items-center gap-4">
                    <ProfileAvatar
                      photoURL={sub.by.photoURL}
                      displayName={sub.by.name}
                      size="md"
                    />
                    <a
                      href={sub.demoLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hover:text-primary"
                    >
                      <h5 className="mb-0 text-lg font-bold tracking-tight text-base-content">
                        {sub.by.name}
                      </h5>
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <h2 className="text-2xl text-center my-8 text-base-content/60">
            No submissions yet
          </h2>
        )}
      </SubmissionWrapper>
    </div>
  );
}
