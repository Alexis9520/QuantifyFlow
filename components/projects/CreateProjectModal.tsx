"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/services/projectService";
import { toast } from "sonner";
import { Trash2 } from "lucide-react"; // 👈 CAMBIO: Importar ícono
import { ProjectUrl } from "@/types"; // 👈 CAMBIO: Importar tipo de URL

interface CreateProjectModalProps {
  children: React.ReactNode;
  teamId?: string;
  onProjectCreated: () => void;
}

export function CreateProjectModal({
  children,
  teamId,
  onProjectCreated,
}: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [urls, setUrls] = useState<ProjectUrl[]>([]); // 👈 CAMBIO: Estado para URLs
  const [isLoading, setIsLoading] = useState(false);

  // --- Manejadores de URLs ---

  /**
   * Actualiza un campo (label o link) de una URL específica en el estado.
   */
  const handleUrlChange = (
    index: number,
    field: "label" | "link",
    value: string
  ) => {
    const newUrls = [...urls];
    newUrls[index] = { ...newUrls[index], [field]: value };
    setUrls(newUrls);
  };

  /**
   * Añade una nueva URL vacía al estado para ser editada.
   */
  const handleAddUrl = () => {
    // Generamos un ID local único para la key de React
    const newId = `temp_${Date.now()}`;
    setUrls([...urls, { id: newId, label: "", link: "" }]);
  };

  /**
   * Elimina una URL del estado basado en su índice.
   */
  const handleRemoveUrl = (indexToRemove: number) => {
    setUrls(urls.filter((_, index) => index !== indexToRemove));
  };

  // --- Manejador de Submit ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !name) return;

    setIsLoading(true);
    const toastId = toast.loading("Creando proyecto...");

    // 👈 CAMBIO: Filtrar URLs que estén completamente vacías
    const finalUrls = urls.filter(
      (url) => url.label.trim() !== "" || url.link.trim() !== ""
    );

    try {
      // 👈 CAMBIO: Pasar el array de URLs al servicio
      await createProject({
        teamId,
        name,
        description,
        urls: finalUrls,
      });

      toast.success("Proyecto creado exitosamente.", { id: toastId });
      onProjectCreated();
      setOpen(false);
    } catch (error) {
      toast.error("Error al crear el proyecto.", { id: toastId });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Manejador de Apertura/Cierre ---

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Resetear todos los campos al cerrar
      setName("");
      setDescription("");
      setUrls([]); // 👈 CAMBIO: Limpiar URLs
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogPortal>
        {/* Overlay con blur sutil */}
        <DialogOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Contenido sin fondo sólido, con contorno moderno */}
        <DialogContent
          className="z-50 w-[92vw] max-w-[480px] border-0 bg-transparent p-0 shadow-none outline-none
                     data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
                     data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {/* Marco con ring visible en light/dark y una sutil aureola */}
          <div className="relative overflow-hidden rounded-2xl ring-2 ring-neutral-300/90 dark:ring-white/20">
            {/* Glow sutil interior (sin fondo, solo luz) */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40 blur-2xl"
              style={{
                background:
                  "radial-gradient(600px 200px at 90% 0%, rgba(139,92,246,0.12), transparent 60%), radial-gradient(500px 200px at 10% 100%, rgba(34,211,238,0.12), transparent 60%)",
              }}
            />
            {/* Contenido del formulario */}
            <form
              onSubmit={handleSubmit}
              className="relative z-10 p-5 sm:p-6"
            >
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                    Crear nuevo proyecto
                  </span>
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Dale un nombre, descripción y URLs relevantes.
                </DialogDescription>
              </DialogHeader>

              {/* 👇 CAMBIO: Contenedor del formulario ahora tiene max-h y scroll 
                para acomodar las URLs sin hacer el modal gigante.
              */}
              <div
                className="mt-4 grid gap-4 overflow-y-auto"
                style={{ maxHeight: "calc(70vh - 100px)" }} // Ajusta 100px según el alto de tu header/footer
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del proyecto</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ej. Sitio web, App móvil, CRM..."
                    className="h-11 rounded-2xl bg-transparent px-3 text-sm
                               ring-2 ring-neutral-300/90 dark:ring-white/20
                               placeholder:text-muted-foreground/70
                               focus-visible:ring-violet-500/70 dark:focus-visible:ring-violet-400/70"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe brevemente de qué trata este proyecto..."
                    className="min-h-[110px] rounded-2xl bg-transparent px-3 py-2 text-sm
                               ring-2 ring-neutral-300/90 dark:ring-white/20
                               placeholder:text-muted-foreground/70
                               focus-visible:ring-violet-500/70 dark:focus-visible:ring-violet-400/70"
                  />
                </div>

                {/* --- SECCIÓN DE URLs (NUEVO) --- */}
                <div className="space-y-3">
                  <Label>URLs (opcional)</Label>
                  
                  {/* Lista de URLs */}
                  {urls.map((url, index) => (
                    <div
                      key={url.id} // Usamos el ID temporal como key
                      className="flex items-center gap-2"
                    >
                      <Input
                        type="text"
                        placeholder="Etiqueta (Ej. Producción)"
                        value={url.label}
                        onChange={(e) =>
                          handleUrlChange(index, "label", e.target.value)
                        }
                        className="h-11 rounded-2xl bg-transparent px-3 text-sm
                                   ring-2 ring-neutral-300/90 dark:ring-white/20
                                   placeholder:text-muted-foreground/70
                                   focus-visible:ring-violet-500/70 dark:focus-visible:ring-violet-400/70"
                      />
                      <Input
                        type="url"
                        placeholder="https://ejemplo.com"
                        value={url.link}
                        onChange={(e) =>
                          handleUrlChange(index, "link", e.target.value)
                        }
                        className="h-11 rounded-2xl bg-transparent px-3 text-sm
                                   ring-2 ring-neutral-300/90 dark:ring-white/20
                                   placeholder:text-muted-foreground/70
                                   focus-visible:ring-violet-500/70 dark:focus-visible:ring-violet-400/70"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUrl(index)}
                        className="rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Botón para añadir URL */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddUrl}
                    className="h-11 w-full rounded-2xl border-dashed
                               ring-2 ring-neutral-300/90 dark:ring-white/20
                               text-muted-foreground
                               hover:bg-neutral-100/70 dark:hover:bg-white/10"
                  >
                    + Añadir URL
                  </Button>
                </div>
              </div>

              <DialogFooter className="mt-5">
                <Button
                  type="submit"
                  disabled={isLoading || !name}
                  className="h-11 rounded-2xl font-semibold shadow-md
                               bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500
                               hover:from-indigo-400 hover:via-violet-500 hover:to-fuchsia-400"
                >
                  {isLoading ? "Creando..." : "Crear proyecto"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}