import { Easing } from 'react-native'

/** Saída exponencial suave: começa rápido e assenta sem ricochete. Curva principal do app. */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1)
/** Para elementos que saem ou trocam de lugar. */
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1)
