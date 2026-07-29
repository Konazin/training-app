import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error(error, info.componentStack)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return <View style={styles.screen}><Text style={styles.title}>O aplicativo encontrou um erro.</Text><Pressable onPress={() => this.setState({ failed: false })} style={styles.button}><Text style={styles.buttonText}>Tentar novamente</Text></Pressable></View>
  }
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: '#f5f5f5', flex: 1, justifyContent: 'center', padding: 28 },
  title: { color: '#111', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  button: { backgroundColor: '#111', borderRadius: 14, marginTop: 20, padding: 15 },
  buttonText: { color: '#fff', fontWeight: '800' },
})
