import Navbar from "@/components/shared/Navbar";
import Hero from "@/components/landing/Hero";
import DemoVideos from "@/components/landing/DemoVideos";
import HowItWorks from "@/components/landing/HowItWorks";
import WhyItsAccurate from "@/components/landing/WhyItsAccurate";
import WhoItsFor from "@/components/landing/WhoItsFor";
import ContactForm from "@/components/landing/ContactForm";
import EarlyAccess from "@/components/landing/EarlyAccess";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar user={null} />
      <main className="flex-1">
        <Hero />
        <DemoVideos />
        <HowItWorks />
        <WhyItsAccurate />
        <WhoItsFor />
        <ContactForm />
        <EarlyAccess />
      </main>
      <Footer />
    </>
  );
}
