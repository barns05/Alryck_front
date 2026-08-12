/**
 * InfosLegalesDrawer — Tiroir coulissant (Sheet) pour les informations légales.
 * Année de création, SIRET, adresse du siège.
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Hash, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function InfosLegalesDrawer({ open, onOpenChange, cs, qc }) {
  const lastCsId = useRef(null);
  const [anneeCreation, setAnneeCreation] = useState('');
  const [siret, setSiret] = useState('');
  const [adresse, setAdresse] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cs?.id && cs.id !== lastCsId.current) {
      setAnneeCreation(cs.annee_creation ? String(cs.annee_creation) : '');
      setSiret(cs.siret || '');
      setAdresse(cs.adresse || '');
      lastCsId.current = cs.id;
    }
  }, [cs]);

  const handleSave = async () => {
    if (!cs?.id) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(cs.id, {
      annee_creation: anneeCreation ? parseInt(anneeCreation) : null,
      siret,
      adresse,
    });
    qc.invalidateQueries(['company-settings']);
    qc.invalidateQueries(['company-settings-vitrine']);
    qc.invalidateQueries(['company-settings-vitrine-completion']);
    setSaving(false);
    toast.success('Informations légales enregistrées');
    onOpenChange?.(false);
  };

  const anneeActuelle = new Date().getFullYear();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border pr-12">
          <SheetTitle>Informations légales</SheetTitle>
          <SheetDescription>Adresse administrative et informations légales de votre entreprise.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Année de création</label>
            <Input type="number" min="1900" max={anneeActuelle} value={anneeCreation} onChange={e => setAnneeCreation(e.target.value)} placeholder="Ex : 2010" className="w-40" />
            {anneeCreation && (anneeActuelle - Number(anneeCreation)) > 0 && (
              <p className="text-xs text-emerald-600 font-medium">→ Affichera « {anneeActuelle - Number(anneeCreation)} ans d'expérience »</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><Hash size={13} className="text-muted-foreground" /> SIRET</label>
            <Input value={siret} onChange={e => setSiret(e.target.value)} placeholder="123 456 789 00010" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><MapPin size={13} className="text-muted-foreground" /> Adresse du siège</label>
            <Input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Ex : 12 rue des Fleurs, 75001 Paris" />
            <p className="text-[11px] text-muted-foreground">Adresse administrative de votre entreprise. L'adresse publique affichée dans l'annuaire (ville + code postal) se gère dans la sous-page « Offre & Prestation ».</p>
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