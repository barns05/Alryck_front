/**
 * ContractsPanel — page Contrats (module Juridique), vue globale.
 *
 * 2 onglets : « Contrats clients » (espace de stockage central des vrais contrats
 * rattachés à un client) et « Mes modèles » (gabarits réutilisables, non rattachés).
 * Lien discret vers un partenaire juridique externe en bas (bientôt disponible).
 */
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ContratsSection from './ContratsSection';
import ModelesSection from './ModelesSection';

export default function ContractsPanel() {
  return (
    <div className="space-y-5">
      <Tabs defaultValue="contrats" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contrats">Contrats clients</TabsTrigger>
          <TabsTrigger value="modeles">Mes modèles</TabsTrigger>
        </TabsList>
        <TabsContent value="contrats" className="mt-4">
          <ContratsSection />
        </TabsContent>
        <TabsContent value="modeles" className="mt-4">
          <ModelesSection />
        </TabsContent>
      </Tabs>
      <p className="text-center text-xs text-muted-foreground pt-2">
        Besoin d'aide pour rédiger votre contrat ?{' '}
        <span className="text-primary underline-offset-2 underline cursor-default">
          Faire appel à un partenaire juridique
        </span>{' '}
        <span className="text-muted-foreground">(bientôt disponible)</span>
      </p>
    </div>
  );
}