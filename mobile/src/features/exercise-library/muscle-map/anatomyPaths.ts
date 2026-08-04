import type { MuscleMapView, MuscleRegion } from './muscleRegions'

export interface AnatomyRegionPath {
  region: MuscleRegion
  view: MuscleMapView
  paths: readonly string[]
}

export const BODY_SILHOUETTES: Record<MuscleMapView, string> = {
  front: 'M60 18 C48 18 43 27 44 38 C45 47 50 52 53 54 L45 62 C35 68 29 87 25 108 L18 158 C17 166 21 170 26 169 L34 123 L37 174 L31 218 L34 302 C34 311 43 312 47 304 L56 230 L60 184 L64 230 L73 304 C77 312 86 311 86 302 L89 218 L83 174 L86 123 L94 169 C99 170 103 166 102 158 L95 108 C91 87 85 68 75 62 L67 54 C70 52 75 47 76 38 C77 27 72 18 60 18 Z',
  back: 'M180 18 C168 18 163 27 164 38 C165 47 170 52 173 54 L165 62 C155 68 149 87 145 108 L138 158 C137 166 141 170 146 169 L154 123 L157 174 L151 218 L154 302 C154 311 163 312 167 304 L176 230 L180 184 L184 230 L193 304 C197 312 206 311 206 302 L209 218 L203 174 L206 123 L214 169 C219 170 223 166 222 158 L215 108 C211 87 205 68 195 62 L187 54 C190 52 195 47 196 38 C197 27 192 18 180 18 Z',
}

export const ANATOMY_PATHS: readonly AnatomyRegionPath[] = [
  { region: 'front-shoulder', view: 'front', paths: ['M44 65 C36 69 32 79 31 91 L43 94 L50 72 Z', 'M76 65 C84 69 88 79 89 91 L77 94 L70 72 Z'] },
  { region: 'chest', view: 'front', paths: ['M49 70 C53 66 58 67 59 72 L58 92 C51 91 47 87 45 79 Z', 'M71 70 C67 66 62 67 61 72 L62 92 C69 91 73 87 75 79 Z'] },
  { region: 'biceps', view: 'front', paths: ['M35 94 C32 100 31 115 34 126 L43 124 L45 96 Z', 'M85 94 C88 100 89 115 86 126 L77 124 L75 96 Z'] },
  { region: 'forearms', view: 'front', paths: ['M31 127 L25 158 C24 163 28 165 31 160 L39 128 Z', 'M89 127 L95 158 C96 163 92 165 89 160 L81 128 Z'] },
  { region: 'abs', view: 'front', paths: ['M53 96 L59 96 L59 151 L51 148 Z', 'M61 96 L67 96 L69 148 L61 151 Z'] },
  { region: 'obliques', view: 'front', paths: ['M45 95 L52 96 L50 150 L43 157 L40 120 Z', 'M75 95 L68 96 L70 150 L77 157 L80 120 Z'] },
  { region: 'adductors', view: 'front', paths: ['M55 166 L59 170 L55 221 L49 204 Z', 'M65 166 L61 170 L65 221 L71 204 Z'] },
  { region: 'quads', view: 'front', paths: ['M44 166 C49 161 54 164 56 171 L51 226 L40 224 L39 190 Z', 'M76 166 C71 161 66 164 64 171 L69 226 L80 224 L81 190 Z'] },
  { region: 'calves', view: 'front', paths: ['M39 231 C46 227 51 234 50 249 L45 290 L37 287 Z', 'M81 231 C74 227 69 234 70 249 L75 290 L83 287 Z'] },
  { region: 'traps', view: 'back', paths: ['M166 61 L176 56 L179 91 L163 75 Z', 'M194 61 L184 56 L181 91 L197 75 Z'] },
  { region: 'rear-shoulder', view: 'back', paths: ['M164 65 C156 69 152 79 151 91 L163 94 L170 72 Z', 'M196 65 C204 69 208 79 209 91 L197 94 L190 72 Z'] },
  { region: 'lats', view: 'back', paths: ['M165 82 L178 91 L177 139 L162 153 L158 105 Z', 'M195 82 L182 91 L183 139 L198 153 L202 105 Z'] },
  { region: 'triceps', view: 'back', paths: ['M155 94 C152 104 152 117 155 128 L164 124 L165 96 Z', 'M205 94 C208 104 208 117 205 128 L196 124 L195 96 Z'] },
  { region: 'forearms', view: 'back', paths: ['M151 128 L145 158 C144 163 148 165 151 160 L159 128 Z', 'M209 128 L215 158 C216 163 212 165 209 160 L201 128 Z'] },
  { region: 'lower-back', view: 'back', paths: ['M166 140 L178 136 L179 165 L164 158 Z', 'M194 140 L182 136 L181 165 L196 158 Z'] },
  { region: 'glutes', view: 'back', paths: ['M159 166 C166 160 176 162 179 170 L177 192 C168 195 160 189 157 180 Z', 'M201 166 C194 160 184 162 181 170 L183 192 C192 195 200 189 203 180 Z'] },
  { region: 'hamstrings', view: 'back', paths: ['M160 195 C168 191 175 195 176 205 L171 231 L158 226 Z', 'M200 195 C192 191 185 195 184 205 L189 231 L202 226 Z'] },
  { region: 'calves', view: 'back', paths: ['M159 232 C166 226 172 234 170 252 L165 290 L157 286 Z', 'M201 232 C194 226 188 234 190 252 L195 290 L203 286 Z'] },
]
