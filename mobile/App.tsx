import { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import {
  createHttpWorkoutSessionRepository,
  useWorkoutSessionController,
} from '@training/workout-session-core'
import { apiClient } from './src/config/api'
import type { MainTabParamList, RootStackParamList } from './src/core/navigation/types'
import { useTrainingController } from './src/controllers/useTrainingController'
import { useTrainingPlanController } from './src/features/training-plan/controller/useTrainingPlanController'
import { ArchivedTrainingPlansScreen } from './src/features/training-plan/views/ArchivedTrainingPlansScreen'
import { DayExerciseEditorScreen } from './src/features/training-plan/views/DayExerciseEditorScreen'
import { ExercisePickerScreen } from './src/features/training-plan/views/ExercisePickerScreen'
import { RestActivityEditorScreen } from './src/features/training-plan/views/RestActivityEditorScreen'
import { TrainingPlanDayScreen } from './src/features/training-plan/views/TrainingPlanDayScreen'
import { TrainingPlanEditorScreen } from './src/features/training-plan/views/TrainingPlanEditorScreen'
import { TrainingPlanView } from './src/features/training-plan/views/TrainingPlanView'
import { WorkoutSessionScreen } from './src/features/workout-session/views/WorkoutSessionScreen'
import { ExerciseDetailScreen } from './src/features/exercise-library/ExerciseDetailScreen'
import { ExerciseScreen } from './src/screens/ExerciseScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { HistoryScreen } from './src/screens/HistoryScreen'
import { LibraryScreen } from './src/screens/LibraryScreen'
import { MoreScreen } from './src/screens/MoreScreen'
import { WorkoutsScreen } from './src/screens/WorkoutsScreen'
import { ThemeProvider, type ThemeColors, useTheme } from './src/theme'
import { useAppBootstrap } from './src/features/bootstrap/useAppBootstrap'
import { BootstrapScreen } from './src/features/bootstrap/BootstrapScreen'
import { AppErrorBoundary } from './src/features/bootstrap/AppErrorBoundary'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()
const workoutSessionRepository = createHttpWorkoutSessionRepository(apiClient)

export default function App() {
  return (
    <AppErrorBoundary><ThemeProvider><TrainingApp /></ThemeProvider></AppErrorBoundary>
  )
}

function TrainingApp() {
  const { colors, isDark, toggleTheme } = useTheme()
  const styles = createStyles(colors)
  const controller = useTrainingController()
  const trainingPlan = useTrainingPlanController()
  const workoutSession = useWorkoutSessionController(workoutSessionRepository)
  const bootstrap = useAppBootstrap(controller.refresh, trainingPlan.refresh, workoutSession.refresh)
  const [currentRoute, setCurrentRoute] = useState('MainTabs')
  const message = workoutSession.message || trainingPlan.message || controller.message
  const navigationTheme = useMemo<NavigationTheme>(() => ({
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.card,
      border: colors.gray200,
      text: colors.ink,
      primary: colors.primary,
      notification: colors.danger,
    },
  }), [colors, isDark])

  if (bootstrap.state !== 'ready') {
    return <BootstrapScreen state={bootstrap.state} message={bootstrap.message} onRetry={() => void bootstrap.retry()} />
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <SafeAreaView edges={['top']} style={styles.container}>
          <NavigationContainer
            theme={navigationTheme}
            onReady={() => setCurrentRoute('MainTabs')}
            onStateChange={(state) => {
              const route = state?.routes[state.index ?? 0]
              if (route?.name) setCurrentRoute(route.name)
            }}
          >
          <Stack.Navigator
            screenOptions={{
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: colors.background },
              headerShown: false,
            }}
          >
            <Stack.Screen name="MainTabs">
              {({ navigation }) => (
                <MainTabs
                  navigation={navigation}
                  controller={controller}
                  trainingPlan={trainingPlan}
                  workoutSession={workoutSession}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Workouts">
              {({ navigation }) => (
                <WorkoutsScreen
                  workouts={controller.workouts}
                  loading={controller.loading}
                  onCreate={controller.createWorkout}
                  onRemove={controller.removeWorkout}
                  onAddExercise={(workoutId) => {
                    controller.setSelectedWorkoutId(workoutId)
                    navigation.navigate('Exercise')
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Library">
              {() => (
                <LibraryScreen
                  exercises={controller.exerciseLibrary}
                  onCreate={controller.createExerciseDefinition}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Exercise">
              {() => (
                <ExerciseScreen
                  workouts={controller.workouts}
                  selectedWorkout={controller.selectedWorkout}
                  loading={controller.loading}
                  onSelectWorkout={controller.setSelectedWorkoutId}
                  onCreateWorkoutExercise={controller.addExercise}
                  onRemoveWorkoutExercise={controller.removeExercise}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
            <Stack.Screen name="TrainingPlanEditor">
              {() => (
                <TrainingPlanEditorScreen
                  plans={trainingPlan.trainingPlans}
                  busyKeys={trainingPlan.busyKeys}
                  errors={trainingPlan.errors}
                  onCreate={trainingPlan.create}
                  onUpdate={trainingPlan.update}
                  onActivate={trainingPlan.activate}
                  onDuplicate={trainingPlan.duplicate}
                  onArchive={trainingPlan.archive}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="TrainingPlanDay">
              {({ navigation }) => (
                <TrainingPlanDayScreen
                  plans={trainingPlan.trainingPlans}
                  busyKeys={trainingPlan.busyKeys}
                  errors={trainingPlan.errors}
                  onUpdateDay={trainingPlan.updateDay}
                  onRemoveExercise={trainingPlan.removeDayExercise}
                  onReorderExercises={trainingPlan.reorderDayExercises}
                  onRemoveActivity={trainingPlan.removeRestActivity}
                  onReorderActivities={trainingPlan.reorderRestActivities}
                  onStart={async (planId, dayId) => {
                    const success = await workoutSession.start(planId, dayId)
                    if (success) navigation.navigate('Session')
                    return success
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="ExercisePicker">
              {() => (
                <ExercisePickerScreen
                  plans={trainingPlan.trainingPlans}
                  library={controller.exerciseLibrary}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="ArchivedTrainingPlans">
              {() => (
                <ArchivedTrainingPlansScreen
                  plans={trainingPlan.trainingPlans}
                  busyKeys={trainingPlan.busyKeys}
                  errors={trainingPlan.errors}
                  onRestore={trainingPlan.archive}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="DayExerciseEditor">
              {() => (
                <DayExerciseEditorScreen
                  plans={trainingPlan.trainingPlans}
                  library={controller.exerciseLibrary}
                  busyKeys={trainingPlan.busyKeys}
                  errors={trainingPlan.errors}
                  onCreate={trainingPlan.addDayExercise}
                  onUpdate={trainingPlan.updateDayExercise}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="RestActivityEditor">
              {() => (
                <RestActivityEditorScreen
                  plans={trainingPlan.trainingPlans}
                  busyKeys={trainingPlan.busyKeys}
                  errors={trainingPlan.errors}
                  onCreate={trainingPlan.addRestActivity}
                  onUpdate={trainingPlan.updateRestActivity}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Session">
              {() => (
                <WorkoutSessionScreen
                  session={workoutSession.activeSession}
                  restTimer={workoutSession.restTimer}
                  errors={workoutSession.errors}
                  busyKeys={workoutSession.busyKeys}
                  onUpdateSet={workoutSession.updateSet}
                  onAddSet={workoutSession.addSet}
                  onRemoveSet={workoutSession.removeSet}
                  onSetExerciseStatus={workoutSession.setExerciseStatus}
                  onPause={workoutSession.pause}
                  onResume={workoutSession.resume}
                  onComplete={workoutSession.complete}
                  onAbandon={workoutSession.abandon}
                  onStartRest={workoutSession.startRest}
                  onAdjustRest={workoutSession.adjustRest}
                  onSkipRest={workoutSession.skipRest}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
          </NavigationContainer>

          {!!message && (
            <View style={styles.message}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          )}
          {currentRoute !== 'Session' && (
            <Pressable
              accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              onPress={toggleTheme}
              style={({ pressed }) => [styles.themeButton, pressed && styles.pressed]}
            >
              <Text style={styles.themeButtonText}>{isDark ? '☀' : '☾'}</Text>
            </Pressable>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  )
}

function MainTabs({
  navigation,
  controller,
  trainingPlan,
  workoutSession,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainTabs'>
  controller: ReturnType<typeof useTrainingController>
  trainingPlan: ReturnType<typeof useTrainingPlanController>
  workoutSession: ReturnType<typeof useWorkoutSessionController>
}) {
  const { colors } = useTheme()
  const symbols: Record<keyof MainTabParamList, string> = {
    Today: '⌂',
    Plan: '▥',
    History: '◷',
    More: '•••',
  }
  const labels: Record<keyof MainTabParamList, string> = {
    Today: 'Hoje',
    Plan: 'Ficha',
    History: 'Histórico',
    More: 'Mais',
  }

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.onPrimary,
        tabBarInactiveTintColor: colors.gray500,
        tabBarLabel: labels[route.name],
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>{symbols[route.name]}</Text>,
        tabBarStyle: {
          backgroundColor: colors.nearBlack,
          borderTopColor: colors.gray200,
          height: 72,
          paddingBottom: 9,
          paddingTop: 7,
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: '700' },
      })}
    >
      <Tabs.Screen name="Today">
        {() => (
          <HomeScreen
            dashboard={controller.dashboard}
            loading={controller.loading}
            onRefresh={controller.refresh}
            onNavigate={(screen) => {
              if (screen === 'workouts') navigation.navigate('Workouts')
              else navigation.navigate('Exercise')
            }}
            activeSession={workoutSession.activeSession}
            onResumeSession={() => navigation.navigate('Session')}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Plan">
        {() => (
          <TrainingPlanView
            plans={trainingPlan.trainingPlans}
            selectedPlan={trainingPlan.selectedTrainingPlan}
            loading={trainingPlan.loading || workoutSession.busyKeys.has('start')}
            onSelect={trainingPlan.setSelectedTrainingPlanId}
            onStart={async (planId, dayId) => {
              const success = await workoutSession.start(planId, dayId)
              if (success) navigation.navigate('Session')
              return success
            }}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="History">
        {() => <HistoryScreen sessions={workoutSession.sessions} />}
      </Tabs.Screen>
      <Tabs.Screen name="More">
        {() => (
          <MoreScreen
            onOpen={(screen) => {
              if (screen === 'Exercise') {
                navigation.navigate('Exercise')
              } else if (screen === 'Workouts') {
                navigation.navigate('Workouts')
              } else {
                navigation.navigate('Library')
              }
            }}
          />
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { backgroundColor: colors.background, flex: 1 },
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
  themeButtonText: { color: colors.ink, fontSize: 19 },
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
  messageText: { color: colors.white, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.72 },
})
