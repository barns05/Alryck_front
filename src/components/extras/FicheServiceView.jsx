import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Download, Calendar, MapPin, Users, Clock, ChefHat, Shirt, Phone, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">{title}</h4>
      {children}
    </div>
  );
}

export default function FicheServiceView({ extraId }) {
  const qc = useQueryClient();

  const { data: fiches = [] } = useQuery({
    queryKey: ['fiches-extra-portal', extraId],
    queryFn: () => base44.entities.FicheServiceExtra.filter({ extra_id: extraId }),
    enabled: !!extraId,
  });

  const fichesEnvoyees = fiches.filter(f => f.statut === 'Envoyée' || f.statut === 'Vue');

  // Marquer les fiches comme "Vue"
  useEffect(() => {
    fichesEnvoyees.forEach(async (fiche) => {
      if (fiche.statut === 'Envoyée') {
        await base44.entities.FicheServiceExtra.update(fiche.id, {
          statut: 'Vue',
          date_vue: new Date().toISOString(),
        });
        qc.invalidateQueries(['fiches-extra-portal', extraId]);
      }
    });
  }, [fiches.length]);

  if (fichesEnvoyees.length === 0) return null;

  const handleDownloadPDF = (fiche) => {
    const content = buildPDFContent(fiche);
    const win = window.open('', '_blank');
    win.document.write(content);
    win.document.close();
    win.print();
  };

  const buildPDFContent = (fiche) => {
    const dateStr = fiche.evenement_date
      ? format(parseISO(fiche.evenement_date), 'EEEE d MMMM yyyy', { locale: fr })
      : '';

    const menuLines = [];
    if (fiche.menu?.entree) menuLines.push(`• Entrée : ${fiche.menu.entree}`);
    if (fiche.menu?.plat) menuLines.push(`• Plat : ${fiche.menu.plat}`);
    if (fiche.menu?.dessert) menuLines.push(`• Dessert : ${fiche.menu.dessert}`);
    if (fiche.menu?.boissons) menuLines.push(`• Boissons : ${fiche.menu.boissons}`);
    if (fiche.menu?.options_speciales) menuLines.push(`• Options spéciales : ${fiche.menu.options_speciales}`);

    const programmeLines = (fiche.programme || []).map(e =>
      `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${e.heure || ''}</td><td style="padding:4px 8px;border-bottom:1px solid #eee">${e.nom || e.intitule || ''}</td></tr>`
    ).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fiche de service — ${fiche.evenement_nom}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; padding: 32px; max-width: 700px; margin: 0 auto; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
    .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .info-row { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; font-size: 14px; }
    .label { color: #64748b; min-width: 160px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>📋 Fiche de service</h1>
  <div class="badge">${fiche.extra_poste || ''}</div>
  <p style="font-size:15px;font-weight:700;margin-top:12px">${fiche.extra_nom}</p>

  <h2>Événement</h2>
  <div class="info-row"><span class="label">Nom</span><strong>${fiche.evenement_nom || ''}</strong></div>
  <div class="info-row"><span class="label">Date</span>${dateStr}</div>
  <div class="info-row"><span class="label">Lieu</span>${fiche.evenement_lieu || '—'}</div>
  <div class="info-row"><span class="label">Nombre d'invités</span>${fiche.nb_invites || '—'}</div>
  <div class="info-row"><span class="label">Prise de poste</span><strong>${fiche.heure_prise_poste || '—'}</strong></div>

  <h2>Informations pratiques</h2>
  <div class="info-row"><span class="label">Tenue vestimentaire</span>${fiche.tenue || '—'}</div>
  <div class="info-row"><span class="label">Responsable du soir</span>${fiche.responsable_nom || '—'}</div>
  <div class="info-row"><span class="label">Urgences</span>${fiche.coordonnees_urgence || '—'}</div>

  ${menuLines.length > 0 ? `<h2>Menu</h2><p style="font-size:14px;line-height:1.8">${menuLines.join('<br>')}</p>` : ''}

  ${programmeLines ? `<h2>Programme de la journée</h2><table><thead><tr><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #e2e8f0">Heure</th><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #e2e8f0">Étape</th></tr></thead><tbody>${programmeLines}</tbody></table>` : ''}

  <p style="margin-top:32px;font-size:12px;color:#94a3b8">Document généré le ${format(new Date(), 'd MMMM yyyy', { locale: fr })}</p>
</body>
</html>`;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <FileText size={14} /> Mes fiches de service ({fichesEnvoyees.length})
      </h3>

      {fichesEnvoyees.map(fiche => {
        const dateStr = fiche.evenement_date
          ? format(parseISO(fiche.evenement_date), 'EEEE d MMMM yyyy', { locale: fr })
          : '';

        return (
          <div key={fiche.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Header fiche */}
            <div className="bg-primary/5 border-b border-border px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm">{fiche.evenement_nom}</p>
                <p className="text-xs text-muted-foreground capitalize">{dateStr}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" onClick={() => handleDownloadPDF(fiche)}>
                <Download size={12} /> PDF
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Infos clés */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={13} className="text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Prise de poste</p>
                    <p className="font-bold text-primary">{fiche.heure_prise_poste || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Lieu</p>
                    <p className="font-medium">{fiche.evenement_lieu || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Invités</p>
                    <p className="font-medium">{fiche.nb_invites || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shirt size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tenue</p>
                    <p className="font-medium">{fiche.tenue || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Responsable + Urgences */}
              {(fiche.responsable_nom || fiche.coordonnees_urgence) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                  {fiche.responsable_nom && (
                    <p className="text-xs flex items-center gap-1.5">
                      <UserCheck size={12} className="text-amber-600" />
                      <span className="text-amber-700"><strong>Responsable :</strong> {fiche.responsable_nom}</span>
                    </p>
                  )}
                  {fiche.coordonnees_urgence && (
                    <p className="text-xs flex items-center gap-1.5">
                      <Phone size={12} className="text-amber-600" />
                      <span className="text-amber-700"><strong>Urgences :</strong> {fiche.coordonnees_urgence}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Menu */}
              {fiche.menu && Object.values(fiche.menu).some(v => v) && (
                <Section title="Menu">
                  <div className="text-sm space-y-1">
                    {fiche.menu.entree && <p>🥗 <strong>Entrée :</strong> {fiche.menu.entree}</p>}
                    {fiche.menu.plat && <p>🍽️ <strong>Plat :</strong> {fiche.menu.plat}</p>}
                    {fiche.menu.dessert && <p>🍰 <strong>Dessert :</strong> {fiche.menu.dessert}</p>}
                    {fiche.menu.boissons && <p>🍷 <strong>Boissons :</strong> {fiche.menu.boissons}</p>}
                    {fiche.menu.options_speciales && <p>⚡ <strong>Options :</strong> {fiche.menu.options_speciales}</p>}
                  </div>
                </Section>
              )}

              {/* Programme */}
              {fiche.programme && fiche.programme.length > 0 && (
                <Section title="Programme de la journée">
                  <div className="space-y-1">
                    {fiche.programme.map((etape, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="text-muted-foreground font-mono text-xs w-12 shrink-0 pt-0.5">{etape.heure}</span>
                        <span>{etape.nom || etape.intitule}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}