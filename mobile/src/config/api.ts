import { Platform } from 'react-native'

const emulatorHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost'

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${emulatorHost}:8080/api`
