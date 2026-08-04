import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GenerateForm from "@/components/dashboard/GenerateForm";

const mockFrom = jest.fn((table: string) => {
  void table;
  return {
    insert: () => ({
      select: () => ({ single: async () => ({ data: { id: "new-id" }, error: null }) }),
    }),
  };
});

jest.mock("@/lib/supabase", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: jest.fn(),
      }),
    },
    from: (table: string) => mockFrom(table),
  }),
}));

jest.mock("@/lib/posthog", () => ({ trackEvent: jest.fn() }));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function selectPdf() {
  const file = new File(["%PDF-1.4"], "dremel.pdf", { type: "application/pdf" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("GenerateForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("defaults to Research paper mode", () => {
    render(<GenerateForm userId="u1" tier="free" onCreated={jest.fn()} />);
    expect(screen.getByText("Generate paper")).toBeInTheDocument();
    expect(
      screen.getByText("Anything that isn't a book — research papers or any other PDF")
    ).toBeInTheDocument();
  });

  it("switches to Book mode and updates copy and submit label", () => {
    render(<GenerateForm userId="u1" tier="free" onCreated={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    expect(screen.getByText("Generate course")).toBeInTheDocument();
    expect(
      screen.getByText("Long PDFs with a table of contents — textbooks and workbooks")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/one at a time from the course page/i)
    ).toBeInTheDocument();
  });

  it("switches back to Research paper mode", () => {
    render(<GenerateForm userId="u1" tier="free" onCreated={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    fireEvent.click(screen.getByRole("button", { name: "Research paper" }));
    expect(screen.getByText("Generate paper")).toBeInTheDocument();
    expect(
      screen.getByText("Anything that isn't a book — research papers or any other PDF")
    ).toBeInTheDocument();
  });

  // 2026-08-03: papers default to a single explainer video (jobs + {type: "paper"})
  // instead of the exhaustive multi-part Deep Dive pipeline (courses + paper_course)
  // — most viewers want the paper's core ideas, not a per-part walkthrough. Deep
  // Dive still exists on the backend, just not reachable from this form for now.
  it("submits a paper into the jobs table and triggers paper", async () => {
    render(<GenerateForm userId="u1" tier="free" onCreated={jest.fn()} />);
    selectPdf();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Dremel" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate paper" }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    expect(mockFrom).toHaveBeenCalledWith("jobs");
    expect(mockFrom).not.toHaveBeenCalledWith("courses");
    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      type: "paper",
      job_id: "new-id",
    });
  });

  it("shows the explainer copy for papers, not the multi-part copy", () => {
    render(<GenerateForm userId="u1" tier="free" onCreated={jest.fn()} />);
    expect(screen.getByText(/single explainer video/i)).toBeInTheDocument();
    expect(screen.queryByText(/one at a time from the paper page/i)).not.toBeInTheDocument();
  });

  it("shows Deep dive as a disabled, non-selectable option", () => {
    render(<GenerateForm userId="u1" tier="free" onCreated={jest.fn()} />);
    const deepDive = screen.getByRole("button", { name: /Deep dive/i });
    expect(deepDive).toBeDisabled();
    fireEvent.click(deepDive);
    // Still on Research paper mode — clicking the disabled pill did nothing.
    expect(screen.getByText("Generate paper")).toBeInTheDocument();
  });

  it("submits a book into the courses table and triggers book", async () => {
    render(<GenerateForm userId="u1" tier="free" onCreated={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    selectPdf();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Algorithms" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate course" }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    expect(mockFrom).toHaveBeenCalledWith("courses");
    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      type: "book",
      course_id: "new-id",
    });
  });
});
