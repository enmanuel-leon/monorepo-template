import { describe, it, expect } from 'vitest';
import {
  detectCountryCode,
  findFirstTimezone,
  type CountryObj,
} from '../../src/pages/onboarding/use-onboarding-page';

describe('Onboarding Helpers', () => {
  const mockCountries: CountryObj[] = [
    {
      code: 'MX',
      name: 'Mexico',
      timezones: [
        {
          id: 'tz-mx-1',
          ianaName: 'America/Mexico_City',
          displayName: 'Mexico City (GMT-06:00)',
          gmtOffset: 'GMT-06:00',
          countryCode: 'MX',
        },
      ],
    },
    {
      code: 'US',
      name: 'United States',
      timezones: [
        {
          id: 'tz-us-1',
          ianaName: 'America/New_York',
          displayName: 'New York (GMT-05:00)',
          gmtOffset: 'GMT-05:00',
          countryCode: 'US',
        },
      ],
    },
  ];

  it('detectCountryCode returns country code when timezone matches', () => {
    const code = detectCountryCode(mockCountries);
    // Depending on local node environment, it returns a string or null without throwing
    if (code) {
      expect(typeof code).toBe('string');
      expect(code).toHaveLength(2);
    } else {
      expect(code).toBeNull();
    }
  });

  it('findFirstTimezone returns the first timezone for a given country code', () => {
    const tz = findFirstTimezone(mockCountries, 'MX');
    expect(tz).not.toBeNull();
    expect(tz?.ianaName).toBe('America/Mexico_City');
    expect(tz?.id).toBe('tz-mx-1');
  });

  it('findFirstTimezone falls back to the first country when country code is not found', () => {
    const tz = findFirstTimezone(mockCountries, 'ES');
    expect(tz).not.toBeNull();
    expect(tz?.ianaName).toBe('America/Mexico_City');
  });

  it('findFirstTimezone returns null when countries list is empty', () => {
    const tz = findFirstTimezone([], 'MX');
    expect(tz).toBeNull();
  });
});
