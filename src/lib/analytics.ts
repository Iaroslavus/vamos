export type AnalyticsValue = string | number | boolean | null;
export type AnalyticsProps = Record<string, AnalyticsValue>;

/**
 * Local analytics until a product SDK is wired up.
 * Dev builds print the event. Nothing leaves the device, and callers
 * must not pass names, emails, or the text the learner typed.
 */
export function track(event: string, props: AnalyticsProps = {}): void {
  if (!__DEV__) return;
  console.log(`[analytics] ${event}`, props);
}
