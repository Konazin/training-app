import { Platform } from 'react-native'
import { createApiClient } from '@training/mobile-api'

const emulatorHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost'

export const apiClient = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? `http://${emulatorHost}:8080/api` : ''),
  accessToken: process.env.EXPO_PUBLIC_API_TOKEN,
})
