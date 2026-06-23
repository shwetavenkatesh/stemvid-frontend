import Button from "@/components/shared/Button";

export default function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-20">
      <p className="text-lg font-medium text-gray-700">
        You haven&apos;t generated any videos yet
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Upload a research paper or textbook to get started
      </p>
      <div className="mt-6">
        <Button onClick={onGenerate}>Generate your first video</Button>
      </div>
    </div>
  );
}
