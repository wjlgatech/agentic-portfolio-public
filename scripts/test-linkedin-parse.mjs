// Unit tests for the public LinkedIn profile parser — fixture-based, deterministic.
import { parseLinkedInProfile, linkedinToResumeText } from "../packages/core/src/linkedin-parse.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// A realistic public profile head (og:title + og:description, entity-encoded like LinkedIn serves).
const profile = `
<html><head>
<meta property="og:title" content="Jane Rivera - Staff ML Engineer at Acme &amp; Co | LinkedIn">
<meta property="og:description" content="Staff ML Engineer at Acme &amp; Co · Experience: Acme, Google · Education: MIT · Location: San Francisco Bay Area · 500+ connections. See Jane&#39;s profile.">
<meta property="og:type" content="profile">
</head><body>…</body></html>`;

const p = parseLinkedInProfile(profile);
check("extracts the name from og:title", p.name === "Jane Rivera");
check("extracts the headline from og:title", p.headline === "Staff ML Engineer at Acme & Co");
check("decodes HTML entities (&amp; → &, &#39; → ')", p.summary.includes("Acme & Co") && p.summary.includes("Jane's profile"));
check("summary carries experience/education/location signal", /Experience:|Education:|Location:/.test(p.summary));
check("ok=true for a real profile", p.ok === true);

// Attribute order reversed (content before property) — still parses.
const reversed = `<meta content="Bob Lee - Designer | LinkedIn" property="og:title">`;
check("tolerant of reversed meta attribute order", parseLinkedInProfile(reversed).name === "Bob Lee");

// Title with no headline dash.
const noHeadline = parseLinkedInProfile(`<meta property="og:title" content="Ada Byte | LinkedIn">`);
check("name-only title yields empty headline, still ok", noHeadline.name === "Ada Byte" && noHeadline.headline === "" && noHeadline.ok);

// An authwall / blocked page (no og:title) → ok:false so the caller falls back gracefully.
const wall = parseLinkedInProfile(`<html><head><title>Sign Up | LinkedIn</title></head><body>Please sign in</body></html>`);
check("a blocked/authwall page is ok:false (no fabrication)", wall.ok === false && wall.name === "");

// resume-text composition.
const text = linkedinToResumeText(p, "https://www.linkedin.com/in/jane-rivera");
check("linkedinToResumeText includes name + headline + URL", text.includes("Jane Rivera") && text.includes("Staff ML Engineer") && text.includes("linkedin.com/in/jane-rivera"));
check("linkedinToResumeText is empty for a failed parse", linkedinToResumeText(wall, "x") === "");

console.log(ok ? "✅ linkedin-parse: all pass" : "❌ linkedin-parse: FAIL");
process.exit(ok ? 0 : 1);
