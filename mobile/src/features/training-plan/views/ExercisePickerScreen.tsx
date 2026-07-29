import { Alert, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScreenHeader } from '../../../components/ScreenHeader'
import type { RootStackParamList } from '../../../navigation/types'
import type { ExerciseDefinition } from '../../../models/training'
import type { TrainingPlan } from '../model/trainingPlan'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { ExercisePicker } from './ExercisePicker'

export function ExercisePickerScreen({
  plans,
  library,
}: {
  plans: TrainingPlan[]
  library: ExerciseDefinition[]
}) {
  const route = useRoute<RouteProp<RootStackParamList, 'ExercisePicker'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const plan = plans.find((item) => item.id === route.params.planId)
  const day = plan?.days.find((item) => item.id === route.params.dayId)
  const { colors } = useTheme()
  const styles = createStyles(colors)

  if (!plan || !day) {
    return <View style={styles.empty}><Text style={styles.title}>Dia não encontrado</Text></View>
  }
  const planId = plan.id
  const dayId = day.id
  const configuredExerciseIds = day.exercises.map((item) => item.exercise.id)

  function select(exercise: ExerciseDefinition) {
    const openEditor = () => navigation.replace('DayExerciseEditor', {
      planId,
      dayId,
      exerciseDefinitionId: exercise.id,
    })
    if (!configuredExerciseIds.includes(exercise.id)) {
      openEditor()
      return
    }
    Alert.alert(
      'Exercício repetido',
      'Este exercício já está no dia. Deseja adicionar outra configuração?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Adicionar novamente', onPress: openEditor },
      ],
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader
          eyebrow={plan.name}
          title="Escolher exercício"
          description="Busque na biblioteca antes de configurar."
        />
      </View>
      <ExercisePicker exercises={library} onSelect={select} />
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { backgroundColor: colors.background, flex: 1 },
  header: { paddingHorizontal: shared.pagePadding },
  empty: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
})
