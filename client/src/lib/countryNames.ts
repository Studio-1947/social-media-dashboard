/**
 * ISO 3166-1 alpha-2 → display name.
 *
 * Metricool returns raw country codes in its `country` / `page_follows_country`
 * distributions. Covers the codes seen on live accounts plus the common rest;
 * anything unmapped falls through to the raw code rather than being dropped.
 */
const COUNTRY_NAMES: Record<string, string> = {
    IN: 'India',
    NP: 'Nepal',
    BD: 'Bangladesh',
    PK: 'Pakistan',
    LK: 'Sri Lanka',
    BT: 'Bhutan',
    US: 'United States',
    CA: 'Canada',
    GB: 'United Kingdom',
    IE: 'Ireland',
    AU: 'Australia',
    NZ: 'New Zealand',
    AE: 'United Arab Emirates',
    SA: 'Saudi Arabia',
    QA: 'Qatar',
    KW: 'Kuwait',
    OM: 'Oman',
    BH: 'Bahrain',
    DE: 'Germany',
    FR: 'France',
    ES: 'Spain',
    IT: 'Italy',
    PT: 'Portugal',
    NL: 'Netherlands',
    BE: 'Belgium',
    CH: 'Switzerland',
    AT: 'Austria',
    SE: 'Sweden',
    NO: 'Norway',
    DK: 'Denmark',
    FI: 'Finland',
    PL: 'Poland',
    RU: 'Russia',
    UA: 'Ukraine',
    TR: 'Turkey',
    GR: 'Greece',
    SG: 'Singapore',
    MY: 'Malaysia',
    ID: 'Indonesia',
    TH: 'Thailand',
    VN: 'Vietnam',
    PH: 'Philippines',
    JP: 'Japan',
    KR: 'South Korea',
    CN: 'China',
    HK: 'Hong Kong',
    TW: 'Taiwan',
    ZA: 'South Africa',
    NG: 'Nigeria',
    KE: 'Kenya',
    EG: 'Egypt',
    MA: 'Morocco',
    BR: 'Brazil',
    AR: 'Argentina',
    MX: 'Mexico',
    CL: 'Chile',
    CO: 'Colombia',
    PE: 'Peru',
    IL: 'Israel',
};

/** Falls back to the raw code — an unmapped country is still real data. */
export function countryName(code: string): string {
    if (!code) return 'Unknown';
    return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}
