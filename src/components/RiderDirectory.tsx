import { useState, type FormEvent } from 'react';
import { createRiderAccount, editRiderAccount, deleteRiderAccount } from '../services/riders';
import type { RiderAccount } from '../types';
import { showSystemConfirm } from './SystemDialogHost';

interface Props {
  riders: RiderAccount[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

const empty = { name: '', phone: '', email: '', password: '', available: true };
const inputClass = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900';

export function RiderDirectory({ riders, loading, error, reload }: Props) {
  const [editing, setEditing] = useState<RiderAccount | 'new' | null>(null);
  const [draft, setDraft] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');

  function open(rider: RiderAccount | 'new') {
    setDraft(rider === 'new' ? empty : { name: rider.name, email: rider.email || '', phone: rider.phone,
      password: '', available: rider.available });
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
      if (editing === 'new') {
        await createRiderAccount(draft);
      } else {
        await editRiderAccount(editing.id, { name: draft.name, phone: draft.phone, available: draft.available,
          ...(draft.email ? { email: draft.email } : {}), ...(draft.password ? { password: draft.password } : {}) });
      }
      setNotice(editing === 'new' ? 'Repartidor creado.' : 'Cambios guardados.');
      setEditing(null);
      setDraft(empty);
      await reload();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'No se pudo guardar el repartidor.');
    } finally { setBusy(false); }
  }

  async function remove(rider: RiderAccount) {
    if (busy || !await showSystemConfirm({ title: '¿Eliminar repartidor?', message: `Dar de baja a ${rider.name} de la flotilla.`,
      details: rider.userId ? 'Se cerrará su acceso. Su correo y teléfono de cuenta quedarán reservados y se conservará el historial de pedidos.' : 'El contacto dejará de aparecer en las opciones de WhatsApp.', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', tone: 'danger' })) return;
    setBusy(true);
    setFailure('');
    setNotice('');
    try {
      await deleteRiderAccount(rider.id);
      setNotice('Repartidor eliminado de la flotilla.');
      await reload();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'No se pudo eliminar el repartidor.');
    } finally { setBusy(false); }
  }

  return <section aria-label="Directorio de repartidores" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-extrabold text-gray-900">Repartidores</h3>
      {!editing && <button disabled={busy} type="button" onClick={() => open('new')}
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">Nuevo repartidor</button>}
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error} <button type="button" onClick={reload} className="underline">Reintentar</button></p>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {failure && <p role="alert" className="text-sm text-red-700">{failure}</p>}
    {editing && <form onSubmit={save} className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <h4 className="font-bold">{editing === 'new' ? 'Alta de repartidor' : 'Editar repartidor'}</h4>
      {editing !== 'new' && !editing.userId && <p className="text-sm">Este contacto usa WhatsApp. Agrega correo y contraseña para darle acceso a pedidos asignados.</p>}
      <fieldset disabled={busy} className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <label>Nombre completo<input className={inputClass} required minLength={2} maxLength={120} value={draft.name}
          onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        <label>Teléfono / WhatsApp<input className={inputClass} type="tel" required minLength={8} maxLength={32} value={draft.phone}
          onChange={e => setDraft({ ...draft, phone: e.target.value })} /></label>
        <label>Correo de acceso<input className={inputClass} type="email" required={editing === 'new' || !!editing.userId || !!draft.password}
          maxLength={254} value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>
        <label>{editing !== 'new' && editing.userId ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}
          <input className={inputClass} type="password" autoComplete="new-password" minLength={8} maxLength={128}
            required={editing === 'new' || (!editing.userId && !!draft.email)} value={draft.password}
            onChange={e => setDraft({ ...draft, password: e.target.value })} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.available}
          onChange={e => setDraft({ ...draft, available: e.target.checked })} />Disponible para despacho</label>
      </fieldset>
      <div className="flex gap-3"><button type="submit" disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">
        {busy ? 'Guardando…' : 'Guardar repartidor'}</button>
        <button type="button" disabled={busy} onClick={() => { setEditing(null); setDraft(empty); setFailure(''); }} className="text-sm font-bold">Cancelar</button></div>
    </form>}
    {riders.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-gray-50 text-gray-700"><tr>{['Nombre', 'Teléfono', 'Correo de acceso', 'Disponibilidad', 'Acciones'].map(h =>
        <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
      <tbody>{riders.map(r => <tr key={r.id} className="border-b border-gray-200">
        <th scope="row" className="p-2">{r.name}</th><td className="p-2">{r.phone}</td><td className="p-2">{r.email || 'Solo WhatsApp'}</td>
        <td className="p-2">{r.status !== 'activo' ? 'Cuenta bloqueada' : r.available ? 'Disponible' : 'Fuera de servicio'}</td>
        <td className="p-2"><div className="flex gap-3"><button type="button" disabled={busy || !!editing} onClick={() => open(r)} className="font-bold text-blue-700">Editar</button>
          <button type="button" disabled={busy || !!editing} onClick={() => remove(r)} className="font-bold text-red-700">Eliminar</button></div></td>
      </tr>)}</tbody></table></div> : !error && <p className="text-sm">{loading ? 'Cargando repartidores…' : 'Todavía no hay repartidores registrados.'}</p>}
  </section>;
}
