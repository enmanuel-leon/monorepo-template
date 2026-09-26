import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { listCountriesFromDb, listTimezonesFromDb } from '../../src/services/reference.service.js';

describe('Reference Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('listCountriesFromDb returns countries with timezones ordered by name', async () => {
    const mockCountries = [
      { code: 'MX', name: 'Mexico', timezones: [{ id: 'tz-1', displayName: 'Mexico City' }] },
      { code: 'US', name: 'United States', timezones: [{ id: 'tz-2', displayName: 'New York' }] },
    ];
    const findManySpy = vi
      .spyOn(prisma.country, 'findMany')
      .mockResolvedValue(
        mockCountries as unknown as Awaited<ReturnType<typeof prisma.country.findMany>>,
      );

    const result = await listCountriesFromDb();

    expect(findManySpy).toHaveBeenCalledWith({
      include: { timezones: true },
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual(mockCountries);
  });

  it('listTimezonesFromDb queries by countryCode when provided', async () => {
    const mockTzs = [{ id: 'tz-1', countryCode: 'MX', displayName: 'Mexico City' }];
    const findManySpy = vi
      .spyOn(prisma.timezone, 'findMany')
      .mockResolvedValue(
        mockTzs as unknown as Awaited<ReturnType<typeof prisma.timezone.findMany>>,
      );

    const result = await listTimezonesFromDb('MX');

    expect(findManySpy).toHaveBeenCalledWith({
      where: { countryCode: 'MX' },
      include: { country: true },
      orderBy: { displayName: 'asc' },
    });
    expect(result).toEqual(mockTzs);
  });

  it('listTimezonesFromDb queries all timezones when countryCode is omitted', async () => {
    const mockTzs = [
      { id: 'tz-1', countryCode: 'MX', displayName: 'Mexico City' },
      { id: 'tz-2', countryCode: 'US', displayName: 'New York' },
    ];
    const findManySpy = vi
      .spyOn(prisma.timezone, 'findMany')
      .mockResolvedValue(
        mockTzs as unknown as Awaited<ReturnType<typeof prisma.timezone.findMany>>,
      );

    const result = await listTimezonesFromDb();

    expect(findManySpy).toHaveBeenCalledWith({
      include: { country: true },
      orderBy: { displayName: 'asc' },
    });
    expect(result).toEqual(mockTzs);
  });
});
