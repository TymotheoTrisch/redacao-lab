import { expect, it } from 'vitest'
import config from '../capacitor.config'

it('acomoda o leitor abaixo das barras do sistema e dos recortes no Android edge-to-edge', () => {
  expect(config.android?.adjustMarginsForEdgeToEdge).toBe('auto')
})
