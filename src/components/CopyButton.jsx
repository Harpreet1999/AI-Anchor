import { useState } from "react";
import { Copy, TickCircle } from "iconsax-react";

// A small, consistent copy-to-clipboard affordance reused across every step
// that shows raw text worth grabbing (a chunk, a prompt, an answer, a
// vector). Falls back silently if the Clipboard API is unavailable (e.g.
// an insecure context) rather than throwing in the user's face.
export default function CopyButton({ getText, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const text = typeof getText === "function" ? getText() : getText;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard permission denied or unavailable — no crash, just no-op.
    }
  };

  return (
    <button type="button" className="copy-btn" onClick={handleClick} aria-live="polite">
      {copied ? (
        <><TickCircle size={13} variant="Outline" color="currentColor" /> Copied</>
      ) : (
        <><Copy size={13} variant="Outline" color="currentColor" /> {label}</>
      )}
    </button>
  );
}
