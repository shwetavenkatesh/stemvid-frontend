import { render, screen } from "@testing-library/react";
import StatusTracker from "@/components/job/StatusTracker";

describe("StatusTracker", () => {
  it("shows failed state", () => {
    render(<StatusTracker status="failed" />);
    expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
  });

  it("marks completed steps with checkmark", () => {
    render(<StatusTracker status="rendering" />);
    const steps = screen.getAllByText("✓");
    expect(steps).toHaveLength(3);
  });

  it("highlights current step", () => {
    render(<StatusTracker status="generating_script" />);
    expect(screen.getByText("Generating script...")).toBeInTheDocument();
  });

  it("shows all steps completed when ready", () => {
    render(<StatusTracker status="ready" />);
    const checks = screen.getAllByText("✓");
    expect(checks).toHaveLength(4);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows queued as first active step", () => {
    render(<StatusTracker status="queued" />);
    expect(screen.getByText("Queued...")).toBeInTheDocument();
  });
});
