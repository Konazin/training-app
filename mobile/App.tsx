import { useEffect, useMemo, useState } from 'react'
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
import type { MainTabParamList, RootStackParamList } from './src/core/navigation/types'
import { useTrainingController } from './src/controllers/useTrainingController'
import { useWorkoutSessionController } from './src/features/workout-session/controller/useWorkoutSessionController'
import { WorkoutSessionScreen } from './src/features/workout-session/views/WorkoutSessionScreen'
import { ExerciseScreen } from './src/screens/ExerciseScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { HistoryScreen } from './src/screens/HistoryScreen'
import { LibraryScreen } from './src/screens/LibraryScreen'
import { MoreScreen } from './src/screens/MoreScreen'
import { WeeklyPlanScreen } from './src/screens/WeeklyPlanScreen'
import { WorkoutsScreen } from './src/screens/WorkoutsScreen'
import { ThemeProvider, type ThemeColors, useTheme } from './src/theme'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()

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
  const controller = useTrainingController()
  const workoutSession = useWorkoutSessionController()
  const [exerciseDestination, setExerciseDestination] = useState<'workout' | 'plan'>('workout')
  const [currentRoute, setCurrentRoute] = useState('MainTabs')
  const message = workoutSession.message || controller.message
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

  useEffect(() => {
    void Promise.all([controller.refresh(), workoutSession.refresh()])
  }, [controller.refresh, workoutSession.refresh])

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
                  workoutSession={workoutSession}
                  setExerciseDestination={setExerciseDestination}
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
                    setExerciseDestination('workout')
                    navigation.navigate('Exercise', { destination: 'workout' })
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
  workoutSession,
  setExerciseDestination,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainTabs'>
  controller: ReturnType<typeof useTrainingController>
  workoutSession: ReturnType<typeof useWorkoutSessionController>
  setExerciseDestination: (destination: 'workout' | 'plan') => void
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
              else {
                setExerciseDestination('workout')
                navigation.navigate('Exercise', { destination: 'workout' })
              }
            }}
            activeSession={workoutSession.activeSession}
            onResumeSession={() => navigation.navigate('Session')}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Plan">
        {() => (
          <WeeklyPlanScreen
            plans={controller.trainingPlans}
            selectedPlan={controller.selectedTrainingPlan}
            library={controller.exerciseLibrary}
            loading={controller.loading || workoutSession.busyKeys.has('start')}
            onSelectPlan={controller.setSelectedTrainingPlanId}
            onCreate={controller.createTrainingPlan}
            onActivate={controller.activateTrainingPlan}
            onUpdateDay={controller.updatePlanDay}
            onAddExercise={controller.addDayExercise}
            onAddRestActivity={controller.addRestActivity}
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
                setExerciseDestination('workout')
                navigation.navigate('Exercise', { destination: 'workout' })
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
