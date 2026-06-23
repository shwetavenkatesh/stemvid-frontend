export default function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="overflow-hidden rounded-lg bg-black">
      <video
        src={url}
        controls
        className="aspect-video w-full"
        preload="metadata"
      />
    </div>
  );
}
