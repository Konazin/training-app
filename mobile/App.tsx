import { useCallback, useEffect, useMemo, useRef } from 'react'
import { AppState } from 'react-native'
import { DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NavigationBar } from 'expo-navigation-bar'
import { StatusBar } from 'expo-status-bar'
import { type LocalRepositories, type SeedData } from '@training/training-local-db'
import seed from './assets/seeds/exercises.v1.json'
import type { MainTabParamList, RootStackParamList } from './src/navigation/types'
import { useTrainingController } from './src/controllers/useTrainingController'
import { useWorkoutSessionController } from './src/controllers/useWorkoutSessionController'
import { useBackupController } from './src/controllers/useBackupController'
import { useTrainingPlanController } from './src/features/training-plan/controller/useTrainingPlanController'
import { useTrainingPlanTrashController } from './src/features/training-plan/controller/useTrainingPlanTrashController'
import { ArchivedTrainingPlansScreen } from './src/features/training-plan/views/ArchivedTrainingPlansScreen'
import { DayExerciseEditorScreen } from './src/features/training-plan/views/DayExerciseEditorScreen'
import { ExercisePickerScreen } from './src/features/training-plan/views/ExercisePickerScreen'
import { RestActivityEditorScreen } from './src/features/training-plan/views/RestActivityEditorScreen'
import { TrainingPlanDayScreen } from './src/features/training-plan/views/TrainingPlanDayScreen'
import { TrainingPlanEditorScreen } from './src/features/training-plan/views/TrainingPlanEditorScreen'
import { TrainingPlanView } from './src/features/training-plan/views/TrainingPlanView'
import { TrainingPlanTrashScreen } from './src/features/training-plan/views/TrainingPlanTrashScreen'
import { WorkoutSessionScreen } from './src/features/workout-session/views/WorkoutSessionScreen'
import { ExerciseDetailScreen } from './src/features/exercise-library/ExerciseDetailScreen'
import { LibraryScreen } from './src/screens/LibraryScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { HistoryScreen } from './src/screens/HistoryScreen'
import { MoreScreen } from './src/screens/MoreScreen'
import { IntegrationsScreen } from './src/screens/IntegrationsScreen'
import { WgerIntegrationScreen } from './src/features/wger/WgerIntegrationScreen'
import { ThemeProvider, useTheme } from './src/theme'
import { useAppBootstrap } from './src/features/bootstrap/useAppBootstrap'
import { useLocalRuntime } from './src/features/bootstrap/useLocalRuntime'
import { BootstrapScreen } from './src/features/bootstrap/BootstrapScreen'
import { AppErrorBoundary } from './src/features/bootstrap/AppErrorBoundary'
import { exportDiagnostic } from './src/integrations/backupFiles'
import { getAppVersion } from './src/config/version'
import { Toast } from './src/components/Toast'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SystemBars />
        <AppErrorBoundary>
          <RuntimeApp />
        </AppErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

function SystemBars() {
  const { isDark } = useTheme()
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationBar style={isDark ? 'light' : 'dark'} />
    </>
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
  return <LocalApp repositories={runtime.repositories} />
}

function LocalApp({
  repositories,
}: {
  repositories: LocalRepositories
}) {
  const { colors, isDark } = useTheme()
  const controller = useTrainingController(repositories.exercises, repositories.dashboard)
  const trainingPlan = useTrainingPlanController(repositories.plans, controller.refresh)
  const workoutSession = useWorkoutSessionController(repositories.sessions, controller.refresh)
  const trashRefresh = useRef<() => Promise<boolean>>(async () => true)
  const refreshCore = useCallback(async () => {
    const results = await Promise.all([
      workoutSession.refresh(),
      trainingPlan.refresh(),
      controller.refresh(),
    ])
    if (results.some((result) => !result)) throw new Error('Não foi possível recarregar todos os dados locais.')
  }, [controller.refresh, trainingPlan.refresh, workoutSession.refresh])
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCore(), trashRefresh.current()])
  }, [refreshCore])
  const backup = useBackupController(
    repositories.backup,
    repositories.metadata,
    getAppVersion(),
    () => repositories.maintenance.resetToSeed(seed as SeedData),
    refreshAll,
  )
  const trash = useTrainingPlanTrashController(
    repositories.planTrash,
    () => backup.createAutomaticBackup('BEFORE_EMPTY_TRASH'),
    trainingPlan.refresh,
    controller.refresh,
  )
  trashRefresh.current = trash.refresh
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void trash.refresh()
    })
    return () => subscription.remove()
  }, [trash.refresh])
  const bootstrap = useAppBootstrap([
    workoutSession.refresh,
    trainingPlan.refresh,
    controller.refresh,
    trash.refresh,
  ])
  const notification = trash.message
    ? { message: trash.message, kind: trash.messageKind, source: 'trash' as const }
    : workoutSession.message
      ? { message: workoutSession.message, kind: 'error' as const, source: 'other' as const }
      : trainingPlan.message
      ? { message: trainingPlan.message, kind: 'error' as const, source: 'other' as const }
      : controller.message
        ? { message: controller.message, kind: 'error' as const, source: 'other' as const }
        : { message: backup.message, kind: backup.messageKind, source: 'other' as const }
  const navigationTheme = useMemo<NavigationTheme>(() => ({
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.card,
      border: colors.border,
      text: colors.textPrimary,
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
    <>
      <NavigationContainer theme={navigationTheme}>
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
                    trash={trash}
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
              <Stack.Screen name="Integrations" component={IntegrationsScreen} />
              <Stack.Screen name="WgerIntegration">
                {() => (
                  <WgerIntegrationScreen
                    imports={repositories.externalExerciseImport}
                    exercises={repositories.exercises}
                    onImported={controller.refresh}
                  />
                )}
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
                    onMoveToTrash={trash.moveToTrash}
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
              <Stack.Screen name="TrainingPlanTrash">
                {() => (
                  <TrainingPlanTrashScreen
                    plans={trash.plans}
                    loading={trash.loading}
                    busy={trash.busy}
                    onRefresh={trash.refresh}
                    onRestore={trash.restore}
                    onDelete={trash.deletePermanently}
                    onEmpty={trash.emptyTrash}
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
      <Toast
        message={notification.message}
        kind={notification.kind}
        notificationId={notification.source === 'trash' ? trash.notificationId : undefined}
        actionLabel={notification.source === 'trash' && trash.pendingUndo ? 'Desfazer' : undefined}
        actionBusyLabel="Desfazendo…"
        onAction={notification.source === 'trash' && trash.pendingUndo
          ? () => trash.undoMoveToTrash(trash.pendingUndo!.token)
          : undefined}
        duration={notification.source === 'trash' && trash.pendingUndo ? 6000 : undefined}
        onDismiss={notification.source === 'trash'
          ? () => trash.dismissNotification(
            trash.notificationId,
            trash.pendingUndo?.token,
          )
          : undefined}
      />
    </>
  )
}

function MainTabs({
  navigation,
  controller,
  trainingPlan,
  workoutSession,
  backup,
  trash,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList>
  controller: ReturnType<typeof useTrainingController>
  trainingPlan: ReturnType<typeof useTrainingPlanController>
  workoutSession: ReturnType<typeof useWorkoutSessionController>
  backup: ReturnType<typeof useBackupController>
  trash: ReturnType<typeof useTrainingPlanTrashController>
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const icons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
    Today: 'home-outline',
    Plan: 'clipboard-outline',
    History: 'time-outline',
    More: 'ellipsis-horizontal-circle-outline',
  }
  const labels: Record<keyof MainTabParamList, string> = { Today: 'Hoje', Plan: 'Ficha', History: 'Histórico', More: 'Mais' }
  return (
    <Tabs.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveBackgroundColor: colors.surfaceSecondary,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabel: labels[route.name],
      tabBarIcon: ({ color, focused }) => <Ionicons color={color} name={focused ? icons[route.name].replace('-outline', '') as keyof typeof Ionicons.glyphMap : icons[route.name]} size={24} />,
      tabBarItemStyle: { borderRadius: 14, marginHorizontal: 3, minHeight: 56 },
      tabBarStyle: {
        backgroundColor: colors.tabBar,
        borderTopColor: colors.border,
        height: 64 + insets.bottom,
        paddingBottom: insets.bottom + 4,
        paddingHorizontal: 6,
        paddingTop: 4,
      },
      tabBarLabelStyle: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
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
            onLibrary={() => navigation.navigate('Library')}
            onTrash={() => navigation.navigate('TrainingPlanTrash')}
            trashCount={trash.count}
            onIntegrations={() => navigation.navigate('Integrations')}
            onExport={() => void backup.exportBackup()}
            onImport={() => void backup.importBackup()}
            onErase={() => void backup.eraseAll()}
            onResetSeed={() => void backup.resetSeed()}
            automaticBackups={backup.automaticBackups}
            onRestoreAutomatic={(uri) => void backup.restoreAutomatic(uri)}
            onShareAutomatic={(uri) => void backup.shareAutomatic(uri)}
            onDeleteAutomatic={(uri) => void backup.deleteAutomatic(uri)}
            onDeleteAllAutomatic={() => void backup.deleteAllAutomatic()}
          />
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  )
}
