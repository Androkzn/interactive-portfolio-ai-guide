// Why a lane stops waiting, and what it would still have had to download: plain markup, no hooks,
// used by the live race (the lab page's method section words the same reasoning on its own).
import type { FullPageWeight, RaceLink } from "@/packages/contracts/src/site-race";

/** The research behind the 10 s cap. Every number is quoted as its source states it (links checked 2026-11-24). */
const PATIENCE_SOURCES = {
  /** "10 seconds keeps the user's attention." · "A 10-second delay will often make users leave a site immediately." (2010) */
  website: { name: "Nielsen Norman Group", title: "Website Response Times", href: "https://www.nngroup.com/articles/website-response-times/" },
  /** "53% of visits are likely to be abandoned if pages take longer than 3 seconds to load" (2016) */
  mobile: { name: "Google, 2016", title: "The need for mobile speed", href: "https://blog.google/products/admanager/the-need-for-mobile-speed/" },
} as const;

/** The limit the research is about: the note explains a 10 s cap, and only that one. */
const RESEARCHED_CAP_MS = 10_000;

export const capSeconds = (capMs: number) => `${Math.round(capMs / 100) / 10} s`;
const mbText = (kb: number) => `${(kb / 1024).toFixed(1)} MB`;

function Source({ source }: { source: (typeof PATIENCE_SOURCES)[keyof typeof PATIENCE_SOURCES] }) {
  return <a href={source.href} target="_blank" rel="noreferrer" title={source.title}>{source.name}</a>;
}

/** In the lane, the moment it is stopped: why the race gives up there. */
export function PatienceWhy({ capMs }: { capMs: number }) {
  if (capMs !== RESEARCHED_CAP_MS) return <>Stopped at the {capSeconds(capMs)} cap.</>;
  return (
    <>
      Stopped at {capSeconds(capMs)}: by then attention has moved on, and a 10-second delay will often make users leave a site (<Source source={PATIENCE_SOURCES.website} />).
      {" "}On phones, 53% of visits are likely to be abandoned if pages take longer than 3 seconds to load (<Source source={PATIENCE_SOURCES.mobile} />).
    </>
  );
}

/** The least time `kb` takes over the link: bandwidth alone, so a true lower bound (rounded down). */
function minDownloadSeconds(kb: number, link: RaceLink): number {
  const seconds = (kb * 1024 * 8) / (link.downMbps * 1e6);
  return seconds >= 10 ? Math.floor(seconds) : Math.floor(seconds * 10) / 10;
}

/**
 * What a lane stopped at the cap still had ahead of it. With the warm-up's full count: the page's
 * weight and, on a throttled link, the least time it takes to download (only when that is longer
 * than the cap, or it explains nothing). Without one: what had arrived and what was still in flight.
 */
export function FullPageLine({ fullPage, link, capMs, received, inFlight }: { fullPage: FullPageWeight | null; link: RaceLink | null; capMs: number; received: number; inFlight: number | null }) {
  if (!fullPage?.loaded) {
    return <><b>Still downloading:</b> {mbText(received)} in by {capSeconds(capMs)}{inFlight ? `, ${inFlight} request${inFlight === 1 ? "" : "s"} still in flight` : ""}.</>;
  }
  const seconds = link ? minDownloadSeconds(fullPage.kb, link) : null;
  return (
    <>
      <b>Full page: {mbText(fullPage.kb)}</b>
      {seconds !== null && seconds * 1000 > capMs ? <>, at least {seconds} s to download on this connection ({link!.downMbps} Mbps).</> : "."}
    </>
  );
}
