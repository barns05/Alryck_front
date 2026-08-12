import ContractsPanel from '@/components/juridique/ContractsPanel';

export default function Contrats() {
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Contrats</h2>
        <p className="text-muted-foreground text-sm mt-1">Contrats clients et modèles réutilisables</p>
      </div>
      <ContractsPanel />
    </div>
  );
}