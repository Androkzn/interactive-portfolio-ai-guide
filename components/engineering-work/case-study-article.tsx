import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUpRight, FileCheck2, Mail, Scale, ShieldQuestion } from "lucide-react";
import {
  CaseStudy,
  checkStatusLabels,
  claimById,
  roleKindLabels,
  sourceAvailabilityLabels,
  sourceKindLabels,
  verificationStatusLabels,
} from "@/lib/engineering-work";
import { contactUrl, emailUrl } from "@/lib/site-links";

const backHref = "/#engineering-work";
const backLabel = "Back to engineering work";

/**
 * One visual template for all three case-study pages. The template is shared;
 * the text is not — every section is filled from lib/engineering-work.ts, so a
 * page can be short where there is little to say instead of padded to match the
 * others.
 */
export function CaseStudyArticle({ study }: { study: CaseStudy }) {
  const citedClaims = study.sources.claimIds.map(claimById).filter((claim) => claim !== undefined);
  return (
    // header and footer stay OUTSIDE <main> so they keep their banner and
    // contentinfo landmark roles — inside <main> they demote to generic.
    <div className="case-page" id="top">
      <a className="skip-link" href="#case-problem">Skip to the case study</a>
      <header className="case-page-header">
        <Link className="wordmark" href="/">
          <span className="wordmark-avatar">
            <img className="wordmark-photo" src="/images/andrei-tekhtelev-avatar.png" alt="" aria-hidden="true" />
          </span>
          <span className="wordmark-name">ANDREI<br /><b>TEKHTELEV</b></span>
        </Link>
        <nav className="case-page-contact" aria-label="Contact links">
          <a href={contactUrl} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={13} aria-hidden="true" /></a>
          <a href={emailUrl}>Email <ArrowUpRight size={13} aria-hidden="true" /></a>
        </nav>
      </header>

      <main>
        <article className="case-article">
        <div className="case-intro">
          <Link className="case-back-link" href={backHref}>
            <ArrowLeft size={15} aria-hidden="true" />{backLabel}
          </Link>
          <span className="case-category">{study.category}</span>
          <h1 className="case-title">{study.title}</h1>
          <p className="case-lede">{study.lede}</p>
          <dl className="case-meta">
            {study.context.map((item) => (
              <div className="case-meta-item" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <section className="case-section" id="case-problem" aria-labelledby="case-problem-title">
          <h2 className="case-section-title" id="case-problem-title">
            <span className="case-section-number" aria-hidden="true">01</span>{study.problem.title}
          </h2>
          <div className="case-prose">
            {study.problem.body.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
          </div>
        </section>

        <section className="case-section" id="case-role" aria-labelledby="case-role-title">
          <h2 className="case-section-title" id="case-role-title">
            <span className="case-section-number" aria-hidden="true">02</span>{study.role.title}
          </h2>
          <div className="case-prose"><p>{study.role.intro}</p></div>
          <ul className="case-role-list">
            {study.role.items.map((item) => (
              <li className={`case-role-item case-role-item-${item.kind}`} key={item.text.slice(0, 40)}>
                <span className="case-role-kind">{roleKindLabels[item.kind]}</span>
                <span className="case-role-text">{item.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="case-section" id="case-decision" aria-labelledby="case-decision-title">
          <h2 className="case-section-title" id="case-decision-title">
            <span className="case-section-number" aria-hidden="true">03</span>{study.decision.title}
          </h2>
          <div className="case-prose">
            {study.decision.body.map((paragraph, index) => (
              <p className={index === 0 ? "case-decision-statement" : undefined} key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
          {study.decision.tradeOff && (
            <aside className="case-tradeoff" aria-labelledby="case-tradeoff-title">
              <h3 className="case-tradeoff-title" id="case-tradeoff-title">
                <Scale size={16} aria-hidden="true" />{study.decision.tradeOff.title}
              </h3>
              <div className="case-prose">
                {study.decision.tradeOff.body.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
              </div>
            </aside>
          )}
        </section>

        <section className="case-section" id="case-how-it-works" aria-labelledby="case-how-it-works-title">
          <h2 className="case-section-title" id="case-how-it-works-title">
            <span className="case-section-number" aria-hidden="true">04</span>{study.howItWorks.title}
          </h2>
          <div className="case-prose"><p>{study.howItWorks.intro}</p></div>
          <ol className="case-flow" aria-label={`${study.howItWorks.title}: step by step`}>
            {study.howItWorks.flow.map((step, index) => (
              <li className="case-flow-step" key={step.id}>
                <span className="case-flow-number" aria-hidden="true">{step.id}</span>
                <div className="case-flow-copy">
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
                {index < study.howItWorks.flow.length - 1 && (
                  <ArrowDown className="case-flow-arrow" size={16} aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
          <p className="case-flow-caption"><FileCheck2 size={15} aria-hidden="true" />{study.howItWorks.flowCaption}</p>
          <div className="case-prose">
            {study.howItWorks.narrative.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
          </div>
          {study.howItWorks.disclosures?.map((disclosure) => (
            <details className="case-disclosure" key={disclosure.summary}>
              <summary>{disclosure.summary}</summary>
              <div className="case-prose">
                {disclosure.body.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
              </div>
            </details>
          ))}
        </section>

        <section className="case-section" id="case-verification" aria-labelledby="case-verification-title">
          <h2 className="case-section-title" id="case-verification-title">
            <span className="case-section-number" aria-hidden="true">05</span>{study.verification.title}
          </h2>
          <div className="case-prose"><p>{study.verification.intro}</p></div>
          <ul className="case-check-list">
            {study.verification.checks.map((check) => {
              const claim = check.claimId ? claimById(check.claimId) : undefined;
              return (
                <li className={`case-check case-check-${check.status}`} key={check.title}>
                  <span className="case-check-status">{checkStatusLabels[check.status]}</span>
                  <div className="case-check-copy">
                    <strong>{check.title}</strong>
                    <p>{check.detail}</p>
                    {claim && (
                      <p className="case-check-source">
                        {verificationStatusLabels[claim.verificationStatus]} · {claim.sourceRef}
                        {claim.sourceDate !== "unknown" && ` · ${claim.sourceDate}`}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="case-section" id="case-outcome" aria-labelledby="case-outcome-title">
          <h2 className="case-section-title" id="case-outcome-title">
            <span className="case-section-number" aria-hidden="true">06</span>{study.outcome.title}
          </h2>
          <div className="case-outcome-grid">
            <div className="case-outcome-block case-outcome-results">
              <h3>What the work produced</h3>
              <ul>{study.outcome.results.map((item) => <li key={item.slice(0, 40)}>{item}</li>)}</ul>
            </div>
            <div className="case-outcome-block case-outcome-limits">
              <h3>What this does not show</h3>
              <ul>{study.outcome.limitations.map((item) => <li key={item.slice(0, 40)}>{item}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className="case-section" id="case-sources" aria-labelledby="case-sources-title">
          <h2 className="case-section-title" id="case-sources-title">
            <span className="case-section-number" aria-hidden="true">07</span>{study.sources.title}
          </h2>
          <div className="case-prose"><p>{study.sources.intro}</p></div>
          <ul className="case-source-list">
            {study.sources.items.map((item) => (
              <li className="case-source" key={item.label}>
                <span className="case-source-kind">{sourceKindLabels[item.kind]}</span>
                <div className="case-source-copy">
                  {item.href
                    ? <a href={item.href} target="_blank" rel="noreferrer">{item.label} <ArrowUpRight size={13} aria-hidden="true" /></a>
                    : <strong>{item.label}</strong>}
                  <p>{item.note}</p>
                </div>
                <span className="case-source-availability">{sourceAvailabilityLabels[item.availability]}</span>
              </li>
            ))}
          </ul>
          {citedClaims.length > 0 && (
            <details className="case-claims">
              <summary>
                <ShieldQuestion size={15} aria-hidden="true" />
                Every figure on this page, with what it measures and what it does not prove ({citedClaims.length})
              </summary>
              <ul className="case-claim-list">
                {citedClaims.map((claim) => (
                  <li className="case-claim" key={claim.id}>
                    <p className="case-claim-statement">{claim.claim}</p>
                    <dl className="case-claim-fields">
                      <div><dt>Verification</dt><dd>{verificationStatusLabels[claim.verificationStatus]}</dd></div>
                      <div><dt>Source</dt><dd>{claim.sourceRef}{claim.sourceDate !== "unknown" && ` (${claim.sourceDate})`}</dd></div>
                      <div><dt>Environment</dt><dd>{claim.environment}</dd></div>
                      <div><dt>What is measured</dt><dd>{claim.measurementDefinition}</dd></div>
                      <div><dt>Limits</dt><dd>{claim.limitations}</dd></div>
                    </dl>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
        </article>
      </main>

      <footer className="case-page-footer">
        <Link className="case-back-link" href={backHref}>
          <ArrowLeft size={15} aria-hidden="true" />{backLabel}
        </Link>
        <a className="case-contact-link" href={emailUrl}>
          <Mail size={17} aria-hidden="true" /><span>Ask me about this work</span><ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
