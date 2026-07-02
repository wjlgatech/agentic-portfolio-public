import { CopilotProvider } from "@/components/Copilot";
import { Portfolio } from "@/components/Portfolio";
import { MakerLanding } from "@/components/MakerLanding";
import { InstanceSite } from "@/components/InstanceSite";
import { InstanceAgentActions } from "@/components/InstanceAgentActions";
import { getActiveInstance } from "@/content/instances";
import { instanceEvidence } from "@core/instance-types";
import { CLUSTERS, PRACTICE_DETAILS } from "@/content/practices-map";
import { type Project } from "@/components/Projects";
import {
  profile,
  mission,
  values,
  love,
  futurePractices,
} from "@/content/profile";
import projectsData from "@/content/projects.json";
import { readPortfolioAsync } from "@/lib/portfolio";
import { readVerification } from "@/lib/verification";
import { readJobFitEval } from "@/lib/jobfit-eval";
import { readDeepenAsync } from "@/lib/deepen";
import { readCompass } from "@/lib/compass";
import { applyOverrides } from "@/lib/overrides";

// Re-read portfolio.yaml per request so local-dev edits (by hand or by the agent)
// show on refresh. Static content (profile/projects) is still build-time.
export const dynamic = "force-dynamic";

const projects = projectsData as Project[];

// Per-instance <title>/OG so a non-portfolio deploy isn't titled "Paul Jialiang Wu".
// Returning {} for the portfolio inherits the layout default (portfolio unchanged).
export async function generateMetadata() {
  if (process.env.MAKER_HOME) {
    const title = "Make your own agentic portfolio — free, in 60 seconds";
    const description = "A live portfolio with its own AI agent that answers about you 24/7. Enter your basics, click once. No code.";
    return { title, description, openGraph: { title, description } };
  }
  const inst = getActiveInstance();
  if (inst.slug === "portfolio") return {};
  const title = `${inst.entity.name} — ${inst.entity.tagline}`;
  const description = inst.entity.blurb || inst.entity.tagline;
  return { title, description, openGraph: { title, description } };
}

export default async function Home() {
  // The HOSTED MAKER deploy sets MAKER_HOME → `/` is the maker front door (make-your-own), NOT a
  // personal portfolio. A forker who deploys the template as THEIR site leaves it unset and gets
  // the personal portfolio below. (Keeps this repo dual-purpose: a template AND the maker service.)
  if (process.env.MAKER_HOME) return <MakerLanding />;

  // Instances: a non-portfolio INSTANCE renders the generic visual site straight
  // from its InstanceConfig (hero + content), with its OWN grounded agent. The portfolio
  // (default) keeps its full, agent-editable site below — this branch leaves it untouched.
  const inst = getActiveInstance();
  if (inst.slug !== "portfolio") {
    return (
      <CopilotProvider
        context={instanceEvidence(inst, 120000)}
        groundingDescription={`${inst.entity.name} knowledge base. ${inst.agent.grounding} Answer ONLY from this; never invent offerings, outcomes, or links.`}
        labels={{
          title: `Ask ${inst.entity.name}`,
          initial: `Hi — I'm the agent for ${inst.entity.name}. ${inst.entity.tagline}. I can answer from grounded material, assess whether we're a fit, and — if you're interested — capture your details so the team follows up. Ask away.`,
        }}
        starters={[
          { label: "🔎 What you offer", prompt: `What does ${inst.entity.name} offer?` },
          { label: "🤔 Is it a fit?", prompt: "I'm a <your background> — is this a fit for me? Be honest." },
          { label: "📅 Book me a demo", prompt: "I'm interested — capture my details and book me a demo." },
          { label: "✅ What's proven", prompt: "Which outcomes are verified, and which are still unverified?" },
        ]}
        agentActions={<InstanceAgentActions instanceName={inst.entity.name} siteUrl={inst.entity.links?.site} />}
      >
        <InstanceSite config={inst} />
      </CopilotProvider>
    );
  }

  const initial = await readPortfolioAsync();
  const initialReport = readVerification();
  const initialFitEval = readJobFitEval();
  const initialDeepen = await readDeepenAsync();
  const initialCompass = readCompass();

  // Apply any committed owner wording-edits to the grounding so the agent SAYS the
  // current text (e.g. after "change Genentech to Accenture"). Live/uncommitted edits
  // are reflected by a client readable inside <Portfolio>.
  const edited = applyOverrides({ profile, mission, love, values, futurePractices }, initial.overrides ?? {});

  // The grounding context handed to the on-page agent. Everything it can
  // truthfully SAY (profile/projects) — the editable LAYOUT it can also CHANGE
  // is registered separately inside <Portfolio> via useCopilotReadable + actions.
  const agentContext = JSON.stringify({
    profile: edited.profile,
    mission: edited.mission,
    values: edited.values,
    love: edited.love,
    futurePractices: edited.futurePractices,
    projects: projects.map((p) => ({
      name: p.name,
      category: p.category,
      highlight: p.highlight,
      private: p.private,
      url: p.url,
    })),
    note: "For private projects, share only the highlight and say internals are private.",
    // The 12X practices with their TRUE rubric, so the agent can "explain practice N through TRUE".
    practices12X: {
      rubric: "Each 12X practice must be TRUE — T: transferable & transformative · R: reusable & refinable · U: understandable & U-loop (Theory U, sense→presence→realize) · E: experienceable & experimentable — for a HUMAN and for an AGENT (skill / plugin / dynamic workflow / hook).",
      clusters: CLUSTERS.map((c) => ({ cluster: c.label, gist: c.gist, practiceNumbers: c.ns })),
      practices: edited.futurePractices.map((p) => ({
        n: p.n,
        name: p.name,
        body: p.body,
        TRUE: PRACTICE_DETAILS[p.n]?.facets,
        forHuman: PRACTICE_DETAILS[p.n]?.human,
        forAgent: PRACTICE_DETAILS[p.n]?.agent,
      })),
    },
    capabilities:
      "You can also restyle and restructure this page: add/remove articles, " +
      "reorder/hide/rename sections, switch the brand theme, VERIFY A RÉSUMÉ, CREATE NEW " +
      "CUSTOM SECTIONS, and EDIT THE WORDING of any text — but ONLY for the owner. For a " +
      "'change X to Y' / reword request (e.g. 'change Genentech to Accenture', 'reword the " +
      "blurb'), use editWording (substring replace) or editText (whole field); the page schema " +
      "stays fixed, only the text changes. To create a section that references a " +
      "repo (e.g. 'highlight my agentic tools from sos'), FIRST call getRepoDigest to pull the " +
      "repo's REAL content, then addSection with items composed from it — never invent tools/links. " +
      "If the owner pastes a résumé/CV (or says 'verify this " +
      "résumé'), call the verifyResume action with the text verbatim; it audits each " +
      "claim against the portfolio + live GitHub and fills the Resume Verification section, " +
      "honestly flagging anything that needs an external source (it never rubber-stamps). " +
      "For a visitor, propose the change and say only the owner can apply it. " +
      "Your live role and what's allowed are in the 'YOUR ROLE' readable; answer " +
      "'what can you do?' from there. " +
      "You can EXPLAIN any 12X practice 'through TRUE' (e.g. 'explain practice 4 through TRUE'): " +
      "give its T/R/U/E facets plus the human and agent angle, straight from practices12X — never invent them. " +
      "IMPORTANT: you CANNOT fetch a LinkedIn FEED/ACTIVITY/PROFILE URL (e.g. " +
      "/in/<name>/recent-activity/...) — LinkedIn login-walls it, so the harvest must run in " +
      "the user's OWN logged-in browser. If asked to import 'all posts' or given such a URL, do " +
      "NOT call a fetch tool blindly. Offer the EASIEST path FIRST: the one-click browser " +
      "extension (in extension/) — a button on their LinkedIn page that harvests + imports " +
      "automatically. Then the no-install fallback: the console script at /linkedin-harvest.js " +
      "(paste in DevTools Console) → paste the JSON back with 'import these posts:'. Either way, " +
      "importing needs owner mode unlocked. You CAN fetch a single /pulse/ or /posts/ link directly.",
  });

  return (
    <CopilotProvider context={agentContext}>
      <Portfolio
        initial={initial}
        initialReport={initialReport}
        initialFitEval={initialFitEval}
        initialDeepen={initialDeepen}
        initialCompass={initialCompass}
        content={{ profile, mission, values, love, futurePractices, projects }}
      />
    </CopilotProvider>
  );
}
