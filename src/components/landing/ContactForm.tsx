"use client";

import { useState } from "react";
import Button from "@/components/shared/Button";
import Modal from "@/components/shared/Modal";
import { trackEvent } from "@/lib/posthog";

export default function ContactForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, type, message }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Failed to send message. Please try again.");
      return;
    }
    trackEvent("contact_form_submitted");
    setSubmitted(true);
  }

  function handleClose() {
    setOpen(false);
    // Reset once the modal is fully closed, not immediately -- resetting
    // submitted before the close animation finishes would flash the form
    // back in behind the fading success message.
    setTimeout(() => {
      setSubmitted(false);
      setName("");
      setEmail("");
      setType("general");
      setMessage("");
      setError("");
    }, 200);
  }

  return (
    <section id="contact" className="px-6 py-20">
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal">
          Looking for beta testers
        </p>
        <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
          We&apos;d love to hear from you
        </h2>
        <p className="mt-3 text-gray-500">
          Try stemvid.ai and tell us what&apos;s working or not. Beta testers
          get extra free videos in exchange for feedback.
        </p>
        <Button className="mt-6" onClick={() => setOpen(true)}>
          Get in touch
        </Button>
      </div>

      <Modal open={open} onClose={handleClose}>
        {submitted ? (
          <div className="text-center">
            <h3 className="text-xl font-bold text-foreground">Message sent!</h3>
            <p className="mt-3 text-gray-500">We&apos;ll get back to you shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <h3 className="text-lg font-bold text-foreground">Get in touch</h3>

            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-gray-700"
              >
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="contact-type"
                className="block text-sm font-medium text-gray-700"
              >
                What&apos;s this about?
              </label>
              <select
                id="contact-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
              >
                <option value="general">General enquiry</option>
                <option value="more_videos">I need more videos</option>
                <option value="pro_early_access">Pro early access</option>
                <option value="enterprise">Enterprise</option>
                <option value="bug">Report an issue</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="block text-sm font-medium text-gray-700"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send message"}
            </Button>
          </form>
        )}
      </Modal>
    </section>
  );
}
