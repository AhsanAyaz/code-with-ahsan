import React from 'react'
import styles from '../../hackstack/hackstack.module.css'
const HackStack2023 = () => {
  return (
    <div className="flex flex-col gap-8 mt-8">
      <section className={styles.section}>
        <div className="flex flex-1 flex-col gap-4">
          <h1 className="w-[80%]">HackStack Pakistan 2023</h1>
          <h2 className="text-2xl">Ignite Your Ideas, Create the Future</h2>
          <span className="flex-1"></span>
          <a
            href="#about"
            className="rounded-md bg-red-700 text-white w-max px-3 py-1.5 hover:bg-red-900"
          >
            Read more...
          </a>
        </div>
        <div className="flex-1 flex flex-col gap-4 justify-center">
          <h2>GDG Kolachi Logo</h2>
          <h2>Code with Ahsan Logo</h2>
        </div>
      </section>
      <section id="opportunities" className={`flex gap-8`}>
        <article className={`flex-1 ${styles.section}`}>
          <h3>Connect with mentors</h3>
        </article>
        <article className={`flex-1 ${styles.section}`}>
          <h3>Learn and build with the best tech</h3>
        </article>
      </section>
      <section id="about" className={`${styles.section} flex-col`}>
        <h2 className="text-4xl">What is HackStack Pakistan?</h2>
        <p>
          Welcome to HackStack 2023 - Pakistan's Premier Full Stack Hackathon. Get ready to ignite
          your ideas and create the future. Join us for an exhilarating journey of innovation,
          learning, and camaraderie.
        </p>
      </section>
      <section id="register" className={`${styles.section} flex-col`}>
        <h2 className="text-4xl">Register</h2>
        <p>
          Are you ready to ignite your ideas and create the future? Register now as a team of 2-4.
          Make sure to submit your innovative project idea and how you plan to bring it to life.
          Registration closes on [Date].
        </p>
      </section>
      <section id="rules" className={`${styles.section} flex-col`}>
        <h2 className="text-4xl">Rules and Guidelines</h2>
        <p>TBD</p>
      </section>
      <section id="mentors" className={`${styles.section} flex-col`}>
        <h2 className="text-4xl">Mentors</h2>
        <p>
          Meet our group of esteemed mentors who will be guiding teams throughout the event. They
          are industry experts, seasoned developers, and tech innovators ready to share their
          knowledge and expertise.
          <br />
          (mentor cards below)
        </p>
      </section>
      <section id="sponsors" className={`${styles.section} flex-col`}>
        <h2 className="text-4xl">Sponsors</h2>
        <p>
          We are proud to be supported by our generous sponsors who believe in the power of
          innovation and learning.
          <br />
          (sponsor cards below)
        </p>
      </section>
      <section id="faq" className={`${styles.section} flex-col`}>
        <h2 className="text-4xl">FAQ</h2>
        <p>
          Got questions? We've got answers. Check out our frequently asked questions to get the
          information you need
        </p>
        <ul>
          <li>FAQ 1</li>
          <li>FAQ 2</li>
        </ul>
      </section>
      <section id="contact" className={`${styles.section} flex-col`}>
        <h2 className="text-4xl">Contact Us</h2>
        <p>
          Can't find what you're looking for? Get in touch with us directly. Our team is ready to
          assist you. (contact details TBD)
        </p>
      </section>
    </div>
  )
}

export default HackStack2023
