const BLOCKED_WORDS = [
  // Español
  'boludo', 'pelotudo', 'idiota', 'imbecil', 'estupido', 'hdp', 'hijo de puta',
  'puta', 'puto', 'mierda', 'carajo', 'gilipollas', 'pendejo', 'cabron',
  'maricon', 'marica', 'culo', 'cono', 'pija', 'verga', 'concha', 'cagon',
  'tarado', 'mogolico', 'retrasado', 'subnormal', 'inutil', 'pedazo de mierda',
  // Inglés
  'asshole', 'bastard', 'bitch', 'cunt', 'fuck', 'shit', 'faggot', 'nigger',
  'whore', 'slut', 'dickhead', 'motherfucker', 'moron', 'idiot',
]

function normalizeForCheck(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\s+/g, '')
}

export function containsBlockedWords(value) {
  const normalized = normalizeForCheck(value)
  return BLOCKED_WORDS.some(w => normalized.includes(normalizeForCheck(w)))
}

export function validateRequiredText(value, fieldName) {
  if (!value || value.trim() === '')
    return `El campo ${fieldName} es obligatorio.`
  const t = value.trim()
  if (t.length < 2)
    return `El ${fieldName} debe tener al menos 2 caracteres válidos.`
  const letters = t.match(/[a-zA-ZÀ-ÿ]/g) || []
  if (letters.length < 2)
    return `El ${fieldName} contiene caracteres inválidos.`
  return null
}

export function validateUserName(value, fieldName) {
  const err = validateRequiredText(value, fieldName)
  if (err) return err
  if (containsBlockedWords(value))
    return `El ${fieldName} contiene palabras no permitidas.`
  return null
}

export function validateEmail(email) {
  if (!email || email.trim() === '')
    return 'El email es obligatorio.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
    return 'Ingresá un correo electrónico válido.'
  return null
}

export function validateUserForm({ nombre, email }) {
  const errors = []
  const nameErr = validateUserName(nombre, 'nombre')
  if (nameErr) errors.push(nameErr)
  const emailErr = validateEmail(email)
  if (emailErr) errors.push(emailErr)
  return errors
}
