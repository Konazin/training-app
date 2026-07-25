import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useTrainingController } from './src/controllers/useTrainingController'
import { ExerciseScreen } from './src/screens/ExerciseScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { HistoryScreen } from './src/screens/HistoryScreen'
import { LibraryScreen } from './src/screens/LibraryScreen'
import { SessionScreen } from './src/screens/SessionScreen'
import { WeeklyPlanScreen } from './src/screens/WeeklyPlanScreen'
import { WorkoutsScreen } from './src/screens/WorkoutsScreen'
import { ThemeProvider, type ThemeColors, useTheme } from './src/theme'

type ScreenName = 'home' | 'workouts' | 'plans' | 'library' | 'session' | 'history' | 'exercise'

const navigation: { id: ScreenName; label: string; symbol: string }[] = [
  { id: 'home', label: 'Início', symbol: '⌂' },
  { id: 'workouts', label: 'Treinos', symbol: '▤' },
  { id: 'plans', label: 'Fichas', symbol: '▥' },
  { id: 'library', label: 'Biblioteca', symbol: '⌁' },
  { id: 'session', label: 'Sessão', symbol: '▶' },
  { id: 'history', label: 'Histórico', symbol: '◷' },
]

export default function App() {
  return (
    <ThemeProvider>
      <TrainingApp />
    </ThemeProvider>
  )
}

function TrainingApp() {
  const { colors, isDark, toggleTheme } = useTheme()
  const styles = createStyles(colors)
  const [screen, setScreen] = useState<ScreenName>('home')
  const [exerciseDestination, setExerciseDestination] = useState<'workout' | 'plan'>('workout')
  const [reduceMotion, setReduceMotion] = useState(false)
  const controller = useTrainingController()
  const pageOpacity = useRef(new Animated.Value(1)).current
  const pageOffset = useRef(new Animated.Value(0)).current

  useEffect(() => {
    void controller.refresh()
  }, [controller.refresh])

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      pageOpacity.setValue(1)
      pageOffset.setValue(0)
      return
    }
    pageOpacity.setValue(0)
    pageOffset.setValue(8)
    Animated.parallel([
      Animated.timing(pageOpacity, {
        duration: 180,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(pageOffset, {
        damping: 18,
        mass: 0.6,
        stiffness: 180,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start()
  }, [pageOffset, pageOpacity, reduceMotion, screen])

  function openExercise(workoutId: number) {
    controller.setSelectedWorkoutId(workoutId)
    setExerciseDestination('workout')
    setScreen('exercise')
  }

  function openPlanExercise(planId: number) {
    controller.setSelectedTrainingPlanId(planId)
    setExerciseDestination('plan')
    setScreen('exercise')
  }

  async function beginSession(planId: number, dayId: number) {
    const success = await controller.startSession(planId, dayId)
    if (success) setScreen('session')
    return success
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {!!controller.message && (
          <View style={styles.message}>
            <Text style={styles.messageText}>{controller.message}</Text>
          </View>
        )}

        <Pressable
          accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          onPress={toggleTheme}
          style={({ pressed }) => [styles.themeButton, pressed && styles.pressed]}
        >
          <Text style={styles.themeButtonText}>{isDark ? '☀' : '☾'}</Text>
        </Pressable>

        <Animated.View
          style={[
            styles.screen,
            {
              opacity: pageOpacity,
              transform: [{ translateY: pageOffset }],
            },
          ]}
        >
          {screen === 'home' && (
            <HomeScreen
              dashboard={controller.dashboard}
              loading={controller.loading}
              onRefresh={controller.refresh}
              onNavigate={setScreen}
            />
          )}
          {screen === 'workouts' && (
            <WorkoutsScreen
              workouts={controller.workouts}
              loading={controller.loading}
              onCreate={controller.createWorkout}
              onRemove={controller.removeWorkout}
              onAddExercise={openExercise}
            />
          )}
          {screen === 'plans' && (
            <WeeklyPlanScreen
              plans={controller.trainingPlans}
              selectedPlan={controller.selectedTrainingPlan}
              library={controller.exerciseLibrary}
              loading={controller.loading}
              onSelectPlan={controller.setSelectedTrainingPlanId}
              onCreate={controller.createTrainingPlan}
              onActivate={controller.activateTrainingPlan}
              onUpdateDay={controller.updatePlanDay}
              onAddExercise={controller.addDayExercise}
              onAddRestActivity={controller.addRestActivity}
              onStart={beginSession}
            />
          )}
          {screen === 'library' && (
            <LibraryScreen exercises={controller.exerciseLibrary} onCreate={controller.createExerciseDefinition} />
          )}
          {screen === 'session' && (
            <SessionScreen
              session={controller.activeSession}
              onOpenPlans={() => setScreen('plans')}
              onUpdateSet={controller.updateSessionSet}
              onSkip={controller.setSessionExerciseStatus}
              onComplete={async (rpe, notes) => {
                const success = await controller.completeSession(rpe, notes)
                if (success) setScreen('history')
                return success
              }}
              onAbandon={async () => {
                const success = await controller.abandonSession()
                if (success) setScreen('history')
                return success
              }}
            />
          )}
          {screen === 'history' && <HistoryScreen sessions={controller.sessions} />}
          {screen === 'exercise' && (
            <ExerciseScreen
              workouts={controller.workouts}
              trainingPlans={controller.trainingPlans}
              selectedWorkout={controller.selectedWorkout}
              selectedPlan={controller.selectedTrainingPlan}
              destination={exerciseDestination}
              loading={controller.loading}
              onDestinationChange={setExerciseDestination}
              onSelectWorkout={controller.setSelectedWorkoutId}
              onSelectPlan={controller.setSelectedTrainingPlanId}
              onCreateWorkoutExercise={controller.addExercise}
              onCreatePlanExercise={controller.addPlanExercise}
              onRemoveWorkoutExercise={controller.removeExercise}
              onRemovePlanExercise={controller.removePlanExercise}
            />
          )}
        </Animated.View>

        <View style={styles.navigation}>
          {navigation.map((item) => {
            const active = screen === item.id
            return (
              <Pressable
                key={item.id}
                onPress={() => setScreen(item.id)}
                style={({ pressed }) => [
                  styles.navItem,
                  active && styles.navItemActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.navSymbol, active && styles.navTextActive]}>{item.symbol}</Text>
                <Text style={[styles.navLabel, active && styles.navTextActive]}>{item.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  themeButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.gray200,
    borderRadius: 15,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    top: 7,
    width: 44,
    zIndex: 15,
  },
  themeButtonText: {
    color: colors.ink,
    fontSize: 19,
  },
  message: {
    backgroundColor: colors.nearBlack,
    borderRadius: 16,
    borderWidth: 1,
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
    position: 'absolute',
    right: 20,
    top: 8,
    zIndex: 20,
  },
  messageText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  navigation: {
    backgroundColor: 'rgba(17,17,17,0.97)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    borderWidth: 1,
    bottom: 12,
    flexDirection: 'row',
    left: 12,
    padding: 6,
    position: 'absolute',
    right: 12,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: 17,
    flex: 1,
    minHeight: 55,
    paddingVertical: 7,
  },
  navItemActive: {
    backgroundColor: colors.primary,
  },
  navSymbol: {
    color: colors.gray500,
    fontSize: 17,
    lineHeight: 19,
  },
  navLabel: {
    color: colors.gray500,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 3,
  },
  navTextActive: {
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.72,
  },
})
