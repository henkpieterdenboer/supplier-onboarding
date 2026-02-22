// OpenSanctions API integration
// https://api.opensanctions.org/

export interface SanctionsMatch {
  name: string
  score: number
  datasets: string[]
  countries: string[]
}

export interface SanctionsResult {
  companyMatch: boolean
  companyResults: SanctionsMatch[]
  directorMatch: boolean
  directorResults: SanctionsMatch[]
  checkedAt: string
}

interface OpenSanctionsQuery {
  schema: string
  properties: Record<string, string[]>
}

interface OpenSanctionsResponse {
  responses: Record<string, {
    results: Array<{
      caption: string
      score: number
      datasets: string[]
      properties: {
        country?: string[]
      }
    }>
  }>
}

const MATCH_THRESHOLD = 0.7

/**
 * Check a company (and optionally its director) against OpenSanctions.
 * Returns null on error (graceful, like VIES).
 */
export async function checkSanctions(
  company: { name: string; country?: string | null },
  director?: { name?: string | null; dateOfBirth?: string | null; passportNumber?: string | null } | null
): Promise<SanctionsResult | null> {
  const apiKey = process.env.OPENSANCTIONS_API_KEY
  if (!apiKey) {
    console.error('OPENSANCTIONS_API_KEY is not configured')
    return null
  }

  try {
    const queries: Record<string, OpenSanctionsQuery> = {}

    // Company query
    const companyProps: Record<string, string[]> = {
      name: [company.name],
    }
    if (company.country) {
      companyProps.country = [company.country]
    }
    queries.company = {
      schema: 'Company',
      properties: companyProps,
    }

    // Director query (optional)
    const hasDirector = director?.name && director.name.trim().length > 0
    if (hasDirector) {
      const personProps: Record<string, string[]> = {
        name: [director.name!.trim()],
      }
      if (director.dateOfBirth) {
        personProps.birthDate = [director.dateOfBirth]
      }
      if (director.passportNumber) {
        personProps.passportNumber = [director.passportNumber]
      }
      queries.director = {
        schema: 'Person',
        properties: personProps,
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch('https://api.opensanctions.org/match/default', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${apiKey}`,
      },
      body: JSON.stringify({ queries }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.error('OpenSanctions API error:', response.status, await response.text())
      return null
    }

    const data: OpenSanctionsResponse = await response.json()

    // Parse company results
    const companyResponse = data.responses?.company
    const companyResults: SanctionsMatch[] = (companyResponse?.results || [])
      .slice(0, 3)
      .map((r) => ({
        name: r.caption,
        score: Math.round(r.score * 100) / 100,
        datasets: r.datasets || [],
        countries: r.properties?.country || [],
      }))
    const companyMatch = companyResults.some((r) => r.score >= MATCH_THRESHOLD)

    // Parse director results
    let directorMatch = false
    let directorResults: SanctionsMatch[] = []
    if (hasDirector) {
      const directorResponse = data.responses?.director
      directorResults = (directorResponse?.results || [])
        .slice(0, 3)
        .map((r) => ({
          name: r.caption,
          score: Math.round(r.score * 100) / 100,
          datasets: r.datasets || [],
          countries: r.properties?.country || [],
        }))
      directorMatch = directorResults.some((r) => r.score >= MATCH_THRESHOLD)
    }

    return {
      companyMatch,
      companyResults,
      directorMatch,
      directorResults,
      checkedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Sanctions check failed:', error)
    return null
  }
}
