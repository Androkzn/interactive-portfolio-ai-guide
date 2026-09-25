import { describe, expect, it } from "vitest";

import {
  caseStudies,
  caseStudyById,
  checkStatusLabels,
  claimRegistry,
  engineeringWorkCards,
  roleKindLabels,
  sourceKindLabels,
  verificationStatusLabels,
} from "./engineering-work";
import type {
  CaseStudy,
  CaseStudyId,
  CheckStatus,
  Claim,
  RoleKind,
  SourceItem,
  VerificationStatus,
} from "./engineering-work";

/** Fails to compile when the union and the literal tuple drift apart. */
type Exhaustive<Union, Listed> = [Union] extends [Listed]
  ? [Listed] extends [Union]
    ? true
    : never
  : never;

const expectedCardOrder = ["step-social-platform", "step-ai-coach", "ai-assisted-plan-review"] as const;

const referencedClaimIds = new Set(
  caseStudies.flatMap((study) => [
    ...study.sources.claimIds,
    ...study.verification.checks.flatMap((check) => (check.claimId ? [check.claimId] : [])),
  ]),
);

const claimIds = new Set(claimRegistry.map((claim) => claim.id));

describe("homepage cards and case-study pages agree", () => {
  it("pairs every card with the case study it links to", () => {
    for (const card of engineeringWorkCards) {
      const study = caseStudies.find((item) => item.id === card.id);
      expect(study, `no case study for card ${card.id}`).toBeDefined();
      expect({ id: card.id, href: card.href, category: card.category, title: card.title }).toEqual({
        id: study!.id,
        href: study!.href,
        category: study!.category,
        title: study!.title,
      });
    }
  });

  it("uses trailing-slash /work/ hrefs everywhere", () => {
    for (const { id, href } of [...engineeringWorkCards, ...caseStudies]) {
      expect(href.startsWith("/work/"), `${id}: href must start with /work/ (${href})`).toBe(true);
      expect(href.endsWith("/"), `${id}: href must end with a trailing slash (${href})`).toBe(true);
    }
  });

  it("keeps exactly three cards, in the published order", () => {
    expect(engineeringWorkCards).toHaveLength(3);
    expect(engineeringWorkCards.map((card) => card.id)).toEqual([...expectedCardOrder]);
  });

  it("has unique claim ids and unique case-study ids", () => {
    expect(claimIds.size).toBe(claimRegistry.length);
    expect(new Set(caseStudies.map((study) => study.id)).size).toBe(caseStudies.length);
  });
});

describe("claim registry backs every published statement", () => {
  it("resolves every referenced claim id", () => {
    for (const study of caseStudies) {
      for (const id of study.sources.claimIds) {
        expect(claimIds.has(id), `${study.id}: sources reference unknown claim ${id}`).toBe(true);
      }
      for (const check of study.verification.checks) {
        if (!check.claimId) continue;
        expect(
          claimIds.has(check.claimId),
          `${study.id}: verification check "${check.title}" references unknown claim ${check.claimId}`,
        ).toBe(true);
      }
    }
  });

  it("defines how each claim is measured, and what it does not prove", () => {
    for (const claim of claimRegistry) {
      expect(claim.measurementDefinition.trim(), `${claim.id}: empty measurementDefinition`).not.toBe("");
      expect(claim.limitations.trim(), `${claim.id}: empty limitations`).not.toBe("");
      expect(
        claim.measurementDefinition.trim(),
        `${claim.id}: measurementDefinition restates the claim instead of defining it`,
      ).not.toBe(claim.claim.trim());
    }
  });

  it("publishes only approved claims, and uses every claim it publishes", () => {
    for (const claim of claimRegistry) {
      if (claim.publicUse === "published") {
        expect(
          referencedClaimIds.has(claim.id),
          `${claim.id}: marked published but no case study references it`,
        ).toBe(true);
      }
      if (claim.publicationApproval === "withheld" || claim.publicationApproval === "pending-owner-approval") {
        expect(
          referencedClaimIds.has(claim.id),
          `${claim.id}: ${claim.publicationApproval} but referenced by a case study`,
        ).toBe(false);
        expect(claim.publicUse, `${claim.id}: ${claim.publicationApproval} but publicUse is published`).toBe(
          "registry-only",
        );
      }
    }
  });

  it("never calls a claim runtime-verified on the strength of a document", () => {
    const runtimeEvidence: Claim["sourceType"][] = ["test-run", "dashboard"];
    for (const claim of claimRegistry) {
      if (claim.verificationStatus !== "runtime-verified") continue;
      expect(
        runtimeEvidence.includes(claim.sourceType),
        `${claim.id}: runtime-verified requires a test-run or dashboard source, got ${claim.sourceType}`,
      ).toBe(true);
    }
  });
});

describe("every case study is complete", () => {
  const nonEmpty = (study: CaseStudy, field: string, value: string) => {
    expect(value.trim(), `${study.id}: empty ${field}`).not.toBe("");
  };

  it("carries problem, role, decision, mechanism, verification, outcome and sources", () => {
    for (const study of caseStudies) {
      nonEmpty(study, "problem.title", study.problem.title);
      expect(study.problem.body.length, `${study.id}: empty problem body`).toBeGreaterThan(0);

      nonEmpty(study, "role.title", study.role.title);
      nonEmpty(study, "role.intro", study.role.intro);
      expect(study.role.items.length, `${study.id}: empty role items`).toBeGreaterThan(0);
      expect(
        study.role.items.some((item) => item.kind === "implemented"),
        `${study.id}: no role item of kind "implemented"`,
      ).toBe(true);

      nonEmpty(study, "decision.title", study.decision.title);
      expect(study.decision.body.length, `${study.id}: empty decision body`).toBeGreaterThan(0);

      nonEmpty(study, "howItWorks.title", study.howItWorks.title);
      nonEmpty(study, "howItWorks.flowCaption", study.howItWorks.flowCaption);
      expect(study.howItWorks.flow.length, `${study.id}: empty flow`).toBeGreaterThan(0);
      expect(study.howItWorks.narrative.length, `${study.id}: empty howItWorks narrative`).toBeGreaterThan(0);

      nonEmpty(study, "verification.title", study.verification.title);
      expect(study.verification.checks.length, `${study.id}: no verification checks`).toBeGreaterThan(0);

      nonEmpty(study, "outcome.title", study.outcome.title);
      expect(study.outcome.results.length, `${study.id}: no outcome results`).toBeGreaterThan(0);
      expect(study.outcome.limitations.length, `${study.id}: no outcome limitations`).toBeGreaterThan(0);

      nonEmpty(study, "sources.title", study.sources.title);
      nonEmpty(study, "sources.intro", study.sources.intro);
      expect(study.sources.items.length, `${study.id}: no source items`).toBeGreaterThan(0);
    }
  });

  it("has publishable metadata on every page", () => {
    for (const study of caseStudies) {
      nonEmpty(study, "metaTitle", study.metaTitle);
      nonEmpty(study, "metaDescription", study.metaDescription);
      expect(
        study.metaDescription.length,
        `${study.id}: metaDescription is ${study.metaDescription.length} characters`,
      ).toBeLessThan(200);
    }
  });

  it("looks studies up by id and refuses unknown ids", () => {
    for (const id of expectedCardOrder) {
      expect(caseStudyById(id).id).toBe(id);
    }
    expect(() => caseStudyById("nope" as CaseStudyId)).toThrow(/Unknown case study/);
  });
});

describe("label maps cover their unions", () => {
  it("labels every check status", () => {
    const statuses = ["automated", "documented", "static-audit", "historical-run", "not-run", "open-question"] as const;
    const _exhaustive: Exhaustive<CheckStatus, (typeof statuses)[number]> = true;
    expect(_exhaustive).toBe(true);
    expect(Object.keys(checkStatusLabels).sort()).toEqual([...statuses].sort());
    expect(Object.values(checkStatusLabels).every((label) => label.trim() !== "")).toBe(true);
  });

  it("labels every role kind", () => {
    const kinds = ["implemented", "led", "team"] as const;
    const _exhaustive: Exhaustive<RoleKind, (typeof kinds)[number]> = true;
    expect(_exhaustive).toBe(true);
    expect(Object.keys(roleKindLabels).sort()).toEqual([...kinds].sort());
    expect(Object.values(roleKindLabels).every((label) => label.trim() !== "")).toBe(true);
  });

  it("labels every source kind", () => {
    const kinds = ["source-code", "test-run", "audit", "technical-write-up", "owner-account"] as const;
    const _exhaustive: Exhaustive<SourceItem["kind"], (typeof kinds)[number]> = true;
    expect(_exhaustive).toBe(true);
    expect(Object.keys(sourceKindLabels).sort()).toEqual([...kinds].sort());
    expect(Object.values(sourceKindLabels).every((label) => label.trim() !== "")).toBe(true);
  });

  it("labels every verification status", () => {
    const statuses = ["author-reported", "source-inspected", "runtime-verified", "target-planned"] as const;
    const _exhaustive: Exhaustive<VerificationStatus, (typeof statuses)[number]> = true;
    expect(_exhaustive).toBe(true);
    expect(Object.keys(verificationStatusLabels).sort()).toEqual([...statuses].sort());
    expect(Object.values(verificationStatusLabels).every((label) => label.trim() !== "")).toBe(true);
  });
});
