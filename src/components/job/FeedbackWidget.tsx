"use client";

import { useState } from "react";
import Button from "@/components/shared/Button";
import { createClient } from "@/lib/supabase";
import { trackEvent } from "@/lib/posthog";

const roles = [
  "Researcher",
  "PhD Student",
  "Professor",
  "Educator",
  "Course Creator",
  "Other",
];

const fields = [
  "Computer Science",
  "Physics",
  "Mathematics",
  "Biology",
  "Engineering",
  "Other",
];

export default function FeedbackWidget({
  jobId,
  userId,
}: {
  jobId: string;
  userId: string;
}) {
  const supabase = createClient();
  const [role, setRole] = useState("");
  const [field, setField] = useState("");
  const [accurate, setAccurate] = useState("");
  const [clarity, setClarity] = useState("");
  const [animations, setAnimations] = useState("");
  const [improve, setImprove] = useState("");
  const [expectations, setExpectations] = useState("");
  const [useAgain, setUseAgain] = useState("");
  const [volume, setVolume] = useState("");
  const [content, setContent] = useState("");
  const [recommend, setRecommend] = useState("");
  const [extra, setExtra] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const feedbackData = {
      job_id: jobId,
      user_id: userId,
      rating: accurate === "Yes" ? "thumbs_up" : "thumbs_down",
      reason: JSON.stringify({
        role,
        field,
        accurate,
        clarity,
        animations,
        improve,
        expectations,
        use_again: useAgain,
        volume,
        content,
        recommend,
        extra,
      }),
    };

    await supabase.from("feedback").insert(feedbackData);

    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "video_feedback",
        job_id: jobId,
        role,
        field,
        accurate,
        clarity,
        animations,
        improve,
        expectations,
        use_again: useAgain,
        volume,
        content,
        recommend,
        extra,
      }),
    });

    trackEvent("feedback_submitted", { job_id: jobId, accurate });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-gray-200 bg-teal-light p-6 text-center">
        <p className="font-medium text-teal">Thanks for your feedback!</p>
        <p className="mt-1 text-sm text-gray-500">
          This helps us make better videos for you.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-background p-6 space-y-6"
    >
      <h3 className="text-lg font-semibold text-foreground">
        How was this video?
      </h3>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-teal">About you</legend>
        <SelectField
          label="What is your role?"
          value={role}
          onChange={setRole}
          options={roles}
          required
        />
        <SelectField
          label="What field are you in?"
          value={field}
          onChange={setField}
          options={fields}
          required
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-teal">
          About the video
        </legend>
        <SelectField
          label="Did the video accurately represent the content?"
          value={accurate}
          onChange={setAccurate}
          options={["Yes", "Mostly", "No"]}
          required
        />
        <SelectField
          label="Was the explanation clear and easy to follow? (1-5)"
          value={clarity}
          onChange={setClarity}
          options={["1", "2", "3", "4", "5"]}
        />
        <SelectField
          label="Were the animations helpful for understanding? (1-5)"
          value={animations}
          onChange={setAnimations}
          options={["1", "2", "3", "4", "5"]}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">
            What could be improved about the video?
          </label>
          <textarea
            value={improve}
            onChange={(e) => setImprove(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-foreground placeholder:text-gray-300 focus:border-teal focus:outline-none"
          />
        </div>
        <SelectField
          label="Did it meet your expectations?"
          value={expectations}
          onChange={setExpectations}
          options={["Exceeded", "Met", "Below"]}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-teal">
          About future use
        </legend>
        <SelectField
          label="Would you use stemvid.ai again?"
          value={useAgain}
          onChange={setUseAgain}
          options={["Definitely", "Probably", "Probably not", "No"]}
        />
        <SelectField
          label="How many videos do you plan to create per month?"
          value={volume}
          onChange={setVolume}
          options={["1-2", "3-5", "6-10", "10+"]}
        />
        <SelectField
          label="What content would you most want to create?"
          value={content}
          onChange={setContent}
          options={[
            "Research papers",
            "Textbook chapters",
            "Lecture notes",
            "Other",
          ]}
        />
        <SelectField
          label="Would you recommend stemvid.ai to a colleague?"
          value={recommend}
          onChange={setRecommend}
          options={["Yes", "Maybe", "No"]}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-teal">
          Open feedback
        </legend>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Anything else you&apos;d like to tell us?
          </label>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-foreground placeholder:text-gray-300 focus:border-teal focus:outline-none"
          />
        </div>
      </fieldset>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Submitting..." : "Submit feedback"}
      </Button>
    </form>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
