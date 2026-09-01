import Navbar from "@/components/shared/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import WhyItsAccurate from "@/components/landing/WhyItsAccurate";
import WhoItsFor from "@/components/landing/WhoItsFor";
import UnlimitedComingSoon from "@/components/landing/UnlimitedComingSoon";
import ContactForm from "@/components/landing/ContactForm";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar user={null} />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <WhyItsAccurate />
        <WhoItsFor />
        <UnlimitedComingSoon />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
