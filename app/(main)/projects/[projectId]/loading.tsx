import Spinner from "@/components/ui/spinner";


export default function ProjectsLoading() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
      <div className="mb-6">
        <Spinner size={40} label="Cargando…" />
      </div>
      
    </div>
  );
}