import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'

jest.mock('../../../theme', () => ({
  shared: { radii: { sm: 14 }, spacing: { xs: 4, sm: 8, md: 12 } },
  useTheme: () => ({
    colors: {
      border: '#263B59', primary: '#5B8CFF', primaryPressed: '#79A4FF',
      surface: '#111F35', surfaceSecondary: '#172A44', surfaceTertiary: '#203652',
      textPrimary: '#FFFFFF', textSecondary: '#9BADC5',
    },
  }),
}))

import { MuscleMap } from './MuscleMap'

describe('acessibilidade do mapa muscular', () => {
  it('identifica as vistas, regiões e músculos não mapeados', async () => {
    let renderer!: ReactTestRenderer
    await act(async () => {
      renderer = create(createElement(MuscleMap, {
        primaryMuscleGroup: 'peitoral',
        secondaryMuscleGroups: ['tríceps', 'serrátil anterior'],
      }))
    })
    const root = renderer.root
    expect([...new Set(root.findAll((node) => node.props.accessibilityRole === 'image').map((node) => node.props.accessibilityLabel))])
      .toEqual(['Mapa muscular, vista frontal', 'Mapa muscular, vista posterior'])
    expect(root.findAll((node) => node.props.accessibilityLabel === 'Peitoral: principal')).not.toHaveLength(0)
    expect(root.findAll((node) => node.props.accessibilityLabel === 'Tríceps: secundário')).not.toHaveLength(0)
    expect(root.findByProps({ accessibilityLabel: 'Músculos sem região no mapa' })).toBeTruthy()
    act(() => renderer.unmount())
  })
})
