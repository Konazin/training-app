import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fontFamilies } from '../../theme/typography'

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
  screen: { alignItems: 'center', backgroundColor: '#FAFAFA', flex: 1, justifyContent: 'center', padding: 28 },
  title: { color: '#111111', fontFamily: fontFamilies.text, fontSize: 20, fontWeight: '500', textAlign: 'center' },
  button: { alignItems: 'center', backgroundColor: '#111111', borderRadius: 12, justifyContent: 'center', marginTop: 20, minHeight: 56, paddingHorizontal: 18 },
  buttonText: { color: '#FFFFFF', fontFamily: fontFamilies.text, fontWeight: '500' },
})
