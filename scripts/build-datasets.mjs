// Data-prep / indexing script — the "offline phase" of RAG.
// Reads data/sources/*.md and *.txt, chunks them into the shared schema
// (see data/schema.md), and writes data/processed/*.json.
//
// Run with: npm run data:build
// Re-run any time a source file under data/sources/ changes.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "data", "sources");
const OUT = path.join(ROOT, "data", "processed");

function slug(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function readSrc(name) {
  return fs.readFileSync(path.join(SRC, name), "utf8");
}

// Split a markdown body into top-level "## Heading" sections.
// Returns [{ heading, body }], body = everything until the next "## " or EOF.
function splitByH2(md) {
  const lines = md.split("\n");
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1], body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ heading: s.heading, body: s.body.join("\n").trim() }));
}

// Split a section body into "### Heading" subsections.
function splitByH3(body) {
  const lines = body.split("\n");
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = /^###\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1], body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ heading: s.heading, body: s.body.join("\n").trim() }));
}

// Split a bullet-list body into individual top-level "- " items
// (each item may itself span multiple lines, up to the next "- ").
function splitByBullets(body) {
  const lines = body.split("\n");
  const items = [];
  let current = null;
  for (const line of lines) {
    if (/^-\s+/.test(line)) {
      if (current !== null) items.push(current.trim());
      current = line.replace(/^-\s+/, "");
    } else if (current !== null && line.trim() !== "") {
      current += " " + line.trim();
    }
  }
  if (current !== null) items.push(current.trim());
  return items;
}

function firstNumber(str) {
  if (!str) return null;
  const m = /(\d+(?:\.\d+)?)/.exec(str.replace(/,/g, ""));
  return m ? Number(m[1]) : null;
}

// Split on `sep` only outside of parentheses, so "AWS (Lambda, S3, EC2)"
// stays one item instead of shattering on the commas inside it.
function splitRespectingParens(str, sep = ",") {
  const parts = [];
  let depth = 0;
  let buf = "";
  for (const ch of str) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      parts.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

const SECTION_ALIASES = {
  projects: "project",
  certifications: "certification",
  achievements: "achievement",
};
function canonicalSection(tag) {
  return SECTION_ALIASES[tag] || tag;
}

// ---------------------------------------------------------------------------
// Dataset 1: Portfolio ("Portfolio Data")
// ---------------------------------------------------------------------------
function buildPortfolio() {
  const chunks = [];

  // --- resume.md: coarser, resume-framed chunks ---
  const resumeMd = readSrc("resume.md");
  for (const { heading, body } of splitByH2(resumeMd)) {
    if (!body) continue;
    if (/^Work Experience$/i.test(heading)) {
      for (const role of splitByH3(body)) {
        chunks.push({
          id: `resume-role-${slug(role.heading)}`,
          section: "work_experience",
          title: role.heading,
          text: `${role.heading}\n${role.body}`,
          source: "resume.md",
          metadata: {},
        });
      }
    } else if (/^(Projects|Skills|Certifications|Education)/i.test(heading)) {
      for (const item of splitByBullets(body)) {
        chunks.push({
          id: `resume-${slug(heading)}-${slug(item.slice(0, 40))}`,
          section: canonicalSection(slug(heading.split(" ")[0])),
          title: heading,
          text: item,
          source: "resume.md",
          metadata: {},
        });
      }
    } else {
      chunks.push({
        id: `resume-${slug(heading)}`,
        section: slug(heading),
        title: heading,
        text: body,
        source: "resume.md",
        metadata: {},
      });
    }
  }

  // --- portfolio.md: fine-grained, per-item chunks ---
  const portfolioMd = readSrc("portfolio.md");
  for (const { heading, body } of splitByH2(portfolioMd)) {
    if (!body) continue;

    if (/^Certifications$/i.test(heading) || /^Achievements/i.test(heading)) {
      const sectionTag = /^Certifications$/i.test(heading) ? "certification" : "achievement";
      for (const item of splitByBullets(body)) {
        const nameMatch = /^\*\*(.+?)\*\*/.exec(item);
        const title = nameMatch ? nameMatch[1] : item.slice(0, 60);
        chunks.push({
          id: `portfolio-${sectionTag}-${slug(title)}`,
          section: sectionTag,
          title,
          text: item.replace(/\*\*/g, ""),
          source: "portfolio.md",
          metadata: {},
        });
      }
    } else if (/^Education$/i.test(heading)) {
      for (const item of splitByBullets(body)) {
        const nameMatch = /^\*\*(.+?)\*\*/.exec(item);
        const title = nameMatch ? nameMatch[1] : item.slice(0, 60);
        chunks.push({
          id: `portfolio-education-${slug(title)}`,
          section: "education",
          title,
          text: item.replace(/\*\*/g, ""),
          source: "portfolio.md",
          metadata: {},
        });
      }
    } else if (/^Skills/i.test(heading)) {
      const groups = body.split(/\n\s*\n/).filter(Boolean);
      for (const g of groups) {
        const m = /^\*\*(.+?)\*\*\s*(\(tags\))?:\s*(.+)$/s.exec(g.trim());
        if (!m) continue;
        const groupName = m[1];
        const isTags = Boolean(m[2]);
        const itemsRaw = splitRespectingParens(m[3]).map((s) => s.trim());
        let skills;
        if (isTags) {
          skills = itemsRaw.map((name) => ({ name }));
        } else {
          skills = itemsRaw.map((entry) => {
            const em = /^(.+?)\s+(\d+)$/.exec(entry);
            return em ? { name: em[1], value: Number(em[2]) } : { name: entry };
          });
        }
        chunks.push({
          id: `portfolio-skills-${slug(groupName)}`,
          section: "skills",
          title: groupName,
          text: `${groupName}: ${itemsRaw.join(", ")}`,
          source: "portfolio.md",
          metadata: { skills },
        });
      }
    } else if (/^Work Experience$/i.test(heading)) {
      for (const role of splitByH3(body)) {
        const tagsMatch = /Tags:\s*(.+)/.exec(role.body);
        chunks.push({
          id: `portfolio-role-${slug(role.heading)}`,
          section: "work_experience",
          title: role.heading,
          text: `${role.heading}\n${role.body}`,
          source: "portfolio.md",
          metadata: tagsMatch ? { tags: tagsMatch[1].split(",").map((s) => s.trim()) } : {},
        });
      }
    } else if (/^Projects$/i.test(heading)) {
      for (const proj of splitByH3(body)) {
        const arch = {};
        const fm = /Frontend ([^;]+);/.exec(proj.body);
        const bm = /Backend ([^;]+);/.exec(proj.body);
        const dm = /Database ([^;.]+)[;.]/.exec(proj.body);
        const dep = /Deployment ([^;.]+)\./.exec(proj.body);
        if (fm) arch.frontend = fm[1].trim();
        if (bm) arch.backend = bm[1].trim();
        if (dm) arch.database = dm[1].trim();
        if (dep) arch.deployment = dep[1].trim();
        chunks.push({
          id: `portfolio-project-${slug(proj.heading)}`,
          section: "project",
          title: proj.heading,
          text: `${proj.heading}\n${proj.body}`.replace(/\*\*/g, ""),
          source: "portfolio.md",
          metadata: { architecture: arch },
        });
      }
    } else {
      // Identity/Hero, About, Contact — keep as one chunk each
      chunks.push({
        id: `portfolio-${slug(heading)}`,
        section: slug(heading.split("/")[0].trim()),
        title: heading,
        text: body.replace(/\*\*/g, ""),
        source: "portfolio.md",
        metadata: {},
      });
    }
  }

  return {
    datasetId: "portfolio",
    displayName: "Portfolio Data",
    description:
      "Harpreet Singh's resume and full portfolio site — work history, projects, skills, certifications, achievements, and education. Ask about his AI Engineer work at Cognizant, the Agentic Grounding Platform, or anything else on his site.",
    sourceFiles: ["data/sources/resume.md", "data/sources/portfolio.md"],
    chunks,
  };
}

// ---------------------------------------------------------------------------
// Dataset 2: JDM Legends car specs
// ---------------------------------------------------------------------------
function buildCars() {
  const md = readSrc("cars-jdm-legends.md");
  const chunks = [];
  for (const { heading, body } of splitByH2(md)) {
    if (/^sources?$/i.test(heading)) continue; // not a car
    const bullets = splitByBullets(body);
    const text = `${heading}\n` + bullets.map((b) => `- ${b}`).join("\n");

    const get = (label) => {
      const b = bullets.find((x) => new RegExp(`^${label}:`, "i").test(x));
      return b ? b.replace(new RegExp(`^${label}:\\s*`, "i"), "") : null;
    };
    const years = get("Years");
    const yearMatch = years ? /(\d{4})\D+(\d{4})/.exec(years) : null;

    chunks.push({
      id: `cars-${slug(heading)}`,
      section: "car_spec",
      title: heading,
      text,
      source: "cars-jdm-legends.md",
      metadata: {
        engine: get("Engine"),
        horsepowerHp: firstNumber(get("Horsepower")),
        torqueLbFt: firstNumber(get("Torque")),
        zeroToSixtySec: firstNumber(get("0–60 mph") || get("0-60 mph")),
        curbWeightLb: firstNumber(get("Curb weight")),
        yearStart: yearMatch ? Number(yearMatch[1]) : null,
        yearEnd: yearMatch ? Number(yearMatch[2]) : null,
      },
    });
  }

  return {
    datasetId: "cars-jdm-legends",
    displayName: "JDM Legends — Spec Comparison",
    description:
      "Verified specs (horsepower, torque, 0-60, weight, production years) for 8 iconic 1990s-2000s Japanese sports cars, including both Fairlady Z generations. A numeric, chartable dataset.",
    sourceFiles: ["data/sources/cars-jdm-legends.md"],
    chunks,
  };
}

// ---------------------------------------------------------------------------
// Dataset 3: Sherlock Holmes (Project Gutenberg)
// ---------------------------------------------------------------------------
function buildSherlock() {
  const raw = readSrc("sherlock-holmes.txt").replace(/\r\n/g, "\n");
  const startIdx = raw.indexOf("*** START OF");
  const endIdx = raw.indexOf("*** END OF");
  const bodyStart = raw.indexOf("\n", startIdx) + 1;
  const body = raw.slice(bodyStart, endIdx);

  // Story titles look like "II. THE RED-HEADED LEAGUE" — a roman numeral,
  // a period, then an all-caps title of real length (filters out bare
  // "I." / "II." in-story chapter markers, which have no title text).
  const titleRe = /^([IVXLC]+)\.\s+([A-Z][A-Z’' \-]{8,})\s*$/gm;
  const marks = [];
  let m;
  while ((m = titleRe.exec(body)) !== null) {
    marks.push({ index: m.index, title: m[2].trim() });
  }

  const stories = marks.map((mark, i) => {
    const start = mark.index;
    const end = i + 1 < marks.length ? marks[i + 1].index : body.length;
    return { title: mark.title, text: body.slice(start, end).trim() };
  });

  const chunks = [];
  const TARGET_LEN = 1200;
  for (const story of stories) {
    const paragraphs = story.text.split(/\n\s*\n/).filter((p) => p.trim());
    let buf = "";
    let part = 1;
    const flush = () => {
      if (!buf.trim()) return;
      chunks.push({
        id: `sherlock-${slug(story.title)}-${part}`,
        section: "story",
        title: story.title,
        text: buf.trim(),
        source: "sherlock-holmes.txt",
        metadata: { story: story.title, part },
      });
      part += 1;
      buf = "";
    };
    for (const p of paragraphs) {
      if (buf.length + p.length > TARGET_LEN && buf) flush();
      buf += (buf ? "\n\n" : "") + p;
    }
    flush();
  }

  return {
    datasetId: "sherlock-holmes",
    displayName: "The Adventures of Sherlock Holmes",
    description:
      "All 12 stories from Arthur Conan Doyle's 1892 collection (public domain, Project Gutenberg). Ask about any case, character, or clue.",
    sourceFiles: ["data/sources/sherlock-holmes.txt"],
    chunks,
  };
}

// ---------------------------------------------------------------------------
// Dataset 4: The Boston Cooking-School Cook Book (Project Gutenberg) — a
// third, structurally distinct shape: neither flat numeric specs (cars)
// nor narrative prose (Sherlock), but recipes and technique grouped by
// chapter. Same paragraph-grouping strategy as Sherlock, split on chapter
// boundaries instead of story boundaries.
// ---------------------------------------------------------------------------
function buildCookbook() {
  const raw = readSrc("boston-cooking-school-cookbook.txt").replace(/\r\n/g, "\n");
  const startIdx = raw.indexOf("*** START OF");
  const endIdx = raw.indexOf("*** END OF");
  const bodyStart = raw.indexOf("\n", startIdx) + 1;
  const body = raw.slice(bodyStart, endIdx);

  // Chapter headings are a centered "CHAPTER I" line immediately followed
  // by the all-caps chapter name on its own line (e.g. "EGGS", "SOUPS
  // WITHOUT STOCK") — distinct from the table-of-contents entries, which
  // use "I. FOOD" / "XIV. VEAL" shorthand and never say the word "CHAPTER".
  const chapterRe = /^[ \t]*CHAPTER\s+[IVXLC]+[ \t]*\n+[ \t]*([A-ZÀ-Ý][A-ZÀ-Ý:,'’ \-]{2,60})[ \t]*$/gm;
  const marks = [];
  let m;
  while ((m = chapterRe.exec(body)) !== null) {
    marks.push({ index: m.index, title: m[1].trim().replace(/\s+/g, " ") });
  }

  const chapters = marks.map((mark, i) => {
    const start = mark.index;
    const end = i + 1 < marks.length ? marks[i + 1].index : body.length;
    return { title: mark.title, text: body.slice(start, end).trim() };
  });

  const chunks = [];
  // 2800 chars/chunk (up from an earlier 1200) — deliberately coarser so
  // the whole dataset lands around ~500 chunks instead of ~1270. This is
  // purely a demo-scale decision (matches Sherlock's chunk count better,
  // and shrinks the Python service's cold-start/RAM footprint), not a
  // change in what the chunker actually does.
  const TARGET_LEN = 2800;
  for (const chapter of chapters) {
    const paragraphs = chapter.text.split(/\n\s*\n/).filter((p) => p.trim());
    let buf = "";
    let part = 1;
    const flush = () => {
      if (!buf.trim()) return;
      chunks.push({
        id: `cookbook-${slug(chapter.title)}-${part}`,
        section: "recipe_chapter",
        title: chapter.title,
        text: buf.trim(),
        source: "boston-cooking-school-cookbook.txt",
        metadata: { chapter: chapter.title, part },
      });
      part += 1;
      buf = "";
    };
    for (const p of paragraphs) {
      if (buf.length + p.length > TARGET_LEN && buf) flush();
      buf += (buf ? "\n\n" : "") + p;
    }
    flush();
  }

  return {
    datasetId: "cookbook",
    displayName: "The Boston Cooking-School Cook Book",
    description:
      "Fannie Merritt Farmer's 1896 cooking manual (public domain, Project Gutenberg) — recipes and technique across 38 chapters, from eggs and soups to pastry and cake. Ask how to make something, or what goes in it.",
    sourceFiles: ["data/sources/boston-cooking-school-cookbook.txt"],
    chunks,
  };
}

// ---------------------------------------------------------------------------
function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const datasets = [
    ["portfolio.json", buildPortfolio()],
    ["cars-jdm-legends.json", buildCars()],
    ["sherlock-holmes.json", buildSherlock()],
    ["cookbook.json", buildCookbook()],
  ];
  for (const [filename, data] of datasets) {
    fs.writeFileSync(path.join(OUT, filename), JSON.stringify(data, null, 2), "utf8");
    console.log(`${filename}: ${data.chunks.length} chunks`);
  }
}

main();
