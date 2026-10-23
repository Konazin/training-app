import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { calculatePlates } from '@training/training-domain'
import { ScreenHeader } from '../../components/ScreenHeader'
import { ScreenScrollView } from '../../components/Screen'
import { ThemedTextInput } from '../../components/ThemedTextInput'
import { SegmentedControl } from '../../components/ui'
import { Reveal } from '../../motion'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'
import { parseNumberInput } from '../nutrition/nutritionInput'

const BARS = [
  { value: '20', label: '20 kg' },
  { value: '15', label: '15 kg' },
  { value: '10', label: '10 kg' },
]

export function PlateCalculatorScreen() {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [text, setText] = useState('')
  const [bar, setBar] = useState('20')
  const parsed = parseNumberInput(text, null)
  const target = parsed != null && Number.isFinite(parsed) ? parsed : 0
  const result = useMemo(() => calculatePlates(target, Number(bar)), [target, bar])
  return (
    <ScreenScrollView>
      <ScreenHeader title="Calculadora de anilhas" description="Anilhas por lado, da maior para a menor. Cálculo feito no aparelho." />
      <Text style={styles.label}>Carga total (kg)</Text>
      <ThemedTextInput accessibilityLabel="Carga total em quilos" inputMode="decimal" onChangeText={setText}
        placeholder="Ex.: 82,5" value={text} />
      <Text style={[styles.label, styles.gap]}>Barra</Text>
      <SegmentedControl label="Peso da barra" onChange={setBar} options={BARS} value={bar} />
      {target > 0 && (
        <Reveal>
          <View accessibilityLiveRegion="polite" style={styles.result}>
            <Text style={styles.label}>Cada lado</Text>
            <Text style={styles.plates}>
              {result.perSide.length ? result.perSide.map((p) => p.toLocaleString('pt-BR')).join(' + ') : 'Só a barra'}
            </Text>
            <Text style={styles.detail}>
              Total: {result.achieved.toLocaleString('pt-BR')} kg
              {result.remainder > 0 ? ` · faltam ${result.remainder.toLocaleString('pt-BR')} kg com as anilhas padrão` : ''}
            </Text>
          </View>
        </Reveal>
      )}
    </ScreenScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  label: { ...typography.caption, color: colors.t2, marginBottom: shared.spacing.xs },
  gap: { marginTop: shared.spacing.lg },
  result: { backgroundColor: colors.s1, borderRadius: shared.radii.lg, marginTop: shared.spacing.lg, padding: 20 },
  plates: { ...typography.numberLarge, color: colors.tx, marginTop: 8 },
  detail: { ...typography.bodySmall, color: colors.t2, marginTop: 10 },
})
