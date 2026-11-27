import React, { useState } from 'react';
import type { MenuItemOptionGroup } from '../types';
import { Plus, Trash2, X, ListChecks, Sparkles } from 'lucide-react';
import { getOptionGroupRuleSubtitle } from '../utils/dishOptions';

interface AdminDishSpecsEditorProps {
  optionGroups: MenuItemOptionGroup[];
  onChange: (nextGroups: MenuItemOptionGroup[]) => void;
  compact?: boolean;
}

function makeGroupId(): string {
  return 'grp-' + Math.random().toString(36).substring(2, 8);
}

export const AdminDishSpecsEditor: React.FC<AdminDishSpecsEditorProps> = ({
  optionGroups,
  onChange,
  compact = false,
}) => {
  const [groupName, setGroupName] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [hasLimit, setHasLimit] = useState(true);
  const [limitMode, setLimitMode] = useState<'up_to' | 'exact'>('up_to');
  const [limitCount, setLimitCount] = useState<number>(1);
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [draftOptionInput, setDraftOptionInput] = useState('');
  const [draftOptions, setDraftOptions] = useState<string[]>([]);
  const [inlineOptionInputs, setInlineOptionInputs] = useState<Record<string, string>>({});

  const addDraftOptionsFromText = (raw: string) => {
    const items = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    setDraftOptions((prev) => {
      const next = [...prev];
      for (const it of items) {
        if (!next.includes(it)) next.push(it);
      }
      return next;
    });
    setDraftOptionInput('');
  };

  const handleCreateGroup = () => {
    const cleanName = groupName.trim();
    // Si escribió opciones en el input pero no pulsó "Añadir", incorporarlas automáticamente
    const pendingItems = draftOptionInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const mergedOptions = Array.from(new Set([...draftOptions, ...pendingItems]));

    if (!cleanName || mergedOptions.length === 0) return;

    const safeMax = hasLimit ? Math.max(1, Math.floor(limitCount || 1)) : 0;
    const safeMin = !isRequired
      ? 0
      : hasLimit && limitMode === 'exact'
      ? safeMax
      : 1;

    const newGroup: MenuItemOptionGroup = {
      id: makeGroupId(),
      name: cleanName,
      required: safeMin > 0,
      hasLimit,
      minSelect: safeMin,
      maxSelect: safeMax,
      allowRepeat: hasLimit && safeMax > 1 ? allowRepeat : false,
      options: mergedOptions,
    };

    onChange([...optionGroups, newGroup]);
    setGroupName('');
    setDraftOptions([]);
    setDraftOptionInput('');
    setIsRequired(true);
    setHasLimit(true);
    setLimitMode('up_to');
    setLimitCount(1);
    setAllowRepeat(false);
  };

  const handleApplyPreset = (preset: 'comida_china' | 'alitas_limite' | 'alitas_sin_limite') => {
    if (preset === 'comida_china') {
      const chineseGroups: MenuItemOptionGroup[] = [
        {
          id: makeGroupId(),
          name: 'Base a elegir (Arroz o Pasta)',
          required: true,
          hasLimit: true,
          minSelect: 1,
          maxSelect: 1,
          allowRepeat: false,
          options: ['Arroz frito', 'Pasta (Espagueti / Chow Mein)', 'Mitad arroz y mitad pasta'],
        },
        {
          id: makeGroupId(),
          name: 'Guisados a elegir',
          required: true,
          hasLimit: true,
          minSelect: 2,
          maxSelect: 2,
          allowRepeat: true,
          options: [
            'Pollo a la naranja',
            'Res con brócoli',
            'Pollo Kung Pao',
            'Cerdo agridulce',
            'Costillitas BBQ',
            'Pollo Teriyaki',
          ],
        },
      ];
      onChange([...optionGroups, ...chineseGroups]);
      return;
    }

    if (preset === 'alitas_limite') {
      onChange([
        ...optionGroups,
        {
          id: makeGroupId(),
          name: 'Salsas a elegir',
          required: true,
          hasLimit: true,
          minSelect: 1,
          maxSelect: 2,
          allowRepeat: false,
          options: [
            'BBQ',
            'Buffalo',
            'Mango Habanero',
            'Lemon Pepper',
            'Parmesano Ajo',
            'Tamarindo Chipotle',
          ],
        },
      ]);
      return;
    }

    onChange([
      ...optionGroups,
      {
        id: makeGroupId(),
        name: 'Salsas a elegir',
        required: true,
        hasLimit: false,
        minSelect: 1,
        maxSelect: 0,
        allowRepeat: false,
        options: ['BBQ', 'Buffalo', 'Mango Habanero', 'Lemon Pepper', 'Parmesano Ajo'],
      },
    ]);
  };

  const handleUpdateExistingGroup = (
    groupId: string,
    updater: (grp: MenuItemOptionGroup) => MenuItemOptionGroup
  ) => {
    onChange(optionGroups.map((g) => (g.id === groupId ? updater(g) : g)));
  };

  const handleAddOptionToExistingGroup = (groupId: string) => {
    const raw = (inlineOptionInputs[groupId] || '').trim();
    if (!raw) return;
    const toAdd = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (toAdd.length === 0) return;

    handleUpdateExistingGroup(groupId, (grp) => ({
      ...grp,
      options: Array.from(new Set([...grp.options, ...toAdd])),
    }));
    setInlineOptionInputs((prev) => ({ ...prev, [groupId]: '' }));
  };

  const handleRemoveOptionFromExistingGroup = (groupId: string, opt: string) => {
    handleUpdateExistingGroup(groupId, (grp) => {
      const nextOpts = grp.options.filter((o) => o !== opt);
      return { ...grp, options: nextOpts };
    });
  };

  const canCreate =
    groupName.trim().length > 0 &&
    (draftOptions.length > 0 || draftOptionInput.trim().length > 0);

  return (
    <div className="space-y-3">
      {/* Plantillas rápidas de 1 clic */}
      <div className="bg-red-50/70 border border-red-200 rounded-xl p-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-[#ed0718] uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Plantillas Rápidas de Especificaciones (1 Clic):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleApplyPreset('comida_china')}
            className="px-2.5 py-1 bg-white hover:bg-red-100 text-gray-900 border border-red-200 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
          >
            🥡 Comida China (Arroz o Pasta + Guisados con límite)
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('alitas_limite')}
            className="px-2.5 py-1 bg-white hover:bg-red-100 text-gray-900 border border-red-200 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
          >
            🍗 Alitas (Salsas · Máx. 2)
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('alitas_sin_limite')}
            className="px-2.5 py-1 bg-white hover:bg-red-100 text-gray-900 border border-red-200 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
          >
            🍗 Alitas / Salsas (Sin límite)
          </button>
        </div>
      </div>

      {/* Grupos ya agregados al platillo */}
      {optionGroups.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-black text-gray-700 uppercase tracking-wide flex items-center gap-1">
            <ListChecks className="w-3.5 h-3.5 text-[#ed0718]" />
            Especificaciones activas en este platillo ({optionGroups.length}):
          </span>

          <div className={`space-y-2 ${compact ? 'max-h-56' : 'max-h-64'} overflow-y-auto pr-0.5`}>
            {optionGroups.map((grp) => {
              const grpHasLimit = grp.hasLimit !== false && (grp.maxSelect ?? 1) > 0;
              const isExact = grpHasLimit && (grp.minSelect ?? 1) === grp.maxSelect && grp.maxSelect > 1;
              return (
                <div
                  key={grp.id}
                  className="bg-white border border-gray-200 rounded-xl p-2.5 space-y-2 shadow-2xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-xs text-gray-900">{grp.name}</div>
                      <div className="text-[10px] font-bold text-[#ed0718]">
                        {getOptionGroupRuleSubtitle(grp)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Cambiar rápido entre Con límite / Sin límite */}
                      <select
                        value={!grpHasLimit ? 'unlimited' : isExact ? `exact:${grp.maxSelect}` : `max:${grp.maxSelect}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'unlimited') {
                            handleUpdateExistingGroup(grp.id, (g) => ({
                              ...g,
                              hasLimit: false,
                              maxSelect: 0,
                              minSelect: g.required === false ? 0 : 1,
                              allowRepeat: false,
                            }));
                            return;
                          }
                          const [mode, rawNum] = val.split(':');
                          const num = Math.max(1, Number(rawNum) || 1);
                          handleUpdateExistingGroup(grp.id, (g) => ({
                            ...g,
                            hasLimit: true,
                            maxSelect: num,
                            minSelect:
                              mode === 'exact'
                                ? num
                                : g.required === false
                                ? 0
                                : 1,
                            allowRepeat: num > 1 ? g.allowRepeat : false,
                          }));
                        }}
                        className="border border-gray-300 rounded-lg px-1.5 py-0.5 text-[10px] font-bold bg-gray-50 text-gray-800"
                        title="Ajustar límite de selecciones"
                      >
                        <option value="max:1">Máx. 1 opción</option>
                        <option value="max:2">Hasta 2 opciones</option>
                        <option value="exact:2">Exactamente 2 (ej. 2 guisados)</option>
                        <option value="max:3">Hasta 3 opciones</option>
                        <option value="exact:3">Exactamente 3 (ej. 3 guisados)</option>
                        <option value="max:4">Hasta 4 opciones</option>
                        <option value="exact:4">Exactamente 4 (ej. 4 guisados)</option>
                        <option value="unlimited">Sin límite de elecciones</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => onChange(optionGroups.filter((g) => g.id !== grp.id))}
                        className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        title="Eliminar grupo de especificación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Chips de opciones del grupo */}
                  <div className="flex flex-wrap gap-1">
                    {grp.options.map((opt) => (
                      <span
                        key={opt}
                        className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 text-gray-800 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      >
                        <span>{opt}</span>
                        {grp.options.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionFromExistingGroup(grp.id, opt)}
                            className="text-gray-400 hover:text-red-600 cursor-pointer"
                            title="Quitar opción"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Añadir más opciones al grupo existente */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={inlineOptionInputs[grp.id] || ''}
                      onChange={(e) =>
                        setInlineOptionInputs((prev) => ({ ...prev, [grp.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOptionToExistingGroup(grp.id);
                        }
                      }}
                      placeholder="Añadir otra opción (separa con comas)..."
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-[11px] bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddOptionToExistingGroup(grp.id)}
                      className="px-2 py-1 bg-gray-800 hover:bg-black text-white rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      ＋ Opción
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Constructor manual de nuevo grupo de especificación */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
        <span className="text-[11px] font-black text-gray-800 uppercase tracking-wide block">
          ＋ Crear Grupo de Especificación Personalizado
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
              Título de la elección para el cliente
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ej. Elige tu base, Guisados, Salsas..."
              className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
              ¿Es obligatorio elegir?
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setIsRequired(true)}
                className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  isRequired
                    ? 'bg-[#101b29] text-white border-[#101b29]'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
              >
                Sí, obligatorio
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRequired(false);
                  if (limitMode === 'exact') setLimitMode('up_to');
                }}
                className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  !isRequired
                    ? 'bg-[#101b29] text-white border-[#101b29]'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
              >
                No, opcional
              </button>
            </div>
          </div>
        </div>

        {/* Configuración de Límite */}
        <div className="bg-white border border-gray-200 rounded-lg p-2.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-gray-700">
              ¿Tiene límite de opciones a elegir?
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHasLimit(true)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  hasLimit
                    ? 'bg-[#ed0718] text-white border-[#ed0718]'
                    : 'bg-gray-50 text-gray-600 border-gray-300'
                }`}
              >
                Con límite
              </button>
              <button
                type="button"
                onClick={() => setHasLimit(false)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  !hasLimit
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-gray-50 text-gray-600 border-gray-300'
                }`}
              >
                Sin límite
              </button>
            </div>
          </div>

          {hasLimit ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                  Cantidad límite permitida
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={limitCount}
                  onChange={(e) => setLimitCount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full border border-gray-300 rounded-lg p-1.5 text-xs font-mono font-bold bg-gray-50"
                />
              </div>

              {isRequired && limitCount > 1 && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                    Regla del límite
                  </label>
                  <select
                    value={limitMode}
                    onChange={(e) => setLimitMode(e.target.value as 'up_to' | 'exact')}
                    className="w-full border border-gray-300 rounded-lg p-1.5 text-xs font-semibold bg-gray-50"
                  >
                    <option value="up_to">Hasta {limitCount} (de 1 a {limitCount}, ej. salsas)</option>
                    <option value="exact">Exactamente {limitCount} (ej. {limitCount} guisados)</option>
                  </select>
                </div>
              )}

              {limitCount > 1 && (
                <label className="sm:col-span-2 flex items-center gap-2 text-[11px] font-semibold text-gray-700 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={allowRepeat}
                    onChange={(e) => setAllowRepeat(e.target.checked)}
                    className="rounded border-gray-300 text-[#ed0718] focus:ring-[#ed0718]"
                  />
                  <span>
                    Permitir que el cliente repita la misma opción (ej. 2 porciones del mismo guisado)
                  </span>
                </label>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-emerald-700 font-semibold">
              El cliente podrá seleccionar todas las opciones que desee sin tope máximo.
            </p>
          )}
        </div>

        {/* Captura de opciones del grupo */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-gray-600">
            Opciones disponibles (escribe una o varias separadas por coma)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={draftOptionInput}
              onChange={(e) => setDraftOptionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDraftOptionsFromText(draftOptionInput);
                }
              }}
              placeholder="Ej. Arroz, Pasta  ó  BBQ, Buffalo, Mango Habanero"
              className="flex-1 border border-gray-300 rounded-lg p-2 text-xs bg-white"
            />
            <button
              type="button"
              onClick={() => addDraftOptionsFromText(draftOptionInput)}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Añadir
            </button>
          </div>

          {draftOptions.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {draftOptions.map((opt) => (
                <span
                  key={opt}
                  className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-[#ed0718] text-[11px] font-bold px-2 py-0.5 rounded-full"
                >
                  <span>{opt}</span>
                  <button
                    type="button"
                    onClick={() => setDraftOptions((prev) => prev.filter((x) => x !== opt))}
                    className="hover:text-red-900 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!canCreate}
          onClick={handleCreateGroup}
          className="w-full bg-[#101b29] hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-black py-2 px-3 rounded-xl transition cursor-pointer"
        >
          ＋ Guardar Grupo de Especificación en el Platillo
        </button>
      </div>
    </div>
  );
};
