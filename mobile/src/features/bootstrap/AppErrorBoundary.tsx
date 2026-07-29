import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error(error, info.componentStack)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><Text style={styles.title}>O aplicativo encontrou um erro.</Text><Pressable accessibilityRole="button" onPress={() => this.setState({ failed: false })} style={styles.button}><Text style={styles.buttonText}>Tentar novamente</Text></Pressable></SafeAreaView>
  }
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: '#f5f5f5', flex: 1, justifyContent: 'center', padding: 28 },
  title: { color: '#111', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  button: { alignItems: 'center', backgroundColor: '#111', borderRadius: 14, justifyContent: 'center', marginTop: 20, minHeight: 48, paddingHorizontal: 18 },
  buttonText: { color: '#fff', fontWeight: '800' },
})
