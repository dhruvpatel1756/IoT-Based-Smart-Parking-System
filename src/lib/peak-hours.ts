/**
 * Utility functions for peak-hour pricing logic.
 */

export interface PeakHourConfig {
  peak_hour_start: number | null;
  peak_hour_end: number | null;
  peak_price_per_hour: number | null;
  price_per_hour: number;
}

/** Check if a given hour (0-23) falls within peak hours. */
export function isPeakHour(hour: number, config: PeakHourConfig): boolean {
  const { peak_hour_start, peak_hour_end } = config;
  if (peak_hour_start == null || peak_hour_end == null) return false;

  if (peak_hour_start <= peak_hour_end) {
    return hour >= peak_hour_start && hour < peak_hour_end;
  }
  // Wraps midnight (e.g., 22 to 6)
  return hour >= peak_hour_start || hour < peak_hour_end;
}

/** Check if the current time is peak. */
export function isCurrentlyPeak(config: PeakHourConfig): boolean {
  return isPeakHour(new Date().getHours(), config);
}

/** Get the effective price for a given hour. */
export function getPriceForHour(hour: number, config: PeakHourConfig): number {
  if (isPeakHour(hour, config) && config.peak_price_per_hour != null) {
    return config.peak_price_per_hour;
  }
  return config.price_per_hour;
}

/** Calculate total price across a time range respecting peak hours. */
export function calculateTotalPrice(
  startTime: Date,
  endTime: Date,
  config: PeakHourConfig
): number {
  let total = 0;
  const current = new Date(startTime);
  while (current < endTime) {
    total += getPriceForHour(current.getHours(), config);
    current.setHours(current.getHours() + 1);
  }
  return Math.max(config.price_per_hour, total); // Minimum 1 hour
}

/** Format peak hours as a readable string, e.g., "9 AM – 6 PM" */
export function formatPeakHours(start: number, end: number): string {
  const fmt = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12} ${period}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
