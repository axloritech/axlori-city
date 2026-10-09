import { LANDMARKS, WORLD_HEIGHT, WORLD_WIDTH } from "@/game/world/landmarks";

type Props = {
  player: { x: number; y: number };
  target?: { x: number; y: number } | null;
  large?: boolean;
};

const colors: Record<string, string> = {
  house: "#e8bb6a",
  shop: "#e1774e",
  restaurant: "#d68b68",
  bank: "#95b39a",
  job: "#f2ce6b",
  police: "#88a9b5",
  office: "#9aaab0",
  fuel: "#dfbe68",
};

export default function CityMap({ player, target = null, large = false }: Props) {
  const px = (player.x / WORLD_WIDTH) * 240;
  const py = (player.y / WORLD_HEIGHT) * 176;
  const tx = target ? (target.x / WORLD_WIDTH) * 240 : null;
  const ty = target ? (target.y / WORLD_HEIGHT) * 176 : null;

  return (
    <svg viewBox="0 0 240 176" className="city-map" role="img" aria-label="Axlori City map with roads and location markers">
      <rect width="240" height="176" rx="12" fill="#788f60" />
      <path d="M0 50H240M0 112H240M79 0V176M161.5 0V176" stroke="#d2c8a7" strokeWidth="13" />
      <path d="M0 50H240M0 112H240M79 0V176M161.5 0V176" stroke="#454b49" strokeWidth="9" />
      <path d="M0 50H240M0 112H240M79 0V176M161.5 0V176" stroke="#d4b654" strokeWidth="0.8" strokeDasharray="4 5" opacity=".85" />
      <rect x="9" y="128" width="40" height="37" rx="5" fill="#6c9b67" stroke="#cad09b" strokeWidth="1.4" />
      <path d="M12 146H46M29 131V162" stroke="#ded2a0" strokeWidth="2.2" />
      <rect x="87" y="7" width="66" height="34" rx="4" fill="#8a9f6a" opacity=".55" />
      <rect x="87" y="65" width="66" height="35" rx="4" fill="#819660" opacity=".45" />
      <rect x="169" y="124" width="58" height="41" rx="4" fill="#879968" opacity=".5" />
      {LANDMARKS.map((landmark) => {
        const x = (landmark.x / WORLD_WIDTH) * 240;
        const y = (landmark.y / WORLD_HEIGHT) * 176;
        return <rect key={landmark.id} x={x - 2.3} y={y - 2.3} width="4.6" height="4.6" rx="1.2" fill={colors[landmark.kind] ?? "#e8bb6a"} stroke="#26382d" strokeWidth=".7" />;
      })}
      {target && tx !== null && ty !== null && (
        <g>
          <path d={`M${px},${py} L${tx},${ty}`} stroke="#f3bf57" strokeWidth="1.2" strokeDasharray="3 3" opacity=".95" />
          <circle cx={tx} cy={ty} r="4.2" fill="#f3bf57" stroke="#fff0bd" strokeWidth="1.5" />
        </g>
      )}
      <circle cx={px} cy={py} r={large ? 5.2 : 4.6} fill="#fff2c0" stroke="#dc7049" strokeWidth="2.5" />
      <circle cx={px} cy={py} r={large ? 9 : 8} fill="none" stroke="#fff0bd" strokeWidth="1" opacity=".7" />
    </svg>
  );
}
