'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  Link as LinkIcon,
  Clipboard,
  Check,
  AlertTriangle,
  Settings2,
  Tags,
  ArrowRight,
  Save,
  UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import { useUserSettings } from '@/services/useUserSettings';
import {
  useAdminTeamData,
  updateTeamName,
  generateInvitationCode,
  createTag,
  deleteTag,
  updateTeamMemberRole, // 👈 Importar nueva función
  TeamMemberWithDetails, // 👈 Importar tipo
  TeamMemberRol,        // 👈 Importar tipo
  Tag,
} from '@/services/teamService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Spinner from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

// --- SUBCOMPONENTE: TeamCodeGenerator (Mejorado) ---
const TeamCodeGenerator: React.FC<{ teamId: string }> = ({ teamId }) => {
  const [code, setCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setStatus('idle');
    try {
      const newCode = await generateInvitationCode(teamId);
      setCode(newCode);
    } catch (error) {
      console.error('Error al generar código:', error);
      setStatus('error');
    } finally {
      setIsGenerating(false);
    }
  }, [teamId]);

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <section className="bg-accent border border-primary/20 p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-accent-foreground">
        <LinkIcon className="w-5 h-5" /> Código de Invitación
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Genera un código de uso único o temporal para invitar nuevos miembros.
      </p>

      {status === 'error' && (
        <p className="text-sm text-destructive mb-2">
          Error al generar el código. Intenta de nuevo.
        </p>
      )}

      {code ? (
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-background border border-input p-3 rounded-md">
          <span className="text-2xl font-mono font-bold text-primary flex-grow">
            {code}
          </span>

          <button
            onClick={handleCopy}
            className={`p-2 rounded-md transition-colors text-sm font-medium inline-flex items-center
              ${
                status === 'copied'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            disabled={status === 'copied'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {status === 'copied' ? (
                <motion.span
                  key="copied"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className="flex items-center"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Copiado
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className="flex items-center"
                >
                  <Clipboard className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={handleGenerate}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 inline-flex items-center"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Spinner size={14} label="" className="text-muted-foreground" />
            ) : (
              'Generar Nuevo'
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <Spinner size={16} label="" className="mr-2 text-primary-foreground" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Generar Código
        </button>
      )}
    </section>
  );
};

// --- COMPONENTE PRINCIPAL (Mejorado) ---
export default function TeamSettingsPage() {
  const { user: authUser } = useAuth();
  const userId = authUser?.uid || '';

  const { data: userData, isLoading: isUserLoading } = useUserSettings(userId);

  const activeTeamId = userData?.membership?.teamId || null;
  const isAdmin = userData?.membership?.role === 'admin';

  const {
    team,
    tags,
    members, 
    isLoading: isTeamDataLoading,
    error: teamDataError, 
    refetch: refetchTeamData, 
  } = useAdminTeamData(activeTeamId || '');

  const [teamName, setTeamName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#0d9488');
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const [pendingRoles, setPendingRoles] = useState<Record<string, TeamMemberRol>>({});

  useEffect(() => {
    if (team) {
      setTeamName(team.teamName);
    }
  }, [team]);

  useEffect(() => {
    if (tags) {
      setCurrentTags(tags.sort((a, b) => a.tagName.localeCompare(b.tagName)));
    }
  }, [tags]);

  useEffect(() => {
    setPendingRoles({}); // Resetea los roles pendientes cuando los datos de miembros se recargan
  }, [members]);

  if (!authUser) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-destructive">
        <AlertTriangle className="w-8 h-8 mb-2" />
        Por favor, inicia sesión.
      </div>
    );
  }

  // Cargando datos de usuario/equipo
  if (isUserLoading || isTeamDataLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground">
        <Spinner size={40} label="Cargando datos del equipo…" className="text-muted-foreground" />
      </div>
    );
  }
  if (teamDataError) { // 👈 Mostrar error si la carga falló
      return <div className="p-8 text-center text-destructive">Error al cargar datos del equipo: {teamDataError.message}</div>;
  }
  if (!isAdmin || !activeTeamId || !team) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-destructive">
        <AlertTriangle className="w-8 h-8 mb-2" />
        <span className="font-medium">Acceso denegado o no hay equipo.</span>
        <span className="text-sm">Se requiere rol de Administrador.</span>
      </div>
    );
  }

  const handleTeamNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName === team.teamName) return;
    setIsSavingTeam(true);
    setSaveSuccess(false);
    try {
      await updateTeamName(activeTeamId, teamName);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error al actualizar el nombre del equipo:', error);
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setIsCreatingTag(true);
    try {
      const newTag = await createTag(activeTeamId, newTagName, newTagColor);
      setCurrentTags((prev) =>
        [...prev, newTag].sort((a, b) => a.tagName.localeCompare(b.tagName)),
      );
      setNewTagName('');
      setNewTagColor('#0d9488');
    } catch (error) {
      console.error('Error al crear la etiqueta:', error);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta etiqueta?')) {
      try {
        await deleteTag(tagId);
        setCurrentTags((prev) => prev.filter((tag) => tag.tagId !== tagId));
      } catch (error) {
        console.error('Error al eliminar la etiqueta:', error);
      }
    }
  };
  const handleRoleChange = async (memberDocId: string, newRole: TeamMemberRol) => {
    if (updatingMemberId) return;
    setUpdatingMemberId(memberDocId);
    const toastId = toast.loading(`Actualizando rol...`);

    try {
      await updateTeamMemberRole(memberDocId, newRole);
      toast.success(`Rol actualizado correctamente.`, { id: toastId });
      refetchTeamData(); // Refresca y limpiará pendingRoles vía useEffect
    } catch (error: any) {
      console.error("Error al actualizar rol:", error);
      toast.error(`Error: ${error.message || 'No se pudo actualizar el rol.'}`, { id: toastId });
      // No revertimos pendingRoles aquí, el refetch lo limpiará o el usuario puede cambiarlo de nuevo
    } finally {
      setUpdatingMemberId(null);
    }
  };
  const handlePendingRoleChange = (memberDocId: string, newRole: TeamMemberRol) => {
    setPendingRoles(prev => ({
      ...prev,
      [memberDocId]: newRole,
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-8 max-w-4xl mx-auto"
    >
      <h1 className="text-3xl font-bold mb-6 text-foreground">
        Configuración del Equipo: <strong>{team.teamName}</strong>
      </h1>

      <div className="space-y-8">
        {/* SECCIÓN 1: Código de Invitación */}
        <TeamCodeGenerator teamId={activeTeamId} />

        {/* SECCIÓN 2: Nombre del Equipo */}
        <section className="bg-card text-card-foreground border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold p-6 border-b flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Detalles del Equipo
          </h2>
          <form onSubmit={handleTeamNameSave} className="p-6 space-y-4">
            <div>
              <label
                htmlFor="teamName"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Nombre del Equipo
              </label>
              <input
                id="teamName"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="mt-1 block w-full max-w-md bg-background border border-input rounded-md shadow-sm p-2 text-sm transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                required
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                type="submit"
                disabled={isSavingTeam || teamName === team.teamName}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-foreground
                      bg-primary rounded-md transition-colors
                      hover:bg-primary/90
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                      disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingTeam ? (
                  <Spinner size={16} label="" className="mr-2 text-primary-foreground" />
                ) : null}
                {isSavingTeam ? 'Guardando...' : 'Guardar Nombre'}
              </button>

              <AnimatePresence>
                {saveSuccess && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-emerald-600 dark:text-emerald-400 font-medium text-sm flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Nombre actualizado.
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </form>
        </section>
        {/* SECCIÓN 4: Gestión de Miembros */}
        <section className="bg-card text-card-foreground border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold p-6 border-b flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            Gestión de Miembros ({members.length})
          </h2>

          <div className="divide-y divide-border">
            {members.map((member) => {
              const isOwner = team.ownerUid === member.uid;
              const isUpdatingThisMember = updatingMemberId === member.teamMemberDocId;

              // --- 👇 CAMBIO 4: Leer el rol del estado centralizado o del miembro ---
              const currentSelectedRole = pendingRoles[member.teamMemberDocId] ?? member.rol;
              // Determina si hay un cambio pendiente para este miembro
              const hasPendingChange = pendingRoles[member.teamMemberDocId] !== undefined && pendingRoles[member.teamMemberDocId] !== member.rol;

              // ❌ ELIMINAR ESTA LÍNEA: const [selectedRole, setSelectedRole] = useState<TeamMemberRole>(member.role);

              return (
                <div key={member.teamMemberDocId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 md:p-6">
                  {/* Info del miembro (sin cambios) */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* ... (Avatar, Nombre, Email, Badge Owner) ... */}
                    {/* Avatar */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                      {member.photoURL ? (
                        <img src={member.photoURL} alt={member.displayName || 'Avatar'} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">
                          {(member.displayName || "").split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    {/* Nombre y Email */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate flex items-center">
                        {member.displayName || 'Usuario sin nombre'}
                        {isOwner && (
                           <span className="ml-2 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-1.5 py-0.5 rounded">
                              Owner
                           </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{member.email || 'Sin email'}</p>
                    </div>
                  </div>


                  {/* Selector de Rol y Botón Guardar */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select
                      // --- 👇 CAMBIO 5: Usar estado centralizado y handler ---
                      value={currentSelectedRole}
                      onValueChange={(value) => handlePendingRoleChange(member.teamMemberDocId, value as TeamMemberRol)}
                      disabled={isOwner || isUpdatingThisMember}
                    >
                      <SelectTrigger className="w-full sm:w-[120px]" disabled={isOwner}>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* --- 👇 CAMBIO 6: Mostrar botón si hay cambio pendiente --- */}
                    {!isOwner && hasPendingChange && (
                      <Button
                        size="sm"
                        // Llama a handleRoleChange con el rol PENDIENTE
                        onClick={() => handleRoleChange(member.teamMemberDocId, currentSelectedRole)}
                        disabled={isUpdatingThisMember}
                      >
                        {isUpdatingThisMember ? (
                          <Spinner size={16} label="" className="mr-1" />
                        ) : (
                          <Save className="h-4 w-4 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">Guardar</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {members.length === 0 && <p>No hay miebros que mostrar</p>}
        </section>
        {/* --- Fin Sección Miembros --- */}      
        {/* SECCIÓN 3: Gestión de Etiquetas (Tags) */}
        <section className="bg-card text-card-foreground border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold p-6 border-b flex items-center gap-2">
            <Tags className="w-5 h-5" />
            Gestión de Etiquetas (Tags)
          </h2>

          <div className="p-6">
            <div className="mb-6 space-y-2">
              <AnimatePresence>
                {currentTags.map((tag) => (
                  <motion.div
                    key={tag.tagId}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex justify-between items-center p-2.5 border border-border rounded-md transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        style={{ backgroundColor: tag.color }}
                        className="w-4 h-4 rounded-full border border-black/10"
                      />
                      <span className="font-medium text-foreground">
                        {tag.tagName}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTag(tag.tagId)}
                      className="text-destructive opacity-60 hover:opacity-100 p-1 rounded-full hover:bg-destructive/10 transition-all"
                      aria-label={`Eliminar etiqueta ${tag.tagName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {currentTags.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No hay etiquetas creadas para este equipo.
                </p>
              )}
            </div>

            <hr className="my-6 border-border" />

            <h3 className="text-lg font-medium mb-3 text-foreground">
              Crear Nueva Etiqueta
            </h3>
            <form
              onSubmit={handleCreateTag}
              className="flex flex-wrap sm:flex-nowrap gap-4 items-end"
            >
              <div className="flex-grow w-full sm:w-auto">
                <label
                  htmlFor="newTagName"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Nombre de la Etiqueta
                </label>
                <input
                  id="newTagName"
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm p-2 text-sm
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="newTagColor"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Color
                </label>
                <input
                  id="newTagColor"
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="mt-1 w-12 h-10 p-0 border-none rounded-md cursor-pointer bg-background
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingTag || !newTagName.trim()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-secondary-foreground
                      bg-secondary rounded-md transition-colors
                      hover:bg-secondary/80
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                      disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingTag ? (
                  <Spinner size={16} label="" className="mr-2 text-secondary-foreground" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {isCreatingTag ? 'Creando...' : 'Crear Etiqueta'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </motion.div>
  );
}