export interface WgerPage {
  count: number
  next: string | null
  previous: string | null
  results: unknown[]
}

export interface WgerLanguage {
  id: number
  short_name: string
  full_name?: string
  full_name_en?: string
}

export interface WgerLanguageOption {
  code: string
  name: string
}

export interface WgerLicense {
  id: number
  full_name: string
  short_name: string
  url: string | null
}

export interface WgerMetadata {
  languages: Map<number, string>
  licenses: Map<number, WgerLicense>
}

export interface WgerClientOptions {
  baseUrl?: string
  timeoutMs?: number
  maxPageSize?: number
  maxResponseBytes?: number
  fetch?: typeof fetch
}
