import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline";

const styles: Record<Variant, string> = {
  primary:
    "bg-teal text-white hover:bg-teal-dark",
  secondary:
    "bg-gray-100 text-foreground hover:bg-gray-200",
  outline:
    "border border-teal text-teal hover:bg-teal-light",
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-md px-5 py-2.5 text-sm font-medium transition-colors ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
