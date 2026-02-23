export const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000

/**
 * Returns a Date object X minutes from now.
 */
export const XMinutesFromNow = (minute: number): Date => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + minute)
  return now
}

/**
 * Returns a Date object X minutes ago from now.
 */
export const XMinutesAgo = (minute: number): Date => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - minute)
  return now
}

/**
 * Returns a Date object X days from now.
 * Uses timestamp arithmetic (simple & reliable).
 */
export const XDaysFromNow = (day: number): Date => {
  return new Date(Date.now() + day * 24 * 60 * 60 * 1000)
}

/**
 * Returns a Date object X days ago from now.
 * Uses timestamp arithmetic (simple & reliable).
 */
export const XDaysAgo = (day: number): Date => {
  return new Date(Date.now() - day * 24 * 60 * 60 * 1000)
}

/**
 * Returns a future Date based on a duration string (e.g. "15m", "30d", "2h", "1w")
 *
 * @param duration - Time duration string (supports: s, m, h, d, w, y)
 *                   Default: "15m"
 * @returns Date object representing now + duration
 * @throws Error if the duration string is invalid
 *
 * @example
 * getExpirationDate("30m")     // now + 30 minutes
 * getExpirationDate("7d")      // now + 7 days
 * getExpirationDate()          // now + 15 minutes (default)
 */
export const getExpirationDate = (duration: string = "15m"): Date => {
  // Supported time units and their millisecond multipliers
  const multipliers: Record<string, number> = {
    s: 1000, // seconds
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    // w: 7 * 24 * 60 * 60 * 1000, // weeks
    // y: 365 * 24 * 60 * 60 * 1000, // years (approximate)
  }

  // Parse the input string: e.g. "30m" → number=30, unit="m"
  const match = duration.trim().match(/^(\d+)([smhdwy])$/i)

  if (!match) {
    throw new Error(
      `Invalid duration format: "${duration}". Expected format like "15m", "2h", "30d".`,
      // `Expected format like "15m", "2h", "30d", "1w", "6M", etc.`,
    )
  }

  const value = parseInt(match[1]!, 10)
  const unit = match[2]!.toLowerCase()

  if (!(unit in multipliers)) {
    throw new Error(`Unsupported time unit: "${unit}"`)
  }

  const milliseconds = value * multipliers[unit]!

  // Create future date: now + calculated milliseconds
  const expiration = new Date(Date.now() + milliseconds)

  return expiration
}
