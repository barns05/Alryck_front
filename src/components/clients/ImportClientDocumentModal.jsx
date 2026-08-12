import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Upload, FileText, Check, AlertTriangle, ChevronRight, RefreshCw, Sparkles, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CREATE_OPTIONS = [
  { id: 'client', label: 'Fiche client', emoji: '👤' },
  { id: 'evenement', label: "Fiche événement", emoji: '🎉' },
  { id: 'both', label: 'Les deux', emoji: '✨' },
];

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx';

function genToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function FieldRow({ label, value, onChange, type = 'text' }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="text-sm h-8" />
    </div>
  );
}

export default function ImportClientDocumentModal({ onClose }) {
  const qc = useQueryClient();
  const ref = useRef();
  const [step, setStep] = useState(1); // 1=upload, 2=choix, 3=analyse, 4=validation, error
  const [file, setFile] = useState(null);
  const [createType, setCreateType] = useState(null);
  const [result, setResult] = useState(null); // { client, evenement }
  const [saving, setSaving] = useState(false);

  const STEPS = ['Document', 'Créer', 'Analyse', 'Validation'];

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setStep(2);
  };

  const handleLaunchAnalysis = async () => {
    if (!createType) return;
    setStep(3);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const needClient = createType === 'client' || createType === 'both';
      const needEvent = createType === 'evenement' || createType === 'both';

      const prompt = `Analyse ce document et extrait les informations suivantes.
${needClient ? `
CLIENT: prenom, nom, telephone, email, adresse, notes.` : ''}
${needEvent ? `
EVENEMENT: nom_evenement (ex: "Mariage Dupont"), type_evenement (parmi: Mariage, Pacs, Anniversaire de mariage, Baptême, Anniversaire, Soirée d'entreprise, Séminaire, Cocktail, Gala, Location, Autre), date_evenement (format YYYY-MM-DD), heure_debut (HH:MM), heure_fin (HH:MM), lieu_nom, nb_invites (nombre), nb_adultes (nombre), notes_contrat.` : ''}
Retourne uniquement les champs trouvés dans le document. Si une information est absente, omets-la.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            prenom: { type: 'string' },
            nom: { type: 'string' },
            telephone: { type: 'string' },
            email: { type: 'string' },
            adresse: { type: 'string' },
            notes: { type: 'string' },
            nom_evenement: { type: 'string' },
            type_evenement: { type: 'string' },
            date_evenement: { type: 'string' },
            heure_debut: { type: 'string' },
            heure_fin: { type: 'string' },
            lieu_nom: { type: 'string' },
            nb_invites: { type: 'number' },
            nb_adultes: { type: 'number' },
            notes_contrat: { type: 'string' },
          },
        },
      });

      if (!response) { setStep('error'); return; }

      // Structurer les résultats
      const clientData = needClient ? {
        prenom: response.prenom || '',
        nom: response.nom || '',
        telephone: response.telephone || '',
        email: response.email || '',
        adresse: response.adresse || '',
        notes: response.notes || '',
        date_evenement: response.date_evenement || '',
        type_evenement: response.type_evenement || '',
        lieu_evenement: response.lieu_nom || '',
        nombre_personnes: response.nb_invites || '',
      } : null;

      const evenementData = needEvent ? {
        nom: response.nom_evenement || (response.nom ? `Événement ${response.nom}` : '') || '',
        type_evenement: response.type_evenement || '',
        date: response.date_evenement || '',
        heure_debut: response.heure_debut || '',
        heure_fin: response.heure_fin || '',
        lieu_nom: response.lieu_nom || '',
        nb_invites: response.nb_invites || 0,
        nb_adultes: response.nb_adultes || 0,
        notes_contrat: response.notes_contrat || '',
        client_nom: response.nom ? `${response.prenom || ''} ${response.nom || ''}`.trim() : '',
        statut: 'En attente',
      } : null;

      setResult({ client: clientData, evenement: evenementData });
      setStep(4);
    } catch (e) {
      console.error(e);
      alert('❌ Erreur lors de l\'analyse : ' + (e.message || 'Veuillez réessayer avec un autre document ou une autre approche.'));
      setStep('error');
    }
  };

  const handleValidate = async () => {
    setSaving(true);
    try {
      let clientId = null;
      if (result.client) {
        const clientPayload = {
          ...result.client,
          lien_client_token: genToken(),
        };
        if (clientPayload.nombre_personnes) clientPayload.nombre_personnes = parseInt(clientPayload.nombre_personnes) || undefined;
        const created = await base44.entities.Client.create(clientPayload);
        clientId = created.id;
      }

      if (result.evenement) {
        const evPayload = { ...result.evenement };
        if (clientId) {
          evPayload.client_id = clientId;
          evPayload.client_nom = `${result.client?.prenom || ''} ${result.client?.nom || ''}`.trim();
          evPayload.client_email = result.client?.email || '';
          evPayload.client_telephone = result.client?.telephone || '';
        }
        if (evPayload.nb_invites) evPayload.nb_invites = parseInt(evPayload.nb_invites) || 0;
        await base44.entities.Evenement.create(evPayload);
      }

      qc.invalidateQueries(['clients']);
      qc.invalidateQueries(['evenements']);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = () => {
    setFile(null);
    setCreateType(null);
    setResult(null);
    setStep(1);
  };

  const stepNum = step === 'error' ? null : step;
  const setClientField = (k, v) => setResult(r => ({ ...r, client: { ...r.client, [k]: v } }));
  const setEvField = (k, v) => setResult(r => ({ ...r, evenement: { ...r.evenement, [k]: v } }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Importer depuis un document</p>
              <p className="text-xs text-muted-foreground">Amanda extrait automatiquement les informations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Steps */}
        {stepNum && (
          <div className="px-6 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors
                    ${i + 1 < stepNum ? 'bg-emerald-500 text-white' : i + 1 === stepNum ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {i + 1 < stepNum ? <Check size={11} /> : i + 1}
                  </div>
                  <span className={`text-xs ${i + 1 === stepNum ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</span>
                  {i < STEPS.length - 1 && <ChevronRight size={12} className="text-muted-foreground ml-auto mr-1 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Étape 1 : Upload */}
          {step === 1 && (
            <>
              <div
                onClick={() => ref.current?.click()}
                className="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors border-border hover:border-primary/50 hover:bg-muted/50"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload size={24} className="text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm">Glissez votre document ici</p>
                  <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir</p>
                </div>
                <p className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">PDF · JPG · PNG · DOCX</p>
              </div>
              <input ref={ref} type="file" accept={ACCEPT} className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </>
          )}

          {/* Étape 2 : Choix */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
                <FileText size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">{(file?.size / 1024).toFixed(0)} Ko</p>
                </div>
              </div>
              <p className="text-sm font-medium">Que souhaitez-vous créer à partir de ce document ?</p>
              <div className="space-y-2">
                {CREATE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setCreateType(opt.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors
                      ${createType === opt.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30 hover:bg-muted/40'}`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-sm font-medium">{opt.label}</span>
                    {createType === opt.id && <Check size={15} className="ml-auto text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Étape 3 : Analyse */}
          {step === 3 && (
            <div className="flex flex-col items-center gap-6 py-10">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles size={32} className="text-primary animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-spin border-t-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-base">Amanda analyse votre document…</p>
                <p className="text-sm text-muted-foreground">Extraction des informations en cours.</p>
              </div>
            </div>
          )}

          {/* Étape 4 : Validation */}
          {step === 4 && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                <Check size={15} className="shrink-0" />
                <p className="text-sm font-medium">Amanda a analysé votre document avec succès !</p>
              </div>
              <p className="text-sm text-muted-foreground">Vérifiez et ajustez les informations extraites :</p>

              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {result.client && (
                  <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">👤 Fiche client</p>
                    <FieldRow label="Prénom" value={result.client.prenom} onChange={v => setClientField('prenom', v)} />
                    <FieldRow label="Nom" value={result.client.nom} onChange={v => setClientField('nom', v)} />
                    <FieldRow label="Téléphone" value={result.client.telephone} onChange={v => setClientField('telephone', v)} />
                    <FieldRow label="Email" value={result.client.email} onChange={v => setClientField('email', v)} />
                    <FieldRow label="Date de l'événement" value={result.client.date_evenement} onChange={v => setClientField('date_evenement', v)} type="date" />
                    <FieldRow label="Type d'événement" value={result.client.type_evenement} onChange={v => setClientField('type_evenement', v)} />
                    <FieldRow label="Lieu" value={result.client.lieu_evenement} onChange={v => setClientField('lieu_evenement', v)} />
                  </div>
                )}
                {result.evenement && (
                  <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">🎉 Fiche événement</p>
                    <FieldRow label="Nom de l'événement" value={result.evenement.nom} onChange={v => setEvField('nom', v)} />
                    <FieldRow label="Type" value={result.evenement.type_evenement} onChange={v => setEvField('type_evenement', v)} />
                    <FieldRow label="Date" value={result.evenement.date} onChange={v => setEvField('date', v)} type="date" />
                    <FieldRow label="Heure début" value={result.evenement.heure_debut} onChange={v => setEvField('heure_debut', v)} />
                    <FieldRow label="Heure fin" value={result.evenement.heure_fin} onChange={v => setEvField('heure_fin', v)} />
                    <FieldRow label="Lieu" value={result.evenement.lieu_nom} onChange={v => setEvField('lieu_nom', v)} />
                    <FieldRow label="Nombre d'invités" value={result.evenement.nb_invites} onChange={v => setEvField('nb_invites', v)} type="number" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleRestart}>
                  <RefreshCw size={13} /> Recommencer
                </Button>
                <Button size="sm" className="flex-1 gap-1.5" disabled={saving} onClick={handleValidate}>
                  {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={13} />}
                  Valider et créer
                </Button>
              </div>
            </div>
          )}

          {/* Erreur */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">Amanda n'a pas pu analyser ce document.</p>
                <p className="text-sm text-muted-foreground">Le contenu n'a pas pu être extrait automatiquement.</p>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={handleRestart}>
                  <RefreshCw size={13} /> Recommencer
                </Button>
                <Button className="flex-1 gap-1.5" onClick={onClose}>
                  <Pencil size={13} /> Saisir manuellement
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer étape 2 */}
        {step === 2 && (
          <div className="px-6 pb-5 shrink-0">
            <Button className="w-full gap-2" disabled={!createType} onClick={handleLaunchAnalysis}>
              <Sparkles size={15} /> Lancer l'analyse IA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}