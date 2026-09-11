import { render, screen } from "@testing-library/react";
import PaperRow from "@/components/dashboard/PaperRow";
import type { Job } from "@/types";

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

const baseJob: Job = {
  id: "test-123",
  user_id: "user-1",
  title: "Attention Is All You Need",
  pdf_url: "https://example.com/paper.pdf",
  status: "ready",
  video_url: "https://example.com/video.mp4",
  created_at: "2026-06-20T10:00:00Z",
  completed_at: "2026-06-20T10:12:00Z",
  regen_log: null,
};

describe("PaperRow", () => {
  it("renders the job title", () => {
    render(<PaperRow job={baseJob} />);
    expect(screen.getByText("Attention Is All You Need")).toBeInTheDocument();
  });

  it("links to the job page", () => {
    render(<PaperRow job={baseJob} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/job/test-123");
  });

  it("shows Untitled video when title is empty", () => {
    render(<PaperRow job={{ ...baseJob, title: "" }} />);
    expect(screen.getByText("Untitled video")).toBeInTheDocument();
  });

  it("shows a Ready pill for finished jobs", () => {
    render(<PaperRow job={baseJob} />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows a Ready to review pill while reviewing", () => {
    render(<PaperRow job={{ ...baseJob, status: "reviewing" }} />);
    expect(screen.getByText("Ready to review")).toBeInTheDocument();
  });

  it("collapses every earlier pipeline stage into a single Processing pill", () => {
    for (const status of [
      "queued",
      "generating_script",
      "generating_audio",
      "creating_animations",
      "rendering",
    ] as const) {
      const { unmount } = render(<PaperRow job={{ ...baseJob, status }} />);
      expect(screen.getByText("Processing")).toBeInTheDocument();
      unmount();
    }
  });

  it("shows a Failed pill for failed jobs", () => {
    render(<PaperRow job={{ ...baseJob, status: "failed" }} />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });
});
