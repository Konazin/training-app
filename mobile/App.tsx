import { useCallback, useMemo, useRef } from 'react'
import { Alert } from 'react-native'
import {
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
  type Theme as NavigationTheme,
} from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NavigationBar } from 'expo-navigation-bar'
import { StatusBar } from 'expo-status-bar'
import { type LocalRepositories } from '@training/training-local-db'
import {
  buildLocalNotices,
  calculateHistoryProgress,
  type BackupRepository,
} from '@training/training-domain'
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
import { AppearanceSettingsScreen } from './src/screens/AppearanceSettingsScreen'
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
import { triggerHaptic } from './src/theme/haptics'
import { runRefreshParts, type RefreshAllResult } from './src/controllers/refreshAll'
import {
  useLocalCalendarClock,
  useRefreshOnFocus,
  useRefreshUi,
} from './src/controllers/useRefreshUi'
import { systemBarStyle } from './src/theme/uiContracts'
import { isUiPreferences, type UiPreferences } from './src/theme/preferences'
import { Onboarding } from './src/features/onboarding/Onboarding'
import { useOnboarding } from './src/features/onboarding/useOnboarding'
import { useStarterPackImportController } from './src/features/exercise-library/useStarterPackImportController'
import { WGER_STARTER_PACK, recommendedPackEnabled } from '@training/training-domain'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()
const navigationRef = createNavigationContainerRef<RootStackParamList>()

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
      <StatusBar style={systemBarStyle(isDark)} />
      <NavigationBar style={systemBarStyle(isDark)} />
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
  const {
    applyImportedPreferences,
    colors,
    isDark,
    motion,
    preferences,
    savedPreferences,
  } = useTheme()
  const controller = useTrainingController(repositories.exercises, repositories.dashboard)
  const trainingPlan = useTrainingPlanController(repositories.plans, controller.refresh)
  const workoutSession = useWorkoutSessionController(repositories.sessions, controller.refresh)
  const onboarding = useOnboarding(repositories.metadata)
  const starterPack = useStarterPackImportController(repositories.externalExerciseImport, controller.refresh)
  const starterPackAction = useCallback(() => {
    Alert.alert(
      'Importar pacote recomendado?',
      `${WGER_STARTER_PACK.length} exercícios serão consultados no Wger. É necessária internet; nenhum plano será criado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Importar', onPress: () => void starterPack.run() },
      ],
    )
  }, [starterPack])
  const trashRefresh = useRef<() => Promise<boolean>>(async () => true)
  const refreshAll = useCallback((): Promise<RefreshAllResult> => runRefreshParts([
    { name: 'sessão', refresh: workoutSession.refresh },
    { name: 'fichas', refresh: trainingPlan.refresh },
    { name: 'dashboard e biblioteca', refresh: controller.refresh },
    { name: 'lixeira e badge', refresh: () => trashRefresh.current() },
  ]), [controller.refresh, trainingPlan.refresh, workoutSession.refresh])
  const backupRepository = useMemo<BackupRepository>(() => ({
    export: async (appVersion) => ({
      ...await repositories.backup.export(appVersion),
      uiPreferences: savedPreferences,
    }),
    restore: async (value) => {
      await repositories.backup.restore(value)
      if (value.uiPreferences !== undefined && isUiPreferences(value.uiPreferences)) {
        const applyPreferences = () => applyImportedPreferences(value.uiPreferences as UiPreferences)
        if (!await applyPreferences()) {
          return {
            postCommitWarning: 'O backup foi restaurado, mas as preferências visuais não puderam ser aplicadas.',
            retryPostCommit: applyPreferences,
          }
        }
      }
    },
    reset: () => repositories.backup.reset(),
  }), [applyImportedPreferences, repositories, savedPreferences])
  const backup = useBackupController(
    backupRepository,
    repositories.metadata,
    getAppVersion(),
    refreshAll,
  )
  const trash = useTrainingPlanTrashController(
    repositories.planTrash,
    () => backup.createAutomaticBackup('BEFORE_EMPTY_TRASH'),
    trainingPlan.refresh,
    controller.refresh,
  )
  trashRefresh.current = trash.refresh
  const bootstrap = useAppBootstrap([
    workoutSession.refresh,
    trainingPlan.refresh,
    controller.refresh,
    trash.refresh,
  ])
  const notification = starterPack.state.status === 'SUCCESS_WITH_WARNING'
    ? { message: starterPack.state.message, kind: 'warning' as const, source: 'starter' as const }
    : trash.message
    ? { message: trash.message, kind: trash.messageKind, source: 'trash' as const }
    : workoutSession.message
      ? { message: workoutSession.message, kind: 'error' as const, source: 'other' as const }
      : trainingPlan.message
      ? { message: trainingPlan.message, kind: trainingPlan.messageKind, source: 'other' as const }
      : controller.message
        ? { message: controller.message, kind: 'error' as const, source: 'other' as const }
        : { message: backup.message, kind: backup.messageKind, source: 'backup' as const }
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
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
            <Stack.Navigator screenOptions={{
              animation: motion.navigationAnimation,
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
                    refreshAll={refreshAll}
                    notices={buildLocalNotices({
                      activeSession: workoutSession.activeSession,
                      hasActivePlan: trainingPlan.trainingPlans.some((plan) =>
                        plan.active && !plan.archived && plan.deletedAt === null),
                      providerMediaUnavailable: controller.exerciseLibrary.some((exercise) =>
                        exercise.source === 'WGER'
                        && !exercise.primaryImageUrl
                        && !exercise.primaryVideoUrl),
                    })}
                    onOnboarding={onboarding.reopen}
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
                    onFavorite={controller.setExerciseFavorite}
                    onImportStarterPack={starterPackAction}
                    onCancelStarterPack={starterPack.cancel}
                    starterPackCancellable={starterPackCancellable(starterPack.state)}
                    starterPackBusy={starterPackBusy(starterPack.state)}
                    starterPackMessage={starterPackMessage(starterPack.state)}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="ExerciseDetail">
                {() => (
                  <ExerciseDetailScreen
                    exercises={controller.exerciseLibrary}
                    onFavorite={controller.setExerciseFavorite}
                    onOpened={controller.registerExerciseRecent}
                    onUpdateNotes={controller.updateExerciseNotes}
                  />
                )}
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
              <Stack.Screen name="AppearanceSettings" component={AppearanceSettingsScreen} />
              <Stack.Screen name="TrainingPlanEditor">
                {() => (
                  <TrainingPlanEditorScreen
                    plans={trainingPlan.trainingPlans}
                    busyKeys={trainingPlan.busyKeys}
                    errors={trainingPlan.errors}
                    onCreate={trainingPlan.createWithDays}
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
                      if (success) {
                        void triggerHaptic('SESSION_START', preferences.hapticsEnabled)
                        navigation.navigate('Session')
                      }
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
                    onFavorite={controller.setExerciseFavorite}
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
                    history={workoutSession.sessions}
                    library={controller.exerciseLibrary}
                    restTimer={workoutSession.restTimer}
                    errors={workoutSession.errors}
                    busyKeys={workoutSession.busyKeys}
                    onUpdateSet={workoutSession.updateSet}
                    onAddSet={workoutSession.addSet}
                    onRemoveSet={workoutSession.removeSet}
                    onSetExerciseStatus={workoutSession.setExerciseStatus}
                    onUpdateExerciseNotes={workoutSession.updateExerciseNotes}
                    onUpdateSessionNotes={workoutSession.updateSessionNotes}
                    onApplySuggestion={workoutSession.applySuggestion}
                    onSubstituteExercise={workoutSession.substituteExercise}
                    onUndoSubstitution={workoutSession.undoSubstitution}
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
        actionLabel={notification.source === 'starter'
          ? 'Atualizar tela'
          : notification.source === 'trash' && trash.pendingUndo
          ? 'Desfazer'
          : notification.source === 'backup' && backup.refreshPending
            ? 'Tentar novamente'
            : undefined}
        actionBusyLabel={notification.source === 'starter'
          ? 'Atualizando…'
          : notification.source === 'backup' ? 'Tentando novamente…' : 'Desfazendo…'}
        onAction={notification.source === 'trash' && trash.pendingUndo
          ? () => trash.undoMoveToTrash(trash.pendingUndo!.token)
          : notification.source === 'starter'
            ? starterPack.retryRefresh
          : notification.source === 'backup' && backup.refreshPending
            ? backup.retryRefresh
            : undefined}
        duration={notification.source === 'trash' && trash.pendingUndo ? 6000 : undefined}
        onDismiss={notification.source === 'trash'
          ? () => trash.dismissNotification(
            trash.notificationId,
            trash.pendingUndo?.token,
          )
          : notification.source === 'backup' && backup.refreshPending
            ? backup.dismissRetry
            : undefined}
      />
      <Onboarding
        visible={onboarding.visible}
        onSkip={onboarding.skip}
        onComplete={onboarding.complete}
        onOpenWger={() => {
          if (navigationRef.isReady()) navigationRef.navigate('WgerIntegration')
        }}
        onCreateCustom={() => {
          if (navigationRef.isReady()) navigationRef.navigate('Library')
        }}
        onImportStarterPack={starterPackAction}
        starterPackEnabled={recommendedPackEnabled(WGER_STARTER_PACK.length, 0)}
        starterPackBusy={starterPackBusy(starterPack.state)}
      />
    </>
  )
}

function starterPackBusy(state: ReturnType<typeof useStarterPackImportController>['state']) {
  return state.status === 'FETCHING' || state.status === 'DOWNLOADING_MEDIA'
    || state.status === 'VALIDATING' || state.status === 'AWAITING_PARTIAL_CONFIRMATION'
    || state.status === 'COMMITTING'
}

function starterPackCancellable(state: ReturnType<typeof useStarterPackImportController>['state']) {
  return state.status === 'FETCHING' || state.status === 'DOWNLOADING_MEDIA' || state.status === 'VALIDATING'
}

function starterPackMessage(state: ReturnType<typeof useStarterPackImportController>['state']) {
  if (state.status === 'FETCHING') return `Consultando Wger… ${state.completed}/${state.total}`
  if (state.status === 'DOWNLOADING_MEDIA') return `Baixando mídia… ${state.completed}/${state.total}`
  if (state.status === 'VALIDATING') return 'Validando conteúdo recebido do Wger…'
  if (state.status === 'COMMITTING') return `Salvando ${state.total} exercícios…`
  if (state.status === 'SUCCESS') return `${state.imported} importado(s); ${state.skipped} indisponível(is).${state.withoutDemo ? ` ${state.withoutDemo} sem demonstração visual.` : ''}`
  if (state.status === 'SUCCESS_WITH_WARNING') return state.message
  if (state.status === 'ERROR') return state.message
  return ''
}

function MainTabs({
  navigation,
  controller,
  trainingPlan,
  workoutSession,
  backup,
  trash,
  refreshAll,
  notices,
  onOnboarding,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList>
  controller: ReturnType<typeof useTrainingController>
  trainingPlan: ReturnType<typeof useTrainingPlanController>
  workoutSession: ReturnType<typeof useWorkoutSessionController>
  backup: ReturnType<typeof useBackupController>
  trash: ReturnType<typeof useTrainingPlanTrashController>
  refreshAll: () => Promise<RefreshAllResult>
  notices: ReturnType<typeof buildLocalNotices>
  onOnboarding: () => void
}) {
  const { colors, preferences } = useTheme()
  const insets = useSafeAreaInsets()
  const icons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
    Today: 'home-outline',
    Plan: 'clipboard-outline',
    History: 'time-outline',
    More: 'ellipsis-horizontal-circle-outline',
  }
  const labels: Record<keyof MainTabParamList, string> = { Today: 'Hoje', Plan: 'Ficha', History: 'Progresso', More: 'Mais' }
  const { clock, refreshClock } = useLocalCalendarClock()
  const historySessions = useMemo(
    () => workoutSession.activeSession
      ? [
          workoutSession.activeSession,
          ...workoutSession.sessions.filter((item) => item.id !== workoutSession.activeSession?.id),
        ]
      : workoutSession.sessions,
    [workoutSession.activeSession, workoutSession.sessions],
  )
  const historyProgress = useMemo(
    () => calculateHistoryProgress(historySessions, clock.now),
    [clock.dateKey, historySessions],
  )
  const onStartToday = useCallback(async (
    planId: number,
    planDayId: number,
  ): Promise<boolean> => {
    const plan = trainingPlan.trainingPlans.find((item) =>
      item.id === planId && item.active && !item.archived && item.deletedAt === null)
    const day = plan?.days.find((item) => item.id === planDayId)
    if (workoutSession.activeSession || !day || day.restDay || !day.exercises.length) return false
    const success = await workoutSession.start(planId, planDayId)
    if (success) {
      void triggerHaptic('SESSION_START', preferences.hapticsEnabled)
      navigation.navigate('Session')
    }
    return success
  }, [navigation, preferences.hapticsEnabled, trainingPlan.trainingPlans, workoutSession])
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
          <TodayTab
            refreshAll={refreshAll}
            onDateChange={refreshClock}
            render={({ refresh, refreshing, warning }) => (
              <HomeScreen
                plans={trainingPlan.trainingPlans}
                sessions={workoutSession.sessions}
                loading={refreshing}
                activeSession={workoutSession.activeSession}
                trashCount={trash.count}
                warning={warning}
                now={clock.now}
                onRefresh={() => void refresh()}
                onCreatePlan={() => navigation.navigate('TrainingPlanEditor')}
                onOpenPlans={() => tabNavigation.navigate('Plan')}
                onOpenPlanDay={(planId, dayId) => navigation.navigate('TrainingPlanDay', {
                  planId,
                  dayId,
                })}
                onStartToday={(planId, dayId) => void onStartToday(planId, dayId)}
                onContinueSession={() => navigation.navigate('Session')}
                onOpenArchived={() => navigation.navigate('ArchivedTrainingPlans')}
                onOpenTrash={() => navigation.navigate('TrainingPlanTrash')}
                onOpenLibrary={() => navigation.navigate('Library')}
                onOpenIntegrations={() => navigation.navigate('Integrations')}
              />
            )}
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
              if (success) {
                void triggerHaptic('SESSION_START', preferences.hapticsEnabled)
                navigation.navigate('Session')
              }
              return success
            }}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="History">
        {() => (
          <RefreshableHistory
            sessions={historySessions}
            progress={historyProgress}
            onRefresh={refreshAll}
            onDateChange={refreshClock}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="More">
        {() => (
          <MoreScreen
            busy={backup.busy}
            onAppearance={() => navigation.navigate('AppearanceSettings')}
            onLibrary={() => navigation.navigate('Library')}
            onTrash={() => navigation.navigate('TrainingPlanTrash')}
            trashCount={trash.count}
            onIntegrations={() => navigation.navigate('Integrations')}
            onExport={() => void backup.exportBackup()}
            onImport={() => void backup.importBackup()}
            onErase={() => void backup.eraseAll()}
            automaticBackups={backup.automaticBackups}
            onRestoreAutomatic={(uri) => void backup.restoreAutomatic(uri)}
            onShareAutomatic={(uri) => void backup.shareAutomatic(uri)}
            onDeleteAutomatic={(uri) => void backup.deleteAutomatic(uri)}
            onDeleteAllAutomatic={() => void backup.deleteAllAutomatic()}
            notices={notices}
            onOnboarding={onOnboarding}
          />
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  )
}

function TodayTab({
  refreshAll,
  onDateChange,
  render,
}: {
  refreshAll: () => Promise<RefreshAllResult>
  onDateChange: () => void
  render: (state: ReturnType<typeof useRefreshUi>) => React.ReactNode
}) {
  const refreshState = useRefreshUi(refreshAll, onDateChange)
  useRefreshOnFocus(useCallback(() => {
    onDateChange()
    void refreshState.refresh()
  }, [onDateChange, refreshState.refresh]))
  return render(refreshState)
}

function RefreshableHistory({
  sessions,
  progress,
  onRefresh,
  onDateChange,
}: {
  sessions: Parameters<typeof HistoryScreen>[0]['sessions']
  progress: Parameters<typeof HistoryScreen>[0]['progress']
  onRefresh: () => Promise<RefreshAllResult>
  onDateChange: () => void
}) {
  const refreshState = useRefreshUi(onRefresh, onDateChange)
  useRefreshOnFocus(onDateChange)
  return (
    <HistoryScreen
      sessions={sessions}
      progress={progress}
      loading={refreshState.refreshing}
      warning={refreshState.warning}
      onRefresh={() => void refreshState.refresh()}
    />
  )
}
