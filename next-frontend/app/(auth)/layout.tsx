import React from "react"

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="container mx-auto w-full md:w-2xl lg:w-3xl min-h-[590px] h-auto  pt-10">
      {children}
    </div>
  )
}

export default AuthLayout
