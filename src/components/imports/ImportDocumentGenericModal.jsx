/**
 * Composant générique d'import par document (PDF, image, Word).
 * L'IA extrait les champs demandés et l'admin valide avant création.
 * 
 * Props:
 *   - title: string
 *   - subtitle: string
 *   - entityName: string (ex: "Prestataire")
 *   - queryKey: string
 *   - prompt: string (prompt complet pour l'IA)
 *   - jsonSchema: object (schéma JSON pour la réponse IA)
 *   - buildPayload: fn(response) => object (transforme la réponse IA en payload à enregistrer)
 *   - renderEditor: fn(data, setField) => JSX (formulaire de vérification)
 *   - onClose: fn
 */
import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Upload, FileText, Check, AlertTriangle, ChevronRight, RefreshCw, Sparkles, Pencil } from 'lucide-react';
import AmandaProcessing from '@/components/AmandaProcessing';
import { Button } from '@/components/ui/button';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx';
const STEPS = ['Document', 'Analyse', 'Validation'];

export default function ImportDocumentGenericModal({
  title,
  subtitle,
  entityName,
  queryKey,
  prompt,
  jsonSchema,
  buildPayload,
  renderEditor,
  onClose,
}) {
  const qc = useQueryClient();
  const ref = useRef();
  const [step, setStep] = useState(1); // 1|2|3|error
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setData(d => ({ ...d, [k]: v }));

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    handleLaunchAnalysis(f);
  };

  const handleLaunchAnalysis = async (f) => {
    setStep(2);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: jsonSchema,
      });
      if (!response) { setStep('error'); return; }
      setData(response);
      setStep(3);
    } catch (e) {
      console.error(e);
      setStep('error');
    }
  };

  const handleValidate = async () => {
    setSaving(true);
    try {
      const payload = buildPayload ? buildPayload(data) : data;
      await base44.entities[entityName].create(payload);
      qc.invalidateQueries([queryKey]);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = () => {
    setFile(null); setData(null); setStep(1);
  };

  const stepNum = step === 'error' ? null : step;

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
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
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
              <div onClick={() => ref.current?.click()}
                className="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors border-border hover:border-primary/50 hover:bg-muted/50">
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

          {/* Étape 2 : Analyse */}
          {step === 2 && (
            <div className="flex flex-col items-center gap-4 py-10">
              <AmandaProcessing size="lg" variant="light" message="Amanda analyse votre document…" />
              <p className="text-sm text-muted-foreground">Extraction des informations en cours.</p>
            </div>
          )}

          {/* Étape 3 : Validation */}
          {step === 3 && data && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                <Check size={15} className="shrink-0" />
                <p className="text-sm font-medium">Amanda a analysé votre document avec succès !</p>
              </div>
              <p className="text-sm text-muted-foreground">Vérifiez et ajustez avant de valider :</p>
              <div className="bg-muted/30 rounded-2xl border border-border p-4 max-h-72 overflow-y-auto space-y-3">
                {renderEditor(data, setField)}
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
                <Button variant="outline" className="flex-1 gap-1.5" onClick={handleRestart}><RefreshCw size={13} /> Recommencer</Button>
                <Button className="flex-1 gap-1.5" onClick={onClose}><Pencil size={13} /> Saisir manuellement</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}