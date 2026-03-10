import { Metadata } from "next";
import { getCourses } from "@/lib/content/contentProvider";
import PortfolioBio from "@/components/portfolio/PortfolioBio";
import BooksSection from "@/components/portfolio/BooksSection";
import CoursesSection from "@/components/portfolio/CoursesSection";
import OpenSourceSection from "@/components/portfolio/OpenSourceSection";
import WorkHistorySection from "@/components/portfolio/WorkHistorySection";
import TestimonialsSection from "@/components/portfolio/TestimonialsSection";
import ContactSection from "@/components/portfolio/ContactSection";
import SocialLinksSection from "@/components/portfolio/SocialLinksSection";

export const metadata: Metadata = {
  title: "About Muhammad Ahsan Ayaz - Software Architect, GDE, Author",
  description:
    "Software Architect at Scania, Google Developer Expert in AI & Angular, author of 4 books, and founder of Code With Ahsan community.",
};

export default async function About() {
  const courses = await getCourses();

  return (
    <>
      {/* 1. Bio / hero */}
      <PortfolioBio />

      {/* 2. Published books */}
      <BooksSection />

      {/* 3. Courses */}
      <CoursesSection courses={courses} />

      {/* 4. Open source */}
      <OpenSourceSection />

      {/* 5. Work history */}
      <WorkHistorySection />

      {/* 6. Testimonials */}
      <TestimonialsSection />

      {/* 7. Contact / hire */}
      <ContactSection />

      {/* 8. Social links with follower counts */}
      <SocialLinksSection />
    </>
  );
}
