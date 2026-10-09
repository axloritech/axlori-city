export type DayPhase = "Morning" | "Afternoon" | "Evening" | "Night";

export interface TimeSource {
  /** Must return the user's authoritative local clock, not a simulated game clock. */
  now(): Date;
}

export class DeviceLocalTimeSource implements TimeSource {
  now() {
    return new Date();
  }
}

export interface TimeSnapshot {
  date: Date;
  display: string;
  phase: DayPhase;
  minutesAfterMidnight: number;
  nightStrength: number;
}

/** A small time-source adapter so server-synced time can replace device time later. */
export class RealTimeSystem {
  private readonly source: TimeSource;
  private readonly formatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  constructor(source: TimeSource = new DeviceLocalTimeSource()) {
    this.source = source;
  }

  read(): TimeSnapshot {
    const date = this.source.now();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const minutesAfterMidnight = hours * 60 + minutes + date.getSeconds() / 60;
    const phase: DayPhase =
      hours >= 5 && hours < 12 ? "Morning" :
        hours >= 12 && hours < 17 ? "Afternoon" :
          hours >= 17 && hours < 20 ? "Evening" : "Night";

    // Smooth twilight throughout the day; at noon it is bright and at local midnight it is darkest.
    const angle = ((minutesAfterMidnight - 720) / 1_440) * Math.PI * 2;
    const nightStrength = 0.34 * ((1 - Math.cos(angle)) / 2);
    return {
      date,
      display: this.formatter.format(date),
      phase,
      minutesAfterMidnight,
      nightStrength,
    };
  }
}
