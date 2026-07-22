import { render, screen } from "@testing-library/react";
import CourseCard from "@/components/dashboard/CourseCard";
import type { Course } from "@/types";

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

const baseCourse: Course = {
  id: "course-123",
  user_id: "user-1",
  title: "Introduction to Algorithms",
  pdf_url: "https://example.com/book.pdf",
  status: "structure_ready",
  course_structure: {
    course_title: "Introduction to Algorithms",
    book: "Introduction to Algorithms",
    total_videos: 20,
    videos: [],
  },
  total_videos: 20,
  completed_videos: 3,
  current_video_index: 4,
  error_message: null,
  created_at: "2026-06-20T10:00:00Z",
};

describe("CourseCard", () => {
  it("renders course title", () => {
    render(<CourseCard course={baseCourse} />);
    expect(screen.getByText("Introduction to Algorithms")).toBeInTheDocument();
  });

  it("shows progress as completed/total videos", () => {
    render(<CourseCard course={baseCourse} />);
    expect(screen.getByText("3/20 videos")).toBeInTheDocument();
  });

  it("shows 'Planning course...' before the curriculum exists", () => {
    render(
      <CourseCard
        course={{
          ...baseCourse,
          status: "building_structure",
          course_structure: null,
          total_videos: null,
        }}
      />
    );
    expect(screen.getByText("Planning course...")).toBeInTheDocument();
  });

  it("shows the status label", () => {
    render(<CourseCard course={{ ...baseCourse, status: "complete" }} />);
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("links to the course page", () => {
    render(<CourseCard course={baseCourse} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/course/course-123");
  });

  it("shows Untitled course when title is empty", () => {
    render(<CourseCard course={{ ...baseCourse, title: "" }} />);
    expect(screen.getByText("Untitled course")).toBeInTheDocument();
  });
});

const basePaper: Course = {
  ...baseCourse,
  title: "Dremel: Interactive Analysis of Web-Scale Datasets",
  source_type: "paper",
  course_structure: {
    paper_title: "Dremel: Interactive Analysis of Web-Scale Datasets",
    total_concepts: 4,
    total_parts: 2,
    parts: [],
  },
  total_videos: 2,
  completed_videos: 1,
};

describe("CourseCard — papers", () => {
  it("shows progress as completed/total parts, not videos", () => {
    render(<CourseCard course={basePaper} />);
    expect(screen.getByText("1/2 parts")).toBeInTheDocument();
  });

  it("shows 'Planning paper...' before the structure exists", () => {
    render(
      <CourseCard
        course={{
          ...basePaper,
          status: "building_structure",
          course_structure: null,
          total_videos: null,
          completed_videos: null,
        }}
      />
    );
    expect(screen.getByText("Planning paper...")).toBeInTheDocument();
  });

  it("shows 'Planning paper' as the status badge while building structure", () => {
    render(<CourseCard course={{ ...basePaper, status: "building_structure" }} />);
    expect(screen.getByText("Planning paper")).toBeInTheDocument();
  });

  it("does not use book wording for a paper", () => {
    render(
      <CourseCard
        course={{
          ...basePaper,
          status: "building_structure",
          course_structure: null,
          total_videos: null,
          completed_videos: null,
        }}
      />
    );
    expect(screen.queryByText("Planning course...")).not.toBeInTheDocument();
  });
});
