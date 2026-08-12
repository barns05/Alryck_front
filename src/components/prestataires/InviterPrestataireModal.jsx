import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TYPES = ['Traiteur', 'DJ / Musique', 'Photographe', 'Vidéaste', 'Fleuriste', 'Décoration', 'Animation', 'Transport', 'Sécurité', 'Sono / Lumières', 'Autre'];

export default function InviterPrestataireModal({ onClose }) {
  const qc = useQueryClient();
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!nom.trim() || !email.trim()) return;
    setLoading(true);

    const today = new Date().toLocaleDateString('fr-FR');
    const appUrl = window.location.origin;

    // 1. Créer le prestataire en base (actif: false = en attente)
    await base44.entities.Prestataire.create({
      nom: nom.trim(),
      email: email.trim().toLowerCase(),
      domaine: type || undefined,
      actif: false,
      notes: `Invité via la plateforme le ${today}`,
    });

    // Rafraîchir la liste
    qc.invalidateQueries(['prestataires']);

    // 2. Envoyer l'email d'invitation
    await base44.integrations.Core.SendEmail({
      to: email.trim(),
      subject: `Invitation à rejoindre la plateforme`,
      body: `<p>Bonjour ${nom.trim()},</p>
<p>Nous avons le plaisir de vous inviter à rejoindre notre plateforme de coordination événementielle.</p>
<p>En rejoignant la plateforme, vous pourrez :</p>
<ul>
  <li>Recevoir et gérer vos missions directement en ligne</li>
  <li>Accéder à vos fiches de service et programmes</li>
  <li>Communiquer facilement avec les équipes organisatrices</li>
</ul>
<p><a href="${appUrl}" style="display:inline-block;padding:12px 24px;background:#1e40af;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Rejoindre la plateforme →</a></p>
<p>Cordialement</p>`,
    });

    // 3. Notification admin
    await base44.entities.Notification.create({
      titre: '🤝 Invitation prestataire envoyée',
      message: `Invitation envoyée à ${nom.trim()}${type ? ` (${type})` : ''} — ${email.trim()}. Profil créé en attente de validation.`,
      type: 'prestataire',
      lien: '/Prestataires',
    });

    setLoading(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Inviter un partenaire</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Un profil sera créé immédiatement en attente de validation</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {sent ? (
          <div className="py-8 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="font-semibold text-emerald-700">Invitation envoyée !</p>
            <p className="text-sm text-muted-foreground">{nom} a été ajouté à votre liste de partenaires et recevra l'email d'invitation.</p>
            <Button onClick={onClose} className="mt-2">Fermer</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom du prestataire *</Label>
                <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Studio Martin" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@exemple.fr" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type de prestation</Label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Sélectionner…</option>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
              ℹ️ Un profil <strong>en attente</strong> sera créé immédiatement dans votre liste de partenaires.
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={handleSend} disabled={!nom.trim() || !email.trim() || loading}>
                {loading ? 'Envoi…' : 'Inviter'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}