import { useId } from "react";

/* The Ranch Cuts mark (brand v3): the US steer. A side-view steer whose
   outline is quietly the lower 48, dotted cut lines for the 7 primals,
   and the rib in brick. The dashes are real gaps (a mask), so the mark
   sits on any ground. Geometry from brand/logo-r1/project/RcSteer.dc.html
   (shape "usa"); brand/logo/build_logo.py builds the same mark as files.
   rib={null} is the one-color version: solid, dotted lines, no rib. */

const BODY =
  "M30 30C34 28 38 28 42 30L109 30.6C118 31 126 31.6 132 32.2C138 34.6 144 35.4 150 34.2C154 33.6 157 33 159.5 31.4L163.4 28.4L167.6 28.2L170 31.2L172 35.6C169 39 166.6 43 164.4 46.2C162.4 49 160.6 51 160 53.6C159 57 160.6 61 159.6 64.6C157.6 70.4 152.4 74.6 149.6 79.6C147.6 84 147.4 92 148 100L149 114L137 114L135.6 104C134.8 97 133.4 91 130.4 87.4C126 84.6 120 84.4 114 85L110 86.2L107.4 88.4L105 86.4C98 86.8 92 86.4 87 87.4C82.4 92 80 99 79 106L78.4 114L66.4 114L65.4 104C64 98 61.6 93.4 58.4 90.6C56.6 88.4 55 86.4 53.6 85.4L50.6 85.4L50.6 83.6L42 82.4C37.6 80.4 34.4 76.6 31.6 73C30.4 71.4 29.4 69.8 28 68L20 66C14 66 10 62 10 58C10 52 14 46 18 40C20 34 24 30 30 30Z";
const EAR = "M36 32L50 24L46 34Z";
const TAIL = "M170 38C175.5 52 176.5 70 175 86";
const CUTS = "M76 0V120M100 0V120M128 0V120M38 64H128";
const RIB = "M76 0H100V64H76Z";

export default function RcMark({
  width = 56,
  color = "var(--navy)",
  rib = "var(--brick)",
  title,
}: {
  width?: number;
  color?: string;
  rib?: string | null;
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={width} height={Math.round((width * 106) / 184.5)} viewBox="2 16 184.5 106" role={title ? "img" : undefined}
      aria-label={title} aria-hidden={title ? undefined : true} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <clipPath id={`${id}b`}><path d={BODY} /></clipPath>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="130">
          <rect width="200" height="130" fill="#fff" />
          {rib && <path d={RIB} fill="#000" />}
          <path d={CUTS} fill="none" stroke="#000" strokeWidth="1.6" strokeDasharray="3 3" />
        </mask>
        <mask id={`${id}c`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="130">
          <rect width="200" height="130" fill="#fff" />
          <path d={CUTS} fill="none" stroke="#000" strokeWidth="1.6" strokeDasharray="3 3" />
        </mask>
      </defs>
      <g mask={`url(#${id}m)`} fill={color}>
        <path d={BODY} />
        <path d={EAR} />
        <path d={TAIL} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="175" cy="90" rx="3.5" ry="6" />
      </g>
      {rib && <path d={RIB} fill={rib} clipPath={`url(#${id}b)`} mask={`url(#${id}c)`} />}
    </svg>
  );
}
