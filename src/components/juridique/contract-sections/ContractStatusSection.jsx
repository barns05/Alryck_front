import { Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import YousignStatusBadge from '../YousignStatusBadge';

/**
 * ContractStatusSection — statut du contrat, badge Youtrust, date de signature
 * et uploads (modèle à signer + contrat signé) extraits de ContractModal.
 */
export default function ContractStatusSection({ form, setForm, contrat, creationMode, isDynamicModele, onFileUpload, uploadingModele, uploadingSigne }) {
  return (
    <>
      {/* Upload modèle PDF (uniquement si pas un modèle dynamique ET pas en mode "signé") */}
      {!isDynamicModele && creationMode !== 'signe' && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Document à faire signer</label>
          <div className="border border-dashed border-border rounded-lg p-4 text-center">
            <label className="cursor-pointer">
              <Upload size={20} className="mx-auto mb-2 text-muted-foreground" />
              <span className="text-xs text-muted-foreground block">Cliquez pour uploader</span>
              <input
                type="file"
                accept=".pdf"
                onChange={e => e.target.files?.[0] && onFileUpload(e.target.files[0], 'modele')}
                disabled={uploadingModele}
                className="hidden"
              />
            </label>
            {form.modele_nom && (
              <p className="text-xs text-emerald-600 mt-2">✓ {form.modele_nom}</p>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Statut</label>
        <select
          value={form.statut}
          onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {['En attente de signature', 'Signé', 'Archivé'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {contrat?.yousign_statut && (
          <div className="mt-1.5">
            <YousignStatusBadge statut={contrat.yousign_statut} />
          </div>
        )}
      </div>

      {form.statut === 'Signé' && creationMode !== 'a_signer' && (
        <>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Date de signature</label>
            <Input
              type="date"
              value={form.date_signature}
              onChange={e => setForm(f => ({ ...f, date_signature: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Contrat signé</label>
            <div className="border border-dashed border-border rounded-lg p-4 text-center">
              <label className="cursor-pointer">
                <Upload size={20} className="mx-auto mb-2 text-muted-foreground" />
                <span className="text-xs text-muted-foreground block">Cliquez pour uploader</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => e.target.files?.[0] && onFileUpload(e.target.files[0], 'signe')}
                  disabled={uploadingSigne}
                  className="hidden"
                />
              </label>
              {form.contrat_signe_nom && (
                <p className="text-xs text-emerald-600 mt-2">✓ {form.contrat_signe_nom}</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}