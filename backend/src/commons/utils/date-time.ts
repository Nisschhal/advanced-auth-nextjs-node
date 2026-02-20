export const XDaysFromNow = (day: number): Date => {
  return new Date(Date.now() + day * 24 * 60 * 60 * 1000)
}

export const XMinutesFromNow = (minute: number): Date => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + minute)
  return now
}
