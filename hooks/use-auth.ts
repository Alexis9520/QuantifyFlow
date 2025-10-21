"use client"

import { useEffect, useState, useCallback } from "react"
import { type User as FirebaseUser, onAuthStateChanged, signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import type { User } from "@/types"

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  error: Error | null
  logout: () => Promise<void>
}

const authContext: AuthContextType | null = null

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid))
          if (userDoc.exists()) {
            setUser(userDoc.data() as User)
          }
          setFirebaseUser(fbUser)
        } else {
          setUser(null)
          setFirebaseUser(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Auth error"))
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut(auth)
      setUser(null)
      setFirebaseUser(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Logout failed"))
    }
  }, [])

  return { user, firebaseUser, loading, error, logout }
}