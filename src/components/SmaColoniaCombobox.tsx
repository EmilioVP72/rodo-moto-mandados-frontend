import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, MapPin } from 'lucide-react';
import {
  filterSmaColonias,
  isValidSmaColoniaLabel,
  normalizeSearchText,
  SMA_COLONIAS_CATALOG,
  SmaSettlement,
} from '../data/smaColonias';

interface SmaColoniaComboboxProps {
  value: string;
  onChange: (selectedLabel: string) => void;
  placeholder?: string;
  className?: string;
}

export const SmaColoniaCombobox: React.FC<SmaColoniaComboboxProps> = ({
  value,
  onChange,
  placeholder = 'Busca y selecciona tu colonia *',
  className = '',
}) => {
  const [inputText, setInputText] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sincronizar cuando el padre limpie o actualice el valor seleccionado
  useEffect(() => {
    setInputText(value);
  }, [value]);

  // Cerrar lista al hacer clic fuera
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Si el usuario escribió algo sin seleccionar de la lista, restaurar el último valor válido (o vacío)
        setInputText((prev) => {
          if (isValidSmaColoniaLabel(prev)) return prev;
          const exact = SMA_COLONIAS_CATALOG.find(
            (item) =>
              item.searchKey === normalizeSearchText(prev) ||
              normalizeSearchText(item.name) === normalizeSearchText(prev)
          );
          if (exact) {
            onChange(exact.label);
            return exact.label;
          }
          return value;
        });
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [value, onChange]);

  const filteredOptions = useMemo(() => {
    // Si el texto actual coincide exactamente con el valor ya seleccionado y el usuario abre el desplegable,
    // mostramos opciones para facilitar cambiar de colonia, o filtramos en vivo mientras escribe.
    const query = inputText === value && isValidSmaColoniaLabel(value) ? '' : inputText;
    return filterSmaColonias(query, 80);
  }, [inputText, value]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputText, isOpen]);

  const handleSelect = (item: SmaSettlement) => {
    setInputText(item.label);
    onChange(item.label);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredOptions.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      if (filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputText(value);
    }
  };

  const hasValidSelection = isValidSmaColoniaLabel(value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-label="Colonia o asentamiento en San Miguel de Allende"
          value={inputText}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            const nextText = e.target.value;
            setInputText(nextText);
            setIsOpen(true);
            // Invalidar selección hasta que escoja una opción oficial de la lista
            if (value && nextText !== value) {
              onChange('');
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full border rounded-xl py-2 pl-2.5 pr-14 text-xs font-bold outline-none transition bg-white dark:bg-slate-800 text-gray-900 dark:text-white ${
            hasValidSelection
              ? 'border-emerald-400 dark:border-emerald-600 focus:border-[#ed0718]'
              : 'border-gray-300 dark:border-slate-600 focus:border-[#ed0718]'
          }`}
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {inputText && (
            <button
              type="button"
              onClick={() => {
                setInputText('');
                onChange('');
                setIsOpen(true);
              }}
              aria-label="Limpiar colonia"
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Desplegar lista de colonias"
            className="p-1 text-gray-500 hover:text-[#ed0718] rounded-md cursor-pointer"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-[#ed0718]' : ''}`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#ed0718]" />
              Escribe para filtrar y selecciona de la lista
            </span>
            <span className="font-mono">{filteredOptions.length}</span>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">
                No se encontraron coincidencias para "{inputText}". Intenta con otra palabra.
              </div>
            ) : (
              filteredOptions.map((item, idx) => {
                const isSelected = value === item.label;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={item.label}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(item);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-black'
                        : isHighlighted
                        ? 'bg-red-50 dark:bg-slate-800 text-gray-900 dark:text-white font-bold'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 font-semibold'
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-extrabold">{item.name}</span>
                      <span className="text-gray-400 dark:text-gray-500"> - </span>
                      <span className="text-gray-600 dark:text-gray-300 font-semibold">{item.type}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
