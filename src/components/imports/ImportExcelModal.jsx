/**
 * Composant générique d'import Excel/CSV.
 * Props:
 *   - entityLabel: string (ex: "prestataires")
 *   - fields: [{ key, label, required?, transform? }]
 *   - entityName: string (ex: "Prestataire")
 *   - onClose: fn
 *   - accentColor: string (classes tailwind bg/text pour l'icône)
 */
import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Upload, FileText, Check, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line =>
    line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
  );
  return { headers, rows };
}

async function parseExcel(file) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
    file_url,
    json_schema: {
      type: 'object',
      properties: {
        headers: { type: 'array', items: { type: 'string' } },
        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
      },
    },
  });
  if (result.status !== 'success') throw new Error(result.details || 'Erreur extraction');
  return result.output;
}

function autoDetectMapping(headers, fields) {
  const mapping = {};
  fields.forEach(field => {
    const key = field.key.toLowerCase();
    const label = field.label.toLowerCase();
    headers.forEach((h, i) => {
      const hh = h.toLowerCase();
      if (!mapping[field.key] && (hh.includes(key) || hh.includes(label) || key.includes(hh))) {
        mapping[field.key] = i;
      }
    });
  });
  return mapping;
}

export default function ImportExcelModal({ entityLabel, fields, entityName, queryKey, onClose, accentColor = 'bg-emerald-100 text-emerald-600' }) {
  const qc = useQueryClient();
  const ref = useRef();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [parseError, setParseError] = useState(null);

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setParseError(null);
    setLoading(true);
    try {
      let parsed;
      if (f.name.endsWith('.csv')) {
        parsed = parseCSV(await f.text());
      } else {
        parsed = await parseExcel(f);
      }
      if (!parsed.headers?.length) throw new Error('Impossible de lire les en-têtes du fichier.');
      setHeaders(parsed.headers);
      setRows(parsed.rows || []);
      setMapping(autoDetectMapping(parsed.headers, fields));
      setStep(2);
    } catch (e) {
      setParseError(e.message || 'Erreur de lecture.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    let created = 0;
    const errors = [];
    for (const row of rows) {
      try {
        const record = {};
        for (const [fieldKey, colIdx] of Object.entries(mapping)) {
          if (colIdx !== undefined && colIdx !== null && colIdx !== '') {
            const val = row[Number(colIdx)];
            if (val !== undefined && val !== '') {
              const fieldDef = fields.find(f => f.key === fieldKey);
              record[fieldKey] = fieldDef?.transform ? fieldDef.transform(val) : val;
            }
          }
        }
        const requiredFields = fields.filter(f => f.required);
        const missingRequired = requiredFields.filter(f => !record[f.key]);
        if (missingRequired.length > 0) {
          errors.push({ row: row.join(', '), reason: `Champs requis manquants : ${missingRequired.map(f => f.label).join(', ')}` });
          continue;
        }
        await base44.entities[entityName].create(record);
        created++;
      } catch (e) {
        errors.push({ row: row.join(', '), reason: e.message });
      }
    }
    setResult({ created, errors });
    qc.invalidateQueries([queryKey]);
    setStep(3);
    setLoading(false);
  };

  const handleRestart = () => {
    setStep(1); setFile(null); setHeaders([]); setRows([]); setMapping({}); setResult(null); setParseError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentColor}`}>
              <FileText size={16} />
            </div>
            <div>
              <p className="font-semibold text-sm">Importer depuis Excel / CSV</p>
              <p className="text-xs text-muted-foreground">Créez des {entityLabel} en masse</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {/* Steps */}
        {step < 3 && (
          <div className="px-6 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-1">
              {['Fichier', 'Correspondance', 'Résultat'].map((s, i) => (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors
                    ${i + 1 < step ? 'bg-emerald-500 text-white' : i + 1 === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {i + 1 < step ? <Check size={11} /> : i + 1}
                  </div>
                  <span className={`text-xs ${i + 1 === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</span>
                  {i < 2 && <ChevronRight size={12} className="text-muted-foreground ml-auto mr-1 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Étape 1 */}
          {step === 1 && (
            <>
              {loading ? (
                <div className="flex flex-col items-center gap-4 py-10">
                  <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Lecture du fichier…</p>
                </div>
              ) : (
                <>
                  <div onClick={() => ref.current?.click()}
                    className="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors border-border hover:border-primary/50 hover:bg-muted/50">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${accentColor}`}>
                      <Upload size={24} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">Glissez votre fichier ici</p>
                      <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir</p>
                    </div>
                    <p className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">Excel (.xlsx) · CSV (.csv)</p>
                  </div>
                  <input ref={ref} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                  {parseError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <AlertTriangle size={15} className="shrink-0" />
                      <p className="text-sm">{parseError}</p>
                    </div>
                  )}
                  <div className="bg-muted/50 rounded-xl px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Colonnes attendues :</p>
                    <p className="text-xs text-muted-foreground">{fields.map(f => f.label).join(', ')}</p>
                  </div>
                </>
              )}
            </>
          )}

          {/* Étape 2 */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
                <FileText size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">{rows.length} lignes détectées</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Vérifiez la correspondance des colonnes :</p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {fields.map(field => (
                  <div key={field.key} className="flex items-center gap-3">
                    <span className={`text-xs font-medium w-36 shrink-0 ${field.required ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                    <Select
                      value={mapping[field.key] !== undefined ? String(mapping[field.key]) : '__none__'}
                      onValueChange={v => setMapping(m => ({ ...m, [field.key]: v === '__none__' ? undefined : Number(v) }))}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="— Ignorer —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Ignorer —</SelectItem>
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {rows[0] && (
                <div className="bg-muted/30 rounded-xl px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Aperçu (1ère ligne) :</p>
                  <div className="text-xs space-y-0.5">
                    {fields.filter(f => mapping[f.key] !== undefined).map(f => (
                      <p key={f.key}><span className="text-muted-foreground">{f.label} : </span>{rows[0][mapping[f.key]] || '—'}</p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Étape 3 */}
          {step === 3 && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Check size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-700">{result.created} fiche{result.created > 1 ? 's' : ''} créée{result.created > 1 ? 's' : ''}</p>
                  {result.errors.length > 0 && <p className="text-xs text-amber-600 mt-0.5">{result.errors.length} ligne{result.errors.length > 1 ? 's' : ''} ignorée{result.errors.length > 1 ? 's' : ''}</p>}
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-amber-700 font-medium">{e.reason}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.row}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={handleRestart}><RefreshCw size={13} /> Nouvel import</Button>
                <Button className="flex-1" onClick={onClose}>Fermer</Button>
              </div>
            </div>
          )}
        </div>

        {step === 2 && (
          <div className="px-6 pb-5 shrink-0">
            <Button className="w-full gap-2" disabled={loading} onClick={handleImport}>
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={15} />}
              Importer {rows.length} enregistrement{rows.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}