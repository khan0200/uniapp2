export const DEFAULT_TARIFF_PRICES: Record<string, number> = {
  'STANDART': 13000000,
  'PREMIUM': 32500000,
  'VISA PLUS': 65000000,
  'E-VISA (TIL SERTIFIKATISIZ)': 24000000,
  'E-VISA (TIL SERTIFIKATLI)': 16000000,
  'REGIONAL VISA': 24000000,
  'ZERO RISK': 18500000,
  'E-VISA': 24000000,
}

/**
 * Calculates the price of a tariff for a student, taking into account custom
 * tariff prices configured in settings, specific tariff variant names, and language certificates.
 */
export function getTariffPrice(
  tariff: string | null | undefined,
  languageCertificate?: string | null | undefined,
  prices: Record<string, number> = DEFAULT_TARIFF_PRICES
): number {
  if (!tariff || tariff === 'Select') return 0
  const cleanTariff = tariff.trim().toUpperCase()

  // 1. If tariff name specifically indicates with/without certificate in its title
  if (
    cleanTariff.includes('TIL SERTIFIKATLI') ||
    cleanTariff.includes('(TIL SERTIFIKATLI)') ||
    cleanTariff.includes('SERTIFIKATLI') ||
    cleanTariff.includes('WITH CERTIFICATE')
  ) {
    const targetName = 'E-VISA (TIL SERTIFIKATLI)'
    const foundMatch = Object.entries(prices).find(([k]) => k.trim().toUpperCase() === targetName)
    if (foundMatch && Number(foundMatch[1]) > 0) return Number(foundMatch[1])

    const directMatch = Object.entries(prices).find(([k]) => k.trim().toUpperCase() === cleanTariff)
    if (directMatch && Number(directMatch[1]) > 0) return Number(directMatch[1])

    return 16000000
  }

  if (
    cleanTariff.includes('TIL SERTIFIKATISIZ') ||
    cleanTariff.includes('(TIL SERTIFIKATISIZ)') ||
    cleanTariff.includes('SERTIFIKATSIZ') ||
    cleanTariff.includes('WITHOUT CERTIFICATE')
  ) {
    const targetName = 'E-VISA (TIL SERTIFIKATISIZ)'
    const foundMatch = Object.entries(prices).find(([k]) => k.trim().toUpperCase() === targetName)
    if (foundMatch && Number(foundMatch[1]) > 0) return Number(foundMatch[1])

    const directMatch = Object.entries(prices).find(([k]) => k.trim().toUpperCase() === cleanTariff)
    if (directMatch && Number(directMatch[1]) > 0) return Number(directMatch[1])

    return 24000000
  }

  // 2. Exact match in prices (case-insensitive) - if cleanTariff is not generic E-VISA
  if (cleanTariff !== 'E-VISA') {
    const directMatch = Object.entries(prices).find(([k]) => k.trim().toUpperCase() === cleanTariff)
    if (directMatch && Number(directMatch[1]) !== undefined && Number(directMatch[1]) > 0) {
      return Number(directMatch[1])
    }
  }

  // 3. E-VISA generic resolution based on language certificate
  if (cleanTariff.includes('E-VISA')) {
    const hasCert = !!languageCertificate && languageCertificate !== 'NO CERTIFICATE' && languageCertificate.trim() !== ''
    const targetName = hasCert ? 'E-VISA (TIL SERTIFIKATLI)' : 'E-VISA (TIL SERTIFIKATISIZ)'

    const foundMatch = Object.entries(prices).find(([k]) => k.trim().toUpperCase() === targetName)
    if (foundMatch && Number(foundMatch[1]) > 0) return Number(foundMatch[1])

    return hasCert ? 16000000 : 24000000
  }

  // 4. Any other exact match in prices
  const directMatch = Object.entries(prices).find(([k]) => k.trim().toUpperCase() === cleanTariff)
  if (directMatch && Number(directMatch[1]) !== undefined) {
    return Number(directMatch[1])
  }

  // 5. Fallback defaults
  const fallback = DEFAULT_TARIFF_PRICES[cleanTariff]
  return fallback !== undefined ? fallback : 0
}
