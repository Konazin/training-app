import { useEffect, useMemo, useRef, useState } from 'react'
import { Image, Pressable, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { FoodResolver, LOCAL_FOOD_CATALOG, LocalFoodCatalogProvider, NutritionCalculator, buildMealParseContext, buildMealVisionContext, type FoodQueryDraft } from '@training/training-domain'
import type { LocalRepositories } from '@training/training-local-db'
import { AiGatewayClient, AI_PRIVACY_NOTICE } from '../ai/AiGatewayClient'
import { InlineNotice, SectionHeader } from '../../components/ui'
import { useTheme } from '../../theme'
import { createEmptyNutritionMealDraft, type NutritionMealDraft } from './models/nutritionDrafts'

const CONSENT_KEY = 'ai.free-tier-consent'
const ENABLED_KEY = 'ai.enabled'
const MAX_IMAGE_DIMENSION = 1600
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

type SelectedImage = { uri: string; base64: string; mimeType: 'image/jpeg'; width: number; height: number }
export type MealImageState = 'NO_IMAGE' | 'IMAGE_SELECTED' | 'ANALYZING' | 'ANALYSIS_SUCCESS' | 'ANALYSIS_ERROR'

export function AiMealAssistant({ date, repositories, onReview, action }: { date: string; repositories: LocalRepositories; onReview: (draft: NutritionMealDraft) => void; action: 'text' | 'image' }) {
  const { colors } = useTheme(); const client = useMemo(() => new AiGatewayClient(), []); const [enabled, setEnabled] = useState(false); const [available, setAvailable] = useState(false); const [text, setText] = useState(''); const [hint, setHint] = useState(''); const [image, setImage] = useState<SelectedImage | null>(null); const [imageState, setImageState] = useState<MealImageState>('NO_IMAGE'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const mounted = useRef(true)
  useEffect(() => { void Promise.all([repositories.settings.get<boolean>(ENABLED_KEY), client.getStatus()]).then(([stored, status]) => { if (mounted.current) { setEnabled(stored === true); setAvailable(status.available) } }).catch(() => { if (mounted.current) setAvailable(false) }); return () => { mounted.current = false } }, [client, repositories])
  const accept = async () => { await repositories.settings.set(CONSENT_KEY, true); await repositories.settings.set(ENABLED_KEY, true); setEnabled(true) }
  const chooseImage = async (camera = false) => { setError(''); if (camera) { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { setError('Permita acesso à câmera para tirar a foto.'); return } } try { const result = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ mediaTypes: ['images'], base64: true, quality: 0.75, exif: false }); if (result.canceled) return; const asset = result.assets[0]; if (!asset?.uri || !asset.width || !asset.height || !asset.mimeType || !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)) { setError('Selecione uma imagem JPEG, PNG ou WebP.'); return } const processed = await prepareMealImage(asset); if (processed.base64.length * 3 / 4 > MAX_IMAGE_BYTES) { setError('A imagem processada deve ter no máximo 5 MiB.'); return } setImage(processed); setImageState('IMAGE_SELECTED') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível preparar a imagem.') } }
  const run = async () => { if (busy || (action === 'text' ? !text.trim() : !image)) return; setError(''); setBusy(true); if (action === 'image') setImageState('ANALYZING'); try { const profile = await repositories.userProfile.get(); const result = action === 'text' ? await client.parseMeal({ text, context: buildMealParseContext(profile) }) : await client.analyzeMealImage({ image: { base64: image!.base64, mimeType: image!.mimeType, userHint: hint || undefined }, context: buildMealVisionContext(profile, hint) }); if (!mounted.current) return; if (action === 'image') setImageState('ANALYSIS_SUCCESS'); onReview(await toMealDraft(date, result.items, action === 'image')) } catch (cause) { if (mounted.current) { if (action === 'image') setImageState('ANALYSIS_ERROR'); setError(cause instanceof Error ? cause.message : 'Não foi possível interpretar a refeição.') } } finally { if (mounted.current) setBusy(false) } }
  if (!enabled) return <View style={{ gap: 12 }}><SectionHeader title="IA opcional" /><InlineNotice tone="warning" message={AI_PRIVACY_NOTICE} /><Button color={colors.primary} label="Continuar e habilitar IA" onPress={() => void accept()} /></View>
  if (!available) return <InlineNotice tone="warning" message="IA indisponível neste momento. O registro manual continua disponível." />
  return <View style={{ gap: 12 }}><SectionHeader title={action === 'text' ? 'Adicionar com IA' : 'Analisar foto com IA'} />{!!error && <InlineNotice tone="danger" message={error} />}{action === 'text' ? <Input color={colors.textPrimary} border={colors.border} placeholder={colors.textSecondary} label="Descreva a refeição" value={text} onChangeText={setText} placeholderText="Ex.: 200g arroz, 150g frango e dois ovos" /> : <><View style={{ gap: 8, flexDirection: 'row' }}>{image && <Button color={colors.primary} label="Trocar imagem" onPress={() => void chooseImage()} expand />}{!image && <Button color={colors.primary} label="Galeria" onPress={() => void chooseImage()} expand />}<Button color={colors.primary} label="Câmera" onPress={() => void chooseImage(true)} expand /></View>{image && <Image accessibilityLabel="Imagem selecionada para análise" source={{ uri: image.uri }} resizeMode="contain" style={{ aspectRatio: image.width / image.height, backgroundColor: colors.surfaceSecondary, borderRadius: 12, maxHeight: 320, width: '100%' }} />}<Input color={colors.textPrimary} border={colors.border} placeholder={colors.textSecondary} label="Informações adicionais (opcional)" value={hint} onChangeText={setHint} placeholderText="Ex.: o frango pesa 200g e usei uma colher de azeite" /></>}<Button color={colors.primary} disabled={busy || (action === 'text' ? !text.trim() : !image)} label={busy ? 'Analisando…' : imageState === 'ANALYSIS_ERROR' ? 'Tentar novamente' : 'Analisar com IA'} onPress={() => void run()} /></View>
}

export async function prepareMealImage(asset: Pick<ImagePicker.ImagePickerAsset, 'uri' | 'width' | 'height'>): Promise<SelectedImage> {
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(asset.width, asset.height))
  const width = Math.max(1, Math.round(asset.width * scale))
  const height = Math.max(1, Math.round(asset.height * scale))
  const processed = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width, height } }], { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG, base64: true })
  if (!processed.base64) throw new Error('Não foi possível preparar a imagem.')
  return { uri: processed.uri, base64: processed.base64, mimeType: 'image/jpeg', width: processed.width, height: processed.height }
}

function Input({ color, border, placeholder, label, value, onChangeText, placeholderText }: { color: string; border: string; placeholder: string; label: string; value: string; onChangeText: (value: string) => void; placeholderText: string }) { return <TextInput accessibilityLabel={label} multiline onChangeText={onChangeText} placeholder={placeholderText} placeholderTextColor={placeholder} style={{ borderColor: border, borderRadius: 10, borderWidth: 1, color, minHeight: 72, padding: 12 }} value={value} /> }
function Button({ color, label, onPress, disabled, expand }: { color: string; label: string; onPress: () => void; disabled?: boolean; expand?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ alignSelf: 'stretch', backgroundColor: color, borderRadius: 10, flex: expand ? 1 : 0, justifyContent: 'center', minHeight: 48, opacity: disabled ? 0.55 : 1, paddingHorizontal: 16 }}><Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>{label}</Text></Pressable> }

async function toMealDraft(date: string, items: readonly FoodQueryDraft[], estimated: boolean): Promise<NutritionMealDraft> {
  const resolver = new FoodResolver([new LocalFoodCatalogProvider(LOCAL_FOOD_CATALOG)]); const draft = createEmptyNutritionMealDraft(date)
  draft.items = await Promise.all(items.map(async (item) => { const resolved = await resolver.resolve({ text: item.query }); const food = resolved.status === 'exact' || resolved.status === 'probable' ? resolved.candidates[0] : null; const quantity = item.quantity; const unit = item.unit
    if (food && quantity && unit === food.servingBasis.unit) { const nutrients = NutritionCalculator.calculatePortion(food, { amount: quantity, unit }).nutrients; return { name: food.name, portionDescription: `${estimated ? '~' : ''}${quantity} ${unit}`, estimatedGrams: unit === 'g' ? String(quantity) : '', caloriesKcal: String(nutrients.energyKcal), proteinGrams: String(nutrients.proteinG), carbohydratesGrams: String(nutrients.carbsG), fatGrams: String(nutrients.fatG), fiberGrams: String(nutrients.fiberG), micronutrients: {} } }
    return { name: item.query, portionDescription: quantity ? `${estimated ? '~' : ''}${quantity} ${unit ?? ''}`.trim() : 'Quantidade a confirmar', estimatedGrams: unit === 'g' && quantity ? String(quantity) : '', caloriesKcal: '', proteinGrams: '', carbohydratesGrams: '', fatGrams: '', fiberGrams: '', micronutrients: {} }
  }))
  return draft
}
