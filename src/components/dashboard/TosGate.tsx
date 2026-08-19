"use client";

import Link from "next/link";
import Button from "@/components/shared/Button";

export default function TosGate({
  onAgree,
  onLogout,
  loading,
}: {
  onAgree: () => void;
  onLogout: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground">
          Before you continue
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          stemvid.ai is a free Beta. Please read and agree to our{" "}
          <Link
            href="/terms"
            target="_blank"
            className="font-medium text-teal hover:underline"
          >
            Beta Terms of Service
          </Link>{" "}
          before generating videos.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={onAgree} disabled={loading} className="w-full">
            {loading ? "Saving..." : "I Agree"}
          </Button>
          <button
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Log out instead
          </button>
        </div>
      </div>
    </div>
  );
}
