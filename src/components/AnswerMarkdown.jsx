// A small, hand-rolled Markdown-lite renderer for the generated answer —
// not a real Markdown library (no new dependency for one panel). Covers
// what the prompt in api/_lib/groq.mjs actually asks the model to
// produce: bold, italic, inline code, bullet/numbered lists, and simple
// GFM-style tables. Anything unrecognized just renders as a plain
// paragraph — never throws, never shows raw syntax it can't parse.

function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*.+?\*\*|`.+?`|_.+?_|(?<!\*)\*[^*]+?\*(?!\*))/g).filter((p) => p !== "");
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={key} className="answer-inline-code">{part.slice(1, -1)}</code>;
    }
    if ((part.startsWith("_") && part.endsWith("_")) || (part.startsWith("*") && part.endsWith("*"))) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}
function isTableSeparator(line) {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-");
}
function splitRow(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

export default function AnswerMarkdown({ text }) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    if (isTableRow(line) && lines[i + 1] && isTableSeparator(lines[i + 1])) {
      const header = splitRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2] });
      i += 1;
      continue;
    }

    const listMatch = line.match(/^\s*([-*]|\d+\.)\s+(.*)/);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[1]);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*([-*]|\d+\.)\s+(.*)/);
        if (!m) break;
        items.push(m[2]);
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paraLines = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() !== "" && !isTableRow(lines[i]) && !/^(#{1,3})\s+/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "p", text: paraLines.join(" ") });
  }

  return (
    <div className="answer-markdown">
      {blocks.map((b, bi) => {
        const key = `b-${bi}`;
        if (b.type === "heading") {
          const Tag = b.level === 1 ? "h4" : b.level === 2 ? "h5" : "h6";
          return <Tag key={key} className="answer-heading">{renderInline(b.text, key)}</Tag>;
        }
        if (b.type === "list") {
          const ListTag = b.ordered ? "ol" : "ul";
          return (
            <ListTag key={key} className="answer-list">
              {b.items.map((item, ii) => (
                <li key={`${key}-${ii}`}>{renderInline(item, `${key}-${ii}`)}</li>
              ))}
            </ListTag>
          );
        }
        if (b.type === "table") {
          return (
            <div key={key} className="answer-table-wrap">
              <table className="answer-table">
                <thead>
                  <tr>
                    {b.header.map((h, hi) => (
                      <th key={hi}>{renderInline(h, `${key}-h${hi}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci}>{renderInline(cell, `${key}-${ri}-${ci}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={key}>{renderInline(b.text, key)}</p>;
      })}
    </div>
  );
}
