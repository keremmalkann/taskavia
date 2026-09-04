export function validateProposal(price: number, duration: number, message: string, minimum: number) {
  if (!Number.isFinite(price) || price <= 0 || price > 9999999999.99 || price < minimum) return 'Teklif tutarı pozitif olmalı ve ilanın minimum bütçesinden düşük olmamalı.'
  if (!Number.isInteger(duration) || duration < 1 || duration > 3650) return 'Teslim süresi 1–3650 arasında tam gün olmalı.'
  if (message.trim().length < 10 || message.trim().length > 2000) return 'Mesaj 10–2000 karakter olmalı.'
  return null
}
