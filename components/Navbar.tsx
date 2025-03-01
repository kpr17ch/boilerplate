"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

export function Navbar() {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  React.useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-center px-4",
        isScrolled ? "bg-black/70 backdrop-blur-lg" : "bg-black/50 backdrop-blur-sm",
      )}
    >
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center transition-all duration-200 hover:scale-105"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 100 100"
            className="text-[#5E6AD2]"
          >
            <path
              fill="currentColor"
              d="M1.225 61.523c-.222-.949.908-1.546 1.597-.857l36.512 36.512c.69.69.092 1.82-.857 1.597-18.425-4.323-32.93-18.827-37.252-37.252ZM.002 46.889a.99.99 0 0 0 .29.76L52.35 99.71c.201.2.478.307.76.29 2.37-.149 4.695-.46 6.963-.927.765-.157 1.03-1.096.478-1.648L2.576 39.448c-.552-.551-1.491-.286-1.648.479a50.067 50.067 0 0 0-.926 6.962ZM4.21 29.705a.988.988 0 0 0 .208 1.1l64.776 64.776c.289.29.726.375 1.1.208a49.908 49.908 0 0 0 5.185-2.684.981.981 0 0 0 .183-1.54L8.436 24.336a.981.981 0 0 0-1.541.183 49.896 49.896 0 0 0-2.684 5.185Zm8.448-11.631a.986.986 0 0 1-.045-1.354C21.78 6.46 35.111 0 49.952 0 77.592 0 100 22.407 100 50.048c0 14.84-6.46 28.172-16.72 37.338a.986.986 0 0 1-1.354-.045L12.659 18.074Z"
            />
          </svg>
        </Link>
        <nav className="flex items-center rounded-full bg-white/10 px-3 backdrop-blur-sm">
          <Link href="/features" className="px-3 py-2 text-xs text-white/70 transition-all duration-200 hover:scale-105 hover:text-white">
            Features
          </Link>
          <Link href="/method" className="px-3 py-2 text-xs text-white/70 transition-all duration-200 hover:scale-105 hover:text-white">
            Method
          </Link>
          <Link href="/customers" className="px-3 py-2 text-xs text-white/70 transition-all duration-200 hover:scale-105 hover:text-white">
            Customers
          </Link>
          <Link href="/changelog" className="px-3 py-2 text-xs text-white/70 transition-all duration-200 hover:scale-105 hover:text-white">
            Changelog
          </Link>
          <Link href="/pricing" className="px-3 py-2 text-xs text-white/70 transition-all duration-200 hover:scale-105 hover:text-white">
            Pricing
          </Link>
          <Link href="/company" className="px-3 py-2 text-xs text-white/70 transition-all duration-200 hover:scale-105 hover:text-white">
            Company
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onMouseEnter={() => setIsDropdownOpen(true)}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white/70 transition-all duration-200 hover:scale-105 hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Account
              </button>
              {isDropdownOpen && (
                <div 
                  className="absolute right-1/2 mt-4 w-48 translate-x-1/2 rounded-md bg-black py-1 shadow-lg ring-1 ring-white/10"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <Link
                    href="/account"
                    className="block px-4 py-2 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Übersicht
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full px-4 py-2 text-left text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 text-xs text-white/70 transition-all duration-200 hover:scale-105 hover:text-white">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-white/80 px-2.5 py-1.5 text-xs font-medium text-black/80 transition-all hover:scale-105 hover:bg-white hover:text-black"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  )
}

