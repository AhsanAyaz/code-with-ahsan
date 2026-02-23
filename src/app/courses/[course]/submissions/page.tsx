"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { useParams } from "next/navigation";
// @ts-ignore
import SubmissionWrapper from "@/components/SubmissionWrapper";
// @ts-ignore
import { getCoursesForStaticPaths } from "@/services/CourseService";
import axios from "axios";
import ProfileAvatar from "@/components/ProfileAvatar";
import qs from "qs";
// @ts-ignore
import Course from "@/classes/Course.class";
// @ts-ignore
import { STRAPI_COURSE_POPULATE_OBJ } from "@/lib/strapiQueryHelpers";
// @ts-ignore
import Spinner from "@/components/Spinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
// @ts-ignore
import { getFireStorageFileName } from "@/lib/utils/queryParams";

const strapiUrl =
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  "https://strapi-production-7b84.up.railway.app";
const strapiAPIKey =
  process.env.STRAPI_API_KEY ||
  "2d28dddc977ac98d7e4e55b2f5cd7e1302d22f3e9033f705cb918185d5d178fd95768ae1d7e8406714022bccddc7c91a394fee9e276eba87b0e047948b22e4be58f0e97bd6e5295f52dd24fd943ad67fb0f85e7bc2d1a6487753cc704a160761b29ef8dda04f04c31fac2c1b9620103afe7a0eba541108738a5fc46c4083485d";

function getFirebaseServices() {
  const app = getApp();
  return {
    auth: getAuth(app),
    storage: getStorage(app),
    firestore: getFirestore(app),
  };
}

export default function SubmissionsPage() {
  const params = useParams();
  const courseSlug = params.course;

  const [course, setCourse] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);

  useEffect(() => {
    const { auth } = getFirebaseServices();
    setUser(auth.currentUser);
    const sub = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => sub();
  }, []);

  // Fetch Course Details
  useEffect(() => {
    if (!courseSlug) return;

    async function fetchCourse() {
      try {
        // We fetch by slug. But Strapi findOne usually takes ID or we use filters.
        // The old code used /api/courses/${courseId} which implies courseId was the ID or slug if configured.
        // Let's assume we can filter by slug.
        const queryStr = qs.stringify(
          {
            filters: {
              slug: {
                $eq: courseSlug,
              },
            },
            populate: STRAPI_COURSE_POPULATE_OBJ,
          },
          {
            encodeValuesOnly: true,
          }
        );
        const url = `${strapiUrl}/api/courses?${queryStr}`;
        const coursesResp = await axios.get(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${strapiAPIKey}`,
          },
        });

        if (coursesResp.data.data && coursesResp.data.data.length > 0) {
          const courseObj = new Course(coursesResp.data.data[0]);
          setCourse(courseObj);
        }
      } catch (e) {
        console.error("Failed to fetch course", e);
      }
    }
    fetchCourse();
  }, [courseSlug]);

  const getSubmissions = useCallback(async () => {
    if (!courseSlug) return;
    const { firestore } = getFirebaseServices();
    const querySnapshot = await getDocs(
      collection(firestore, `cwa-web/project-submissions/${courseSlug}`)
    );
    const submissionsList: any[] = [];
    querySnapshot.forEach((doc) => {
      submissionsList.push(doc.data());
    });
    setSubmissions(submissionsList);
    setLoading(false);
  }, [courseSlug]);

  useEffect(() => {
    getSubmissions();
  }, [getSubmissions]);

  const deleteProjectFileIfExists = async (docRef: any) => {
    const existingDoc = await getDoc(docRef);
    if (existingDoc.exists()) {
      const { storage } = getFirebaseServices();
      const existingFileUrl = (existingDoc.data() as any)?.screenshotUrl;
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
