import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Imprint — AwardWatch",
  description: "Legal notice (Impressum) for AwardWatch, pursuant to § 5 TMG / § 18(2) MStV.",
  alternates: { canonical: "/impressum" },
};

export default function ImpressumPage() {
  return (
    <div className="border-t-2 border-ink px-6 pb-24 md:px-10">
      <div className="mx-auto max-w-[820px]">
        <h1 className="mt-14 max-w-3xl font-sans text-[13vw] font-black leading-[0.95] tracking-[-0.03em] text-ink sm:text-6xl md:mt-16 md:text-7xl">
          Imprint
        </h1>

        <p className="mt-8 font-sans text-sm font-bold uppercase tracking-[.04em] text-black/45">
          Information pursuant to § 5 TMG / § 18(2) MStV
        </p>

        <div className="mt-6 font-sans text-lg font-semibold leading-relaxed text-ink md:text-xl">
          <p>Dennis Heß</p>
          <p>Horber Str. 35</p>
          <p>71083 Herrenberg</p>
          <p>Germany</p>
        </div>

        <div className="mt-14 border-t-2 border-ink pt-10">
          <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
            Contact
          </h2>
          <div className="mt-5 font-sans text-base leading-relaxed text-black/70 md:text-lg">
            <p>Phone: 01567 9781277</p>
            <p>
              Email:{" "}
              <a href="mailto:hello@dennishess.de" className="text-ink no-underline">
                hello@dennishess.de
              </a>
            </p>
          </div>
        </div>

        <div className="mt-14 border-t-2 border-ink pt-10">
          <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
            Responsible for content pursuant to § 18(2) MStV
          </h2>
          <p className="mt-5 font-sans text-base leading-relaxed text-black/70 md:text-lg">
            Dennis Heß (address as above)
          </p>
        </div>

        <div className="mt-14 border-t-2 border-ink pt-10">
          <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
            Liability for content
          </h2>
          <p className="mt-5 font-sans text-base leading-relaxed text-black/70 md:text-lg">
            As a service provider, we are responsible for our own content
            on these pages in accordance with general law pursuant to §
            7(1) TMG. However, pursuant to §§ 8 to 10 TMG, we as a service
            provider are not obligated to monitor transmitted or stored
            third-party information or to investigate circumstances that
            indicate illegal activity.
          </p>
        </div>

        <div className="mt-14 border-t-2 border-ink pt-10">
          <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
            Liability for links
          </h2>
          <p className="mt-5 font-sans text-base leading-relaxed text-black/70 md:text-lg">
            Our site contains links to external third-party websites (e.g.
            the official registration pages of listed competitions), the
            content of which is beyond our control. We therefore cannot
            accept any liability for this external content. The respective
            provider or operator of a linked page is always responsible
            for its content.
          </p>
        </div>
      </div>
    </div>
  );
}
