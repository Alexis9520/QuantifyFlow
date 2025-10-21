"use client"

import { useCallback, useState } from "react"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  getDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Team } from "@/types"

export function useTeamManagement(userId: string | null) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchUserTeams = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const q = query(collection(db, "teamMembers"), where("userId", "==", userId))
      const snapshot = await getDocs(q)
      const teamIds = snapshot.docs.map((doc) => doc.data().teamId)

      const teamsData: Team[] = []
      for (const teamId of teamIds) {
        const teamDoc = await getDoc(doc(db, "teams", teamId))
        if (teamDoc.exists()) {
          teamsData.push({ ...teamDoc.data(), id: teamDoc.id } as Team)
        }
      }
      setTeams(teamsData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch teams"))
    } finally {
      setLoading(false)
    }
  }, [userId])

  const createTeam = useCallback(
    async (name: string, description?: string) => {
      if (!userId) return
      try {
        const docRef = await addDoc(collection(db, "teams"), {
          name,
          description,
          ownerUid: userId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        })

        await addDoc(collection(db, "teamMembers"), {
          teamId: docRef.id,
          userId,
          role: "admin",
          joinedAt: Timestamp.now(),
        })

        const newTeam: Team = {
          id: docRef.id,
          teamName: name,
          description,
          ownerUid: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setTeams([...teams, newTeam])
        return newTeam
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to create team"))
      }
    },
    [userId, teams],
  )

  const updateTeam = useCallback(
    async (teamId: string, updates: Partial<Team>) => {
      try {
        await updateDoc(doc(db, "teams", teamId), {
          ...updates,
          updatedAt: Timestamp.now(),
        })
        setTeams(teams.map((t) => (t.id === teamId ? { ...t, ...updates } : t)))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to update team"))
      }
    },
    [teams],
  )

  const deleteTeam = useCallback(
    async (teamId: string) => {
      try {
        await deleteDoc(doc(db, "teams", teamId))
        setTeams(teams.filter((t) => t.id !== teamId))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to delete team"))
      }
    },
    [teams],
  )

  return { teams, loading, error, fetchUserTeams, createTeam, updateTeam, deleteTeam }
}