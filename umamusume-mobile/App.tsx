import { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import {
  createHttpWorkoutSessionRepository,
  useWorkoutSessionController,
} from '@training/workout-session-core'
import type { TrainingPlan } from '@training/training-contracts'
import { apiClient } from './src/config/api'
import type { RootStackParamList } from './src/core/navigation/types'
import { useUmaCareerController } from './src/features/umamusume/controller/useUmaCareerController'
import { isUmaCareerSession } from './src/features/umamusume/model/umaCareer'
import { createHttpUmaCareerRepository } from './src/features/umamusume/service/httpUmaCareerRepository'
import { UmaCareerCreateScreen } from './src/features/umamusume/views/UmaCareerCreateScreen'
import { UmaCareerHistoryScreen } from './src/features/umamusume/views/UmaCareerHistoryScreen'
import { UmaCareerListScreen } from './src/features/umamusume/views/UmaCareerListScreen'
import { UmaCareerScreen } from './src/features/umamusume/views/UmaCareerScreen'
import { createHttpReadonlyTrainingPlanRepository } from './src/features/training-plan/service/createHttpReadonlyTrainingPlanRepository'
import { WorkoutSessionScreen } from './src/features/workout-session/views/WorkoutSessionScreen'
import { ThemeProvider, type ThemeColors, useTheme } from './src/theme'

const Stack = createNativeStackNavigator<RootStackParamList>()
const careerRepository = createHttpUmaCareerRepository(apiClient)
const sessionRepository = createHttpWorkoutSessionRepository(apiClient)
const trainingPlanRepository = createHttpReadonlyTrainingPlanRepository(apiClient)

export default function App() {
  return (
    <ThemeProvider>
      <UmaApp />
    </ThemeProvider>
  )
}

function UmaApp() {
  const { colors, isDark, toggleTheme } = useTheme()
  const styles = createStyles(colors)
  const career = useUmaCareerController(careerRepository)
  const session = useWorkoutSessionController(sessionRepository)
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [plansMessage, setPlansMessage] = useState('')
  const [currentRoute, setCurrentRoute] = useState<keyof RootStackParamList>('UmaCareer')
  const message = career.message || session.message || plansMessage

  const refreshPlans = useCallback(async () => {
    setPlansMessage('')
    try {
      setPlans(await trainingPlanRepository.listTrainingPlans())
    } catch (cause) {
      setPlansMessage(cause instanceof Error ? cause.message : 'Não foi possível carregar as fichas.')
    }
  }, [])

  useEffect(() => {
    void Promise.all([career.refresh(), session.refresh(), refreshPlans()])
  }, [career.refresh, refreshPlans, session.refresh])

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
            onStateChange={(state) => {
              const route = state?.routes[state.index ?? 0]
              if (route?.name) setCurrentRoute(route.name as keyof RootStackParamList)
            }}
          >
            <Stack.Navigator
              initialRouteName="UmaCareer"
              screenOptions={{
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: colors.background },
                headerShown: false,
              }}
            >
              <Stack.Screen name="UmaCareer">
                {({ navigation }) => (
                  <UmaCareerScreen
                    career={career.career}
                    loading={career.loading}
                    busyKeys={career.busyKeys}
                    canContinueTraining={isUmaCareerSession(
                      career.career,
                      session.activeSession?.id ?? null,
                    )}
                    onCreate={() => navigation.navigate('UmaCareerCreate')}
                    onHistory={(careerId) => navigation.navigate('UmaCareerHistory', { careerId })}
                    onAllCareers={() => navigation.navigate('UmaCareerList')}
                    onRefresh={async () => {
                      await Promise.all([career.refresh(), session.refresh()])
                    }}
                    onStartTraining={() => void (async () => {
                      const started = await career.startTraining()
                      if (!started) return
                      session.adoptSession(started)
                      navigation.navigate('Session')
                    })()}
                    onContinueTraining={() => navigation.navigate('Session')}
                    onAcceptRestActivity={career.acceptRestActivity}
                    onCompleteRestActivity={career.completeRestActivity}
                    onCancelRestActivity={career.cancelRestActivity}
                    onFullRest={career.fullRest}
                    onAbandon={career.abandonCareer}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="UmaCareerCreate">
                {() => (
                  <UmaCareerCreateScreen
                    plans={plans}
                    busy={career.busyKeys.has('career:create')}
                    onCreate={career.createCareer}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="UmaCareerList">
                {() => (
                  <UmaCareerListScreen
                    careers={career.careers}
                    selectedCareerId={career.selectedCareerId}
                    onSelect={career.selectCareer}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="UmaCareerHistory">
                {({ route }) => (
                  <UmaCareerHistoryScreen
                    careerId={route.params.careerId}
                    turns={career.turns}
                    turnsCareerId={career.turnsCareerId}
                    loading={career.turnsLoading}
                    error={career.turnsError}
                    onLoad={career.loadTurns}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Session">
                {() => (
                  <WorkoutSessionScreen
                    session={session.activeSession}
                    restTimer={session.restTimer}
                    errors={session.errors}
                    busyKeys={session.busyKeys}
                    onUpdateSet={session.updateSet}
                    onAddSet={session.addSet}
                    onRemoveSet={session.removeSet}
                    onSetExerciseStatus={session.setExerciseStatus}
                    onPause={session.pause}
                    onResume={session.resume}
                    onComplete={session.complete}
                    onAbandon={session.abandon}
                    onStartRest={session.startRest}
                    onAdjustRest={session.adjustRest}
                    onSkipRest={session.skipRest}
                    onCareerRefresh={career.refresh}
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
