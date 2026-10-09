export type WeatherKind = "sunny" | "cloudy" | "rain";

export interface WeatherDescriptor {
  name: string;
  tint: number;
  darkness: number;
  rain: boolean;
}

export const WEATHER: Record<WeatherKind, WeatherDescriptor> = {
  sunny: { name: "Sunny", tint: 0xffd988, darkness: 0, rain: false },
  cloudy: { name: "Cloudy", tint: 0x53626b, darkness: 0.08, rain: false },
  rain: { name: "Rain", tint: 0x33465c, darkness: 0.16, rain: true },
};

export interface WeatherChange {
  previous: WeatherKind;
  current: WeatherKind;
  durationMs: number;
}

/** Fictional local weather: timed and randomized here, ready to be replaced by a shared server source. */
export class WeatherSystem {
  current: WeatherKind;
  private remainingMs: number;
  private readonly random: () => number;

  constructor(random: () => number = Math.random, initial?: WeatherKind) {
    this.random = random;
    this.current = initial ?? this.pickWeighted(["sunny", "cloudy", "rain"], [0.58, 0.27, 0.15]);
    this.remainingMs = this.durationFor(this.current);
  }

  update(deltaMs: number): WeatherChange | null {
    this.remainingMs -= deltaMs;
    if (this.remainingMs > 0) return null;
    const previous = this.current;
    const candidates = (Object.keys(WEATHER) as WeatherKind[]).filter((kind) => kind !== previous);
    const weights = candidates.map((kind) => kind === "rain" ? 0.46 : 0.54);
    this.current = this.pickWeighted(candidates, weights);
    this.remainingMs = this.durationFor(this.current);
    return { previous, current: this.current, durationMs: this.remainingMs };
  }

  get descriptor() {
    return WEATHER[this.current];
  }

  get secondsUntilChange() {
    return Math.ceil(this.remainingMs / 1_000);
  }

  private durationFor(kind: WeatherKind) {
    const minimum = kind === "rain" ? 16_000 : 22_000;
    const maximum = kind === "rain" ? 31_000 : 43_000;
    return minimum + this.random() * (maximum - minimum);
  }

  private pickWeighted<T extends string>(options: T[], weights: number[]): T {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = this.random() * total;
    for (let index = 0; index < options.length; index += 1) {
      cursor -= weights[index];
      if (cursor <= 0) return options[index];
    }
    return options[options.length - 1];
  }
}
