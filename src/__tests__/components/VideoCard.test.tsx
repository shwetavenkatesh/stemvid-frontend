import { render, screen } from "@testing-library/react";
import VideoCard from "@/components/dashboard/VideoCard";
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

describe("VideoCard", () => {
  it("renders job title", () => {
    render(<VideoCard job={baseJob} />);
    expect(screen.getByText("Attention Is All You Need")).toBeInTheDocument();
  });

  it("shows Ready status for completed jobs", () => {
    render(<VideoCard job={baseJob} />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows Processing status for in-progress jobs", () => {
    render(<VideoCard job={{ ...baseJob, status: "rendering" }} />);
    expect(screen.getByText("Rendering")).toBeInTheDocument();
  });

  it("links to the job page", () => {
    render(<VideoCard job={baseJob} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/job/test-123");
  });

  it("shows Untitled video when title is empty", () => {
    render(<VideoCard job={{ ...baseJob, title: "" }} />);
    expect(screen.getByText("Untitled video")).toBeInTheDocument();
  });

  it("shows Video ready text for completed jobs", () => {
    render(<VideoCard job={baseJob} />);
    expect(screen.getByText("Video ready")).toBeInTheDocument();
  });

  it("shows Processing text for in-progress jobs", () => {
    render(<VideoCard job={{ ...baseJob, status: "queued" }} />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });
});
