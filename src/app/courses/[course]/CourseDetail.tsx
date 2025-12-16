"use client";

import React, { useEffect, useCallback, useState, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";
import {
  getFirestore,
  query,
  collection,
  getCountFromServer,
  where,
} from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPersonCirclePlus } from "@fortawesome/free-solid-svg-icons";

// @ts-ignore
import LegitMarkdown from "@/components/LegitMarkdown";
// @ts-ignore
import ResourcesLinks from "@/components/ResourcesLinks";
// @ts-ignore
import logAnalyticsEvent from "@/lib/utils/logAnalyticsEvent";
// @ts-ignore
import { getEnrollmentDoc, unEnroll } from "@/services/EnrollmentService";
// @ts-ignore
import { CoursesList } from "@/components/courses/CoursesList";
import Button from "@/components/Button";
// @ts-ignore
import { getCurrentUser } from "@/services/AuthService";
// @ts-ignore
import { AuthContext } from "@/contexts/AuthContext";
// @ts-ignore
import NewsletterForm from "@/components/NewsletterForm";
import siteMetadata from "@/data/siteMetadata";

const CourseDetail = ({ course }: { course: any }) => {
  const [marked, setMarked] = useState({});
  const [enrollmentCount, setEnrollmentCount] = useState(null);
  const [enrolled, setEnrolled] = useState(null);
  const router = useRouter();
  const { setShowLoginPopup } = useContext(AuthContext);
  // @ts-ignore
  const [user, setUser] = useState(null);

  const getMarked = useCallback(
    async (user: any) => {
      if (!user) {
        return;
      }
      const enrollment = await getEnrollmentDoc({ course, attendee: user });
      const isEnrolled = enrollment.exists();
      setEnrolled(!!isEnrolled as any);
      if (!isEnrolled) {
        return;
      }
      setMarked(enrollment.data().marked);
    },
    [course]
  );

  const getGetEnrollmentCount = useCallback(async () => {
    try {
      const db = getFirestore(getApp());
      const q = query(
        collection(db, "enrollment"),
        where("courseId", "==", course.slug)
      );
      const snapshot = await getCountFromServer(q);
      setEnrollmentCount(snapshot.data().count as any);
    } catch (e) {
      // console.error("Error fetching enrollment count", e)
    }
  }, [course.slug]);

  const enroll = async (course: any) => {
    const attendee = await getCurrentUser();
    if (!attendee) {
      setShowLoginPopup(true);
      return;
    }
    await getEnrollmentDoc({ course, attendee }, true);
    router.push(`/courses/${course.slug}`);
    setEnrolled(true as any);
    logAnalyticsEvent("course_joined", {
      courseSlug: course.slug,
    });
  };

  const enrollUser = async (event: any) => {
    event?.stopPropagation();
    await enroll(course);
  };

  useEffect(() => {
    const auth = getAuth(getApp());
    const sub = auth.onAuthStateChanged((user) => {
      setUser(user as any);
      if (user) {
        getMarked(user);
      } else {
        setMarked({});
        setEnrolled(false as any);
      }
    });
    return () => {
      sub();
    };
  }, [course.slug, getMarked]);

  useEffect(() => {
    logAnalyticsEvent("course_viewed", {
      courseSlug: course.slug,
    });
    getGetEnrollmentCount();
  }, [course.slug, getGetEnrollmentCount]);

  return (
    <>
      <header className="text-center mb-6 font-bold">
        <h1 className="text-5xl">{course.name}</h1>
        <p className="text-center text-xl mb-4">
          {enrollmentCount} student{enrollmentCount !== 1 ? "s" : ""} enrolled
        </p>
        <dl className="flex flex-col my-4 gap-4 items-center">
          {course.duration && (
            <div className="flex items-center gap-4">
              <dt className="text-sm font-medium text-base-content/70">
                Course Duration
              </dt>
              <dd className="text-xs text-base-content/60">
                {course.duration}
              </dd>
            </div>
          )}
        </dl>
        <div className="my-4 post-cover-image banner-img">
          {course.introEmbeddedUrl && (
            <section className="embed-container mb-4">
              <iframe
                src={`${course.introEmbeddedUrl}`}
                title={course.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </section>
          )}
          {!course.introEmbeddedUrl && course.banner && (
            <Image
              width={900}
              height={400}
              style={{ objectFit: "contain" }}
              alt={`${course.name} banner`}
              src={course.banner}
            />
          )}
        </div>
      </header>
      <div className="mb-6">
        <LegitMarkdown>{course.description}</LegitMarkdown>
      </div>
      <div className="mb-6">
        <LegitMarkdown>{course.outline}</LegitMarkdown>
      </div>
      {course?.chapters && (
        <CoursesList
          enrolled={enrolled}
          course={course}
          activePost={null}
          markedPosts={marked}
          enrollUser={enrollUser}
        />
      )}
      {course.resources?.length ? (
        <div className="resources mt-6">
          <ResourcesLinks
            headingClasses="text-center mb-6 font-bold"
            resources={course.resources}
            noHeading={false}
            heading={"Resources"}
          />
        </div>
      ) : null}
      {enrolled && (
        <section>
          <h4 className="my-6 text-center font-bold">Project Submissions</h4>
          {/* @ts-ignore */}
          {/* @ts-ignore */}
          <Link
            href={`/courses/${course.slug}/submissions`}
            className={`flex items-center gap-4 justify-between px-4 py-2 backdrop-blur border border-primary/20 dark:border-primary/30 hover:border-primary/40 dark:hover:border-primary/50 transition-colors rounded-lg shadow-lg cursor-pointer ${
              course.active
                ? "bg-primary text-primary-content dark:bg-primary"
                : "bg-gray-200 dark:bg-gray-800/50"
            }`}
          >
            <span className="break-words text-base-content hover:text-primary dark:hover:text-primary">
              View Submissions
            </span>
          </Link>
        </section>
      )}
      <section className="enrollment my-4" id="enrollmentManagement">
        {enrolled ? (
          <button
            onClick={async () => {
              const attendee = await getCurrentUser();
              const sure = confirm(
                `Are you sure you want to leave the course? This will delete all your progress in the course including any submitted assignments. Also, we hate to see you go :(`
              );
              if (sure) {
                await unEnroll({ course, attendee });
                setMarked({});
                logAnalyticsEvent("course_left", {
                  courseSlug: course.slug,
                });
                setEnrolled(false as any);
              }
            }}
            className="px-4 text-white uppercase hover:bg-red-500 hover:shadow-md rounded-md py-2 w-full bg-red-400 dark:bg-red-500 dark:hover:bg-red-600"
          >
            Leave Course
          </button>
        ) : (
          <Button
            onClick={enrollUser}
            color="primary"
            className="px-4 uppercase mb-0 py-3 w-full border-none rounded-none"
            title="Enroll"
            href={undefined}
          >
            Enroll
          </Button>
        )}
      </section>
      {!enrolled ? (
        <Button
          onClick={enrollUser}
          color="primary"
          className="slide-in-left fixed bottom-20 right-4 shadow-lg text-center uppercase mb-52 py-1   border-none rounded-md"
          title="Enroll"
          href={undefined}
        >
          <span className="mr-2">Enroll</span>{" "}
          <FontAwesomeIcon
            className="animate-bounce"
            icon={faPersonCirclePlus}
          />
        </Button>
      ) : null}
      <div className="flex items-center justify-center pt-4">
        <NewsletterForm />
      </div>
    </>
  );
};

export default CourseDetail;
