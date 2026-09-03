import { useEffect, useState } from 'react'
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type {
  ExerciseCategory,
  ExerciseLibraryRepository,
  ExerciseProviderId,
  ExternalExerciseCandidate,
  ExternalExerciseImportRepository,
} from '@training/training-domain'
import { exerciseIdentity } from '@training/training-domain'
import { FormField } from '../../components/FormField'
import { PrimaryButton } from '../../components/PrimaryButton'
import { Screen } from '../../components/Screen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SelectableChip } from '../../components/SelectableChip'
import { ThemedTextInput } from '../../components/ThemedTextInput'
import { Toast } from '../../components/Toast'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'
import { useWgerIntegrationController } from './useWgerIntegrationController'

export function WgerIntegrationScreen({
  imports,
  exercises,
  onImported,
  providerId,
}: {
  imports: ExternalExerciseImportRepository
  exercises: ExerciseLibraryRepository
  onImported: () => Promise<unknown>
  providerId: ExerciseProviderId
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const controller = useWgerIntegrationController(imports, exercises, onImported, providerId)
  const providerName = providerId === 'EXERCISEDB' ? 'ExerciseDB' : 'Wger'
  const isWger = providerId === 'WGER'
  const isExerciseDb = providerId === 'EXERCISEDB'
  const busy = controller.phase === 'loading' || controller.phase === 'importing'
  const [consented, setConsented] = useState(false)
  const [languageModal, setLanguageModal] = useState(false)
  const selectedLanguage = controller.query.language === 'auto'
    ? 'Automático'
    : controller.languages.find((language) => language.code === controller.query.language)?.name ?? controller.query.language
  return (
    <Screen includeBottomInset={false} keyboard style={styles.screen}>
      <View style={styles.header}>
        <ScreenHeader
          eyebrow="Integração opcional"
          title={`Catálogo ${providerName}`}
          description={`Consulte somente o catálogo ${providerName}. A cópia escolhida fica no aparelho.`}
        />

        {!consented && <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Você controla cada consulta</Text>
          <Text style={styles.noticeText}>
            O app faz apenas requisições GET ao ${providerName}. Nenhuma ficha, sessão, série, nota ou identificador local é enviado.
          </Text>
          <Text style={styles.noticeText}>
            Exercícios escolhidos ficam no SQLite. Imagens e vídeos remotos podem precisar de internet e cada item mantém autoria e licença.
          </Text>
          <PrimaryButton label="Entendi e quero continuar" onPress={() => setConsented(true)} />
        </View>}

        {consented && (
          <View style={styles.searchArea}>
            <Text style={styles.section}>BUSCA</Text>
            {isExerciseDb ? <Text style={styles.noticeText}>A versão gratuita do ExerciseDB não oferece busca por nome. Navegue pelo catálogo ou use Wger para pesquisar exercícios.</Text> : <ThemedTextInput
              accessibilityLabel="Buscar exercícios"
              placeholder="Nome do exercício"
              returnKeyType="search"
              value={controller.query.text}
              onChangeText={(text) => controller.setQuery((current) => ({ ...current, page: 1, text }))}
              onSubmitEditing={() => void controller.search(1)}
              style={styles.search}
            />}
            {isWger && <>
            <Text style={styles.label}>Idioma do Wger</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Selecionar idioma do Wger"
              onPress={() => { setLanguageModal(true); void controller.loadLanguages() }}
              style={styles.languageButton}
            >
              <Text style={styles.languageName}>{selectedLanguage}</Text>
              <Text style={styles.languageCode}>{controller.query.language === 'auto' ? 'auto' : controller.query.language}</Text>
            </Pressable>
            </>}
            <Text style={styles.label}>Resultados por página</Text>
            <View style={styles.chips}>
              {[10, 20, 50].map((pageSize) => (
                <SelectableChip
                  key={pageSize}
                  label={String(pageSize)}
                  selected={controller.query.pageSize === pageSize}
                  onPress={() => controller.setQuery((current) => ({ ...current, page: 1, pageSize }))}
                />
              ))}
            </View>
            <View style={styles.chips}>
              <SelectableChip
                label="Somente com imagem"
                selected={controller.query.onlyWithImage}
                onPress={() => controller.setQuery((current) => ({ ...current, page: 1, onlyWithImage: !current.onlyWithImage }))}
              />
              <SelectableChip
                label="Somente com vídeo"
                selected={controller.query.onlyWithVideo}
                onPress={() => controller.setQuery((current) => ({ ...current, page: 1, onlyWithVideo: !current.onlyWithVideo }))}
              />
            </View>
            <PrimaryButton
              label={controller.phase === 'loading' ? 'Consultando catálogo…' : isExerciseDb ? 'Carregar catálogo ExerciseDB' : 'Buscar exercícios'}
              loading={controller.phase === 'loading'}
              onPress={() => void controller.search(1)}
            />

            {!!controller.importedCount && (
              <PrimaryButton
                secondary
                disabled={busy}
                label={`Atualizar ${controller.importedCount} importado(s)`}
                onPress={() => Alert.alert(
                  'Atualizar exercícios importados?',
                  `${controller.importedCount} item(ns) serão consultados. IDs locais, fichas e histórico serão preservados.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Atualizar', onPress: () => void controller.refreshImported() },
                  ],
                )}
              />
            )}
          </View>
        )}
      </View>
      <FlatList
        data={controller.items}
        style={styles.list}
        extraData={[controller.selected, controller.existing, controller.phase]}
        keyExtractor={(item) => exerciseIdentity(item.provider, item.externalId)}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={controller.items.length ? (
          <View style={styles.resultsHeader}>
            <View>
              <Text style={styles.section}>RESULTADOS</Text>
              <Text style={styles.resultCount}>Página {controller.query.page} · {controller.total} no catálogo</Text>
            </View>
            <SmallButton label="Selecionar página" onPress={controller.selectPage} />
          </View>
        ) : null}
        ListEmptyComponent={<Text style={styles.empty}>{consented ? 'Busque exercícios para começar.' : 'Confirme a consulta para acessar o catálogo.'}</Text>}
        renderItem={({ item }) => (
          <ResultCard
            item={item}
            selected={controller.selected.has(exerciseIdentity(item.provider, item.externalId))}
            existing={controller.existing.has(exerciseIdentity(item.provider, item.externalId))}
            onToggle={() => controller.toggle(item)}
            onPreview={() => controller.setPreview(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      />
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottomBar}>
          <View style={styles.bottomTop}>
            <Text style={styles.selectedCount}>{controller.selected.size} selecionado(s)</Text>
            <SmallButton label="Limpar seleção" disabled={!controller.selected.size || busy} onPress={controller.clearSelection} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Importar selecionados"
            accessibilityState={{ disabled: !controller.selected.size || busy, busy: controller.phase === 'importing' }}
            disabled={!controller.selected.size || busy}
            onPress={() => Alert.alert('Importar exercícios?', `${controller.selected.size} exercício(s) serão salvos no aparelho.`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Importar', onPress: () => void controller.importSelected() },
            ])}
            style={[styles.importButton, (!controller.selected.size || busy) && styles.disabled]}
          >
            <Text style={styles.importButtonText}>{controller.phase === 'importing' ? 'Importando…' : 'Importar selecionados'}</Text>
          </Pressable>
          <View style={styles.pagination}>
            <SmallButton label="Anterior" disabled={!controller.hasPrevious || busy} onPress={() => void controller.search(controller.query.page - 1)} />
            <Text accessibilityLabel={`Página ${controller.query.page}`} style={styles.pageNumber}>Página {controller.query.page}</Text>
            <SmallButton label="Próxima" disabled={!controller.hasNext || busy} onPress={() => void controller.search(controller.query.page + 1)} />
          </View>
        </View>
      </SafeAreaView>
      <CandidateModal
        candidate={controller.preview}
        onClose={() => controller.setPreview(null)}
        onSave={controller.savePreview}
      />
      {isWger && <LanguageModal
        languages={controller.languages}
        loading={controller.languagesLoading}
        failed={controller.languagesFailed}
        selected={controller.query.language}
        onSelect={(language) => {
          controller.setQuery((current) => ({ ...current, page: 1, language }))
          setLanguageModal(false)
        }}
        onRetry={() => void controller.loadLanguages()}
        visible={languageModal}
        onClose={() => setLanguageModal(false)}
      />}
      <Toast message={controller.message.text} kind={controller.message.kind} />
    </Screen>
  )
}

function ResultCard({
  item,
  selected,
  existing,
  onToggle,
  onPreview,
}: {
  item: ExternalExerciseCandidate
  selected: boolean
  existing: boolean
  onToggle: () => void
  onPreview: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const hasImage = item.media.some((media) => media.type === 'IMAGE')
  const hasVideo = item.media.some((media) => media.type === 'VIDEO')
  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`Selecionar ${item.name}`}
        onPress={onToggle}
        style={[styles.checkbox, selected && styles.checkboxSelected]}
      >
        <Text style={styles.checkboxText}>{selected ? '✓' : ''}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onPreview} style={styles.cardCopy}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardMeta}>{item.primaryMuscleGroup} · {item.equipment}</Text>
        <Text style={styles.cardMeta}>{item.category} · {item.language}</Text>
        <View style={styles.badges}>
          <Text style={styles.badge}>{providerLabel(item.provider)}</Text>
          {hasImage && <Text style={styles.badge}>Imagem</Text>}
          {hasVideo && <Text style={styles.badge}>Vídeo</Text>}
          {existing && <Text style={styles.badgeImported}>Já importado</Text>}
        </View>
      </Pressable>
      <Text style={styles.arrow}>›</Text>
    </View>
  )
}

function LanguageModal({
  languages,
  loading,
  failed,
  selected,
  visible,
  onSelect,
  onRetry,
  onClose,
}: {
  languages: readonly { code: string; name: string }[]
  loading: boolean
  failed: boolean
  selected: string
  visible: boolean
  onSelect: (language: string) => void
  onRetry: () => void
  onClose: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [filter, setFilter] = useState('')
  const options = [{ code: 'auto', name: 'Automático' }, ...languages]
    .filter((language, index, all) => all.findIndex((item) => item.code === language.code) === index)
    .filter((language) => `${language.name} ${language.code}`.toLowerCase().includes(filter.trim().toLowerCase()))
  useEffect(() => { if (!visible) setFilter('') }, [visible])
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={[styles.languageModal, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Idioma do Wger</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar idiomas" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ThemedTextInput
          accessibilityLabel="Pesquisar idioma"
          placeholder="Pesquisar idioma"
          value={filter}
          onChangeText={setFilter}
          style={styles.languageSearch}
        />
        {loading && <Text style={styles.empty}>Carregando idiomas…</Text>}
        {failed && <View style={styles.languageFailure}>
          <Text style={styles.empty}>Não foi possível carregar os idiomas. A busca continua disponível.</Text>
          <SmallButton label="Tentar novamente" onPress={onRetry} />
        </View>}
        <FlatList
          data={options}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: selected === item.code }}
              onPress={() => onSelect(item.code)}
              style={[styles.languageOption, selected === item.code && styles.languageOptionSelected]}
            >
              <Text style={styles.languageName}>{item.name}</Text>
              <Text style={styles.languageCode}>{item.code}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum idioma encontrado.</Text>}
        />
      </SafeAreaView>
    </Modal>
  )
}

function providerLabel(provider: ExternalExerciseCandidate['provider']) {
  return provider === 'EXERCISEDB' ? 'ExerciseDB' : 'Wger'
}

function CandidateModal({
  candidate,
  onClose,
  onSave,
}: {
  candidate: ExternalExerciseCandidate | null
  onClose: () => void
  onSave: (candidate: ExternalExerciseCandidate) => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [draft, setDraft] = useState(candidate)
  useEffect(() => setDraft(candidate), [candidate])
  if (!draft) return null
  const mainMedia = draft.media.find((media) => media.main) ?? draft.media[0]
  const categories: ExerciseCategory[] = ['STRENGTH', 'CARDIO', 'MOBILITY', 'STRETCHING', 'RECOVERY', 'TECHNIQUE']
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pré-visualização</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar pré-visualização" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
            {mainMedia?.type === 'IMAGE' && (
              <Image source={{ uri: mainMedia.thumbnailRemoteUrl ?? mainMedia.remoteUrl }} style={styles.previewImage} />
            )}
            <Text style={styles.previewName}>{draft.name}</Text>
            <Text style={styles.cardMeta}>{draft.description || 'Descrição não fornecida pela fonte.'}</Text>
            <Text style={styles.previewHeading}>Instruções</Text>
            <Text style={styles.previewBody}>{draft.instructions || 'Informação não fornecida pela fonte.'}</Text>
            <Text style={styles.label}>Categoria local</Text>
            <View style={styles.chips}>
              {categories.map((category) => (
                <SelectableChip
                  key={category}
                  label={category}
                  selected={draft.category === category}
                  onPress={() => setDraft((current) => current && ({ ...current, category }))}
                />
              ))}
            </View>
            <FormField label="Dificuldade" value={draft.difficulty} onChangeText={(difficulty) => setDraft((current) => current && ({ ...current, difficulty }))} />
            <FormField label="Músculo principal" value={draft.primaryMuscleGroup} onChangeText={(primaryMuscleGroup) => setDraft((current) => current && ({ ...current, primaryMuscleGroup }))} />
            <FormField label="Equipamento" value={draft.equipment} onChangeText={(equipment) => setDraft((current) => current && ({ ...current, equipment }))} />
            <Text style={styles.previewHeading}>Atribuição</Text>
            <Text style={styles.previewBody}>Autor: {draft.author || 'Informação não fornecida pela fonte'}</Text>
            <Text style={styles.previewBody}>Licença: {draft.licenseName || 'Informação não fornecida pela fonte'}</Text>
            {!!draft.warnings.length && <Text style={styles.warning}>{draft.warnings.join('\n')}</Text>}
            <LinkButton label="Abrir fonte original" url={draft.sourceUrl} />
            <LinkButton label="Consultar licença" url={draft.licenseUrl} />
            <PrimaryButton label="Aplicar ajustes" onPress={() => onSave(draft)} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function LinkButton({ label, url }: { label: string; url: string | null }) {
  const { colors } = useTheme()
  if (!url) return null
  return (
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={stylesStatic.linkButton}>
      <Text style={{ color: colors.primary, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  )
}

function SmallButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[stylesStatic.smallButton, { borderColor: colors.border, backgroundColor: colors.surface }, disabled && stylesStatic.disabled]}
    >
      <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  )
}

const stylesStatic = StyleSheet.create({
  smallButton: { borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 13 },
  disabled: { opacity: 0.45 },
  linkButton: { justifyContent: 'center', minHeight: 48 },
})

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: 10, paddingHorizontal: shared.screen.horizontalPadding, paddingTop: 8 },
  searchArea: { gap: 8 },
  listContent: { flexGrow: 1, paddingBottom: 12, paddingHorizontal: shared.screen.horizontalPadding, paddingTop: 8 },
  list: { flex: 1, minHeight: 120 },
  itemSeparator: { height: 8 },
  empty: { ...typography.bodySmall, color: colors.textSecondary, padding: 20, textAlign: 'center' },
  notice: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, gap: 10, padding: 18 },
  noticeTitle: { ...typography.titleSmall, color: colors.textPrimary },
  noticeText: { ...typography.bodySmall, color: colors.textSecondary },
  section: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.4, marginTop: 8 },
  search: { marginBottom: 2 },
  label: { ...typography.label, color: colors.textSecondary, fontWeight: '800', marginTop: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultsHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  resultCount: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  selectedCount: { ...typography.label, color: colors.primary, fontWeight: '800' },
  languageButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 13 },
  languageName: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  languageCode: { color: colors.textSecondary, fontSize: 12 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 112, padding: 13 },
  cardSelected: { borderColor: colors.primary, borderWidth: 2 },
  checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 7, borderWidth: 2, height: 28, justifyContent: 'center', width: 28 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxText: { color: colors.onPrimary, fontSize: 16, fontWeight: '900' },
  cardCopy: { flex: 1, minWidth: 0 },
  cardName: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  cardMeta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  badge: { backgroundColor: colors.surfaceSecondary, borderRadius: 999, color: colors.textPrimary, fontSize: 12, paddingHorizontal: 8, paddingVertical: 4 },
  badgeImported: { backgroundColor: colors.successSurface, borderRadius: 999, color: colors.success, fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4 },
  arrow: { color: colors.textSecondary, fontSize: 24 },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  bottomSafe: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 1 },
  bottomBar: { gap: 8, paddingHorizontal: shared.screen.horizontalPadding, paddingTop: 8 },
  bottomTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  importButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', minHeight: 48, paddingHorizontal: 16 },
  importButtonText: { color: colors.onPrimary, fontWeight: '800' },
  pageNumber: { alignSelf: 'center', color: colors.textPrimary, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  backdrop: { backgroundColor: colors.scrim, flex: 1 },
  modalSafe: { backgroundColor: colors.background, flex: 1 },
  modalHeader: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 64, paddingHorizontal: shared.screen.horizontalPadding },
  modalTitle: { ...typography.titleSmall, color: colors.textPrimary },
  closeButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  closeText: { color: colors.textPrimary, fontSize: 28 },
  modalContent: { gap: 12, padding: shared.screen.horizontalPadding, paddingBottom: 40 },
  languageModal: { flex: 1 },
  languageSearch: { marginHorizontal: shared.screen.horizontalPadding, marginVertical: 10 },
  languageFailure: { alignItems: 'center', gap: 8, paddingHorizontal: shared.screen.horizontalPadding },
  languageOption: { borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: shared.screen.horizontalPadding, minHeight: 56, paddingVertical: 16 },
  languageOptionSelected: { backgroundColor: colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 10 },
  previewImage: { aspectRatio: 16 / 9, backgroundColor: colors.surfaceSecondary, borderRadius: 18, width: '100%' },
  previewName: { color: colors.textPrimary, fontSize: 26, fontWeight: '800' },
  previewHeading: { ...typography.label, color: colors.textPrimary, fontWeight: '800', marginTop: 5 },
  previewBody: { ...typography.body, color: colors.textSecondary },
  warning: { ...typography.bodySmall, color: colors.warning },
})
