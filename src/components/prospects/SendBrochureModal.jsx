/**
 * SendBrochureModal — Sélectionne une brochure du catalogue et l'envoie au prospect.
 *
 * Crée un ProspectMessage (admin → prospect) avec le lien de la brochure et
 * tente d'envoyer un email. Le prospect retrouve le document dans sa messagerie.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, BookOpen, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SendBrochureModal({ prospect, onClose }) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [sending, setSending] = useState(false);

  const { data: brochures = [] } = useQuery({
    queryKey: ['brochures-catalogue-active'],
    queryFn: () => base44.entities.BrochureCatalogue.filter({ actif: true }),
  });

  const handleSend = async () => {
    const brochure = brochures.find(b => b.id === selectedId);
    if (!brochure) return;

    setSending(true);
    try {
      await base44.entities.ProspectMessage.create({
        prospect_id: prospect.id,
        auteur: 'admin',
        message: `📄 Brochure partagée : ${brochure.nom}\nConsulter : ${brochure.fichier_url}`,
      });

      if (prospect.email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: prospect.email,
            subject: `Brochure : ${brochure.nom}`,
            body: `<p>Bonjour ${prospect.prenom || ''},</p><p>Voici la brochure <strong>${brochure.nom}</strong>.</p><p><a href="${brochure.fichier_url}" style="display:inline-block;padding:10px 20px;background:#1e40af;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Consulter la brochure →</a></p><p>Retrouvez tous vos documents dans votre espace prospect.</p>`,
          });
        } catch (e) { /* non bloquant si prospect non enregistré */ }
      }

      qc.invalidateQueries(['prospect-messages']);
      toast.success('Brochure envoyée au prospect');
      onClose();
    } catch (e) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <BookOpen size={16} /> Envoyer une brochure
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {brochures.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Aucune brochure active dans votre catalogue. Ajoutez-en depuis la Bibliothèque.
            </p>
          ) : (
            <div className="space-y-2">
              {brochures.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    selectedId === b.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <p className="text-sm font-medium">{b.nom}</p>
                  {b.fichier_nom && <p className="text-xs text-muted-foreground mt-0.5">{b.fichier_nom}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" onClick={handleSend} disabled={!selectedId || sending} className="gap-1.5">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Envoi…' : 'Envoyer'}
          </Button>
        </div>
      </div>
    </div>
  );
}