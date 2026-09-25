import Link from "next/link";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { engineeringWorkCards } from "@/lib/engineering-work";

/**
 * "Selected engineering work" — the one section of concrete engineering work on
 * the homepage. It replaces the former "Systems that hold up after they ship"
 * metric grid and the standalone "From evidence to production" workflow
 * section; the workflow material now lives inside the third case study.
 *
 * The legacy anchors are kept as jump points so older links still land here
 * instead of 404-ing on a hash, without duplicating the section.
 */
export function EngineeringWorkSection() {
  return (
    <section className="engineering-work-section" id="engineering-work" aria-labelledby="engineering-work-title">
      <span className="anchor-alias" id="production-engineering" aria-hidden="true" />
      <span className="anchor-alias" id="ai-engineering" aria-hidden="true" />
      <div className="engineering-work-heading">
        <div>
          <div className="section-eyebrow"><Layers3 size={14} />Engineering case studies</div>
          <h2 id="engineering-work-title">Selected engineering <em>work.</em></h2>
        </div>
        <p>Products I helped build, decisions I owned, and what changed as a result.</p>
      </div>
      <div className="engineering-work-grid">
        {engineeringWorkCards.map((card) => (
          <article className="engineering-work-card" key={card.id} aria-labelledby={`engineering-work-${card.id}`}>
            <span className="engineering-work-category">{card.category}</span>
            <h3 className="engineering-work-card-title" id={`engineering-work-${card.id}`}>{card.title}</h3>
            <p className="engineering-work-card-summary">{card.description}</p>
            <dl className="engineering-work-facts">
              <div className="engineering-work-fact">
                <dt>My contribution</dt>
                <dd>{card.contribution}</dd>
              </div>
              <div className="engineering-work-fact">
                <dt>Key decision</dt>
                <dd>{card.decision}</dd>
              </div>
            </dl>
            <p className="engineering-work-signal">
              <span className="engineering-work-signal-label">{card.signal.label}</span>
              <span className="engineering-work-signal-value">{card.signal.value}</span>
            </p>
            <Link className="engineering-work-cta" href={card.href}>
              <span>{card.cta}</span>
              <ArrowUpRight size={16} aria-hidden="true" />
              <span className="sr-only">: {card.title}</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
