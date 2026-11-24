import type { CSSProperties } from "react";
import styles from "./performance-lab-teaser.module.css";

/*
 * Race-lane art, drawn as original inline SVG for this site (no third-party car designs).
 * The only mark on either car is the Next.js logo on the F1 car, which labels the optimized lane.
 *
 * Both cars share one scale, 1 unit = 25 mm, so they read as real vehicles side by side:
 *   F1 car    5.6 m long, 0.95 m tall, 3.6 m wheelbase, 720 mm tyres on 18" rims
 *   hatchback 4.06 m long, 1.46 m tall, 2.56 m wheelbase, 195/65 R15 tyres
 * The ground line is y = 62 in both viewBoxes. Body, wheels and suspension are separate layers so the
 * CSS can roll the wheels with the distance travelled and pitch the body under load (see the .module.css).
 */

export const F1_VIEW = { w: 236, h: 66 };
export const HATCH_VIEW = { w: 166, h: 66 };

const origin = (x: number, y: number) => ({ transformOrigin: `${x}px ${y}px` }) as CSSProperties;

function NextLogo({ cx, cy, r, id, light = false }: { cx: number; cy: number; r: number; id: string; light?: boolean }) {
  // Vector Next.js mark: a disc and an "N" whose diagonal and right stem fade out. `light` is the
  // white variant (white disc, black N) that reads clearly on the violet bodywork.
  const s = r / 90;
  const ink = light ? "#000" : "#fff";
  return (
    <g transform={`translate(${cx - 90 * s} ${cy - 90 * s}) scale(${s})`}>
      <defs>
        <linearGradient id={`${id}-a`} x1="109" y1="116.5" x2="144.5" y2="160.5" gradientUnits="userSpaceOnUse"><stop stopColor={ink} /><stop offset="1" stopColor={ink} stopOpacity="0" /></linearGradient>
        <linearGradient id={`${id}-b`} x1="121" y1="54" x2="120.8" y2="106.9" gradientUnits="userSpaceOnUse"><stop stopColor={ink} /><stop offset="1" stopColor={ink} stopOpacity="0" /></linearGradient>
      </defs>
      <circle cx="90" cy="90" r="90" fill={light ? "#fff" : "#000"} />
      <circle cx="90" cy="90" r="86" fill="none" stroke={light ? "#000" : "#fff"} strokeOpacity={light ? ".14" : ".9"} strokeWidth="6" />
      <path d="M149.5 157.5L69.1 54H54v72h12.1V69.4l73.8 95.4a90.2 90.2 0 009.6-7.3z" fill={`url(#${id}-a)`} />
      <rect x="115" y="54" width="12" height="72" fill={`url(#${id}-b)`} />
    </g>
  );
}

/* ---------- wheels ---------- */

function F1Wheel({ cx }: { cx: number }) {
  const cy = 47.6;
  return (
    <g>
      <ellipse cx={cx} cy={61.6} rx={13} ry={1.3} fill="#000" opacity=".75" />
      <circle cx={cx} cy={cy} r={14.4} fill="url(#rc-f1Tyre)" />
      <circle cx={cx} cy={cy} r={14.05} fill="none" stroke="#000" strokeWidth=".5" />
      <circle cx={cx} cy={cy} r={13.2} fill="none" stroke="#ffffff" strokeOpacity=".05" strokeWidth="1.1" />
      {/* Rolls with the car: compound stripe and sidewall lettering show the rotation. */}
      <g className={styles.rollNext} style={origin(cx, cy)}>
        <circle cx={cx} cy={cy} r={11.9} fill="none" stroke="#e6ff8a" strokeWidth=".75" strokeDasharray="25 12.4" />
        <circle cx={cx} cy={cy} r={12.95} fill="none" stroke="#8c9098" strokeWidth=".7" strokeDasharray="1.1 .45 .7 .45 1.5 .45 .5 .45 1.1 9 .8 .45 1.3 .45 .6 .45 1.2 14" />
        <circle cx={cx} cy={cy} r={9.1} fill="url(#rc-f1Rim)" />
        <circle cx={cx} cy={cy} r={8.55} fill="url(#rc-f1Cover)" stroke="#55575e" strokeWidth=".35" />
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={`M${cx} ${cy - 2.6}L${cx} ${cy - 8}`} stroke="#ffffff" strokeOpacity=".13" strokeWidth=".9" strokeLinecap="round" transform={`rotate(${i * 72} ${cx} ${cy})`} />
        ))}
        <circle cx={cx} cy={cy} r={2.3} fill="#1a1b1f" stroke="#6d7078" strokeWidth=".4" />
        <circle cx={cx + .9} cy={cy - .4} r={.6} fill="#d4ff76" />
      </g>
      {/* At speed the stripe smears into a ring, as it does on camera. */}
      <circle className={styles.wheelBlur} cx={cx} cy={cy} r={11.9} fill="none" stroke="#e6ff8a" strokeWidth=".9" />
      <path d={`M${cx - 12.4} ${cy - 5}A13.4 13.4 0 0 1 ${cx + 4} ${cy - 12.8}`} fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth=".8" strokeLinecap="round" />
    </g>
  );
}

function HatchWheel({ cx }: { cx: number }) {
  const cy = 49.3;
  return (
    <g>
      <ellipse cx={cx} cy={61.7} rx={11.4} ry={1.2} fill="#000" opacity=".7" />
      <circle cx={cx} cy={cy} r={12.7} fill="url(#rc-hTyre)" />
      <circle cx={cx} cy={cy} r={12.35} fill="none" stroke="#000" strokeWidth=".45" />
      <circle cx={cx} cy={cy} r={7.9} fill="#16171a" />
      {/* Brake disc and caliper stay put while the alloy turns in front of them. */}
      <circle cx={cx} cy={cy} r={6.3} fill="url(#rc-hDisc)" />
      <circle cx={cx} cy={cy} r={3.1} fill="#3a3c41" />
      <path d={`M${cx - 6.1} ${cy - 2.6}A6.6 6.6 0 0 1 ${cx - 2.6} ${cy - 6.1}L${cx - 1.9} ${cy - 4.5}A4.9 4.9 0 0 0 ${cx - 4.5} ${cy - 1.9}Z`} fill="#2d2f34" stroke="#55585f" strokeWidth=".3" />
      <g className={styles.rollOriginal} style={origin(cx, cy)}>
        <circle cx={cx} cy={cy} r={10.4} fill="none" stroke="#6f737b" strokeWidth=".55" strokeDasharray="1 .4 .6 .4 1.3 .4 .5 .4 1 8 .7 .4 1.2 .4 .5 .4 1 12" />
        <circle cx={cx} cy={cy} r={7.6} fill="none" stroke="url(#rc-hRim)" strokeWidth="1.1" />
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 72} ${cx} ${cy})`}>
            <path d={`M${cx - 1.15} ${cy - 1.8}L${cx - 1.5} ${cy - 7.3}H${cx - .25}L${cx - .2} ${cy - 1.9}Z`} fill="url(#rc-hRim)" />
            <path d={`M${cx + .2} ${cy - 1.9}L${cx + .25} ${cy - 7.3}H${cx + 1.5}L${cx + 1.15} ${cy - 1.8}Z`} fill="url(#rc-hRim)" />
          </g>
        ))}
        <circle cx={cx} cy={cy} r={2.2} fill="url(#rc-hRim)" stroke="#6d7077" strokeWidth=".3" />
        {Array.from({ length: 4 }, (_, i) => <circle key={i} cx={cx + Math.cos(i * Math.PI / 2 + .4) * 1.35} cy={cy + Math.sin(i * Math.PI / 2 + .4) * 1.35} r=".32" fill="#55575e" />)}
      </g>
      <circle className={styles.wheelBlurSlow} cx={cx} cy={cy} r={5.4} fill="none" stroke="#c9ccd2" strokeWidth="3.8" />
      <path d={`M${cx - 11} ${cy - 4.6}A11.9 11.9 0 0 1 ${cx + 3.4} ${cy - 11.4}`} fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth=".7" strokeLinecap="round" />
    </g>
  );
}

/* ---------- Formula 1 car (Next.js lane) ---------- */

export function F1Car() {
  return (
    <svg viewBox={`0 0 ${F1_VIEW.w} ${F1_VIEW.h}`} className={styles.carSvg} aria-hidden="true">
      <defs>
        <linearGradient id="rc-f1Paint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e1dcff" /><stop offset=".22" stopColor="#a99eff" /><stop offset=".5" stopColor="#7a6be6" />
          <stop offset=".54" stopColor="#5546b8" /><stop offset=".8" stopColor="#3b2f8f" /><stop offset="1" stopColor="#1e1750" />
        </linearGradient>
        <linearGradient id="rc-f1Pod" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9d3ff" /><stop offset=".28" stopColor="#9a8ef5" /><stop offset=".52" stopColor="#6e5fd8" />
          <stop offset=".56" stopColor="#4b3da9" /><stop offset="1" stopColor="#1c1549" />
        </linearGradient>
        <linearGradient id="rc-carbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a4d55" /><stop offset=".35" stopColor="#24262b" /><stop offset="1" stopColor="#0b0c0e" /></linearGradient>
        <linearGradient id="rc-halo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7d8089" /><stop offset=".5" stopColor="#2a2c31" /><stop offset="1" stopColor="#121316" /></linearGradient>
        <linearGradient id="rc-visor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7b8cff" /><stop offset=".45" stopColor="#1b1f3a" /><stop offset="1" stopColor="#05060b" /></linearGradient>
        <linearGradient id="rc-helmet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".6" stopColor="#d7d8de" /><stop offset="1" stopColor="#8f919a" /></linearGradient>
        <radialGradient id="rc-f1Tyre" cx=".42" cy=".38" r=".62"><stop offset=".62" stopColor="#2c2d31" /><stop offset=".86" stopColor="#16171a" /><stop offset="1" stopColor="#050506" /></radialGradient>
        <radialGradient id="rc-f1Rim" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#c9ccd3" /><stop offset=".6" stopColor="#6e717a" /><stop offset="1" stopColor="#2a2c31" /></radialGradient>
        <radialGradient id="rc-f1Cover" cx=".38" cy=".3" r=".8"><stop offset="0" stopColor="#4a4d56" /><stop offset=".55" stopColor="#1f2126" /><stop offset="1" stopColor="#0d0e10" /></radialGradient>
        <radialGradient id="rc-shadow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#000" stopOpacity=".8" /><stop offset=".7" stopColor="#000" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
      </defs>

      <ellipse cx="122" cy="62.2" rx="118" ry="3.6" fill="url(#rc-shadow)" />

      <g className={styles.carPitch} style={origin(44, 62)}>
        <g className={styles.carBob}>
          {/* Rear wing: swept endplate, main plane + DRS flap in profile, swan-neck pylon, rain light. */}
          <path d="M23 36.5L26.5 47.5H30L27 36.5Z" fill="#141518" />
          <path d="M7.4 22.4H29.2C30.6 22.4 31.2 23.4 30.7 24.6L27.4 33.4C25.8 37.6 23.2 40.6 19.2 42.2L10.6 45.2C8 46 6.2 44.8 6.2 42.4V23.6C6.2 22.9 6.7 22.4 7.4 22.4Z" fill="url(#rc-carbon)" />
          <path d="M29.6 30.6C24 29.6 18.4 28.4 13.4 27.6L13 29C18.6 30.4 24 31.6 29.2 32.4Z" fill="#5d616b" />
          <path d="M14 27.2C11.4 26 9.2 24.8 7.4 23.6L7 25.2C9 26.6 11.2 27.8 13.6 28.6Z" fill="#5d616b" />
          <path d="M13.4 27.6L14 27.2" stroke="#d4ff76" strokeWidth=".6" />
          <path d="M23.6 31.2L25 22.8" stroke="#08090b" strokeWidth=".5" />
          <path d="M7.4 22.4H29.2" stroke="#b9aeff" strokeWidth=".9" />
          <path d="M8.2 31.4H25.6" stroke="#fff" strokeOpacity=".08" strokeWidth=".5" />
          <text x="16.4" y="38.6" textAnchor="middle" fill="#fff" fontFamily="Inter, system-ui, sans-serif" fontSize="4.2" fontWeight="800" letterSpacing=".15">NEXT.JS</text>
          <rect x="6.6" y="40.2" width="2.2" height="3" rx=".5" fill="#ff3b30" className={styles.rainLight} />

          {/* Beam wing, gearbox / crash structure and diffuser kick-up. */}
          <path d="M28.6 48.4C24 47.6 18 47.6 12.6 48.4L12.8 49.6C18.4 49.2 24 49.4 28.4 49.8Z" fill="#2c2e34" />
          <path d="M28 45.4L44 44.2L58 47L58 52.4L30 50.6C28.4 50.4 27.6 49.4 27.6 48.2Z" fill="url(#rc-carbon)" />
          <path d="M60 60.6L28 56.2C26.6 56 25.8 55.2 26 54L26.6 52.6L58 55.6Z" fill="#0b0c0e" />

          {/* Floor, plank and floor-edge wing. */}
          <path d="M58 61L176 61L180 59.4L176 57.2L60 57.4Z" fill="#101114" />
          <path d="M72 61.3H170" stroke="#2a2c31" strokeWidth=".7" />
          {[84, 112, 140, 160].map(x => <rect key={x} x={x} y={60.9} width={2.2} height={.8} rx={.3} fill="#9aa0a8" />)}
          <path d="M60 57.4C61 55.2 63.4 54 66.4 53.8L70 56.8Z" fill="#17181c" />

          {/* Rear suspension and driveshaft, hidden behind the wheel except between wheel and body. */}
          <path d="M44 46L62 42.6M44 49.4L64 51.4M46 47.6L60 47.4" stroke="#24262b" strokeWidth="1" strokeLinecap="round" />

          {/* Monocoque, nose and engine cover in one pressing, with the horizon reflection in the paint. */}
          <path d="M36 47L40 45.4C56 41.4 80 35 98 29.4C104 27.5 108 25 111 24L118 23.6C119.6 23.6 120.5 24.6 120.1 26L119 33.4L142 34C150 34.3 158 35.6 166 37.6C180 41 200 46 222 50.6C225 51.2 227 52 227 53.2C227 54.4 225.6 55 223.6 55C205 54.6 188 53.6 176 54L150 55.6L60 56.8L40 50.2Z" fill="url(#rc-f1Paint)" />
          <path d="M58 41.6C78 36.6 96 31 110.4 25.8" stroke="#fff" strokeOpacity=".6" strokeWidth=".6" fill="none" strokeLinecap="round" />
          {/* Engine-cover cooling louvres and the chassis / nose bulkhead seams. */}
          <g stroke="#1a1450" strokeOpacity=".7" strokeWidth=".5" strokeLinecap="round">
            {[0, 1, 2, 3, 4, 5].map(i => <path key={i} d={`M${72 + i * 3.2} ${40.6 - i * .9}l2.2 -.7`} />)}
            <path d="M166.4 38L164.6 54.4M119.4 33.6L119 55.6" strokeOpacity=".45" strokeWidth=".4" />
          </g>
          <path d="M146 35C160 35.8 176 39.8 196 45C206 47.6 216 49.6 224 51.2" stroke="#fff" strokeOpacity=".5" strokeWidth=".6" fill="none" strokeLinecap="round" />
          <path d="M150 44.6C170 46.6 196 50 222 53" stroke="#d4ff76" strokeWidth=".8" fill="none" strokeLinecap="round" />
          <path d="M64 44.4C80 41.4 92 38 100 35.6" stroke="#1a1450" strokeOpacity=".5" strokeWidth=".45" fill="none" />
          {/* Roll-hoop airbox and onboard camera pod. */}
          <path d="M115.4 24.2H118.4C119.3 24.2 119.7 24.9 119.5 25.8L118.9 29.2C117.4 29 116 28.2 115.2 27.2Z" fill="#06070a" />
          <rect x="111.6" y="22" width="4.6" height="1.8" rx=".6" fill="#111215" />
          <rect x="111.6" y="22" width="2.2" height="1.8" rx=".6" fill="#d4ff76" />

          {/* Cockpit opening, headrest and driver. */}
          <path d="M119.2 30.4L140.6 33.2L141.6 34.6L119 34.4Z" fill="#07080a" />
          <path d="M118.6 29.8C119.6 29.4 121 29.4 121.6 30.2L122 34.2H118.8Z" fill="#1d1f24" />
          <path d="M121 31.8C121 27.8 123.4 25.6 126.2 25.6C129.4 25.6 131.2 27.8 131.2 30.4L130.8 32.4C130.4 33.4 129.4 34 128.2 34H122.2C121.5 34 121 33.4 121 32.8Z" fill="url(#rc-helmet)" />
          <path d="M126.8 28.4H130.8C131.1 29.2 131.1 30.2 130.9 31H126.6C126.2 30 126.2 29.2 126.8 28.4Z" fill="url(#rc-visor)" />
          <path d="M121.4 31.6C123.6 31 126 31 128.4 31.6" stroke="#6e5fd8" strokeWidth=".9" fill="none" />
          <path d="M123 27C124.2 26.2 125.6 26 127 26.2" stroke="#fff" strokeWidth=".55" fill="none" strokeLinecap="round" />

          {/* Halo: rear mounts behind the helmet, over the head, down the centre pillar. */}
          <path d="M118.8 33.2C119.2 29.6 120.6 27.8 123.4 27.4L136.4 27.6C139 27.7 140.4 28.8 141.2 30.6L142.6 34" fill="none" stroke="url(#rc-halo)" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M123.6 26.9L136.2 27.1" stroke="#fff" strokeOpacity=".35" strokeWidth=".4" strokeLinecap="round" />

          {/* Sidepod with undercut and inlet; Next.js roundel where a race number would go. */}
          <path d="M66 52.6C76 46.4 88 40.8 104 38.4C116 36.6 128 36.4 136 37C139 37.2 140.6 38.2 140.6 40L140 43.2C136 44.4 133 46.8 132 50C131 53.4 132 55.4 136 56.4L70 56.8Z" fill="url(#rc-f1Pod)" />
          <path d="M140.6 39.4L140 43.2C138.6 43.6 137.6 43.2 137.6 42L138 39.6C138.8 39.1 139.8 39 140.6 39.4Z" fill="#06070a" />
          <path d="M80 44.4C92 40.6 104 38.8 118 37.6C126 37 132 37 136.6 37.4" stroke="#fff" strokeOpacity=".6" strokeWidth=".6" fill="none" strokeLinecap="round" />
          <path d="M74 53.4C92 51.2 112 50.4 130 50.6" stroke="#d4ff76" strokeWidth=".75" fill="none" strokeLinecap="round" />
          <path d="M70 56.4C90 55.4 112 55 133 55.6" stroke="#0d0a2a" strokeOpacity=".6" strokeWidth=".5" fill="none" />
          <path d="M132.4 49.6C133.2 46.6 135.6 44.6 139.4 43.6" stroke="#fff" strokeOpacity=".25" strokeWidth=".4" fill="none" />
          <NextLogo cx={107} cy={46.4} r={7} id="rc-podLogo" light />

          {/* Mirror on its stalk, outboard of the halo. */}
          <path d="M132.6 36.8L133.8 32.6" stroke="#1a1b20" strokeWidth=".8" />
          <path d="M130 30.4H135.4C136.2 30.4 136.6 31 136.4 31.8L136 32.8C135.8 33.2 135.4 33.4 135 33.4H130.6C130 33.4 129.6 33 129.6 32.4V30.8C129.6 30.6 129.8 30.4 130 30.4Z" fill="url(#rc-f1Pod)" stroke="#2b2266" strokeWidth=".3" />

          {/* Front suspension: wishbones and pushrod into the upright. */}
          <path d="M166 40.4L188 44.2M168 47.6L188 50M170 49.4L186 42.6" stroke="#24262b" strokeWidth="1" strokeLinecap="round" />

          {/* Nose pylons and the four-element front wing with its endplate. */}
          <path d="M213 54.8L213.6 57.6M218 55.2L218.4 57.8" stroke="#16171b" strokeWidth=".9" />
          <path d="M206.2 60.8L207.4 51.2C207.6 50 208.6 49.4 209.8 49.8L227.6 55.6C230 56.4 231.2 58 230.8 60.4L230.6 61.2H206.6Z" fill="url(#rc-carbon)" />
          <path d="M231 60.4C224 60.2 217 60 211.4 59.8M226 58.2C220 57.8 214 57.4 209.2 57M221.6 56.2C216.4 55.6 211.6 54.8 208.2 54.2" stroke="#4a4d56" strokeWidth=".7" fill="none" strokeLinecap="round" />
          <path d="M216.4 54.2C212.6 53.4 209.6 52.4 207.8 51.4" stroke="#b9aeff" strokeWidth=".9" fill="none" strokeLinecap="round" />
          <path d="M209.6 49.9L227.4 55.7" stroke="#fff" strokeOpacity=".14" strokeWidth=".45" />
        </g>
      </g>

      <F1Wheel cx={44} />
      <F1Wheel cx={188} />
    </svg>
  );
}

/* ---------- Hatchback (original-site lane) ---------- */

const HATCH_BODY = "M4.2 53C2.6 53 1.8 51.8 1.8 50.2L1.8 38C1.8 35.6 2.4 33.6 3.2 31.6L4.8 23.4L9 13.2C10.4 10 12.6 8 16 7C20 6 25 5.2 32 4.6C52 3.2 76 3 92 3.6C97.4 3.6 101 5 104.4 8L119.6 22.2C121 23.4 123 24 125.4 24.4C138 26.2 150 27.8 157.4 29.6C161.6 30.6 163.6 32.6 164 36L164.4 44C164.6 48 163.4 51 161 52.8L145.95 53.2L145.95 52A14.6 14.6 0 1 0 117.25 52L117.25 54.6L43.55 54.6L43.55 52A14.6 14.6 0 1 0 14.85 52L14.85 53Z";

export function Hatchback() {
  return (
    <svg viewBox={`0 0 ${HATCH_VIEW.w} ${HATCH_VIEW.h}`} className={styles.carSvg} aria-hidden="true">
      <defs>
        <linearGradient id="rc-hEnds" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2a0e02" stopOpacity=".45" /><stop offset=".1" stopColor="#2a0e02" stopOpacity="0" /><stop offset=".86" stopColor="#2a0e02" stopOpacity="0" /><stop offset="1" stopColor="#2a0e02" stopOpacity=".35" /></linearGradient>
        <radialGradient id="rc-hShadow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#000" stopOpacity=".8" /><stop offset=".7" stopColor="#000" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
        <linearGradient id="rc-hBody" x1="0" y1="3.6" x2="0" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffb88e" /><stop offset=".3" stopColor="#ffd3b6" /><stop offset=".42" stopColor="#ff9d63" />
          <stop offset=".6" stopColor="#f07a3d" /><stop offset=".615" stopColor="#b8461a" /><stop offset=".8" stopColor="#97381a" /><stop offset="1" stopColor="#4f1c08" />
        </linearGradient>
        <linearGradient id="rc-hGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9fb7c6" /><stop offset=".35" stopColor="#3f5463" /><stop offset="1" stopColor="#141c22" /></linearGradient>
        <linearGradient id="rc-hLamp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c9d3da" /><stop offset="1" stopColor="#fffbe8" /></linearGradient>
        <linearGradient id="rc-hTail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ff5a3d" /><stop offset="1" stopColor="#8c1406" /></linearGradient>
        <linearGradient id="rc-hRim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2f3f5" /><stop offset=".55" stopColor="#a9acb3" /><stop offset="1" stopColor="#6d7077" /></linearGradient>
        <radialGradient id="rc-hTyre" cx=".42" cy=".38" r=".62"><stop offset=".6" stopColor="#2b2c30" /><stop offset=".88" stopColor="#151619" /><stop offset="1" stopColor="#050506" /></radialGradient>
        <radialGradient id="rc-hDisc" cx=".45" cy=".4" r=".6"><stop offset="0" stopColor="#9a9da4" /><stop offset=".8" stopColor="#6a6d74" /><stop offset="1" stopColor="#4a4c52" /></radialGradient>
        <radialGradient id="rc-puff" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#b9bcb4" stopOpacity=".5" /><stop offset="1" stopColor="#b9bcb4" stopOpacity="0" /></radialGradient>
      </defs>

      <ellipse cx="84" cy="62.2" rx="82" ry="3.4" fill="url(#rc-hShadow)" />
      <g className={styles.exhaust} aria-hidden="true">
        <circle cx="4" cy="54.2" r="2.4" fill="url(#rc-puff)" /><circle cx="4" cy="54.2" r="2.4" fill="url(#rc-puff)" /><circle cx="4" cy="54.2" r="2.4" fill="url(#rc-puff)" />
      </g>

      <g className={styles.carBobSlow}>
        {/* Arch liners sit behind the wheels; underbody shadow between the axles. */}
        <path d="M14.85 52A14.6 14.6 0 1 1 43.55 52Z" fill="#0d0a09" />
        <path d="M117.25 52A14.6 14.6 0 1 1 145.95 52Z" fill="#0d0a09" />
        <path d="M44 54L118 54L117 56.2H45Z" fill="#0b0b0c" opacity=".85" />
        <rect x="4.6" y="53.2" width="7" height="1.9" rx=".9" fill="#2a2b2f" stroke="#55575d" strokeWidth=".3" />

        {/* Body shell: tailgate, roof, A-pillar, bonnet, bumpers, arches. */}
        <path d={HATCH_BODY} fill="url(#rc-hBody)" />
        <path d={HATCH_BODY} fill="url(#rc-hEnds)" />
        <path d="M18 7.4C30 5.4 56 3.8 92 4.6" stroke="#fff" strokeOpacity=".55" strokeWidth=".6" fill="none" strokeLinecap="round" />
        {/* Black plastic arch trim and sill. */}
        <path d="M14.85 52A14.6 14.6 0 1 1 43.55 52M117.25 52A14.6 14.6 0 1 1 145.95 52" fill="none" stroke="#2a1a14" strokeWidth="1.3" />
        <path d="M44.6 54.2H116.4" stroke="#2a1a14" strokeWidth="1.2" />

        {/* Glasshouse, B-pillar, roof spoiler and shark-fin aerial. */}
        <path d="M27 8.2L95.6 6.6C97.4 6.6 98.6 7.2 99.6 8.4L112.8 21.2C113.2 21.8 112.8 22.2 112 22.2L44 21.2C38 20.8 32 19.4 27 16.8C25.6 16 25.2 15 25.4 13.8L25.8 9.4C25.9 8.6 26.3 8.2 27 8.2Z" fill="url(#rc-hGlass)" />
        <path d="M32 7.9L42 7.6L34.4 20.4L27.4 17.2Z" fill="#fff" opacity=".1" />
        <path d="M84 6.6L92 6.6L83 21.8L75.6 21.7Z" fill="#fff" opacity=".07" />
        <path d="M72.4 6.6H76L75.6 21.7H72Z" fill="#141416" />
        <path d="M46.6 6.8L44.6 21.1" stroke="#141416" strokeWidth=".7" />
        <path d="M10.4 10.4C13 7.6 16.4 6.2 21 5.4L21.4 7C17.4 7.6 14.4 8.8 12 11.2Z" fill="#1d1513" />
        <path d="M40 3.9C41 2.4 43 2 45.6 2.2L46.2 3.7Z" fill="#1d1513" />

        {/* Panel gaps, handles, fuel flap, shoulder and lower character lines. */}
        <g fill="none" stroke="#5c220b" strokeWidth=".4" strokeOpacity=".75">
          <path d="M75 21.8V53.8M113.8 22.4C115.2 30 116.6 38 115.8 47.6L115.2 53.8M45.2 21.4C46.4 30 46.6 38 44.8 46.4" />
          <path d="M119.8 23C122.6 25.4 123.6 28 124 30.4" />
          <circle cx="24" cy="28.6" r="2.3" />
        </g>
        <path d="M6 27.6C40 28 90 29 160 32.2" stroke="#fff" strokeOpacity=".55" strokeWidth=".5" fill="none" />
        <path d="M6 28.4C40 28.8 90 29.8 160 33" stroke="#6b2a0d" strokeOpacity=".5" strokeWidth=".45" fill="none" />
        <path d="M48 44.6C70 44 92 44 112 44.8" stroke="#ffcfae" strokeOpacity=".3" strokeWidth=".45" fill="none" />
        <rect x="98.4" y="26.4" width="5.6" height="1.3" rx=".65" fill="#7c2e10" /><path d="M98.8 26.5H103.6" stroke="#ffd9c0" strokeOpacity=".6" strokeWidth=".3" />
        <rect x="58.8" y="26" width="5.6" height="1.3" rx=".65" fill="#7c2e10" /><path d="M59.2 26.1H64" stroke="#ffd9c0" strokeOpacity=".6" strokeWidth=".3" />

        {/* Lamps, front intake and fog lamp, rear reflector. */}
        <path d="M148.6 30C154 30.4 159 31 162.6 32.4L163.2 34.8C158 35 152 34.2 148.4 32.6Z" fill="url(#rc-hLamp)" stroke="#5c220b" strokeWidth=".3" />
        <path d="M151 32.2C155 32.6 158.6 33.2 161.6 34" stroke="#ffffff" strokeWidth=".45" />
        <path d="M4.3 26L7.2 22.6C9.6 22.4 12.4 23 14 24L13.2 27.6C9.8 28.6 6.8 29.4 3.6 30.4Z" fill="url(#rc-hTail)" stroke="#5c1406" strokeWidth=".3" />
        <path d="M156.6 44.6H164.3L164.1 49H157.2Z" fill="#1a1614" />
        <circle cx="160.2" cy="46.8" r="1.05" fill="#e7e9ec" />
        <rect x="2" y="44" width="4.6" height="1.1" rx=".5" fill="#9c1a0b" />

        {/* Door mirror. */}
        <path d="M112 22.6L115.6 21.4C117.6 20.8 119.6 21.6 119.8 23.4L119.4 25.4C116.6 26.4 113.4 26 112 25.2Z" fill="url(#rc-hBody)" stroke="#5c220b" strokeWidth=".35" />
        <path d="M114 22.2C115.8 21.6 117.6 21.6 118.8 22.4" stroke="#fff" strokeOpacity=".6" strokeWidth=".4" fill="none" />
      </g>

      <HatchWheel cx={29.2} />
      <HatchWheel cx={131.6} />
    </svg>
  );
}
