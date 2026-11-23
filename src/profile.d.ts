declare module 'virtual:redacao-profile' {
  export const moduleIds: string[]
  export function loadPack(): Promise<import('./catalog').Catalog | null>
}
