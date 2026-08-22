// Generic, safe JSON pretty-printer for JSX — recurses through any plain
// object/array/primitive and renders it as indented, key-colored lines.
// Each line is its own block element so there's no reliance on fragile
// whitespace inside JSX text (multi-line JSX text nodes silently collapse
// whitespace, which corrupted an earlier hand-written version of this).

function Indent({ level }) {
  return <>{"  ".repeat(level)}</>;
}

export default function JsonBlock({ value, indent = 0, trailingComma = false }) {
  if (value === null || value === undefined) {
    return <span className="json-num">null{trailingComma ? "," : ""}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <>[]{trailingComma ? "," : ""}</>;
    return (
      <>
        {"["}
        {value.map((v, i) => (
          <div key={i}>
            <Indent level={indent + 1} />
            <JsonBlock value={v} indent={indent + 1} trailingComma={i < value.length - 1} />
          </div>
        ))}
        <div><Indent level={indent} />{"]"}{trailingComma ? "," : ""}</div>
      </>
    );
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return <>{"{}"}{trailingComma ? "," : ""}</>;
    return (
      <>
        {"{"}
        {keys.map((k, i) => (
          <div key={k}>
            <Indent level={indent + 1} />
            <span className="json-key">"{k}"</span>:{" "}
            <JsonBlock value={value[k]} indent={indent + 1} trailingComma={i < keys.length - 1} />
          </div>
        ))}
        <div><Indent level={indent} />{"}"}{trailingComma ? "," : ""}</div>
      </>
    );
  }

  if (typeof value === "number") {
    return <span className="json-num">{value}{trailingComma ? "," : ""}</span>;
  }

  return <>"{String(value)}"{trailingComma ? "," : ""}</>;
}
