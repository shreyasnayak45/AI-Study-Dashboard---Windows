"use client";

/**
 * GreetingHeading — renders "Good [period], [name] 👋" using the USER'S
 * LOCAL BROWSER TIME, not the server clock.
 *
 * Why suppressHydrationWarning?
 * ─────────────────────────────
 * The dashboard page is a server component.  During SSR, `new Date()` runs on
 * the Vercel server (UTC).  During hydration, this client component calls
 * `new Date()` in the user's local timezone — the two values intentionally
 * differ.  `suppressHydrationWarning` tells React to silently accept that
 * mismatch and use the *client* value immediately, with no warning, no extra
 * render pass, and no visual flash.
 *
 * Time bands (local hour):
 *   05 – 11  → Good morning
 *   12 – 16  → Good afternoon
 *   17 – 20  → Good evening
 *   21 – 04  → Good night
 */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

interface GreetingHeadingProps {
  firstName: string;
  className?: string;
}

export function GreetingHeading({ firstName, className }: GreetingHeadingProps) {
  return (
    <h1
      suppressHydrationWarning
      className={className ?? "text-2xl font-bold tracking-tight text-white sm:text-3xl"}
    >
      {getGreeting()}, {firstName} 👋
    </h1>
  );
}
