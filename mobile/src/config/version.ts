import Constants from 'expo-constants'

export function getAppVersion() {
  return Constants.expoConfig?.version ?? '0.0.0-dev'
}
