"use client";
import { PageSEO } from "@/components/SEO";

export default function SimpleLayout({
  children,
  title,
  description,
  SideBarContent,
}) {
  return (
    <>
      <PageSEO title={title} description={description} />
      <div className="divide-y">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-base-content sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            {title}
          </h1>
        </div>
        <div className="items-start space-y-2 xl:grid xl:grid-cols-3 xl:gap-x-8 xl:space-y-0">
          {SideBarContent && (
            <div className="flex flex-col items-center pt-8 space-x-2">
              <SideBarContent />
            </div>
          )}
          <div className="pt-8 pb-8 prose dark:prose-invert max-w-none xl:col-span-2">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
