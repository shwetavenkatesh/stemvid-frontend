import { render } from "@testing-library/react";
import PostHogProvider from "@/components/shared/PostHogProvider";
import { initPostHog, posthog } from "@/lib/posthog";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/lib/posthog", () => ({
  initPostHog: jest.fn(),
  posthog: { capture: jest.fn() },
}));

describe("PostHogProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls initPostHog before capturing pageview", () => {
    const callOrder: string[] = [];
    (initPostHog as jest.Mock).mockImplementation(() => callOrder.push("init"));
    (posthog.capture as jest.Mock).mockImplementation(() =>
      callOrder.push("capture")
    );

    render(<PostHogProvider />);

    expect(callOrder).toEqual(["init", "capture"]);
  });

  it("captures $pageview on mount", () => {
    render(<PostHogProvider />);

    expect(posthog.capture).toHaveBeenCalledWith("$pageview", {
      $current_url: expect.any(String),
    });
  });

  it("calls initPostHog on mount", () => {
    render(<PostHogProvider />);

    expect(initPostHog).toHaveBeenCalledTimes(1);
  });
});
