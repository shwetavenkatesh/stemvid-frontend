import { render, screen, fireEvent } from "@testing-library/react";
import EmptyState from "@/components/dashboard/EmptyState";

describe("EmptyState", () => {
  it("renders the empty message", () => {
    render(<EmptyState onGenerate={() => {}} />);
    expect(
      screen.getByText("You haven't generated any videos yet")
    ).toBeInTheDocument();
  });

  it("calls onGenerate when button is clicked", () => {
    const onGenerate = jest.fn();
    render(<EmptyState onGenerate={onGenerate} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Generate your first video" })
    );
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });
});
