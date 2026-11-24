import { useState, type FormEvent } from 'react';
import { CheckCircle2, AlertCircle, X, Plus, Edit2, Trash2 } from 'lucide-react';
import { createRiderAccount, editRiderAccount, deleteRiderAccount } from '../services/riders';
import type { RiderAccount } from '../types';
import { showSystemConfirm, showSystemToast } from './SystemDialogHost';
import { useBackdropClose } from '../utils/modalBackdrop';

interface Props {
  riders: RiderAccount[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

const empty = { name: '', phone: '', email: '', password: '', available: true };
const inputClass = 'mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none';

export function RiderDirectory({ riders, loading, error, reload }: Props) {
  const [editing, setEditing] = useState<RiderAccount | 'new' | null>(null);
  const [draft, setDraft] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');

  const closeForm = () => {
    if (busy) return;
    setEditing(null);
    setDraft(empty);
    setFailure('');
  };

  const formBackdropHandlers = useBackdropClose(Boolean(editing), closeForm);

  function open(rider: RiderAccount | 'new') {
    setDraft(
      rider === 'new'
        ? empty
        : {
            name: rider.name,
            email: rider.email || '',
            phone: rider.phone,
            password: '',
            available: rider.available,
          }
    );
    setEditing(rider);
    setFailure('');
    setNotice('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setFailure('');
    try {
      const isNew = editing === 'new';
      if (isNew) {
        await createRiderAccount(draft);
      } else {
        await editRiderAccount(editing.id, {
          name: draft.name,
          phone: draft.phone,
          available: draft.available,
          ...(draft.email ? { email: draft.email } : {}),
          ...(draft.password ? { password: draft.password } : {}),
        });
      }
      const successMsg = isNew
        ? `Repartidor "${draft.name.trim()}" creado correctamente.`
        : `Repartidor "${draft.name.trim()}" actualizado correctamente.`;
      setNotice(successMsg);
      showSystemToast({ message: successMsg, tone: 'success' });
      setEditing(null);
      setDraft(empty);
      await reload();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'No se pudo guardar el repartidor.';
      setFailure(errorMsg);
      showSystemToast({ message: errorMsg, tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(rider: RiderAccount) {
    if (
      busy ||
      !(await showSystemConfirm({
        title: '¿Eliminar repartidor?',
        message: `Dar de baja a ${rider.name} de la flotilla.`,
        details: rider.userId
          ? 'Se cerrará su acceso y se conservará el historial de pedidos.'
          : 'El contacto dejará de aparecer en las opciones de WhatsApp.',
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        tone: 'danger',
      }))
    ) {
      return;
    }
    setBusy(true);
    setFailure('');
    setNotice('');
    try {
      await deleteRiderAccount(rider.id);
      const successMsg = `Repartidor "${rider.name}" eliminado correctamente.`;
      setNotice(successMsg);
      showSystemToast({ message: successMsg, tone: 'success' });
      await reload();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'No se pudo eliminar el repartidor.';
      setFailure(errorMsg);
      showSystemToast({ message: errorMsg, tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Directorio de repartidores" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold text-gray-900">Repartidores</h3>
        {!editing && (
          <button
            disabled={busy}
            type="button"
            onClick={() => open('new')}
            className="rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-sm font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo repartidor</span>
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-red-800"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </span>
          <button type="button" onClick={reload} className="underline shrink-0 cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-emerald-900"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Cerrar alerta"
            className="text-emerald-700 hover:text-emerald-950 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {failure && !editing && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-red-900"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{failure}</span>
          </span>
          <button
            type="button"
            onClick={() => setFailure('')}
            aria-label="Cerrar error"
            className="text-red-700 hover:text-red-950 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {editing && (
        <div
          {...formBackdropHandlers}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <form
            onSubmit={save}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150"
          >
            <div className="bg-[#101b29] text-white px-5 py-4 flex items-center justify-between">
              <h4 className="font-black text-base">
                {editing === 'new' ? 'Alta de repartidor' : 'Editar repartidor'}
              </h4>
              <button
                type="button"
                disabled={busy}
                onClick={closeForm}
                aria-label="Cerrar formulario"
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[82dvh] overflow-y-auto">
              {editing !== 'new' && !editing.userId && (
                <p className="text-xs bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3">
                  Contacto solo WhatsApp. Agrega correo y contraseña si deseas darle acceso a la app.
                </p>
              )}

              {failure && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-800"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{failure}</span>
                </div>
              )}

              <fieldset disabled={busy} className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <label className="font-semibold text-gray-700">
                  Nombre completo
                  <input
                    className={inputClass}
                    required
                    minLength={2}
                    maxLength={120}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </label>
                <label className="font-semibold text-gray-700">
                  Teléfono / WhatsApp
                  <input
                    className={inputClass}
                    type="tel"
                    required
                    minLength={8}
                    maxLength={32}
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  />
                </label>
                <label className="font-semibold text-gray-700">
                  Correo de acceso
                  <input
                    className={inputClass}
                    type="email"
                    required={editing === 'new' || !!editing.userId || !!draft.password}
                    maxLength={254}
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  />
                </label>
                <label className="font-semibold text-gray-700">
                  {editing !== 'new' && editing.userId ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}
                  <input
                    className={inputClass}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required={editing === 'new' || (!editing.userId && !!draft.email)}
                    value={draft.password}
                    onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-2 font-semibold text-gray-800 sm:col-span-2 pt-1">
                  <input
                    type="checkbox"
                    checked={draft.available}
                    onChange={(e) => setDraft({ ...draft, available: e.target.checked })}
                  />
                  Disponible para despacho
                </label>
              </fieldset>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  disabled={busy}
                  onClick={closeForm}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 px-4 py-2 text-sm font-bold text-white transition cursor-pointer"
                >
                  {busy ? 'Guardando…' : 'Guardar repartidor'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {riders.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                {['Nombre', 'Teléfono', 'Correo de acceso', 'Disponibilidad', 'Acciones'].map((h) => (
                  <th key={h} scope="col" className="p-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {riders.map((r) => (
                <tr key={r.id} className="border-b border-gray-200">
                  <th scope="row" className="p-2.5 font-bold text-gray-900">
                    {r.name}
                  </th>
                  <td className="p-2.5 font-mono text-xs">{r.phone}</td>
                  <td className="p-2.5 text-xs text-gray-600">{r.email || 'Solo WhatsApp'}</td>
                  <td className="p-2.5 text-xs font-semibold">
                    {r.status !== 'activo' ? 'Cuenta bloqueada' : r.available ? 'Disponible' : 'Fuera de servicio'}
                  </td>
                  <td className="p-2.5">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={busy || !!editing}
                        onClick={() => open(r)}
                        className="font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy || !!editing}
                        onClick={() => remove(r)}
                        className="font-bold text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && (
          <p className="text-sm text-gray-500">
            {loading ? 'Cargando repartidores…' : 'Todavía no hay repartidores registrados.'}
          </p>
        )
      )}
    </section>
  );
}
