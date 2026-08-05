import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "stemvid.ai — Beta Terms of Service",
};

export default function TermsPage() {
  return (
    <>
      <Navbar user={null} />
      <main className="mx-auto max-w-3xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground">
          Beta Terms of Service
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: August 5, 2026 &middot; Effective for the Beta period
          only
        </p>

        <p className="mt-8 text-gray-700">
          stemvid.ai (&ldquo;stemvid.ai,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us&rdquo;) is currently offered as a free, experimental Beta
          service that converts user-supplied research papers, textbook
          chapters, and other text into animated STEM explainer videos. By
          creating an account or using the Service, you (&ldquo;you&rdquo; or
          &ldquo;User&rdquo;) agree to these Beta Terms of Service
          (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service.
        </p>

        <Section title="1. Beta Status">
          <ul>
            <li>
              The Service is an early-stage Beta. Features, availability,
              output quality, and pricing may change or be discontinued at any
              time without notice.
            </li>
            <li>
              We make no guarantee of uptime, accuracy, or continued
              availability of the Service or of any content you generate or
              store through it.
            </li>
            <li>
              We may suspend or terminate your access to the Beta at our sole
              discretion, at any time, for any reason.
            </li>
          </ul>
        </Section>

        <Section title="2. Your Source Material">
          <ul>
            <li>
              You retain all ownership rights in any text, paper, or document
              you upload or submit to the Service (&ldquo;Source
              Material&rdquo;).
            </li>
            <li>
              You represent and warrant that you own the Source Material, or
              that you have the legal right to use it &mdash; including under
              an applicable open license (e.g., CC-BY) or a good-faith fair
              use basis &mdash; for the purpose of generating a video from it.
            </li>
            <li>
              You are solely responsible for confirming you have the
              necessary rights before submitting any Source Material.
              stemvid.ai does not review Source Material for copyright status
              before processing it.
            </li>
            <li>
              You grant stemvid.ai a limited, non-exclusive license to store,
              process, and transmit your Source Material solely to operate and
              provide the Service to you.
            </li>
          </ul>
        </Section>

        <Section title="3. Generated Output">
          <ul>
            <li>
              You own the video and other output generated from your Source
              Material (&ldquo;Output&rdquo;), subject to the rights of any
              underlying Source Material you did not author yourself.
            </li>
            <li>
              You are solely responsible for how you use, publish, or
              distribute your Output, and for ensuring that doing so does not
              infringe any third party&apos;s rights.
            </li>
            <li>
              Output may include an embedded &ldquo;Created by
              stemvid.ai&rdquo; attribution mark. This mark identifies the
              tool used to generate the video; it is not an endorsement,
              verification, or guarantee of the Output&apos;s accuracy or
              fitness for any purpose.
            </li>
            <li>
              Output is AI-generated and may contain errors, omissions, or
              inaccuracies. Do not rely on Output as an authoritative
              substitute for the original Source Material, especially for
              technical, scientific, or educational accuracy.
            </li>
          </ul>
        </Section>

        <Section title="4. Prohibited Uses">
          <p>You agree not to use the Service to:</p>
          <ul>
            <li>Upload or process Source Material you do not have the rights to use;</li>
            <li>
              Generate content that is unlawful, defamatory, harassing, or
              that infringes the intellectual property or privacy rights of
              any third party;
            </li>
            <li>
              Attempt to reverse-engineer, scrape, or overload the Service in
              a way that disrupts it for other users;
            </li>
            <li>
              Use the Service to generate deliberately false or misleading
              educational content.
            </li>
          </ul>
        </Section>

        <Section title="5. Copyright Complaints">
          <p>
            If you believe Output generated through the Service infringes
            your copyright,{" "}
            <Link href="/#contact" className="text-teal hover:underline">
              contact us
            </Link>{" "}
            with a description of the work, the allegedly infringing
            material, and your contact information. We will review and may
            remove content and/or terminate the accounts of repeat infringers
            at our discretion.
          </p>
        </Section>

        <Section title="6. No Warranty">
          <p className="uppercase">
            The Service and all Output are provided &ldquo;as is&rdquo; and
            &ldquo;as available,&rdquo; without warranties of any kind,
            express or implied, including warranties of merchantability,
            fitness for a particular purpose, accuracy, or non-infringement.
          </p>
        </Section>

        <Section title="7. Limitation of Liability">
          <p className="uppercase">
            To the maximum extent permitted by law, stemvid.ai and its
            operator shall not be liable for any indirect, incidental,
            special, or consequential damages arising from your use of the
            Service. Because the Service is currently offered free of charge,
            our total liability to you for any claim arising from the Service
            shall not exceed $0.
          </p>
        </Section>

        <Section title="8. Indemnification">
          <p>
            You agree to indemnify and hold stemvid.ai harmless from any
            claims, damages, or expenses (including reasonable legal fees)
            arising from: (a) Source Material you submit; (b) your use or
            distribution of Output; or (c) your violation of these Terms.
          </p>
        </Section>

        <Section title="9. Age Requirement">
          <p>
            You must be at least 18 years old, or the age of majority in your
            jurisdiction, to create an account and use the Service. The
            Service is not directed at children, even though generated Output
            may be educational content suitable for younger audiences when
            used by a parent, teacher, or guardian.
          </p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>
            Because this is a Beta product, we may update these Terms as the
            Service evolves. We will make reasonable efforts to notify active
            users of material changes. Continued use of the Service after
            changes take effect constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="11. Termination">
          <p>
            You may stop using the Service at any time. We may suspend or
            terminate your account at any time, with or without notice,
            particularly during the Beta period.
          </p>
        </Section>

        <Section title="12. Governing Law">
          <p>
            These Terms are governed by the laws of the State of California,
            United States, without regard to conflict-of-law principles.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            Questions about these Terms? Reach us through our{" "}
            <Link href="/#contact" className="text-teal hover:underline">
              contact page
            </Link>
            .
          </p>
        </Section>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
