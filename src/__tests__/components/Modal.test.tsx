import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "@/components/shared/Modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}}>
        <p>Content</p>
      </Modal>
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders children when open", () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <p>Hello</p>
      </Modal>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key", () => {
    const onClose = jest.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking overlay", () => {
    const onClose = jest.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    const overlay = screen.getByText("Content").parentElement!.parentElement!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
