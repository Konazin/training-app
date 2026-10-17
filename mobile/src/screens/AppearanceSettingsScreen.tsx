import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { ArrowLeft, Check } from 'lucide-react-native'
import { ScreenScrollView } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import { BottomActionBar } from '../components/ui/BottomActionBar'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { MotionView } from '../components/MotionView'
import {
  shared,
  themePresetIds,
  type ThemeColors,
  type ThemePreset,
  resolvePalette,
  useTheme,
} from '../theme'
import { triggerHaptic } from '../theme/haptics'
import { typography } from '../theme/typography'

const presetLabels: Record<ThemePreset, string> = {
  DARK_BLUE: 'Azul midnight',
  MONOCHROME: 'Monocromático',
  DRACULA: 'Violeta midnight',
  WHITE_BLUE: 'Branco e azul',
}
const appearanceOptions = [
  { value: 'SYSTEM', label: 'Sistema', accessibilityLabel: 'Usar configuração do sistema' },
  { value: 'LIGHT', label: 'Claro' },
  { value: 'DARK', label: 'Escuro' },
] as const
const motionOptions = [
  { value: 'SYSTEM', label: 'Sistema', accessibilityLabel: 'Usar configuração do sistema' },
  { value: 'FULL', label: 'Completo' },
  { value: 'REDUCED', label: 'Reduzido' },
  { value: 'OFF', label: 'Desativado' },
] as const

export function AppearanceSettingsScreen() {
  const navigation = useNavigation()
  const {
    colors,
    isDark,
    preferences,
    updatePreview,
    savePreferences,
    cancelPreview,
    restoreDefaults,
  } = useTheme()
  const styles = createStyles(colors)
  const [message, setMessage] = useState('')

  useEffect(() => cancelPreview, [cancelPreview])

  const selectPreset = (themePreset: ThemePreset) => {
    updatePreview({ themePreset })
    void triggerHaptic('THEME_SELECT', preferences.hapticsEnabled)
  }
  const save = async () => {
    setMessage(await savePreferences()
      ? 'Preferências salvas neste aparelho.'
      : 'Não foi possível salvar as preferências.')
  }

  return (<>
    <ScreenScrollView contentContainerStyle={styles.scrollContent}>
      <ScreenHeader
        eyebrow="Preferências locais"
        title="Aparência e acessibilidade"
        description="As alterações são exibidas agora e só ficam salvas após a confirmação."
        action={(
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.back}
          >
            <ArrowLeft color={colors.tx} size={20} strokeWidth={1.7} />
          </Pressable>
        )}
      />

      <MotionView style={styles.preview}>
        <Text style={styles.previewEyebrow}>Prévia ao vivo</Text>
        <Text style={styles.previewTitle}>Força e mobilidade</Text>
        <Text style={styles.previewCopy}>3 exercícios · estado descrito com texto</Text>
        <View style={styles.previewButton}><Text style={styles.previewButtonText}>Começar treino</Text></View>
      </MotionView>

      <PreferenceSection title="Tema">
        {themePresetIds.map((preset) => (
          <ThemePresetRow
            key={preset}
            preset={preset}
            label={presetLabels[preset]}
            selected={preferences.themePreset === preset}
            onPress={() => selectPreset(preset)}
            dark={isDark}
          />
        ))}
      </PreferenceSection>

      <PreferenceSection title="Aparência">
        <SegmentedControl
          label="Aparência"
          options={appearanceOptions}
          value={preferences.appearance}
          onChange={(appearance) => updatePreview({ appearance })}
        />
      </PreferenceSection>

      <PreferenceSection title="Movimento">
        <SegmentedControl
          label="Movimento"
          options={motionOptions}
          value={preferences.motion}
          onChange={(motion) => updatePreview({ motion })}
        />
      </PreferenceSection>

      <ToggleRow
        label="Alto contraste durante o treino"
        checked={preferences.workoutHighContrast}
        onPress={() => updatePreview({ workoutHighContrast: !preferences.workoutHighContrast })}
      />
      <ToggleRow
        label="Feedback tátil"
        checked={preferences.hapticsEnabled}
        onPress={() => updatePreview({ hapticsEnabled: !preferences.hapticsEnabled })}
      />

      {!!message && (
        <Text accessibilityLiveRegion="polite" style={message.startsWith('Não') ? styles.error : styles.success}>
          {message}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          restoreDefaults()
          setMessage('Padrões restaurados na prévia. Confirme para salvar.')
        }}
        style={({ pressed }) => [styles.restore, pressed && styles.pressed]}
      >
        <Text style={styles.restoreText}>Restaurar padrões</Text>
      </Pressable>
    </ScreenScrollView>
    <BottomActionBar>
      <PrimaryButton label="Salvar preferências" onPress={() => void save()} />
    </BottomActionBar>
  </>)
}

function ThemePresetRow({
  preset,
  label,
  selected,
  onPress,
  dark,
}: {
  preset: ThemePreset
  label: string
  selected: boolean
  onPress: () => void
  dark: boolean
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const swatch = resolvePalette(preset, dark)
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.themeRow, pressed && styles.pressed]}
    >
      <View style={styles.swatches} accessibilityElementsHidden>
        {[swatch.bg, swatch.s1, swatch.ac].map((color, index) => (
          <View key={index} style={[styles.swatch, { backgroundColor: color }]} />
        ))}
      </View>
      <Text style={[styles.themeLabel, selected && styles.themeLabelSelected]}>{label}</Text>
      <View style={[styles.selectionMark, selected && styles.selectionMarkSelected]}>
        {selected && <Check color={colors.on} size={13} strokeWidth={2} />}
      </View>
      {selected && <Text style={styles.selectedText}>Selecionado</Text>}
    </Pressable>
  )
}

function PreferenceSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View>{children}</View>
    </View>
  )
}

function ToggleRow({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}
    >
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.switchTrack, checked && styles.switchTrackChecked]}>
        <View style={[styles.switchThumb, checked && styles.switchThumbChecked]} />
      </View>
    </Pressable>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scrollContent: { paddingBottom: 160 },
  sectionTitle: {
    ...typography.monoLabel,
    color: colors.t2,
    marginBottom: 8,
    marginTop: 24,
  },
  themeRow: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 8, minHeight: 56 },
  swatches: { flexDirection: 'row', gap: 3, width: 48 },
  swatch: { borderColor: colors.bd, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, height: 14, width: 14 },
  themeLabel: { ...typography.bodySmall, color: colors.tx, flex: 1 },
  themeLabelSelected: { fontWeight: '500' },
  selectionMark: { alignItems: 'center', borderColor: colors.mu, borderRadius: 10, borderWidth: 1, height: 20, justifyContent: 'center', width: 20 },
  selectionMarkSelected: { backgroundColor: colors.ac, borderColor: colors.ac },
  selectedText: { ...typography.captionSmall, color: colors.t2 },
  toggleRow: {
    alignItems: 'center',
    borderBottomColor: colors.bd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  toggleLabel: { ...typography.bodySmall, color: colors.tx, flex: 1, paddingRight: 12 },
  switchTrack: {
    backgroundColor: colors.s2,
    borderColor: colors.mu,
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 2,
    width: 42,
  },
  switchTrackChecked: { backgroundColor: colors.ac, borderColor: colors.ac },
  switchThumb: { backgroundColor: colors.tx, borderRadius: 8, height: 16, width: 16 },
  switchThumbChecked: { alignSelf: 'flex-end', backgroundColor: colors.on },
  preview: {
    backgroundColor: colors.s1,
    borderColor: colors.bd,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    padding: 16,
  },
  previewEyebrow: { ...typography.monoLabel, color: colors.t2 },
  previewTitle: { ...typography.title, color: colors.tx, marginTop: 6 },
  previewCopy: { ...typography.bodySmall, color: colors.t2, marginTop: 5 },
  previewButton: {
    alignItems: 'center',
    backgroundColor: colors.ac,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
  },
  previewButtonText: { ...typography.label, color: colors.on, fontWeight: '500' },
  success: { ...typography.bodySmall, color: colors.tx, marginVertical: 12 },
  error: { ...typography.bodySmall, color: colors.dg, marginVertical: 12 },
  restore: { alignItems: 'flex-start', justifyContent: 'center', minHeight: shared.touchTarget.minimum, marginTop: 8 },
  restoreText: { ...typography.bodySmall, color: colors.tx, textDecorationLine: 'underline', textUnderlineOffset: 3 },
  pressed: { opacity: 0.72 },
  back: { alignItems: 'center', justifyContent: 'center', minHeight: shared.touchTarget.minimum, minWidth: shared.touchTarget.minimum },
  backText: { color: colors.tx, fontSize: 24, fontWeight: '400' },
})
