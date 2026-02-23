import { setupJWTStragegy } from "@/commons/strategies/jwt.strategy.js"
import passport from "passport"

const initalizePassport = () => {
  setupJWTStragegy(passport)
}
initalizePassport()

export default passport
