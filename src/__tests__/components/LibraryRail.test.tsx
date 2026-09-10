import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LibraryRail from "@/components/dashboard/LibraryRail";
import type { Job, Course } from "@/types";

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

let mockParams: { id?: string } = {};
jest.mock("next/navigation", () => ({
  useParams: () => mockParams,
}));

let mockJobs: Job[] = [];
let mockCourses: Course[] = [];

jest.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1", email: "u@example.com" } } }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: table === "jobs" ? mockJobs : mockCourses,
          }),
        }),
      }),
    }),
    channel: () => {
      const chainable = {
        on: () => chainable,
        subscribe: () => chainable,
      };
      return chainable;
    },
    removeChannel: () => {},
  }),
}));

const standaloneJob: Job = {
  id: "job-standalone",
  user_id: "user-1",
  title: "GFS: The Google File System",
  pdf_url: "https://example.com/gfs.pdf",
  status: "ready",
  video_url: null,
  created_at: "2026-09-01T00:00:00Z",
  completed_at: null,
  regen_log: null,
  course_id: null,
};

const paperCourse: Course = {
  id: "course-dremel",
  user_id: "user-1",
  title: "Dremel",
  pdf_url: "https://example.com/dremel.pdf",
  status: "structure_ready",
  source_type: "paper",
  course_structure: null,
  total_videos: 2,
  completed_videos: 1,
  current_video_index: 1,
  error_message: null,
  created_at: "2026-09-02T00:00:00Z",
};

const bookCourse: Course = {
  ...paperCourse,
  id: "course-book",
  title: "Some Textbook",
  source_type: undefined,
};

const partJob: Job = {
  id: "job-part-1",
  user_id: "user-1",
  title: "Dremel Part 1",
  pdf_url: "https://example.com/dremel.pdf",
  status: "ready",
  video_url: null,
  created_at: "2026-09-02T01:00:00Z",
  completed_at: null,
  regen_log: null,
  course_id: "course-dremel",
};

describe("LibraryRail", () => {
  beforeEach(() => {
    mockParams = {};
    mockJobs = [];
    mockCourses = [];
  });

  it("shows a standalone job", async () => {
    mockJobs = [standaloneJob];
    render(<LibraryRail />);
    await waitFor(() => {
      expect(screen.getByText("GFS: The Google File System")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /GFS: The Google File System/ })).toHaveAttribute(
      "href",
      "/job/job-standalone"
    );
  });

  it("shows a paper course with its progress count, collapsed by default", async () => {
    mockCourses = [paperCourse];
    mockJobs = [partJob];
    render(<LibraryRail />);
    await waitFor(() => {
      expect(screen.getByText("Dremel")).toBeInTheDocument();
    });
    expect(screen.getByText("1/2 parts")).toBeInTheDocument();
    expect(screen.queryByText("Dremel Part 1")).not.toBeInTheDocument();
  });

  it("expands a paper course on click to reveal its part videos", async () => {
    mockCourses = [paperCourse];
    mockJobs = [partJob];
    render(<LibraryRail />);
    await waitFor(() => screen.getByText("Dremel"));
    fireEvent.click(screen.getByText("Dremel"));
    expect(screen.getByText("Dremel Part 1")).toBeInTheDocument();
  });

  it("hides books (non-paper courses) from the rail", async () => {
    mockCourses = [bookCourse];
    render(<LibraryRail />);
    await waitFor(() => {
      expect(screen.getByText("No videos yet.")).toBeInTheDocument();
    });
    expect(screen.queryByText("Some Textbook")).not.toBeInTheDocument();
  });

  it("auto-expands the course containing the currently selected video", async () => {
    mockParams = { id: "job-part-1" };
    mockCourses = [paperCourse];
    mockJobs = [partJob];
    render(<LibraryRail />);
    await waitFor(() => {
      expect(screen.getByText("Dremel Part 1")).toBeInTheDocument();
    });
  });

  it("shows an empty message when there are no papers at all", async () => {
    render(<LibraryRail />);
    await waitFor(() => {
      expect(screen.getByText("No videos yet.")).toBeInTheDocument();
    });
  });
});
