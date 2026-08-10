import { useState, useRef, useEffect } from 'react';
import { CountryFlag } from './country-flag';
import { ChevronDown, Check, Search } from 'lucide-react';
import type { CountryObj } from '../../pages/onboarding/use-onboarding-page';

interface CustomCountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  countries: CountryObj[];
  label?: string;
}

export function CustomCountrySelect({
  value,
  onChange,
  countries,
  label,
}: Readonly<CustomCountrySelectProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  let selectedCountry = countries.find((c) => c.code === value);
  if (!selectedCountry) {
    if (countries.length > 0) {
      selectedCountry = countries[0];
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  function handleSelect(code: string) {
    onChange(code);
    setIsOpen(false);
    setSearchQuery('');
  }

  const query = searchQuery.trim().toLowerCase();
  const filteredCountries = countries.filter((c) => {
    if (!query) {
      return true;
    }
    const matchName = c.name.toLowerCase().includes(query);
    const matchCode = c.code.toLowerCase().includes(query);
    let matchIso3 = false;
    if (c.iso3) {
      matchIso3 = c.iso3.toLowerCase().includes(query);
    }
    return matchName || matchCode || matchIso3;
  });

  let selectedLabel = 'Select country';
  if (selectedCountry) {
    const iso = selectedCountry.iso3 || selectedCountry.code;
    selectedLabel = `${iso} - ${selectedCountry.name}`;
  }

  return (
    <div ref={containerRef} className="space-y-1 relative z-30">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-slate-100 dark:bg-[#131519] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20 focus:outline-none focus:border-[#7B6CF6] transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedCountry && (
            <CountryFlag countryCode={selectedCountry.code} className="w-5 h-3.5 flex-none" />
          )}
          <span className="truncate">{selectedLabel}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-none ml-2" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101216] p-2 shadow-2xl space-y-2">
          {/* Search Filter Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country or code..."
              className="w-full bg-slate-100 dark:bg-[#131519] border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#7B6CF6]"
            />
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto space-y-1">
            {filteredCountries.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-500">No countries found</div>
            )}

            {filteredCountries.map((c) => {
              let isSelected = false;
              if (selectedCountry && selectedCountry.code === c.code) {
                isSelected = true;
              }

              const iso = c.iso3 || c.code;

              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#7B6CF6]/15 text-[#7B6CF6] font-semibold'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CountryFlag countryCode={c.code} className="w-5 h-3.5 flex-none" />
                    <span className="truncate">
                      <strong className="font-semibold text-slate-900 dark:text-slate-200">
                        {iso}
                      </strong>{' '}
                      - {c.name}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#7B6CF6] flex-none" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
