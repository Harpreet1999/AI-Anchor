import { Ship } from "iconsax-react";
import SystemStatus from "./SystemStatus.jsx";

export default function Masthead() {
  return (
    <header className="masthead">
      <div className="masthead-mark">
        <Ship size={58} variant="Outline" color="currentColor" strokeWidth={1.5} />
      </div>
      <div className="masthead-titlecol">
        <div className="eyebrow">RAG Demonstration Project — Data Layer</div>
        <h1 className="masthead-title">AI Anchor</h1>
      </div>
      <SystemStatus />
      <p className="masthead-dek">
        A RAG pipeline drawn and explained like an engineering blueprint —
      </p>
    </header>
  );
}
