"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { motion, AnimatePresence } from "framer-motion"

export default function SignupPage() {
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage("Check your email for the signup link!")
        setEmail("")
        setIsSubmitted(true)
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center space-y-4">
      <h1 className="text-l font-medium text-white/90">Sign up to Tempflix</h1>
        <AnimatePresence mode="wait">
          {!showEmailInput ? (
            <motion.button
              key="email-button"
              initial={{ y: 0 }}
              exit={{ y: -10, opacity: 0 }}
              onClick={() => setShowEmailInput(true)}
              className="w-52 rounded-md bg-[#5243FF] px-3 py-2.5 text-xs text-white/80 transition-all hover:bg-[#575BC7]"
            >
              Continue with Email
            </motion.button>
          ) : !isSubmitted ? (
            <motion.form
              key="email-form"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              onSubmit={handleSignUp}
              className="flex w-52 flex-col items-center space-y-3"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="w-full rounded-md border border-white/20 bg-black px-3 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-52 rounded-md bg-[#5243FF] px-3 py-2.5 text-xs text-white/80 transition-all hover:bg-[#575BC7] disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Continue with email"}
              </button>
            </motion.form>
          ) : (
            <motion.p
              key="success-message"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center text-xs text-white/60"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-col items-center space-y-4 text-center">
        {showEmailInput ? (
          <Link
            href="/signup"
            className="text-xs text-white/40 transition-colors hover:text-white/60"
            onClick={(e) => {
              e.preventDefault()
              setShowEmailInput(false)
              setMessage(null)
              setIsSubmitted(false)
            }}
          >
            Back to sign up
          </Link>
        ) : (
          <>
            <p className="w-52 text-xs leading-relaxed text-white/40">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="text-white/60 hover:text-white/80">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/dpa" className="text-white/60 hover:text-white/80">
                Data Processing Agreement
              </Link>
              .
            </p>
            <Link
              href="/login"
              className="text-xs text-white/40 transition-colors hover:text-white/60"
            >
              Already have an account? Log in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
