import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContactForm from "@/components/landing/ContactForm";

jest.mock("@/lib/posthog", () => ({ trackEvent: jest.fn() }));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function fillForm() {
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/message/i), {
    target: { value: "hello there" },
  });
}

describe("ContactForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a success message after a successful submit", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    render(<ContactForm />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(screen.getByText(/message sent/i)).toBeInTheDocument()
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows an error message when the request fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    render(<ContactForm />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/failed to send message/i)
      ).toBeInTheDocument()
    );
    expect(screen.queryByText(/message sent/i)).not.toBeInTheDocument();
  });
});
