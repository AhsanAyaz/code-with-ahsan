import { Metadata } from "next";
// @ts-ignore
import siteMetadata from "@/data/siteMetadata";
import Image from "next/image";

export const metadata: Metadata = {
  title: `Mastering Angular Signals by Muhammad Ahsan Ayaz - ${siteMetadata.author}`,
  description:
    "Unlock the power of Angular Signals! A comprehensive guide by Muhammad Ahsan Ayaz covering core concepts, advanced patterns, testing, and migration strategies for building performant and reactive Angular applications.",
};

export default function ModernAngularSignalsBookPage() {
  const bookTitle = "Mastering Angular Signals";
  const authorName = "Muhammad Ahsan Ayaz";
  const authorCreds =
    "GDE in Angular, Speaker, Software Architect, Author of Angular Cookbook";
  const githubRepo = "https://github.com/AhsanAyaz/modern-angular-signals-book";
  const ctaLink = "https://www.amazon.com/dp/B0FF9LSHJN/";
  const ctaText = "Get your copy";

  const ctaButton = () => (
    <div className="not-prose">
      <a
        href={ctaLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center px-6 py-3 border border-transparent !font-medium rounded-md shadow !text-white bg-primary hover:brightness-90 dark:bg-primary dark:hover:brightness-90"
      >
        {ctaText}
      </a>
    </div>
  );

  return (
    <div className="page-padding">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-base-content sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 text-center">
            {bookTitle}
          </h1>
          <p className="text-center text-lg leading-7 text-gray-500 dark:text-gray-400">
            A Practical Guide to Modern Reactivity, Performance, and Migration
          </p>
          <p className="text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
            By {authorName} - {authorCreds}
          </p>
          <div className="flex justify-center mt-6">{ctaButton()}</div>
        </div>

        <div className="prose dark:prose-invert max-w-none pt-8 pb-8">
          <div className="flex flex-col items-center md:flex-row md:items-start md:space-x-8">
            <div className="flex-shrink-0 mb-4 md:mb-0">
              <Image
                src={"/static/images/books/mastering-angular-signals-3d.png"}
                alt={bookTitle}
                width={250}
                height={350}
                className="rounded-md shadow-lg"
              />
            </div>
            <div className="flex-grow">
              <h2>About This Book</h2>
              <p>
                Angular Signals represent a fundamental shift in how we build
                reactive applications. This book is your comprehensive guide to
                mastering this powerful new reactivity model, enabling you to
                build more efficient, maintainable, and performant Angular
                applications.
              </p>
              <p>
                Authored by Muhammad Ahsan Ayaz, a Google Developer Expert in
                Angular and seasoned Software Architect,{" "}
                <em>Mastering Angular Signals</em> distills practical knowledge
                from years of experience working with Angular.
              </p>

              <h3>What You Will Learn</h3>
              <p>
                Journey from the foundational building blocks to advanced
                techniques. This book covers:
              </p>
              <ul>
                <li>
                  The core concepts: <code>signal()</code>,{" "}
                  <code>computed()</code>, and <code>effect()</code>
                </li>
                <li>
                  Managing asynchronous operations with <code>resource()</code>{" "}
                  and <code>rxResource()</code>
                </li>
                <li>
                  Seamless component communication using signal-based{" "}
                  <code>input()</code>, <code>output()</code>, and{" "}
                  <code>model()</code> APIs
                </li>
                <li>Effective strategies for testing your Signal-based code</li>
                <li>
                  Practical techniques for migrating existing RxJS-heavy
                  applications
                </li>
                <li>
                  Performance considerations and architectural best practices
                </li>
              </ul>

              <div className="flex justify-center my-6"> {ctaButton()} </div>

              <h3>Dive into Practical Examples</h3>
              <p>
                Build confidence with hands-on examples demonstrating real-world
                scenarios, including:
              </p>
              <ul>
                <li>Managing component state and user input</li>
                <li>Handling data fetching from APIs</li>
                <li>Building interactive lists with DOM interaction</li>
                <li>Implementing notification panels and shopping carts</li>
              </ul>
              <p>A dedicated code repository is available on GitHub:</p>
              <p>
                <a href={githubRepo} target="_blank" rel="noopener noreferrer">
                  {githubRepo}
                </a>
              </p>

              <div className="flex justify-center my-6"> {ctaButton()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
