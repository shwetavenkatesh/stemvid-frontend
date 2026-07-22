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

  // Regression coverage: papers used to insert into `jobs` and trigger {type: "paper"}
  // — the legacy single-shot flow — which skipped the concept-inventory/part-split
  // structure step entirely. Both content types must now go through `courses`.
  it("submits a paper into the courses table and triggers paper_course", async () => {
    render(<GenerateForm userId="u1" tier="free" onCreated={jest.fn()} />);
    selectPdf();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Dremel" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate paper" }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    expect(mockFrom).toHaveBeenCalledWith("courses");
    expect(mockFrom).not.toHaveBeenCalledWith("jobs");
    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      type: "paper_course",
      course_id: "new-id",
    });
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
