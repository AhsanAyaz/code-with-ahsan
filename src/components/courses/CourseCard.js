"use client";
import React, { useCallback, useEffect, useState } from "react";
import LegitMarkdown from "../LegitMarkdown";
import Image from "next/image";

import {
  getFirestore,
  query,
  collection,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getIsEnrolled } from "@/services/EnrollmentService";
import Button from "../Button";
import { useRouter } from "next/navigation";

// const db = getFirestore(getApp())

const CourseCard = ({ course, enrollHandler, user }) => {
  const { banner } = course;
  const [enrolled, setEnrolled] = useState(null);
  const [enrollmentCount, setEnrollmentCount] = useState(null);
  const router = useRouter();
  const getEnrollment = useCallback(async () => {
    const enrolled = await getIsEnrolled(course.slug, user.uid);
    setEnrolled(enrolled);
  }, [user, course.slug]);

  const getGetEnrollmentCount = useCallback(async () => {
    const db = getFirestore(getApp());
    const q = query(
      collection(db, "enrollment"),
      where("courseId", "==", course.slug)
    );
    const snapshot = await getCountFromServer(q);
    setEnrollmentCount(snapshot.data().count);
  }, [course.slug]);

  useEffect(() => {
    if (user) {
      getEnrollment();
    } else if (enrolled) {
      setEnrolled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, getEnrollment]);

  useEffect(() => {
    getGetEnrollmentCount();
  }, [getGetEnrollmentCount]);

  async function spaNavigate(link, e) {
    const coverImage = e.currentTarget.querySelector("img");
    // @ts-ignore
    if (!document.startViewTransition || !coverImage) {
      router.push(link);
      return;
    }
    coverImage.style.viewTransitionName = "banner-img";

    const x = e?.clientX ?? innerWidth / 2;
    const y = e?.clientY ?? innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );

    // @ts-ignore
    const transition = document.startViewTransition(async () => {
      await router.push(link);
      coverImage.style.viewTransitionName = "";
    });

    await transition.ready;
  }

  return (
    <article
      aria-hidden={true}
      onClick={(e) => {
        if (course.isExternal) {
          e.stopPropagation();
          window.open(course.externalCourseUrl, "_blank");
          return;
        }
        spaNavigate(`/courses/${course.slug}`, e);
      }}
    >
      <div className="block p-4 overflow-hidden border transition ease-in-out duration-150 border-gray-600 rounded-md shadow-md relative hover:-translate-y-1 hover:shadow-lg">
        <span className="absolute inset-x-0 bottom-0 h-2  bg-gradient-to-r from-emerald-300 via-blue-500 to-primary-600"></span>
        {banner && (
          <div className="mb-4">
            <Image
              width={900}
              height={400}
              src={banner}
              style={{ objectFit: "cover" }}
              alt={`${course.name} banner`}
            />
          </div>
        )}
        <h5 className="text-base lg:text-2xl mb-4 line-clamp-1 text-center font-bold text-base-content">
          {course.name}
        </h5>
        <div className="text-sm text-center lg:text-base line-clamp-3 text-ellipsis">
          <LegitMarkdown>{course.outline || course.description}</LegitMarkdown>
        </div>
        <p className="text-center mt-4 mb-8">
          {!course.isExternal ? (
            <span>
              {enrollmentCount !== null
                ? `${enrollmentCount} students enrolled`
                : "..."}
            </span>
          ) : course.externalStudentsCount !== null ? (
            <span>{course.externalStudentsCount} students enrolled</span>
          ) : (
            <span>&nbsp;</span>
          )}
        </p>
        <Button
          onClick={(event) => {
            if (course.isExternal) {
              event.stopPropagation();
              window.open(course.externalCourseUrl, "_blank");
              return;
            }
            if (enrolled) {
              return;
            }
            event.stopPropagation();
            enrollHandler(course);
          }}
          color="primary"
          className="px-4 uppercase mb-6 py-3 w-full border-none rounded-none"
        >
          {enrolled ? "Continue" : "Enroll"}
        </Button>
      </div>
    </article>
  );
};

export default CourseCard;
