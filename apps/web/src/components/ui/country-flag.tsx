import type React from 'react';
import * as Flags from 'country-flag-icons/react/3x2';
import { Globe } from 'lucide-react';

interface CountryFlagProps {
  countryCode: string;
  className?: string;
}

export function CountryFlag({
  countryCode,
  className = 'w-5 h-3.5 inline-block rounded-xs shadow-xs',
}: Readonly<CountryFlagProps>) {
  if (!countryCode) {
    return <Globe className={className} />;
  }

  const uppercaseCode = countryCode.toUpperCase();
  const FlagComponent = (Flags as Record<string, React.ComponentType<{ className?: string }>>)[
    uppercaseCode
  ];

  if (FlagComponent) {
    return <FlagComponent className={className} />;
  }

  return <Globe className={className} />;
}
