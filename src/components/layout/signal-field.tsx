import { useId } from "react";

interface SignalFieldProps {
  readonly compact?: boolean;
}

const nodes = [
  { cx: 58, cy: 75, r: 5, tone: "quiet" },
  { cx: 126, cy: 42, r: 7, tone: "signal" },
  { cx: 183, cy: 112, r: 5, tone: "quiet" },
  { cx: 252, cy: 66, r: 9, tone: "primary" },
  { cx: 326, cy: 112, r: 6, tone: "signal" },
  { cx: 382, cy: 48, r: 5, tone: "quiet" },
  { cx: 104, cy: 174, r: 5, tone: "quiet" },
  { cx: 218, cy: 192, r: 6, tone: "signal" },
  { cx: 344, cy: 185, r: 5, tone: "quiet" },
] as const;

export function SignalField({ compact = false }: SignalFieldProps) {
  const gradientId = useId().replaceAll(":", "");
  return (
    <div className={`signal-field${compact ? " signal-field--compact" : ""}`} aria-hidden="true">
      <div className="signal-field__chrome">
        <span />
        <span />
        <span />
      </div>
      <svg className="signal-field__plot" viewBox="0 0 440 240" role="presentation">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="0.52" stopColor="currentColor" stopOpacity="0.7" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <g className="signal-field__grid">
          <path d="M0 40H440M0 80H440M0 120H440M0 160H440M0 200H440" />
          <path d="M40 0V240M100 0V240M160 0V240M220 0V240M280 0V240M340 0V240M400 0V240" />
        </g>
        <g className="signal-field__links">
          <path d="M58 75L126 42L183 112L252 66L326 112L382 48" style={{ stroke: `url(#${gradientId})` }} />
          <path d="M58 75L104 174L218 192L326 112L344 185" style={{ stroke: `url(#${gradientId})` }} />
          <path d="M126 42L252 66M183 112L218 192M252 66L344 185" style={{ stroke: `url(#${gradientId})` }} />
        </g>
        <g className="signal-field__aperture">
          <circle cx="252" cy="66" r="75" />
          <path d="M252 0V18M252 114V132M186 66H204M300 66H318" />
        </g>
        <path className="signal-field__sweep" d="M252 66L324 33A80 80 0 0 1 329 86Z" />
        <circle className="signal-field__orbit" cx="252" cy="66" r="30" />
        <circle className="signal-field__orbit signal-field__orbit--outer" cx="252" cy="66" r="53" />
        {nodes.map((node) => (
          <circle
            className={`signal-field__node signal-field__node--${node.tone}`}
            cx={node.cx}
            cy={node.cy}
            key={`${node.cx}-${node.cy}`}
            r={node.r}
          />
        ))}
      </svg>
      <div className="signal-field__readout">
        <span>01</span>
        <span>LOCAL</span>
        <span>∆ 00.00</span>
      </div>
      <div className="signal-field__boundary">
        <span>DEVICE</span><i /><span>REVIEW</span><i /><span>PRIVATE SYNC</span>
      </div>
    </div>
  );
}
