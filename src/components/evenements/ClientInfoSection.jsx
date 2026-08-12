import { Link2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

export default function ClientInfoSection({ ev, copyLink, sendLink, sendingLink }) {
  return (
    <>
      {ev.client_nom && (
        <Section title="Client">
          <div className="bg-muted/40 rounded-xl p-3 space-y-1">
            <p className="font-medium">{ev.client_nom}</p>
            {ev.client_email && <p className="text-sm text-muted-foreground">📧 {ev.client_email}</p>}
            {ev.client_telephone && <p className="text-sm text-muted-foreground">📞 {ev.client_telephone}</p>}
          </div>
        </Section>
      )}

      <Section title="Lien client">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={copyLink}>
            <Link2 size={13} /> Copier le lien
          </Button>
          {ev.client_email && (
            <Button size="sm" variant="default" className="gap-1.5 flex-1" onClick={sendLink} disabled={sendingLink}>
              <Send size={13} />
              {sendingLink ? 'Envoi…' : `Envoyer à ${ev.client_email}`}
            </Button>
          )}
        </div>
      </Section>
    </>
  );
}