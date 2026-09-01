import { render, screen } from "@testing-library/react";
import Navbar from "@/components/shared/Navbar";

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

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

jest.mock("@/lib/supabase", () => ({
  createClient: () => ({ auth: { signOut: jest.fn() } }),
}));

describe("Navbar", () => {
  it("shows Dashboard, Settings and Feedback links for a logged-in user, but not Admin", () => {
    render(<Navbar user={{ email: "someone@example.com" }} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("never shows an Admin link, even for the account that used to be hardcoded as admin", () => {
    render(<Navbar user={{ email: "shwets.ven@gmail.com" }} />);

    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows a login link and no account links when logged out", () => {
    render(<Navbar user={null} />);

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Feedback")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
  });
});
