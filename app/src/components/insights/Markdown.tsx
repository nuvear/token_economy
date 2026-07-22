// Tiny Markdown renderer for insight results — headings, tables, bold,
// inline/fenced code, lists, blockquotes, paragraphs. Renders onto SOLID
// surfaces (design rule: numbers never sit on glass).
import type { CSSProperties, ReactNode } from "react";
import { color, font } from "../../tokens";

const body: CSSProperties = {
  color: "var(--ink-2)",
  fontSize: 13.5,
  lineHeight: 1.65,
};

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={k++} style={{ fontWeight: 800, color: "var(--ink)" }}>
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("`")) {
      parts.push(
        <code
          key={k++}
          style={{
            fontFamily: font.mono,
            fontSize: 12,
            background: "var(--track)",
            padding: "1px 5px",
            borderRadius: 5,
            color: color.goldDeep,
          }}
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <em key={k++} style={{ color: "var(--muted)" }}>
          {tok.slice(1, -1)}
        </em>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownView({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const cells = (row: string): string[] =>
    row.split("|").slice(1, -1).map((c) => c.trim());

  while (i < lines.length) {
    const l = lines[i];

    if (l.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      out.push(
        <pre
          key={key++}
          style={{
            margin: "10px 0",
            background: color.navy,
            borderRadius: 10,
            padding: 14,
            overflow: "auto",
            fontFamily: font.mono,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: "#C9D8EE",
            whiteSpace: "pre-wrap",
          }}
        >
          {buf.join("\n")}
        </pre>,
      );
      continue;
    }
    if (/^### /.test(l)) {
      out.push(
        <h3
          key={key++}
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: color.goldDeep,
            margin: "18px 0 6px",
          }}
        >
          {renderInline(l.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }
    if (/^## /.test(l)) {
      out.push(
        <h2
          key={key++}
          style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", margin: "20px 0 8px" }}
        >
          {renderInline(l.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }
    if (/^# /.test(l)) {
      out.push(
        <h1
          key={key++}
          style={{
            fontSize: 21,
            fontWeight: 800,
            color: "var(--ink)",
            margin: "2px 0 8px",
            lineHeight: 1.25,
          }}
        >
          {renderInline(l.slice(2))}
        </h1>,
      );
      i++;
      continue;
    }
    if (/^> /.test(l)) {
      const q: string[] = [];
      while (i < lines.length && /^> /.test(lines[i])) {
        q.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <blockquote
          key={key++}
          style={{
            borderLeft: `3px solid ${color.gold}`,
            background: "var(--track)",
            padding: "10px 14px",
            margin: "12px 0",
            borderRadius: "0 8px 8px 0",
            ...body,
          }}
        >
          {renderInline(q.join(" "))}
        </blockquote>,
      );
      continue;
    }
    if (/^\s*[-*] /.test(l)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        items.push(
          <li key={key++} style={{ margin: "5px 0" }}>
            {renderInline(lines[i].replace(/^\s*[-*] /, ""))}
          </li>,
        );
        i++;
      }
      out.push(
        <ul key={key++} style={{ margin: "8px 0", paddingLeft: 20, ...body }}>
          {items}
        </ul>,
      );
      continue;
    }
    if (/^\d+\. /.test(l)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(
          <li key={key++} style={{ margin: "5px 0" }}>
            {renderInline(lines[i].replace(/^\d+\. /, ""))}
          </li>,
        );
        i++;
      }
      out.push(
        <ol key={key++} style={{ margin: "8px 0", paddingLeft: 22, ...body }}>
          {items}
        </ol>,
      );
      continue;
    }
    if (/^\|/.test(l)) {
      const rows: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      const head = cells(rows[0]);
      const bodyRows = rows.slice(2).map(cells);
      out.push(
        <div key={key++} style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              margin: "12px 0",
              fontSize: 12.5,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <thead>
              <tr>
                {head.map((c, ci) => (
                  <th
                    key={ci}
                    style={{
                      textAlign: ci ? "right" : "left",
                      background: color.navy,
                      color: "#fff",
                      fontWeight: 700,
                      padding: "8px 10px",
                      border: `1px solid ${color.navy2}`,
                    }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 ? "var(--surface-alt)" : "var(--surface)" }}>
                  {row.map((c, ci) => (
                    <td
                      key={ci}
                      style={{
                        textAlign: ci ? "right" : "left",
                        padding: "7px 10px",
                        border: "1px solid var(--border)",
                        color: ci ? "var(--ink)" : "var(--ink-2)",
                        fontWeight: ci ? 600 : 500,
                      }}
                    >
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^---+\s*$/.test(l)) {
      out.push(<hr key={key++} style={{ border: 0, borderTop: "1px solid var(--border)", margin: "14px 0" }} />);
      i++;
      continue;
    }
    if (l.trim() === "") {
      i++;
      continue;
    }
    out.push(
      <p key={key++} style={{ margin: "8px 0", ...body }}>
        {renderInline(l)}
      </p>,
    );
    i++;
  }

  return <div>{out}</div>;
}
