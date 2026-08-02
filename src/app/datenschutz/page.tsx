import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — AwardWatch",
  description: "Privacy policy (Datenschutzerklärung) for AwardWatch, pursuant to Art. 13 GDPR.",
  alternates: { canonical: "/datenschutz" },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-14 border-t-2 border-ink pt-10">
      <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
        {title}
      </h2>
      <div className="mt-5 font-sans text-base leading-relaxed text-black/70 md:text-lg">
        {children}
      </div>
    </div>
  );
}

export default function DatenschutzPage() {
  return (
    <div className="border-t-2 border-ink px-6 pb-24 md:px-10">
      <div className="mx-auto max-w-[820px]">
        <h1 className="mt-14 max-w-3xl font-sans text-[13vw] font-black leading-[0.95] tracking-[-0.03em] text-ink sm:text-6xl md:mt-16 md:text-7xl">
          Privacy Policy
        </h1>

        <p className="mt-8 font-sans text-sm font-bold uppercase tracking-[.04em] text-black/45">
          Information pursuant to Art. 13 GDPR
        </p>

        <Section title="Controller">
          <p>Dennis Heß</p>
          <p>Horber Str. 35</p>
          <p>71083 Herrenberg</p>
          <p>Germany</p>
          <p className="mt-4">
            Email:{" "}
            <a href="mailto:hello@dennishess.de" className="text-ink no-underline">
              hello@dennishess.de
            </a>
          </p>
        </Section>

        <Section title="Overview">
          <p>
            AwardWatch is a directory of design competition deadlines. This
            policy explains what data is processed when you visit the site,
            and on what legal basis, in line with the EU General Data
            Protection Regulation (GDPR) and the German Telecommunications
            and Telemedia Data Protection Act (TTDSG).
          </p>
          <p className="mt-4">
            AwardWatch does not use cookies, does not require a login, and
            does not run advertising or third-party tracking scripts.
          </p>
        </Section>

        <Section title="Hosting (Vercel)">
          <p>
            This site is hosted by Vercel Inc., 340 S Lemon Ave #4133,
            Walnut, CA 91789, USA. When you visit the site, Vercel&apos;s
            infrastructure automatically processes technical data in server
            logs — such as IP address, browser type, referring page, and
            timestamp — to deliver the site and keep it secure. This
            processing is necessary for the operation of the site (Art.
            6(1)(f) GDPR, legitimate interest in stable and secure
            delivery). Where data is transferred to the US, Vercel commits
            to the EU Standard Contractual Clauses as a transfer safeguard.
          </p>
        </Section>

        <Section title="Analytics">
          <p>
            AwardWatch uses Vercel Web Analytics to understand aggregate
            traffic (e.g. page views). This service is cookie-free: visitors
            are identified only via a hash derived from the incoming
            request, no persistent or cross-site identifier is stored, and
            the underlying session data is discarded after 24 hours. No
            personal profile is built and no data is shared with third
            parties for advertising. Because no cookies or comparable
            storage are used, this does not require your consent under §
            25 TTDSG; it is processed on the basis of our legitimate
            interest in understanding site usage (Art. 6(1)(f) GDPR).
          </p>
          <p className="mt-4">
            You can opt out of analytics on this device by visiting the
            site with <code>?va=off</code> appended to the URL; this
            preference is stored only in your browser&apos;s local storage
            and is never transmitted to us.
          </p>
        </Section>

        <Section title="Fonts">
          <p>
            Typefaces are self-hosted: font files are bundled with the site
            at build time and served from this domain. No request is made
            to Google Fonts or any other font provider at runtime, so no
            data about your visit is shared with a font provider.
          </p>
        </Section>

        <Section title="Links to third-party sites">
          <p>
            Competition listings link to the official registration pages of
            third-party organizers. Once you follow such a link, that
            site&apos;s own privacy policy applies; we have no control over
            and no responsibility for their data processing.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under the GDPR you have the right to request access to,
            rectification, or erasure of your personal data, to restrict or
            object to its processing, and to data portability. Since this
            site does not collect personal data beyond anonymized,
            aggregated analytics and standard hosting logs, there is
            typically nothing tied to you individually to access or erase —
            but you&apos;re welcome to reach out with any question at{" "}
            <a href="mailto:hello@dennishess.de" className="text-ink no-underline">
              hello@dennishess.de
            </a>
            . You also have the right to lodge a complaint with a data
            protection supervisory authority, in particular in the German
            state where you reside, work, or where the alleged infringement
            occurred.
          </p>
        </Section>
      </div>
    </div>
  );
}
