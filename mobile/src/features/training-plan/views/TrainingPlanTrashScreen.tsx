import { useCallback, useState } from 'react'
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  trainingPlanTrashDaysRemaining,
  trainingPlanTrashStatusLabel,
  type TrainingPlan,
} from '@training/training-domain'
import { useFocusEffect } from '@react-navigation/native'
import { Screen } from '../../../components/Screen'
import { ScreenHeader } from '../../../components/ScreenHeader'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { isEmptyTrashConfirmation } from '../controller/useTrainingPlanTrashController'

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
  onRestore: (id: number) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
  onEmpty: () => Promise<boolean>
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
              description="As fichas são apagadas automaticamente após 7 dias."
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
            <Text style={styles.emptyTitle}>A lixeira está vazia</Text>
            <Text style={styles.meta}>Fichas removidas aparecerão aqui por 7 dias.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TrashCard
            plan={item}
            busy={busy}
            colors={colors}
            onRestore={() => void onRestore(item.id)}
            onDelete={() => Alert.alert(
              'Excluir permanentemente?',
              'Esta ficha não poderá ser restaurada. O histórico de treinos será preservado.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Excluir',
                  style: 'destructive',
                  onPress: () => void onDelete(item.id),
                },
              ],
            )}
          />
        )}
      />
      <Modal
        visible={confirmingEmpty}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingEmpty(false)}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.modal}>
            <Text style={styles.modalTitle}>Esvaziar lixeira?</Text>
            <Text style={styles.meta}>
              Um backup será criado antes. Digite ESVAZIAR para excluir todas as fichas definitivamente.
            </Text>
            <TextInput
              accessibilityLabel="Confirmação para esvaziar a lixeira"
              autoCapitalize="characters"
              editable={!busy}
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="ESVAZIAR"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryAction} onPress={() => setConfirmingEmpty(false)}>
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || !canEmpty }}
                disabled={busy || !canEmpty}
                style={[styles.dangerAction, (busy || !canEmpty) && styles.disabled]}
                onPress={() => void (async () => {
                  if (await onEmpty()) setConfirmingEmpty(false)
                })()}
              >
                <Text style={styles.dangerActionText}>{busy ? 'Esvaziando…' : 'Esvaziar'}</Text>
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
  const remaining = trainingPlanTrashDaysRemaining(plan.purgeAt!, now)
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{plan.name}</Text>
      <Text style={styles.meta}>
        {plan.category} · {plan.days.reduce((total, day) => total + day.exercises.length, 0)} exercícios
      </Text>
      <Text style={styles.meta}>
        Removida em {new Date(plan.deletedAt!).toLocaleDateString('pt-BR')}
      </Text>
      <Text style={[styles.status, remaining <= 1 && styles.expiring]}>
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
          <Text style={styles.deleteText}>Excluir</Text>
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
  status: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', marginTop: 10 },
  expiring: { color: colors.danger },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  restore: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 48 },
  restoreText: { color: colors.onPrimary, fontWeight: '800' },
  delete: { alignItems: 'center', borderColor: colors.danger, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48 },
  deleteText: { color: colors.danger, fontWeight: '800' },
  emptyButton: { alignItems: 'center', borderColor: colors.danger, borderRadius: 14, borderWidth: 1, justifyContent: 'center', marginBottom: 14, minHeight: 48 },
  emptyButtonText: { color: colors.danger, fontWeight: '800' },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 280 },
  emptyTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.58)', flex: 1, justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, maxWidth: 420, padding: 20, width: '100%' },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.textPrimary, fontSize: 16, marginTop: 16, minHeight: 48, paddingHorizontal: 14 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  secondaryAction: { alignItems: 'center', borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48 },
  secondaryText: { color: colors.textPrimary, fontWeight: '800' },
  dangerAction: { alignItems: 'center', backgroundColor: colors.danger, borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 48 },
  dangerActionText: { color: colors.onPrimary, fontWeight: '800' },
  disabled: { opacity: 0.5 },
})
