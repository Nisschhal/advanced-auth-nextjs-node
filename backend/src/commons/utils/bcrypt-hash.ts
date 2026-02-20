import bcrypt from "bcrypt"

export const hashValue = async (value: string, salt: number = 12) =>
  await bcrypt.hash(value, salt)

export const compareHashValue = async (value: string, hashedValue: string) =>
  await bcrypt.compare(value, hashedValue)
