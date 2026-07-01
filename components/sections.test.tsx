import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PracticesGrid, ValuesAndLove, CustomSectionBody } from "./sections";

describe("section renderers (extracted from Portfolio.tsx)", () => {
  it("PracticesGrid renders each practice with a zero-padded number", () => {
    render(<PracticesGrid practices={[{ n: 1, name: "Close the loop", body: "generate → judge → refactor" }]} />);
    expect(screen.getByText("Close the loop")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("ValuesAndLove renders the values and the love note", () => {
    render(<ValuesAndLove values={[{ title: "Build in the open", body: "Default to transparency." }]} love="Family first." />);
    expect(screen.getByText("Build in the open")).toBeInTheDocument();
    expect(screen.getByText("Family first.")).toBeInTheDocument();
    expect(screen.getByText(/what i love/i)).toBeInTheDocument();
  });

  it("CustomSectionBody renders an item with its tag and links it when a url is given", () => {
    render(<CustomSectionBody items={[{ title: "SMARC verifier", body: "output-quality check", tag: "skill", url: "https://github.com/wjlgatech/sos" }]} />);
    expect(screen.getByText("SMARC verifier")).toBeInTheDocument();
    expect(screen.getByText("skill")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://github.com/wjlgatech/sos");
  });

  it("CustomSectionBody shows an empty state when there are no items", () => {
    render(<CustomSectionBody items={[]} />);
    expect(screen.getByText(/empty/i)).toBeInTheDocument();
  });
});
