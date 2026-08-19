export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-background px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between">
        <span className="text-sm font-semibold text-teal">stemvid.ai</span>
        <a
          href="https://www.youtube.com/channel/UC98o_DYaxmePKq6W2gA0WQQ"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-teal"
        >
          Watch on YouTube
        </a>
      </div>
    </footer>
  );
}
