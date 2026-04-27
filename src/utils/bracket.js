/**
 * Gera chaveamento eliminatório simples.
 * Evita mesma equipe na primeira rodada (snake draft por equipe).
 * Preenche com BYEs (null) até a próxima potência de 2.
 *
 * @param {Array<{id: string, teamName: string}>} athletes
 * @returns {Array<{round, position, fighterAId, fighterBId}>}
 */
export function generateBracket(athletes) {
  if (athletes.length < 2) throw new Error('São necessários pelo menos 2 atletas.')

  const shuffled = shuffleAvoidSameTeam(athletes)
  const slotCount = nextPow2(shuffled.length)
  const slots = [...shuffled.map(a => a.id), ...Array(slotCount - shuffled.length).fill(null)]

  const fights = []

  // Primeira rodada — posições reais
  for (let i = 0; i < slotCount; i += 2) {
    fights.push({ round: 1, position: Math.floor(i / 2), fighterAId: slots[i], fighterBId: slots[i + 1] })
  }

  // Rodadas seguintes — sem atletas (preenchidas conforme resultados)
  const rounds = Math.log2(slotCount)
  let roundFights = slotCount / 2
  for (let r = 2; r <= rounds; r++) {
    roundFights = roundFights / 2
    for (let p = 0; p < roundFights; p++) {
      fights.push({ round: r, position: p, fighterAId: null, fighterBId: null })
    }
  }

  return fights
}

/**
 * Embaralha distribuindo atletas de times diferentes entre si (snake draft).
 */
function shuffleAvoidSameTeam(athletes) {
  const byTeam = new Map()
  for (const a of athletes) {
    const key = a.teamName.toLowerCase().trim()
    if (!byTeam.has(key)) byTeam.set(key, [])
    byTeam.get(key).push(a)
  }

  const groups = [...byTeam.values()].sort((a, b) => b.length - a.length)
  const result = []
  let i = 0

  while (result.length < athletes.length) {
    const g = groups[i % groups.length]
    if (g?.length > 0) result.push(g.shift())
    i++
    if (groups.every(g => g.length === 0)) break
  }

  return result
}

const nextPow2 = (n) => { let p = 1; while (p < n) p *= 2; return p }