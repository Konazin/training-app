import { StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { typography } from '../../../theme/typography'
import { ANATOMY_PATHS, BODY_SILHOUETTES } from './anatomyPaths'
import { MUSCLE_REGION_LABELS, type MuscleMapView, type MuscleRegion } from './muscleRegions'
import { resolveMuscleRegions, type MuscleMapInput } from './resolveMuscleRegions'

export function MuscleMap(input: MuscleMapInput) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const resolved = resolveMuscleRegions(input)
  const primary = new Set(resolved.primary)
  const secondary = new Set(resolved.secondary)
  return <View><View accessibilityLabel="Mapa muscular frontal e posterior" style={styles.maps}><MuscleView colors={colors} primary={primary} secondary={secondary} view="front" /><MuscleView colors={colors} primary={primary} secondary={secondary} view="back" /></View>{resolved.unknown.length > 0 && <View accessibilityLabel="Músculos sem região no mapa" style={styles.unknown}><Text style={styles.unknownTitle}>Outros músculos</Text><Text style={styles.unknownText}>{resolved.unknown.join(' · ')}</Text></View>}</View>
}

function MuscleView({ colors, primary, secondary, view }: { colors: ThemeColors; primary: ReadonlySet<MuscleRegion>; secondary: ReadonlySet<MuscleRegion>; view: MuscleMapView }) {
  const offset = 0
  return <View style={styles.view}><Svg accessible accessibilityLabel={`Mapa muscular, vista ${view === 'front' ? 'frontal' : 'posterior'}`} accessibilityRole="image" height={320} viewBox={`${view === 'front' ? 0 : 120} 0 120 320`} width="100%"><Path d={BODY_SILHOUETTES[view]} fill={colors.surfaceSecondary} stroke={colors.border} strokeWidth={1.5} />{ANATOMY_PATHS.filter((item) => item.view === view).flatMap((item) => item.paths.map((path, index) => <Path accessibilityLabel={`${MUSCLE_REGION_LABELS[item.region]}: ${primary.has(item.region) ? 'principal' : secondary.has(item.region) ? 'secundário' : 'não destacado'}`} d={path} fill={primary.has(item.region) ? colors.primary : secondary.has(item.region) ? `${colors.primary}66` : colors.surfaceTertiary} key={`${item.region}-${index}`} stroke={primary.has(item.region) || secondary.has(item.region) ? colors.primaryPressed : colors.border} strokeWidth={1} testID={`muscle-region-${view}-${item.region}-${index}`} transform={`translate(${offset} 0)`} />))}</Svg><Text style={[styles.viewLabel, { color: colors.textSecondary }]}>{view === 'front' ? 'Frente' : 'Costas'}</Text></View>
}

const styles = StyleSheet.create({ maps: { flexDirection: 'row', gap: shared.spacing.sm }, view: { alignItems: 'center', flex: 1 }, viewLabel: { ...typography.caption, fontWeight: '700', marginTop: shared.spacing.xs, textTransform: 'uppercase' } })
const createStyles = (colors: ThemeColors) => StyleSheet.create({ maps: styles.maps, unknown: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: shared.radii.sm, borderWidth: 1, marginTop: shared.spacing.md, padding: shared.spacing.md }, unknownTitle: { ...typography.labelSmall, color: colors.textPrimary, fontWeight: '800' }, unknownText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: shared.spacing.xs } })
