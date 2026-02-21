import siteMetadata from "@/data/siteMetadata";
// @ts-ignore
import { PageSEO } from "@/components/SEO";
// import axios from 'axios'
// @ts-ignore
import CourseCard from "@/components/courses/CourseCard";
// import qs from 'qs'
// @ts-ignore
import Course from "@/classes/Course.class";
import CoursesList from "./CoursesList";
// import { getApp } from 'firebase/app'
// import { getAuth } from 'firebase/auth'
// import { useContext, useEffect, useState } from 'react'
// import { getCurrentUser } from '../../services/AuthService'
// import { getEnrollmentDoc } from '../../services/EnrollmentService'
// import { useRouter } from 'next/router'
// import { AuthContext } from 'contexts/AuthContext'

async function getCourses() {
  const strapiUrl = process.env.STRAPI_URL;
  const strapiAPIKey = process.env.STRAPI_API_KEY;

  if (!strapiUrl) return [];

  // Updated query structure for Strapi v5
  // Note: We'll construct the query manually or use qs if we verify it works in server components without issues
  // Use simple query string for now
  const query =
    "populate[0]=banner&populate[1]=authors&populate[2]=chapters&sort[0]=visibilityOrder:desc&filters[publishedAt][$notNull]=true";

  const url = `${strapiUrl}/api/courses?${query}`;

  try {
    // Verify if we can just return mock data if envs are missing in this environment
    if (!strapiAPIKey) {
      console.warn("Missing STRAPI_API_KEY, returning empty courses");
      return [];
    }

    const coursesResp = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${strapiAPIKey}`,
      },
      next: { revalidate: 60 },
    });

    if (!coursesResp.ok) {
      throw new Error("Failed to fetch courses");
    }

    const respData = await coursesResp.json();
    return respData.data.map((course: any) => new Course(course));
  } catch (err) {
    console.error("Error fetching courses:", err);
    return [];
  }
}

export const metadata = {
  title: `Courses - ${siteMetadata.title}`,
  description:
    "Browse comprehensive courses and tutorials to master web development and programming.",
  openGraph: {
    title: `Courses - ${siteMetadata.title}`,
    description:
      "Browse comprehensive courses and tutorials to master web development and programming.",
    images: ["/images/courses-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `Courses - ${siteMetadata.title}`,
    description:
      "Browse comprehensive courses and tutorials to master web development and programming.",
    images: ["/images/courses-og.png"],
  },
};

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <div className="page-padding">
      <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-base-content sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 text-center mt-4 mb-4 md:mb-8">
        Courses
      </h1>
      <CoursesList coursesStr={JSON.stringify(courses)} />
    </div>
  );
}
