/**
 * InfosPratiquesDrawer — Tiroir coulissant (Sheet) pour les infos pratiques jour J.
 * Adresse d'intervention, GPS, horaires, contact opérationnel, notes.
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, MapPin, Globe, Clock, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function InfosPratiquesDrawer({ open, onOpenChange, cs, qc }) {
  const lastCsId = useRef(null);
  const [ipAdresse, setIpAdresse] = useState('');
  const [ipGps, setIpGps] = useState('');
  const [ipHoraires, setIpHoraires] = useState('');
  const [ipContact, setIpContact] = useState('');
  const [ipNotes, setIpNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cs?.id && cs.id !== lastCsId.current) {
      setIpAdresse(cs.infos_pratiques_adresse || '');
      setIpGps(cs.infos_pratiques_gps || '');
      setIpHoraires(cs.infos_pratiques_horaires || '');
      setIpContact(cs.infos_pratiques_contact || '');
      setIpNotes(cs.infos_pratiques_notes || '');
      lastCsId.current = cs.id;
    }
  }, [cs]);

  const handleSave = async () => {
    if (!cs?.id) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(cs.id, {
      infos_pratiques_adresse: ipAdresse,
      infos_pratiques_gps: ipGps,
      infos_pratiques_horaires: ipHoraires,
      infos_pratiques_contact: ipContact,
      infos_pratiques_notes: ipNotes,
    });
    qc.invalidateQueries(['company-settings']);
    qc.invalidateQueries(['company-settings-vitrine']);
    qc.invalidateQueries(['company-settings-vitrine-completion']);
    setSaving(false);
    toast.success('Informations pratiques enregistrées');
    onOpenChange?.(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border pr-12">
          <SheetTitle>Informations pratiques jour J</SheetTitle>
          <SheetDescription>Coordonnées opérationnelles visibles par vos clients confirmés (espace client) et sur la fiche événement (popover prestataires).</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><MapPin size={13} className="text-muted-foreground" /> Adresse / lieu d'intervention</label>
            <Input value={ipAdresse} onChange={e => setIpAdresse(e.target.value)} placeholder="Ex : Domaine de la Rose, accès par le portail nord" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><Globe size={13} className="text-muted-foreground" /> Lien GPS / coordonnées</label>
            <Input value={ipGps} onChange={e => setIpGps(e.target.value)} placeholder="https://maps.google.com/… ou 48.8566,2.3522" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><Clock size={13} className="text-muted-foreground" /> Horaires d'installation / intervention</label>
            <Input value={ipHoraires} onChange={e => setIpHoraires(e.target.value)} placeholder="Ex : Installation 14h, prestation 18h–02h" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><Phone size={13} className="text-muted-foreground" /> Contact opérationnel jour J</label>
            <p className="text-[11px] text-muted-foreground -mt-1">Peut différer du téléphone de l'entreprise (ex : chef d'équipe sur place)</p>
            <Input value={ipContact} onChange={e => setIpContact(e.target.value)} placeholder="Ex : 06 12 34 56 78 (chef d'équipe)" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes libres (accès, parking, code porte…)</label>
            <textarea
              value={ipNotes}
              onChange={e => setIpNotes(e.target.value)}
              placeholder="Ex : Stationner sur le parking B, code porte 1234, repérage la veille à 16h…"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              style={{ fontSize: '16px' }}
            />
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