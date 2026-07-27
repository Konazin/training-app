import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../core/navigation/types'
import type { TrainingPlan } from '../../training-plan/model/trainingPlan'
import type { CreateUmaCareerInput } from '../model/umaCareer'
import { shared, type ThemeColors, useTheme } from '../../../theme'

export function UmaCareerCreateScreen({
  plans,
  busy,
  onCreate,
}: {
  plans: TrainingPlan[]
  busy: boolean
  onCreate: (input: CreateUmaCareerInput) => Promise<boolean>
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const availablePlans = useMemo(() => plans.filter((plan) => !plan.archived), [plans])
  const [name, setName] = useState('Minha carreira')
  const [trainingPlanId, setTrainingPlanId] = useState(availablePlans[0]?.id ?? 0)
  const [totalWeeks, setTotalWeeks] = useState<8 | 12 | 16>(8)

  async function submit() {
    if (!name.trim() || !trainingPlanId) return
    if (await onCreate({ name: name.trim(), trainingPlanId, totalWeeks })) {
      navigation.replace('UmaCareer')
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Voltar</Text></TouchableOpacity>
      <Text style={styles.eyebrow}>NOVA TEMPORADA</Text>
      <Text style={styles.title}>Criar carreira</Text>
      <Text style={styles.description}>A ficha continuará editável e será usada diretamente durante a carreira.</Text>

      <Text style={styles.label}>NOME</Text>
      <TextInput
        maxLength={120}
        onChangeText={setName}
        placeholder="Nome da carreira"
        placeholderTextColor={colors.gray400}
        style={styles.input}
        value={name}
      />

      <Text style={styles.label}>DURAÇÃO</Text>
      <View style={styles.options}>
        {([8, 12, 16] as const).map((weeks) => (
          <TouchableOpacity
            key={weeks}
            onPress={() => setTotalWeeks(weeks)}
            style={[styles.option, totalWeeks === weeks && styles.optionSelected]}
          >
            <Text style={[styles.optionText, totalWeeks === weeks && styles.optionTextSelected]}>{weeks} semanas</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>FICHA SEMANAL</Text>
      {availablePlans.map((plan) => (
        <TouchableOpacity
          key={plan.id}
          onPress={() => setTrainingPlanId(plan.id)}
          style={[styles.plan, trainingPlanId === plan.id && styles.planSelected]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planMeta}>{plan.category} · {plan.difficulty}</Text>
          </View>
          <Text style={styles.radio}>{trainingPlanId === plan.id ? '●' : '○'}</Text>
        </TouchableOpacity>
      ))}
      {!availablePlans.length && (
        <Text style={styles.warning}>Crie uma ficha semanal antes de iniciar uma carreira.</Text>
      )}

      <TouchableOpacity
        disabled={busy || !name.trim() || !trainingPlanId}
        onPress={() => void submit()}
        style={[styles.primary, (busy || !name.trim() || !trainingPlanId) && styles.disabled]}
      >
        <Text style={styles.primaryText}>{busy ? 'Criando…' : 'Começar na segunda-feira'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 45 },
  back: { color: colors.gray500, fontSize: 10, fontWeight: '700', marginBottom: 26, marginTop: 8, paddingVertical: 5 },
  eyebrow: { color: colors.gray500, fontSize: 8, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginBottom: 7, marginTop: 5 },
  description: { color: colors.gray500, fontSize: 10, lineHeight: 17, marginBottom: 25 },
  label: { color: colors.gray500, fontSize: 8, fontWeight: '800', letterSpacing: 1, marginBottom: 7, marginTop: 15 },
  input: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 15, borderWidth: 1, color: colors.ink, minHeight: 52, paddingHorizontal: 14 },
  options: { flexDirection: 'row', gap: 7 },
  option: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 14, borderWidth: 1, flex: 1, minHeight: 48, justifyContent: 'center' },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.ink, fontSize: 9, fontWeight: '800' },
  optionTextSelected: { color: colors.onPrimary },
  plan: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginBottom: 7, minHeight: 62, padding: 13 },
  planSelected: { borderColor: colors.ink, borderWidth: 2 },
  planName: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  planMeta: { color: colors.gray500, fontSize: 9, marginTop: 4 },
  radio: { color: colors.ink, fontSize: 16 },
  warning: { backgroundColor: colors.card, borderRadius: 15, color: colors.gray500, fontSize: 10, lineHeight: 17, padding: 15 },
  primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, justifyContent: 'center', marginTop: 25, minHeight: 54 },
  primaryText: { color: colors.onPrimary, fontSize: 11, fontWeight: '800' },
  disabled: { opacity: 0.4 },
})
