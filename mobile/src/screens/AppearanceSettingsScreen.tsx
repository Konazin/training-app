import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { ScreenScrollView } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import { SelectableChip } from '../components/SelectableChip'
import { PrimaryButton } from '../components/PrimaryButton'
import { MotionView } from '../components/MotionView'
import {
  appearancePreferenceIds,
  motionPreferenceIds,
  shared,
  themePresetIds,
  type AppearancePreference,
  type MotionPreference,
  type ThemeColors,
  type ThemePreset,
  useTheme,
} from '../theme'
import { triggerHaptic } from '../theme/haptics'
import { typography } from '../theme/typography'

const presetLabels: Record<ThemePreset, string> = {
  DARK_BLUE: 'Azul-noturno',
  MONOCHROME: 'Monocromático',
  DRACULA: 'Violeta',
  WHITE_BLUE: 'Branco e azul',
}
const appearanceLabels: Record<AppearancePreference, string> = {
  SYSTEM: 'Usar configuração do sistema',
  LIGHT: 'Claro',
  DARK: 'Escuro',
}
const motionLabels: Record<MotionPreference, string> = {
  SYSTEM: 'Usar configuração do sistema',
  FULL: 'Completo',
  REDUCED: 'Reduzido',
  OFF: 'Desativado',
}

export function AppearanceSettingsScreen() {
  const navigation = useNavigation()
  const {
    colors,
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

  return (
    <ScreenScrollView>
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
            <Text style={styles.backText}>←</Text>
          </Pressable>
        )}
      />

      <PreferenceSection title="Tema">
        {themePresetIds.map((preset) => (
          <SelectableChip
            key={preset}
            label={presetLabels[preset]}
            selected={preferences.themePreset === preset}
            onPress={() => selectPreset(preset)}
          />
        ))}
      </PreferenceSection>

      <PreferenceSection title="Aparência">
        {appearancePreferenceIds.map((appearance) => (
          <SelectableChip
            key={appearance}
            label={appearanceLabels[appearance]}
            selected={preferences.appearance === appearance}
            onPress={() => updatePreview({ appearance })}
          />
        ))}
      </PreferenceSection>

      <PreferenceSection title="Movimento">
        {motionPreferenceIds.map((motion) => (
          <SelectableChip
            key={motion}
            label={motionLabels[motion]}
            selected={preferences.motion === motion}
            onPress={() => updatePreview({ motion })}
          />
        ))}
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

      <Text style={styles.sectionTitle}>PRÉVIA AO VIVO</Text>
      <MotionView style={styles.preview}>
        <Text style={styles.previewEyebrow}>TREINO DE HOJE</Text>
        <Text style={styles.previewTitle}>Força e mobilidade</Text>
        <Text style={styles.previewCopy}>3 exercícios · estado descrito com texto</Text>
        <View style={styles.previewButton}><Text style={styles.previewButtonText}>Começar treino</Text></View>
      </MotionView>

      {!!message && (
        <Text accessibilityLiveRegion="polite" style={message.startsWith('Não') ? styles.error : styles.success}>
          {message}
        </Text>
      )}
      <PrimaryButton label="Salvar preferências" onPress={() => void save()} />
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
  )
}

function PreferenceSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.options}>{children}</View>
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
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 8,
    marginTop: 20,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggleRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    minHeight: 64,
    paddingHorizontal: 16,
  },
  toggleLabel: { ...typography.body, color: colors.textPrimary, flex: 1, fontWeight: '700', paddingRight: 12 },
  switchTrack: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 54,
  },
  switchTrackChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  switchThumb: { backgroundColor: colors.textSecondary, borderRadius: 11, height: 22, width: 22 },
  switchThumbChecked: { alignSelf: 'flex-end', backgroundColor: colors.onPrimary },
  preview: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 16,
    padding: 18,
  },
  previewEyebrow: { ...typography.caption, color: colors.textSecondary, fontWeight: '800' },
  previewTitle: { ...typography.title, color: colors.textPrimary, marginTop: 6 },
  previewCopy: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 5 },
  previewButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: shared.touchTarget.minimum,
  },
  previewButtonText: { ...typography.label, color: colors.onPrimary, fontWeight: '800' },
  success: { ...typography.bodySmall, color: colors.success, marginBottom: 12 },
  error: { ...typography.bodySmall, color: colors.danger, marginBottom: 12 },
  restore: { alignItems: 'center', justifyContent: 'center', minHeight: shared.touchTarget.minimum, marginTop: 8 },
  restoreText: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  pressed: { opacity: 0.72 },
  back: { alignItems: 'center', justifyContent: 'center', minHeight: shared.touchTarget.minimum, minWidth: shared.touchTarget.minimum },
  backText: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
})
