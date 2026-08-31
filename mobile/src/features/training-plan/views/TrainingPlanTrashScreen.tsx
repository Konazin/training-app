import { useCallback, useState } from 'react'
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { trainingPlanTrashStatusLabel, type TrainingPlan } from '@training/training-domain'
import { useFocusEffect } from '@react-navigation/native'
import { Screen } from '../../../components/Screen'
import { ScreenHeader } from '../../../components/ScreenHeader'
import { ThemedTextInput } from '../../../components/ThemedTextInput'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import {
  isEmptyTrashConfirmation,
  type TrashUiResult,
} from '../controller/useTrainingPlanTrashController'
import {
  EMPTY_TRASH_DESCRIPTION,
  EMPTY_TRASH_TITLE,
  TRASH_RETENTION_DESCRIPTION,
  emptyTrashCountLabel,
  permanentDeleteCopy,
  trainingPlanTrashAccessibilityLabel,
  trainingPlanTrashUrgency,
} from '../model/trainingPlan'

export function TrainingPlanTrashScreen({
  plans,
  loading,
  busy,
  onRefresh,
  onRestore,
  onDelete,
  onEmpty,
}: {
  plans: TrainingPlan[]
  loading: boolean
  busy: boolean
  onRefresh: () => Promise<boolean>
  onRestore: (id: number) => Promise<TrashUiResult>
  onDelete: (id: number) => Promise<TrashUiResult>
  onEmpty: () => Promise<TrashUiResult>
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [confirmingEmpty, setConfirmingEmpty] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const canEmpty = isEmptyTrashConfirmation(confirmation)
  useFocusEffect(useCallback(() => {
    void onRefresh()
  }, [onRefresh]))

  return (
    <Screen>
      <FlatList
        data={plans}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void onRefresh()} />}
        contentContainerStyle={[styles.content, !plans.length && styles.emptyContent]}
        ListHeaderComponent={(
          <>
            <ScreenHeader
              eyebrow="Gestão de fichas"
              title="Lixeira de fichas"
              description={TRASH_RETENTION_DESCRIPTION}
            />
            {!!plans.length && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                style={styles.emptyButton}
                onPress={() => {
                  setConfirmation('')
                  setConfirmingEmpty(true)
                }}
              >
                <Text style={styles.emptyButtonText}>Esvaziar lixeira</Text>
              </Pressable>
            )}
          </>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{EMPTY_TRASH_TITLE}</Text>
            <Text style={styles.meta}>{EMPTY_TRASH_DESCRIPTION}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TrashCard
            plan={item}
            busy={busy}
            colors={colors}
            onRestore={() => void onRestore(item.id)}
            onDelete={() => {
              const copy = permanentDeleteCopy(item.name)
              Alert.alert(copy.title, copy.description, [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: copy.action,
                  style: 'destructive',
                  onPress: () => void onDelete(item.id),
                },
              ])
            }}
          />
        )}
      />
      <Modal
        visible={confirmingEmpty}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setConfirmingEmpty(false)
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            accessibilityLabel={busy ? 'Esvaziando lixeira…' : 'Confirmação para esvaziar a lixeira'}
            accessibilityLiveRegion="polite"
            accessibilityState={{ busy }}
            accessibilityViewIsModal
            style={styles.modal}
          >
            <Text style={styles.modalTitle}>Esvaziar lixeira?</Text>
            <Text style={styles.meta}>
              {emptyTrashCountLabel(plans.length)}
              {'\n'}Um backup será criado primeiro. O histórico de sessões será preservado,
              mas a programação não poderá ser recuperada.
              {'\n'}Digite ESVAZIAR para continuar.
            </Text>
            <ThemedTextInput
              accessibilityLabel="Confirmação para esvaziar a lixeira"
              autoCapitalize="characters"
              disabled={busy}
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="ESVAZIAR"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                style={[styles.secondaryAction, busy && styles.disabled]}
                onPress={() => setConfirmingEmpty(false)}
              >
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || !canEmpty }}
                disabled={busy || !canEmpty}
                style={[styles.dangerAction, (busy || !canEmpty) && styles.disabled]}
                onPress={() => void (async () => {
                  const result = await onEmpty()
                  if (result.status === 'success') setConfirmingEmpty(false)
                })()}
              >
                {busy
                  ? (
                    <View style={styles.busyLabel}>
                      <ActivityIndicator color={colors.onPrimary} />
                      <Text style={styles.dangerActionText}>Esvaziando lixeira…</Text>
                    </View>
                  )
                  : <Text style={styles.dangerActionText}>Esvaziar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

function TrashCard({
  plan,
  busy,
  colors,
  onRestore,
  onDelete,
}: {
  plan: TrainingPlan
  busy: boolean
  colors: ThemeColors
  onRestore: () => void
  onDelete: () => void
}) {
  const styles = createStyles(colors)
  const now = new Date()
  const urgency = trainingPlanTrashUrgency(plan.purgeAt!, now)
  return (
    <View style={styles.card}>
      <Text
        accessible
        accessibilityLabel={trainingPlanTrashAccessibilityLabel(plan, now)}
        style={styles.name}
      >
        {plan.name}
      </Text>
      <Text style={styles.meta}>
        {plan.category} · {plan.difficulty}
      </Text>
      <Text style={styles.meta}>
        Removida em {new Date(plan.deletedAt!).toLocaleDateString('pt-BR')}
      </Text>
      <Text style={[
        styles.status,
        urgency === 'warning' && styles.warning,
        urgency === 'expired' && styles.expired,
      ]}>
        {trainingPlanTrashStatusLabel(plan.purgeAt!, now)}
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          style={styles.restore}
          onPress={onRestore}
        >
          <Text style={styles.restoreText}>Restaurar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          style={styles.delete}
          onPress={onDelete}
        >
          <Text style={styles.deleteText}>Excluir permanentemente</Text>
        </Pressable>
      </View>
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { paddingBottom: 45, paddingHorizontal: shared.pagePadding },
  emptyContent: { flexGrow: 1 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, marginBottom: 10, padding: 16 },
  name: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', lineHeight: 23 },
  meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  status: { color: colors.textSecondary, fontSize: 14, fontWeight: '800', marginTop: 10 },
  warning: { color: colors.warning },
  expired: { color: colors.danger },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  restore: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 48 },
  restoreText: { color: colors.onPrimary, fontWeight: '800' },
  delete: { alignItems: 'center', borderColor: colors.danger, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48 },
  deleteText: { color: colors.danger, fontWeight: '800' },
  emptyButton: { alignItems: 'center', borderColor: colors.danger, borderRadius: 14, borderWidth: 1, justifyContent: 'center', marginBottom: 14, minHeight: 48 },
  emptyButtonText: { color: colors.danger, fontWeight: '800' },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 280 },
  emptyTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  modalBackdrop: { alignItems: 'center', backgroundColor: colors.overlay, flex: 1, justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, maxWidth: 420, padding: 20, width: '100%' },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  input: { marginTop: 16 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  secondaryAction: { alignItems: 'center', borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48 },
  secondaryText: { color: colors.textPrimary, fontWeight: '800' },
  dangerAction: { alignItems: 'center', backgroundColor: colors.danger, borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 48 },
  dangerActionText: { color: colors.onPrimary, fontWeight: '800' },
  busyLabel: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  disabled: { opacity: 0.5 },
})
