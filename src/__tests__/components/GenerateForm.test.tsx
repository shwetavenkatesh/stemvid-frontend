import { render, screen, fireEvent } from "@testing-library/react";
import GenerateForm from "@/components/dashboard/GenerateForm";

jest.mock("@/lib/supabase", () => ({
  createClient: () => ({
    storage: { from: () => ({ upload: jest.fn(), getPublicUrl: jest.fn() }) },
    from: () => ({
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: "new-id" }, error: null }) }),
      }),
    }),
  }),
}));

jest.mock("@/lib/posthog", () => ({ trackEvent: jest.fn() }));

describe("GenerateForm", () => {
  it("defaults to Research paper mode", () => {
    render(<GenerateForm userId="u1" tier="free" onCreated={jest.fn()} />);
    expect(screen.getByText("Generate video")).toBeInTheDocument();
    expect(screen.getByText("PDF research papers")).toBeInTheDocument();
  });

  it("switches to Book mode and updates copy and submit label", () => {
    render(<GenerateForm userId="u1" tier="free" onCreated={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    expect(screen.getByText("Generate course")).toBeInTheDocument();
    expect(screen.getByText("PDF textbooks and workbooks")).toBeInTheDocument();
    expect(
      screen.getByText(/one at a time from the course page/i)
    ).toBeInTheDocument();
  });

  it("switches back to Research paper mode", () => {
    render(<GenerateForm userId="u1" tier="free" onCreated={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    fireEvent.click(screen.getByRole("button", { name: "Research paper" }));
    expect(screen.getByText("Generate video")).toBeInTheDocument();
    expect(screen.getByText("PDF research papers")).toBeInTheDocument();
  });
});
