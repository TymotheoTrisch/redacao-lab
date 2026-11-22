export interface SavedAnchor {
  quote: string
  prefix: string
  suffix: string
  start: number
  end: number
  version: number
}

// Offsets UTF-16, compatíveis com Range e String.slice do WebView.
export function capture(text: string, start: number, end: number, version: number): SavedAnchor {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= end || end > text.length) {
    throw new Error('Selecione um trecho do bloco.')
  }
  return { quote: text.slice(start,end), prefix: text.slice(Math.max(0,start-32),start),
    suffix: text.slice(end,end+32), start, end, version }
}

export function locate(text: string, version: number, anchor: SavedAnchor): number | null {
  if (!anchor.quote) return null
  if (version === anchor.version && text.slice(anchor.start,anchor.end) === anchor.quote) return anchor.start
  let best = -1
  let winner: number | null = null
  for (let i = text.indexOf(anchor.quote); i >= 0; i = text.indexOf(anchor.quote,i+1)) {
    let before = 0
    while (before < anchor.prefix.length && text[i-before-1] === anchor.prefix[anchor.prefix.length-before-1]) before++
    let after = 0
    while (after < anchor.suffix.length && text[i+anchor.quote.length+after] === anchor.suffix[after]) after++
    const score = before + after
    if (score > best) { best = score; winner = i }
    else if (score === best) winner = null
  }
  return winner
}
