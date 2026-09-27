import { OPERADOR_DISPLAY } from './constants'

// Representación de la fórmula en el constructor: una lista de tokens
// { type: 'var' | 'op' | 'num', value }. NO es un parser: no valida
// sintaxis ni variables — eso lo decide POST /api/indicadores/validar-formula.
// Solo separa la fórmula técnica guardada en piezas para poder mostrarla con
// labels amigables y editarla token por token.

const TOKEN_REGEX = /[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/]|\S/g

export function tokensFromFormula(formula) {
  if (typeof formula !== 'string') return []
  return (formula.match(TOKEN_REGEX) || []).map(t => {
    if (/^[A-Za-z_]/.test(t)) return { type: 'var', value: t }
    if (/^\d/.test(t)) return { type: 'num', value: t }
    return { type: 'op', value: t }
  })
}

// Fórmula técnica que se envía al backend: (INGRESOS_TOTAL - GASTOS_TOTAL) / INGRESOS_TOTAL * 100
export function formulaFromTokens(tokens) {
  return tokens.map(t => t.value).join(' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
}

export function tokenLabel(token, variablesByKey) {
  if (token.type === 'var') return variablesByKey?.[token.value]?.label || token.value
  if (token.type === 'op') return OPERADOR_DISPLAY[token.value] || token.value
  return token.value.replace('.', ',')
}

// (Ingresos totales − Gastos totales) ÷ Ingresos totales × 100
export function formulaLegible(formula, variablesByKey) {
  return tokensFromFormula(formula).map(t => tokenLabel(t, variablesByKey)).join(' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
}
