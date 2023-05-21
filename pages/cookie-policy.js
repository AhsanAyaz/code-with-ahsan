import siteMetadata from '@/data/siteMetadata'
import { PageSEO } from '@/components/SEO'

export default function CookiePolicy() {
  return (
    <>
      <PageSEO
        title={`Cookie Policy - ${siteMetadata.title}`}
        description={siteMetadata.description}
      />
      <h1>Cookie policy</h1>
      <p>
        This cookie policy (&#8220;Policy&#8221;) describes what cookies are and how and
        they&#8217;re being used by the <a href="https://codewithahsan.dev">codewithahsan.dev</a>{' '}
        website (&#8220;Website&#8221; or &#8220;Service&#8221;) and any of its related products and
        services (collectively, &#8220;Services&#8221;). This Policy is a legally binding agreement
        between you (&#8220;User&#8221;, &#8220;you&#8221; or &#8220;your&#8221;) and this Website
        operator (&#8220;Operator&#8221;, &#8220;we&#8221;, &#8220;us&#8221; or &#8220;our&#8221;).
        If you are entering into this agreement on behalf of a business or other legal entity, you
        represent that you have the authority to bind such entity to this agreement, in which case
        the terms &#8220;User&#8221;, &#8220;you&#8221; or &#8220;your&#8221; shall refer to such
        entity. If you do not have such authority, or if you do not agree with the terms of this
        agreement, you must not accept this agreement and may not access and use the Website and
        Services. You should read this Policy so you can understand the types of cookies we use, the
        information we collect using cookies and how that information is used. It also describes the
        choices available to you regarding accepting or declining the use of cookies.
      </p>
      <div className="wpembed-toc">
        <h3>Table of contents</h3>
        <ol className="wpembed-toc">
          <li>
            <a href="#what-are-cookies">What are cookies?</a>
          </li>
          <li>
            <a href="#what-type-of-cookies-do-we-use">What type of cookies do we use?</a>
          </li>
          <li>
            <a href="#changes-and-amendments">Changes and amendments</a>
          </li>
          <li>
            <a href="#acceptance-of-this-policy">Acceptance of this policy</a>
          </li>
          <li>
            <a href="#contacting-us">Contacting us</a>
          </li>
        </ol>
      </div>
      <h2 id="what-are-cookies">What are cookies?</h2>
      <p>
        Cookies are small pieces of data stored in text files that are saved on your computer or
        other devices when websites are loaded in a browser. They are widely used to remember you
        and your preferences, either for a single visit (through a &#8220;session cookie&#8221;) or
        for multiple repeat visits (using a &#8220;persistent cookie&#8221;).
      </p>
      <p>
        Session cookies are temporary cookies that are used during the course of your visit to the
        Website, and they expire when you close the web browser.
      </p>
      <p>
        Persistent cookies are used to remember your preferences within our Website and remain on
        your desktop or mobile device even after you close your browser or restart your computer.
        They ensure a consistent and efficient experience for you while visiting the Website and
        Services.
      </p>
      <p>
        Cookies may be set by the Website (&#8220;first-party cookies&#8221;), or by third parties,
        such as those who serve content or provide advertising or analytics services on the Website
        (&#8220;third party cookies&#8221;). These third parties can recognize you when you visit
        our website and also when you visit certain other websites.
      </p>
      <h2 id="what-type-of-cookies-do-we-use">What type of cookies do we use?</h2>
      <p>
        We do not use cookies to track your internet or Website usage, to collect or store your
        personal information or for any other reason. However, please be advised that in some
        countries, data such as cookie IDs is considered to be personal information. To the extent
        we process such data that is considered personal information, we will process the data in
        accordance with our privacy and cookie policies.
      </p>
      <h2 id="changes-and-amendments">Changes and amendments</h2>
      <p>
        We reserve the right to modify this Policy or its terms related to the Website and Services
        at any time at our discretion. When we do, we will revise the updated date at the bottom of
        this page. We may also provide notice to you in other ways at our discretion, such as
        through the contact information you have provided.
      </p>
      <p>
        An updated version of this Policy will be effective immediately upon the posting of the
        revised Policy unless otherwise specified. Your continued use of the Website and Services
        after the effective date of the revised Policy (or such other act specified at that time)
        will constitute your consent to those changes.
      </p>
      <h2 id="acceptance-of-this-policy">Acceptance of this policy</h2>
      <p>
        You acknowledge that you have read this Policy and agree to all its terms and conditions. By
        accessing and using the Website and Services you agree to be bound by this Policy. If you do
        not agree to abide by the terms of this Policy, you are not authorized to access or use the
        Website and Services. This cookie policy was created with the help of{' '}
        <a
          href="https://www.websitepolicies.com/cookie-policy-generator"
          target="_blank"
          rel="noreferrer"
        >
          WebsitePolicies
        </a>
        .
      </p>
      <h2 id="contacting-us">Contacting us</h2>
      <p>
        If you have any questions, concerns, or complaints regarding this Policy or the use of
        cookies, we encourage you to contact us using the details below:
      </p>
      <p>
        <a href="&#109;&#097;&#105;&#108;&#116;&#111;&#058;ah&#115;&#97;n.u&#98;&#105;tian&#64;gmai&#108;&#46;&#99;&#111;&#109;">
          &#97;&#104;&#115;&#97;&#110;&#46;ub&#105;t&#105;a&#110;&#64;&#103;&#109;&#97;&#105;&#108;&#46;&#99;om
        </a>
      </p>
      <p>This document was last updated on May 21, 2023</p>
      <p className="madewith">
        <a
          href="https://www.websitepolicies.com/cookie-policy-generator?via=madewithbadge"
          target="_blank"
          rel="noreferrer"
        >
          <img
            width="200"
            height="25"
            alt="Made with WebsitePolicies cookie policy generator"
            src="https://cdn.websitepolicies.io/img/badge.png"
            srcSet="https://cdn.websitepolicies.io/img/badge_2x.png 2x"
          />
        </a>
      </p>
      Copy to clipboard
    </>
  )
}
