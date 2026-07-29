import { useCallback, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { seedEmptyDatabase, type LocalRepositories, type SeedData, type SqlDatabase } from '@training/training-local-db'
import seed from './assets/seeds/exercises.v1.json'
import type { MainTabParamList, RootStackParamList } from './src/navigation/types'
import { useTrainingController } from './src/controllers/useTrainingController'
import { useWorkoutSessionController } from './src/controllers/useWorkoutSessionController'
import { useBackupController } from './src/controllers/useBackupController'
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
import { LibraryScreen } from './src/screens/LibraryScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { HistoryScreen } from './src/screens/HistoryScreen'
import { MoreScreen } from './src/screens/MoreScreen'
import { ThemeProvider, type ThemeColors, useTheme } from './src/theme'
import { useAppBootstrap } from './src/features/bootstrap/useAppBootstrap'
import { useLocalRuntime } from './src/features/bootstrap/useLocalRuntime'
import { BootstrapScreen } from './src/features/bootstrap/BootstrapScreen'
import { AppErrorBoundary } from './src/features/bootstrap/AppErrorBoundary'
import { exportDiagnostic } from './src/integrations/backupFiles'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()

export default function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <RuntimeApp />
      </ThemeProvider>
    </AppErrorBoundary>
  )
}

function RuntimeApp() {
  const runtime = useLocalRuntime()
  if (runtime.state !== 'ready' || !runtime.repositories || !runtime.database) {
    return (
      <BootstrapScreen
        state={runtime.state}
        message={runtime.message}
        migrationName={runtime.migrationName}
        onRetry={() => void runtime.retry()}
        onExportDiagnostic={() => void exportDiagnostic(runtime.message)}
      />
    )
  }
  return <LocalApp repositories={runtime.repositories} database={runtime.database} />
}

function LocalApp({
  repositories,
  database,
}: {
  repositories: LocalRepositories
  database: SqlDatabase
}) {
  const { colors, isDark, toggleTheme } = useTheme()
  const styles = createStyles(colors)
  const controller = useTrainingController(repositories.exercises, repositories.dashboard)
  const trainingPlan = useTrainingPlanController(repositories.plans, controller.refresh)
  const workoutSession = useWorkoutSessionController(repositories.sessions, controller.refresh)
  const refreshAll = useCallback(async () => {
    const results = await Promise.all([
      workoutSession.refresh(),
      trainingPlan.refresh(),
      controller.refresh(),
    ])
    if (results.some((result) => !result)) throw new Error('Não foi possível recarregar todos os dados locais.')
  }, [controller.refresh, trainingPlan.refresh, workoutSession.refresh])
  const bootstrap = useAppBootstrap([
    workoutSession.refresh,
    trainingPlan.refresh,
    controller.refresh,
  ])
  const backup = useBackupController(
    repositories.backup,
    '0.1.1',
    async () => {
      await repositories.backup.reset()
      await seedEmptyDatabase(database, seed as SeedData)
    },
    refreshAll,
  )
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
    return (
      <BootstrapScreen
        state={bootstrap.state}
        message={bootstrap.message}
        onRetry={() => void bootstrap.retry()}
        onExportDiagnostic={() => void exportDiagnostic(bootstrap.message)}
      />
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.container}>
          <NavigationContainer
            theme={navigationTheme}
            onReady={() => setCurrentRoute('MainTabs')}
            onStateChange={(state) => {
              const route = state?.routes[state.index ?? 0]
              if (route?.name) setCurrentRoute(route.name)
            }}
          >
            <Stack.Navigator screenOptions={{
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: colors.background },
              headerShown: false,
            }}>
              <Stack.Screen name="MainTabs">
                {({ navigation }) => (
                  <MainTabs
                    navigation={navigation}
                    controller={controller}
                    trainingPlan={trainingPlan}
                    workoutSession={workoutSession}
                    backup={backup}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Library">
                {() => (
                  <LibraryScreen
                    exercises={controller.exerciseLibrary}
                    loading={controller.loading}
                    onCreate={controller.createExerciseDefinition}
                    onUpdate={controller.updateExerciseDefinition}
                    onArchive={controller.archiveExerciseDefinition}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="ExerciseDetail">
                {() => <ExerciseDetailScreen exercises={controller.exerciseLibrary} />}
              </Stack.Screen>
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
                {() => <ExercisePickerScreen plans={trainingPlan.trainingPlans} library={controller.exerciseLibrary} />}
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
          {currentRoute !== 'Session' && (
            <Pressable accessibilityLabel="Alternar tema" onPress={toggleTheme} style={styles.themeButton}>
              <Text style={styles.themeButtonText}>{isDark ? '☀' : '◐'}</Text>
            </Pressable>
          )}
          {!!message && <View style={styles.message}><Text style={styles.messageText}>{message}</Text></View>}
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
  backup,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList>
  controller: ReturnType<typeof useTrainingController>
  trainingPlan: ReturnType<typeof useTrainingPlanController>
  workoutSession: ReturnType<typeof useWorkoutSessionController>
  backup: ReturnType<typeof useBackupController>
}) {
  const { colors } = useTheme()
  const symbols: Record<keyof MainTabParamList, string> = { Today: '⌂', Plan: '▥', History: '◷', More: '•••' }
  const labels: Record<keyof MainTabParamList, string> = { Today: 'Hoje', Plan: 'Ficha', History: 'Histórico', More: 'Mais' }
  return (
    <Tabs.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.onPrimary,
      tabBarInactiveTintColor: colors.gray500,
      tabBarLabel: labels[route.name],
      tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>{symbols[route.name]}</Text>,
      tabBarStyle: { backgroundColor: colors.nearBlack, borderTopColor: colors.gray200, height: 72, paddingBottom: 9, paddingTop: 7 },
      tabBarLabelStyle: { fontSize: 9, fontWeight: '700' },
    })}>
      <Tabs.Screen name="Today">
        {({ navigation: tabNavigation }) => (
          <HomeScreen
            dashboard={controller.dashboard}
            loading={controller.loading}
            activeSession={workoutSession.activeSession}
            onRefresh={controller.refresh}
            onOpenPlan={() => tabNavigation.navigate('Plan')}
            onOpenLibrary={() => navigation.navigate('Library')}
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
            busy={backup.busy}
            message={backup.message}
            onLibrary={() => navigation.navigate('Library')}
            onExport={() => void backup.exportBackup()}
            onImport={() => void backup.importBackup()}
            onErase={() => void backup.eraseAll()}
            onResetSeed={() => void backup.resetSeed()}
          />
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { backgroundColor: colors.background, flex: 1 },
  themeButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 15, borderWidth: 1, height: 44, justifyContent: 'center', position: 'absolute', right: 20, top: 7, width: 44, zIndex: 15 },
  themeButtonText: { color: colors.ink, fontSize: 19 },
  message: { backgroundColor: colors.nearBlack, borderRadius: 16, borderWidth: 1, left: 20, paddingHorizontal: 16, paddingVertical: 13, position: 'absolute', right: 20, top: 8, zIndex: 20 },
  messageText: { color: colors.white, fontSize: 10, fontWeight: '700', textAlign: 'center' },
})
