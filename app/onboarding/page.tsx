"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { collection, query, where, getDocs, doc, writeBatch, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Loader2, Building, UserPlus } from "lucide-react";
import { toast } from "sonner";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function OnboardingBackground({ isLight }: { isLight: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Layer 1: Ambient gradients (solo dark) */}
      {!isLight && (
        <div className="onb-ambient absolute inset-0">
          <div className="onb-blob onb-blob-a" />
          <div className="onb-blob onb-blob-b" />
          <div className="onb-blob onb-blob-c" />
        </div>
      )}

      {/* Layer 2: Grid pattern (en ambos modos, diferente contraste) */}
      <svg
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        role="img"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          maskImage:
            "radial-gradient(65% 55% at 50% 50%, rgba(0,0,0,1), rgba(0,0,0,0.15) 70%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(65% 55% at 50% 50%, rgba(0,0,0,1), rgba(0,0,0,0.15) 70%, transparent 100%)",
        }}
      >
        <defs>
          <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path
              d="M 6 0 L 0 0 0 6"
              fill="none"
              stroke={isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}
              strokeWidth="0.2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Layer 3: Floating shapes */}
      <AnimatePresence>
        {!isLight ? (
          <>
            <motion.div
              className="onb-float absolute -left-20 top-1/4 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 blur-2xl"
              initial={{ x: -40, y: 0, opacity: 0.6 }}
              animate={{ x: 20, y: -10, opacity: 0.85 }}
              transition={{ repeat: Infinity, repeatType: "mirror", duration: 16, ease: "easeInOut" }}
            />
            <motion.div
              className="onb-float absolute -right-16 bottom-1/5 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-400/35 to-indigo-500/30 blur-2xl"
              initial={{ x: 30, y: 10, opacity: 0.55, rotate: -8 }}
              animate={{ x: -20, y: -8, opacity: 0.8, rotate: 6 }}
              transition={{ repeat: Infinity, repeatType: "mirror", duration: 22, ease: "easeInOut" }}
            />
          </>
        ) : (
          <>
            {/* Modo claro: líneas diagonales sutiles */}
            <motion.div
              className="absolute -left-1/3 top-1/4 h-1 w-[160%] rotate-[-18deg] bg-black/5"
              initial={{ opacity: 0.2 }}
              animate={{ opacity: 0.35 }}
              transition={{ repeat: Infinity, repeatType: "mirror", duration: 6 }}
              style={{ boxShadow: "0 0 0 2px rgba(0,0,0,0.06), 0 0 0 12px rgba(0,0,0,0.03)" }}
            />
            <motion.div
              className="absolute -right-1/3 bottom-1/3 h-1 w-[160%] rotate-[18deg] bg-black/5"
              initial={{ opacity: 0.2 }}
              animate={{ opacity: 0.35 }}
              transition={{ repeat: Infinity, repeatType: "mirror", duration: 8 }}
              style={{ boxShadow: "0 0 0 2px rgba(0,0,0,0.06), 0 0 0 12px rgba(0,0,0,0.03)" }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Layer 4: Grain overlay (muy sutil) */}
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle at 25% 15%, rgba(0,0,0,0.8) 0.5px, transparent 0.6px), radial-gradient(circle at 75% 55%, rgba(0,0,0,0.8) 0.5px, transparent 0.6px)", backgroundSize: "5px 5px" }} />
    </div>
  );
}

export default function OnboardingPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // UI state
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");

  const disabledCreate = isLoading || !teamName.trim();
  const disabledJoin = isLoading || !inviteCode.trim();

  const cleanTeamName = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 60);
  const cleanInvite = (s: string) => s.trim().replace(/\s+/g, "").toUpperCase().slice(0, 64);

  useEffect(() => {
    if (!loadingAuth && !user) router.replace("/login");
  }, [loadingAuth, user, router]);

  const createSessionAndRedirect = async () => {
    if (!user) throw new Error("Usuario no autenticado.");
    const toastId = toast.loading("Creando sesión...");
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });
      if (!response.ok) throw new Error("Fallo al crear la sesión del servidor.");
      toast.success("Redirigiendo al dashboard...", { id: toastId });
      router.push("/dashboard");
    } catch (apiError) {
      console.error("Error en createSessionAndRedirect:", apiError);
      toast.error("No se pudo iniciar sesión. Intenta nuevamente.", { id: toastId });
      setError("Hubo un problema al iniciar sesión. Por favor, intenta de nuevo.");
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !user) return;

    setIsLoading(true);
    setError(null);
    const toastId = toast.loading("Creando equipo...");

    try {
      const batch = writeBatch(db);
      const newTeamRef = doc(collection(db, "teams"));
      batch.set(newTeamRef, {
        teamId: newTeamRef.id,
        teamName: cleanTeamName(teamName),
        ownerUid: user.uid,
        createdAt: new Date(),
      });

      const teamMemberId = `${newTeamRef.id}_${user.uid}`;
      batch.set(doc(db, "teamMembers", teamMemberId), {
        teamId: newTeamRef.id,
        userId: user.uid,
        rol: "admin",
        joinedAt: new Date(),
      });

      await batch.commit();
      toast.success("Equipo creado con éxito.", { id: toastId });
      await createSessionAndRedirect();
    } catch (err) {
      console.error("Error creando el equipo:", err);
      toast.error("No se pudo crear el equipo.", { id: toastId });
      setError("No se pudo crear el equipo. Inténtalo de nuevo.");
      setIsLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !user) return;

    setIsLoading(true);
    setError(null);
    const toastId = toast.loading("Uniéndote al equipo...");

    try {
      const q = query(collection(db, "invitationCodes"), where("code", "==", cleanInvite(inviteCode)));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error("El código de invitación no es válido.", { id: toastId });
        setError("El código de invitación no es válido.");
        setIsLoading(false);
        return;
      }

      const invitation = querySnapshot.docs[0].data() as any;
      const { teamId } = invitation;

      await setDoc(doc(db, "teamMembers", `${teamId}_${user.uid}`), {
        teamId,
        userId: user.uid,
        rol: "member",
        joinedAt: new Date(),
      });

      toast.success("Te has unido al equipo con éxito.", { id: toastId });
      await createSessionAndRedirect();
    } catch (err) {
      console.error("Error al unirse al equipo:", err);
      toast.error("No se pudo unir al equipo.", { id: toastId });
      setError("No se pudo unir al equipo. Verifica el código e inténtalo de nuevo.");
      setIsLoading(false);
    }
  };

  if (loadingAuth || (!user && loadingAuth)) {
    return (
      <div className="grid h-screen place-items-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="inline-flex items-center gap-3 rounded-2xl px-4 py-3"
        >
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Cargando sesión...</span>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  const borderShell = isLight ? "border-2 border-black" : "ring-2 ring-white/10";
  const cardShell =
    isLight ? `${borderShell} bg-white text-black` : "bg-background/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl";
  const inputClass = isLight
    ? "h-11 rounded-2xl border-2 border-black bg-transparent px-3 placeholder:text-black/50"
    : "h-11 rounded-2xl bg-transparent px-3 ring-2 ring-white/15 focus-visible:ring-violet-400/70";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <OnboardingBackground isLight={isLight} />

      <Tabs
        defaultValue="create"
        className="w-full max-w-md"
        onValueChange={(value) => setActiveTab(value as "create" | "join")}
      >
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <Card className={`relative overflow-hidden ${cardShell} rounded-2xl`}>
            {!isLight && (
              <div className="pointer-events-none absolute inset-0 opacity-15 blur-2xl bg-[radial-gradient(40%_30%_at_85%_0%,rgba(139,92,246,0.35),transparent_60%),radial-gradient(35%_30%_at_0%_90%,rgba(34,211,238,0.25),transparent_60%)]" />
            )}

            <CardHeader className="relative text-center">
              <CardTitle className={isLight ? "text-2xl font-extrabold" : "text-2xl font-bold tracking-tight"}>
                ¡Bienvenido a QuantifyFlow!
              </CardTitle>
              <CardDescription>
                Para empezar, crea un nuevo equipo o únete a uno existente.
              </CardDescription>
            </CardHeader>

            <CardContent className="relative space-y-6">
              {/* Tabs con píldora animada */}
              <div className={`relative ${isLight ? "border-2 border-black rounded-xl p-1" : ""}`}>
                <TabsList className={`grid w-full grid-cols-2 ${isLight ? "bg-transparent" : ""}`}>
                  <TabsTrigger
                    value="create"
                    className={`relative rounded-xl px-3 py-2 data-[state=active]:text-white ${isLight ? "text-black" : ""}`}
                  >
                    {activeTab === "create" && (
                      <motion.span
                        layoutId="tabPill"
                        className={`absolute inset-0 rounded-xl ${isLight ? "bg-black" : "bg-white/10 ring-1 ring-white/15"}`}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-2">
                      <Building className="h-4 w-4" /> Crear Equipo
                    </span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="join"
                    className={`relative rounded-xl px-3 py-2 data-[state=active]:text-white ${isLight ? "text-black" : ""}`}
                  >
                    {activeTab === "join" && (
                      <motion.span
                        layoutId="tabPill"
                        className={`absolute inset-0 rounded-xl ${isLight ? "bg-black" : "bg-white/10 ring-1 ring-white/15"}`}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-2">
                      <UserPlus className="h-4 w-4" /> Unirse a Equipo
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === "create" && (
                  <TabsContent value="create" asChild forceMount>
                    <motion.div
                      key="create"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <form onSubmit={handleCreateTeam} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="teamName" className={isLight ? "font-semibold" : ""}>
                            Nombre del Equipo
                          </Label>
                          <Input
                            id="teamName"
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(cleanTeamName(e.target.value))}
                            placeholder="Ej: Equipo de Innovación"
                            required
                            disabled={isLoading}
                            className={inputClass}
                          />
                        </div>

                        <Button
                          type="submit"
                          className={isLight ? `${borderShell} bg-black text-white hover:opacity-90 w-full` : "w-full rounded-2xl"}
                          disabled={disabledCreate}
                        >
                          {isLoading && activeTab === "create" ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creando...
                            </>
                          ) : (
                            "Crear Equipo"
                          )}
                        </Button>
                      </form>
                    </motion.div>
                  </TabsContent>
                )}

                {activeTab === "join" && (
                  <TabsContent value="join" asChild forceMount>
                    <motion.div
                      key="join"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <form onSubmit={handleJoinTeam} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="inviteCode" className={isLight ? "font-semibold" : ""}>
                            Código de Invitación
                          </Label>
                          <Input
                            id="inviteCode"
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(cleanInvite(e.target.value))}
                            placeholder="Pega el código aquí"
                            required
                            disabled={isLoading}
                            className={inputClass}
                          />
                        </div>

                        <Button
                          type="submit"
                          className={isLight ? `${borderShell} bg-black text-white hover:opacity-90 w-full` : "w-full rounded-2xl"}
                          disabled={disabledJoin}
                        >
                          {isLoading && activeTab === "join" ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uniéndote...
                            </>
                          ) : (
                            "Unirse al Equipo"
                          )}
                        </Button>
                      </form>
                    </motion.div>
                  </TabsContent>
                )}
              </AnimatePresence>
            </CardContent>

            <CardFooter className="relative flex justify-center">
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-sm font-medium text-destructive"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </CardFooter>

            {/* Loading overlay inside card */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-background/70 backdrop-blur-sm"
                  aria-live="polite"
                >
                  <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    className={`inline-flex items-center gap-3 rounded-xl px-4 py-2 ${isLight ? "border-2 border-black bg-white text-black" : "bg-white/10 ring-1 ring-white/15"}`}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{activeTab === "create" ? "Creando equipo..." : "Uniéndote..."}</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </Tabs>

      {/* Estilos globales de fondo */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .onb-float,
          .onb-blob-a,
          .onb-blob-b,
          .onb-blob-c {
            animation: none !important;
          }
        }
        .onb-ambient {
          filter: saturate(1.05);
        }
        .onb-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(50px);
          opacity: 0.45;
          will-change: transform, opacity;
          animation: onbDrift 28s ease-in-out infinite alternate;
        }
        .onb-blob-a {
          width: 34rem;
          height: 34rem;
          top: -12rem;
          right: -10rem;
          background: radial-gradient(closest-side, rgba(99, 102, 241, 0.7), transparent 70%);
          animation-duration: 30s;
        }
        .onb-blob-b {
          width: 28rem;
          height: 28rem;
          bottom: -10rem;
          left: -8rem;
          background: radial-gradient(closest-side, rgba(34, 211, 238, 0.7), transparent 70%);
          animation-duration: 34s;
        }
        .onb-blob-c {
          width: 22rem;
          height: 22rem;
          top: 30%;
          left: 36%;
          background: radial-gradient(closest-side, rgba(236, 72, 153, 0.7), transparent 70%);
          animation-duration: 26s;
        }
        @keyframes onbDrift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-1.25rem, 0.75rem, 0) scale(1.03);
          }
          100% {
            transform: translate3d(0.5rem, -0.75rem, 0) scale(0.98);
          }
        }
      `}</style>
    </div>
  );
}