import { StyleSheet, Text, View } from 'react-native'
import type { WorkoutStatus } from '../models/training'
import { type ThemeColors, useTheme } from '../theme'

const labels: Record<WorkoutStatus, string> = {
  PLANNED: 'Planejado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
}

export function StatusPill({ status }: { status: WorkoutStatus }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const completed = status === 'COMPLETED'
  return (
    <View style={[styles.pill, completed && styles.completed]}>
      <View style={[styles.dot, completed && styles.completedDot]} />
      <Text style={[styles.text, completed && styles.completedText]}>{labels[status]}</Text>
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.gray100,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  completed: {
    backgroundColor: colors.black,
  },
  text: {
    color: colors.gray500,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dot: {
    backgroundColor: colors.gray400,
    borderRadius: 99,
    height: 5,
    width: 5,
  },
  completedDot: {
    backgroundColor: colors.white,
  },
  completedText: {
    color: colors.white,
  },
})
