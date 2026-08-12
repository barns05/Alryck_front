/**
 * OptionsAvanceesDrawer — Tiroir coulissant (Sheet) pour les options avancées.
 * Terminologie des offres, restauration intégrée, délai de relance prospect.
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import TerminologieSection from '@/components/settings/TerminologieSection';
import { getMetierConfig } from '@/config/metierConfig';

function ToggleField({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!checked)}
        className="relative flex-shrink-0"
        style={{ width: 44, height: 24, borderRadius: 999, background: checked ? 'hsl(var(--primary))' : 'hsl(var(--muted))', cursor: 'pointer', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', display: 'block' }} />
      </div>
      <span className="text-sm">{label}</span>
    </label>
  );
}

export default function OptionsAvanceesDrawer({ open, onOpenChange, cs, qc }) {
  const lastCsId = useRef(null);
  const [terminologie, setTerminologie] = useState({ mode: 'unique', terme_unique: 'Formule', termes: [] });
  const [restaurationIntegree, setRestaurationIntegree] = useState(false);
  const [relanceProspectJours, setRelanceProspectJours] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cs?.id && cs.id !== lastCsId.current) {
      if (cs.terminologie_offres) setTerminologie(cs.terminologie_offres);
      setRestaurationIntegree(cs.restauration_integree === true);
      setRelanceProspectJours(cs.relance_prospect_jours ?? 3);
      lastCsId.current = cs.id;
    }
  }, [cs]);

  const handleSave = async () => {
    if (!cs?.id) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(cs.id, {
      terminologie_offres: terminologie,
      restauration_integree: restaurationIntegree,
      relance_prospect_jours: Number(relanceProspectJours) || 3,
    });
    qc.invalidateQueries(['company-settings']);
    qc.invalidateQueries(['company-settings-vitrine']);
    qc.invalidateQueries(['company-settings-vitrine-completion']);
    setSaving(false);
    toast.success('Options avancées enregistrées');
    onOpenChange?.(false);
  };

  const metier = cs?.metier || '';
  const isLieuNonFood = metier && getMetierConfig(metier).groupe !== 'Restauration et traiteur';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border pr-12">
          <SheetTitle>Options avancées</SheetTitle>
          <SheetDescription>Paramètres rarement modifiés après la configuration initiale.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Terminologie des offres */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">🏷️ Terminologie des offres commerciales</label>
            <p className="text-xs text-muted-foreground">Le ou les termes choisis remplacent « Formule » partout dans l'application.</p>
            <TerminologieSection value={terminologie} onChange={v => setTerminologie(v)} />
          </div>

          {/* Restauration intégrée */}
          {isLieuNonFood && (
            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="text-sm font-semibold">🍽️ Restauration intégrée</h3>
              <p className="text-xs text-muted-foreground">
                Activez cette option si votre établissement propose une restauration intégrée (menus, repas, service traiteur maison). Cela active la gestion des allergènes dans vos événements.
              </p>
              <ToggleField checked={restaurationIntegree} onChange={setRestaurationIntegree} label={restaurationIntegree ? 'Restauration intégrée activée' : 'Propose une restauration intégrée'} />
            </div>
          )}

          {/* Délai de relance prospect */}
          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-sm font-semibold">⚙️ Paramètres prospect</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Délai de relance <span className="font-normal">(jours avant d'afficher « Toujours intéressé ? »)</span>
              </label>
              <div className="flex items-center gap-3">
                <Input type="number" min="1" max="30" value={relanceProspectJours} onChange={e => setRelanceProspectJours(e.target.value)} className="w-24" />
                <span className="text-xs text-muted-foreground">jours après le dernier message</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border">
          <Button onClick={handleSave} disabled={saving || !cs?.id} className="w-full gap-2">
            <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}