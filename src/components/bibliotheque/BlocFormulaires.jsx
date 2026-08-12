import ModeloFormulairesCompact from './ModeloFormulairesCompact';
import BibliothequeQuestions from './BibliothequeQuestions';
import HelpTooltip from '@/components/HelpTooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BlocFormulaires() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-base">📝 Questionnaires</h3>
        <HelpTooltip text="Les questionnaires sont envoyés automatiquement à vos clients selon les délais configurés dans Règles et automatisations. Dupliquez un modèle exemple pour démarrer rapidement." />
      </div>
      
      <Tabs defaultValue="modeles" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="modeles">Modèles</TabsTrigger>
          <TabsTrigger value="bibliotheque">Bibliothèque de questions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="modeles" className="space-y-3">
          <ModeloFormulairesCompact />
        </TabsContent>
        
        <TabsContent value="bibliotheque" className="space-y-3">
          <BibliothequeQuestions />
        </TabsContent>
      </Tabs>
    </div>
  );
}