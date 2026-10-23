import { useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import type { SecretsRepository } from '@training/training-domain'
import { FormField } from '../../components/FormField'
import { PrimaryButton } from '../../components/PrimaryButton'
import { ScreenScrollView } from '../../components/Screen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { InlineNotice } from '../../components/ui'
import { GEMINI_API_KEY_SECRET } from '../../integrations/secureSecrets'
import { type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

type Status = 'loading' | 'configured' | 'missing' | 'unavailable'

export function NutritionAiSettingsScreen({
  secrets,
  onChanged,
}: {
  secrets: SecretsRepository
  onChanged: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [status, setStatus] = useState<Status>('loading')
  const [replacing, setReplacing] = useState(false)
  const [entry, setEntry] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    secrets.get(GEMINI_API_KEY_SECRET)
      .then((key) => { if (mounted.current) setStatus(key ? 'configured' : 'missing') })
      .catch(() => { if (mounted.current) setStatus('unavailable') })
    return () => { mounted.current = false }
  }, [secrets])

  const save = async () => {
    setBusy(true)
    try {
      await secrets.set(GEMINI_API_KEY_SECRET, entry)
      if (!mounted.current) return
      setEntry('')
      setReplacing(false)
      setStatus('configured')
      setNotice({ tone: 'success', message: 'Chave salva no armazenamento seguro deste aparelho.' })
      onChanged()
    } catch (error) {
      if (mounted.current) {
        setNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Não foi possível salvar a chave.' })
      }
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  const remove = () => Alert.alert(
    'Remover chave Gemini?',
    'A chave será apagada do armazenamento seguro deste aparelho. Nenhuma outra informação será alterada.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover chave',
        style: 'destructive',
        onPress: () => {
          void secrets.remove(GEMINI_API_KEY_SECRET).then(() => {
            if (!mounted.current) return
            setStatus('missing')
            setReplacing(false)
            setNotice({ tone: 'success', message: 'Chave removida.' })
            onChanged()
          }).catch(() => {
            if (mounted.current) setNotice({ tone: 'danger', message: 'Não foi possível remover a chave do armazenamento seguro.' })
          })
        },
      },
    ],
  )

  const showForm = status === 'missing' || (status === 'configured' && replacing)
  return (
    <ScreenScrollView>
      <ScreenHeader
        title="Chave Gemini"
        description="Necessária só para estimar refeições por foto e sugerir cardápios."
      />
      {notice && <InlineNotice tone={notice.tone} message={notice.message} />}
      {status === 'unavailable' && (
        <InlineNotice tone="danger" message="O armazenamento seguro não está disponível neste aparelho." />
      )}
      <Text accessibilityRole="header" style={styles.status}>
        {status === 'configured' ? 'Chave configurada' : status === 'loading' ? 'Verificando…' : 'Nenhuma chave configurada'}
      </Text>
      <Text style={styles.body}>
        Crie uma chave pessoal no Google AI Studio e cole aqui. Ela fica no armazenamento seguro do Android e não entra no banco nem nos backups. Em cada solicitação ela é enviada ao Google Gemini; o provedor controla suas cotas e possíveis custos.
      </Text>
      {showForm && (
        <View style={styles.form}>
          <FormField
            label="Chave pessoal da Gemini API"
            value={entry}
            onChangeText={setEntry}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Cole a chave aqui"
          />
          <PrimaryButton
            label="Salvar chave neste aparelho"
            onPress={() => void save()}
            loading={busy}
            disabled={!entry.trim()}
          />
          {status === 'configured' && (
            <View style={styles.gap}><PrimaryButton label="Cancelar" secondary onPress={() => { setReplacing(false); setEntry('') }} /></View>
          )}
        </View>
      )}
      {status === 'configured' && !replacing && (
        <View style={styles.form}>
          <PrimaryButton label="Trocar chave" onPress={() => { setReplacing(true); setNotice(null) }} />
          <View style={styles.gap}><PrimaryButton label="Remover chave" secondary onPress={remove} /></View>
        </View>
      )}
      <Text style={styles.note}>Antes de cada envio, o app explica quais dados serão compartilhados. Revise também os termos atuais do provedor.</Text>
      <Text style={styles.note}>Use uma chave dedicada e não a compartilhe. Como a chamada ocorre no celular, uma chave pessoal pode ser exposta se o aparelho estiver comprometido; restrinja ou revogue a chave na conta do provedor quando necessário.</Text>
    </ScreenScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  status: { ...typography.titleSmall, color: colors.tx, marginTop: 8 },
  body: { ...typography.bodySmall, color: colors.t2, lineHeight: 21, marginVertical: 12 },
  form: { marginTop: 4 },
  gap: { marginTop: 10 },
  note: { ...typography.caption, color: colors.t2, lineHeight: 18, marginTop: 14 },
})
