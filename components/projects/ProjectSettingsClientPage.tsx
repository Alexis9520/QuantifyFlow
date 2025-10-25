'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; // Para redirigir si es necesario
import { toast } from 'sonner'; // Para notificaciones
import { Loader2, Save, Plus, Trash2, AlertTriangle, Link as LinkIcon, Info } from 'lucide-react'; // Iconos

// Importa tus servicios y tipos
import {
    getProjectById,
    updateProject,
    UpdateProjectData,
} from '@/services/projectService'; // Asegúrate que la ruta sea correcta
import { Project, ProjectUrl } from '@/types'; // Asegúrate que la ruta sea correcta

// Importa componentes de shadcn/ui
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Para estructurar
import Spinner from '@/components/ui/spinner'; // Para el estado de carga inicial

interface ProjectSettingsProps {
  projectId: string;
}

export default function ProjectSettingsClientPage({ projectId }: ProjectSettingsProps) {
    const [project, setProject] = useState<Project | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [urls, setUrls] = useState<ProjectUrl[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter(); // Para posible redirección

    // --- Efecto de Carga de Datos (sin cambios internos) ---
    useEffect(() => {
        const fetchProject = async () => {
             if (!projectId) { /* ... */ return; }
             setLoading(true); setError(null);
             try {
                const projectData = await getProjectById(projectId);
                if (projectData) {
                    setProject(projectData);
                    setName(projectData.name);
                    setDescription(projectData.description || '');
                    // Asegurar que urls siempre sea un array, incluso si viene null/undefined
                    setUrls(projectData.urls || []); 
                } else { setError('Proyecto no encontrado.'); }
             } catch (err) { /* ... */ setError('No se pudo cargar...'); } 
             finally { setLoading(false); }
        };
        fetchProject();
    }, [projectId]);

    // --- Manejadores de URLs (sin cambios internos) ---
    const handleUrlChange = (index: number, field: 'label' | 'link', value: string) => {
        const newUrls = [...urls];
        newUrls[index] = { ...newUrls[index], [field]: value };
        setUrls(newUrls);
    };
    const handleAddUrl = () => {
        const newId = `temp_${Date.now()}`;
        setUrls([...urls, { id: newId, label: '', link: '' }]);
    };
    const handleRemoveUrl = (indexToRemove: number) => {
        setUrls(urls.filter((_, index) => index !== indexToRemove));
    };

    // --- Manejador de Guardado (con Toasts) ---
    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!project || !name.trim()) { // Validar nombre no vacío
             toast.error("El nombre del proyecto no puede estar vacío.");
             return;
        }
        setIsSaving(true);
        setError(null);
        const toastId = toast.loading("Guardando cambios...");

        // Filtrar URLs vacías ANTES de enviar
        const validUrls = urls.filter(url => url.label.trim() !== '' || url.link.trim() !== '');
        
        // Validar formato de URLs (básico)
        const invalidUrl = validUrls.find(url => url.link.trim() !== '' && !/^https?:\/\//.test(url.link.trim()));
        if (invalidUrl) {
            toast.error(`La URL "${invalidUrl.link}" no es válida. Debe empezar con http:// o https://`, { id: toastId });
            setIsSaving(false);
            return;
        }


        const dataToUpdate: UpdateProjectData = {
            name: name.trim(),
            description: description.trim(),
            urls: validUrls, // Enviar solo las válidas
        };

        try {
            await updateProject(project.id, dataToUpdate);
            // Actualizar estado local para reflejar lo guardado
            setProject((prev) => prev ? { ...prev, ...dataToUpdate, urls: validUrls } : null);
            setUrls(validUrls); // Sincronizar el estado de URLs por si se filtraron vacías

            toast.success('Proyecto actualizado correctamente.', { id: toastId });
        } catch (err) {
            console.error('Error al guardar:', err);
            setError('No se pudieron guardar los cambios. Inténtalo de nuevo.'); // Mantenemos el error de estado
            toast.error('Error al guardar los cambios.', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    // --- Renderizado Condicional Mejorado ---
    if (loading) {
        return (
             <div className="flex justify-center items-center h-40">
                 <Spinner size={32} label="Cargando configuración..." />
             </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-6 bg-destructive/10 border border-destructive rounded-lg text-destructive">
                <AlertTriangle className="w-8 h-8 mb-2" />
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
                <Button variant="link" onClick={() => router.back()} className="mt-4 text-destructive">
                    Volver atrás
                </Button>
            </div>
        );
    }

    if (!project) {
        // Redirigir o mostrar mensaje más claro
        return <div>Proyecto no encontrado o no tienes permiso para verlo.</div>;
    }

    // --- Renderizado del Formulario Mejorado ---
    return (
        // Contenedor principal con ancho máximo
        <div className="max-w-3xl mx-auto space-y-8"> 
            <header className="mb-6">
                 <h1 className="text-3xl font-bold">Configuración del Proyecto</h1>
                 <p className="text-muted-foreground">Gestiona los detalles de "{project.name}".</p>
            </header>
            
            <form onSubmit={handleSave} className="space-y-6">
                {/* --- Tarjeta de Información General --- */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             <Info className="w-5 h-5"/> Información General
                        </CardTitle>
                        <CardDescription>
                             Edita el nombre y la descripción de tu proyecto.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="project-name">Nombre del Proyecto</Label>
                            <Input
                                id="project-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Ej: Nuevo Sitio Web Corporativo"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="project-description">Descripción</Label>
                            <Textarea
                                id="project-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                placeholder="Añade una descripción (opcional)..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* --- Tarjeta de URLs --- */}
                <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                             <LinkIcon className="w-5 h-5"/> URLs del Proyecto
                         </CardTitle>
                         <CardDescription>
                             Añade enlaces relevantes como repositorios, sitios en producción, etc.
                         </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {urls.map((url, index) => (
                            <div key={url.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 border rounded-md bg-muted/50">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-grow w-full">
                                    <div className="space-y-1">
                                        <Label htmlFor={`url-label-${index}`} className="text-xs">Etiqueta</Label>
                                        <Input
                                            id={`url-label-${index}`}
                                            type="text"
                                            placeholder="Ej: Producción"
                                            value={url.label}
                                            onChange={(e) => handleUrlChange(index, 'label', e.target.value)}
                                            className="bg-background h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`url-link-${index}`} className="text-xs">Enlace (URL)</Label>
                                        <Input
                                            id={`url-link-${index}`}
                                            type="url"
                                            placeholder="https://ejemplo.com"
                                            value={url.link}
                                            onChange={(e) => handleUrlChange(index, 'link', e.target.value)}
                                             className="bg-background h-9 text-sm"
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveUrl(index)}
                                    className="text-destructive hover:bg-destructive/10 flex-shrink-0 mt-4 sm:mt-0"
                                    aria-label="Eliminar URL"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={handleAddUrl} size="sm">
                            <Plus className="w-4 h-4 mr-2" /> Añadir URL
                        </Button>
                    </CardContent>
                </Card>

                {/* --- Botón de Guardar Fijo (Opcional, puede estar en CardFooter) --- */}
                 <div className="flex justify-end pt-4 border-t">
                     <Button type="submit" disabled={isSaving}>
                         {isSaving ? (
                             <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 Guardando...
                             </>
                         ) : (
                             <>
                                 <Save className="mr-2 h-4 w-4" />
                                 Guardar Cambios
                             </>
                         )}
                     </Button>
                 </div>
                 {/* Si hubo un error de guardado específico, mostrarlo */}
                 {error && <p className="text-sm text-destructive mt-2">{error}</p>} 
            </form>
        </div>
    );
}