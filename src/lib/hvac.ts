import { catalogRows, type CatalogRow } from "../data/catalog.ts"

export type Role = "outdoor" | "ahandler" | "coil" | "furnace" | "ductless-out" | "ductless-in"
export type Refrig = "R-410A" | "R-454B" | "R-22" | "R-32" | "unknown"
export type ControlKind = "abcd" | "24v" | "mura-24v" | "ductless" | "unknown"
export type Family = "carrier" | "bryant" | "shared" | "twin"
export type Vent = "b" | "pvc" | "unknown" | "na"

export type Unit = {
  id: string
  brand: string
  model: string
  typeLabel: string
  line: string
  refrigerant: Refrig
  stages: string
  successor: string
  era: string
  notes: string
  sources: string
  status: string
  role: Role
  duty: "ac" | "hp" | "heat" | "indoor"
  control: ControlKind
  family: Family
  vent: Vent
  uln: boolean
  builtinRds: boolean
  crossover: boolean
  threePhase: boolean
  maxTons: number | null
  unverified: boolean
  bus: "abcd" | "24v" | "mura" | "ductless"
}

export type Control = {
  id: string
  brand: string
  name: string
  protocol: "abcd" | "24v"
  wifi: boolean
  y2: boolean
  pek: boolean
  source: string
}

export const controls: Control[] = [
  { id: "systxccitc01", brand: "Carrier", name: "Infinity Touch SYSTXCCITC01", protocol: "abcd", wifi: true, y2: false, pek: false, source: "F086, UI_SI" },
  { id: "systxccuiz01", brand: "Carrier", name: "Infinity SYSTXCCUIZ01", protocol: "abcd", wifi: false, y2: false, pek: false, source: "F086" },
  { id: "systxccwic01", brand: "Carrier", name: "Infinity Wi-Fi SYSTXCCWIC01", protocol: "abcd", wifi: true, y2: false, pek: false, source: "F086" },
  { id: "systxbbuid01", brand: "Bryant", name: "Evolution SYSTXBBUID01 / Connex", protocol: "abcd", wifi: true, y2: false, pek: false, source: "F086" },
  { id: "ecobee-prem", brand: "ecobee", name: "ecobee Premium", protocol: "24v", wifi: true, y2: true, pek: true, source: "ECO_PREM, F004" },
  { id: "ecobee3lite", brand: "ecobee", name: "ecobee3 lite", protocol: "24v", wifi: true, y2: true, pek: true, source: "ECO_3L, F004" },
  { id: "t6", brand: "Honeywell", name: "Honeywell T6 Pro", protocol: "24v", wifi: false, y2: true, pek: false, source: "RES_T6, F016" },
  { id: "cor", brand: "Carrier", name: "Carrier Cor", protocol: "24v", wifi: true, y2: true, pek: false, source: "F004" },
  { id: "housewise", brand: "Bryant", name: "Bryant Housewise", protocol: "24v", wifi: true, y2: true, pek: false, source: "F004" },
]

export const rdsChoices = [
  { id: "none", name: "Без платы A2L" },
  { id: "builtin", name: "Встроенная dissipation board — FE5B / FJ5 / FT5" },
  { id: "field", name: "Полевая плата на змеевике печи" },
] as const

export type RdsId = (typeof rdsChoices)[number]["id"]

export const ventChoices = [
  { id: "none", name: "Вентиляция не выбрана" },
  { id: "b", name: "Type B, 80% / Cat I" },
  { id: "pvc", name: "PVC, Cat IV, 90%+" },
] as const

export type VentId = (typeof ventChoices)[number]["id"]

const extraIndoors: Unit[] = [
  unitFromParts({
    brand: "Bryant",
    model: "615PHA",
    typeLabel: "Ductless indoor",
    line: "Bryant",
    refrigerant: "R-454B",
    stages: "inverter",
    successor: "",
    era: "2025–",
    notes: "Внутренний блок Bryant, указан парой к наружным 37M** / 45M**",
    sources: "каталог Ductless R-454B",
    status: "проверено по OEM",
  }),
  unitFromParts({
    brand: "Bryant",
    model: "615AHA",
    typeLabel: "Ductless indoor",
    line: "Bryant",
    refrigerant: "R-454B",
    stages: "inverter",
    successor: "",
    era: "2025–",
    notes: "Внутренний блок Bryant, указан парой к наружным 37M** / 45M**",
    sources: "каталог Ductless R-454B",
    status: "проверено по OEM",
  }),
]

function slug(brand: string, model: string) {
  return `${brand}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function parseRef(raw: string, side: "left" | "right"): Refrig {
  const parts = raw.split("→").map((s) => s.trim())
  const chunk = side === "right" && parts.length > 1 ? parts[parts.length - 1] : parts[0]
  if (chunk.includes("R-454B")) return "R-454B"
  if (chunk.includes("R-32") && !chunk.includes("R-410A")) return "R-32"
  if (chunk.includes("R-410A")) return "R-410A"
  if (chunk.includes("R-22")) return "R-22"
  return "unknown"
}

function roleOf(model: string, typeLabel: string): Role {
  const m = model.toUpperCase()
  if (typeLabel.includes("печь") || typeLabel.includes("Печь")) return "furnace"
  if (typeLabel.toLowerCase().includes("ductless")) {
    if (/^(45|40|619|615)/.test(m)) return "ductless-in"
    return "ductless-out"
  }
  if (typeLabel.includes("змеевик") || typeLabel.includes("Фанкойл")) {
    if (/^(FE|FT|FJ|FMA|FG|40|45)/.test(m)) return "ahandler"
    return "coil"
  }
  return "outdoor"
}

function dutyOf(model: string, typeLabel: string, notes: string, role: Role): Unit["duty"] {
  if (role === "furnace") return "heat"
  if (role === "ahandler" || role === "coil" || role === "ductless-in") return "indoor"
  const m = model.toUpperCase()
  if (typeLabel.startsWith("HP")) return "hp"
  if (typeLabel.startsWith("AC (")) return "ac"
  if (notes.startsWith("HP") || notes.includes(" HP,")) return "hp"
  const two = m.slice(0, 2)
  if (two === "24" || two === "26") return "ac"
  if (two === "25" || two === "27") return "hp"
  if (m.startsWith("GH")) return "hp"
  if (m.startsWith("GA")) return "ac"
  if (m.includes("MUHA") || m.includes("MURA")) return "hp"
  if (/^[12]/.test(m)) return m[0] === "2" ? "hp" : "ac"
  if (typeLabel.includes("HP")) return "hp"
  return "ac"
}

function familyOf(brand: string, model: string, role: Role): Family {
  const m = model.toUpperCase()
  if (role === "ductless-out" || role === "ductless-in") return "shared"
  if (/^(37MU|38MU|45MU|40MU)/.test(m)) return "shared"
  if (brand === "Carrier/Bryant") return "shared"
  if (m === "59SC5B" || m === "915SB") return "twin"
  if (brand === "Bryant") return "bryant"
  return "carrier"
}

function controlOf(model: string, line: string, stages: string, notes: string, role: Role): ControlKind {
  if (role === "ductless-out" || role === "ductless-in") return "ductless"
  if (role !== "outdoor") return "unknown"
  const m = model.toUpperCase()
  if (m.includes("MURA") || m.includes("MUHA") || notes.includes("S1/S2")) return "mura-24v"
  if (line === "Infinity" || line === "Evolution") return "abcd"
  if (/\bVS\b|variable/i.test(`${stages} ${notes}`)) return "abcd"
  if (line === "Comfort/crossover" || /inverter/i.test(stages)) return "unknown"
  return "24v"
}

function busOf(model: string, notes: string, role: Role, control: ControlKind): Unit["bus"] {
  if (role === "ductless-in" || role === "ductless-out") return "ductless"
  if (control === "mura-24v") return "mura"
  const m = model.toUpperCase()
  if (role === "ahandler" && (m.includes("MUAA") || m.includes("MUHA") || m.includes("MULA"))) return "mura"
  if (role === "ahandler" && (m.startsWith("FE") || notes.includes("VCA") || /\bVS\b/.test(notes))) return "abcd"
  if (role === "furnace" && (m.startsWith("59MN7") || notes.includes("Infinity"))) return "abcd"
  if (control === "abcd") return "abcd"
  return "24v"
}

function ventOf(notes: string, role: Role): Vent {
  if (role !== "furnace") return "na"
  if (/cat\s*iv|9[0-9]\s*%|infinity\s*98|(?:^|\s)9[5-9](?:\s|,|$)/i.test(notes)) return "pvc"
  if (/cat\s*i|80\s*%/i.test(notes)) return "b"
  return "unknown"
}

function unitFromParts(p: {
  brand: string
  model: string
  typeLabel: string
  line: string
  refrigerant: Refrig
  stages: string
  successor: string
  era: string
  notes: string
  sources: string
  status: string
}): Unit {
  const role = roleOf(p.model, p.typeLabel)
  const control = controlOf(p.model, p.line, p.stages, p.notes, role)
  const m = p.model.toUpperCase()
  return {
    id: slug(p.brand, p.model),
    brand: p.brand,
    model: p.model,
    typeLabel: p.typeLabel,
    line: p.line,
    refrigerant: p.refrigerant,
    stages: p.stages,
    successor: p.successor,
    era: p.era,
    notes: p.notes,
    sources: p.sources,
    status: p.status,
    role,
    duty: dutyOf(p.model, p.typeLabel, p.notes, role),
    control,
    family: familyOf(p.brand, p.model, role),
    vent: ventOf(p.notes, role),
    uln: /uln/i.test(p.notes),
    builtinRds: m === "FE5B" || m === "FJ5" || m === "FT5",
    crossover:
      /crossover/i.test(p.line + p.notes + p.successor) ||
      m.includes("MURA") ||
      m.includes("MUHA") ||
      m.includes("MUAA"),
    threePhase: /3-фаз/.test(p.model + p.notes + p.typeLabel),
    maxTons: /4\.5/.test(p.notes) ? 4.5 : null,
    unverified: /не проверено|не подтверждено/i.test(p.status + p.notes),
    bus: busOf(p.model, p.notes, role, control),
  }
}

function splitRow(row: CatalogRow): Unit[] {
  const model = row.model.trim()
  const base = {
    brand: row.brand,
    typeLabel: row.type,
    line: row.line,
    stages: row.stages,
    successor: row.successor,
    era: row.era,
    notes: row.notes,
    sources: row.sources,
    status: row.status,
  }
  if (model.includes("→")) {
    const [leftRaw, rightRaw] = model.split("→").map((s) => s.trim())
    const lefts = leftRaw.split("/").map((s) => s.trim()).filter(Boolean)
    const out: Unit[] = []
    for (const left of lefts) {
      out.push(unitFromParts({ ...base, model: stripParen(left), refrigerant: parseRef(row.refrigerant, "left") }))
    }
    if (!/нет/i.test(rightRaw)) {
      for (const right of rightRaw.split("/").map((s) => s.trim()).filter(Boolean)) {
        out.push(unitFromParts({ ...base, model: stripParen(right), refrigerant: parseRef(row.refrigerant, "right") }))
      }
    }
    return out
  }
  if (model === "113ANA / 213RNA") {
    return [
      unitFromParts({ ...base, brand: "Bryant", model: "113ANA", refrigerant: "R-410A" }),
      unitFromParts({ ...base, brand: "Bryant", model: "213RNA", refrigerant: "R-22" }),
    ]
  }
  if (row.refrigerant.includes("/") && !row.refrigerant.includes("→")) {
    return [unitFromParts({ ...base, model: stripParen(model), refrigerant: "unknown" })]
  }
  return model.split("/").map((part) =>
    unitFromParts({ ...base, model: stripParen(part.trim()), refrigerant: parseRef(row.refrigerant, "left") }),
  )
}

function stripParen(s: string) {
  return s.replace(/\s*\([^)]*\)/g, "").trim()
}

export const units: Unit[] = dedupe([...catalogRows.flatMap(splitRow), ...extraIndoors])

function dedupe(list: Unit[]): Unit[] {
  const seen = new Set<string>()
  const out: Unit[] = []
  for (const u of list) {
    if (!u.model || seen.has(u.id)) continue
    seen.add(u.id)
    out.push(u)
  }
  return out
}

export function unitById(id: string | null): Unit | null {
  if (!id) return null
  return units.find((u) => u.id === id) ?? null
}

export function controlById(id: string | null): Control | null {
  if (!id) return null
  return controls.find((c) => c.id === id) ?? null
}

export type Finding = { level: "stop" | "ok" | "note"; title: string; detail: string; source: string }

export type Pick = {
  mode: "ducted" | "ductless" | "goodman"
  outdoorId: string | null
  indoorId: string | null
  furnaceId: string | null
  coilId: string | null
  controlId: string | null
  rds: RdsId
  vent: VentId
  hasC: boolean
  outdoorSerial: string
  indoorSerial: string
  goodmanCoil: "r32" | "r410a" | "r22"
  a2e: "on" | "off"
}

export const emptyPick: Pick = {
  mode: "ducted",
  outdoorId: null,
  indoorId: null,
  furnaceId: null,
  coilId: null,
  controlId: null,
  rds: "none",
  vent: "none",
  hasC: true,
  outdoorSerial: "",
  indoorSerial: "",
  goodmanCoil: "r410a",
  a2e: "on",
}

export function parseTons(model: string): number | null {
  const m = model.toUpperCase().replace(/[\s-]/g, "")
  const carrier = m.match(/^(24|25|26|27)[A-Z]{3}\d(\d{2})/)
  if (carrier) {
    const k = Number(carrier[2])
    if ([18, 24, 30, 36, 42, 48, 60].includes(k)) return k / 12
  }
  const bryant = m.match(/^[12][349]\d?[A-Z]{3}(\d{3})/)
  if (bryant) {
    const k = Number(bryant[1])
    if ([18, 24, 30, 36, 42, 48, 60].includes(k)) return k / 12
  }
  return null
}

export type Decode = { title: string; lines: { k: string; v: string }[]; unit: Unit | null }

export function decodeModel(raw: string): Decode {
  const m = raw.toUpperCase().replace(/\s+/g, "")
  const lines: { k: string; v: string }[] = []
  if (!m) return { title: "Введите номер", lines, unit: null }
  const carrier = m.match(/^(24|25|26|27)([A-Z])([A-Z])([A-Z])(\d)?(\d{2})?/)
  if (carrier) {
    const family: Record<string, string> = {
      "24": "кондиционер, R-410A",
      "25": "тепловой насос, R-410A",
      "26": "кондиционер, R-454B",
      "27": "тепловой насос, R-454B",
    }
    const stage: Record<string, string> = { S: "1 ступень", T: "2 ступени", V: "variable speed" }
    const tier: Record<string, string> = { C: "Comfort", P: "Performance", N: "Infinity" }
    const seer: Record<string, string> = { "6": "~16 SEER2", "0": "~20 SEER2", "1": "~21 SEER2", "4": "региональный", "5": "региональный" }
    lines.push({ k: "Семья", v: `${carrier[1]} — ${family[carrier[1]]} [CAR_TG]` })
    lines.push({ k: "Ступени", v: `${carrier[2]} — ${stage[carrier[2]] ?? "в базе нет этой буквы"}` })
    lines.push({ k: "Линейка", v: `${carrier[3]} — ${tier[carrier[3]] ?? "в базе нет этой буквы"}` })
    if (carrier[5]) lines.push({ k: "Эффективность", v: `${carrier[5]} — ${seer[carrier[5]] ?? "смотри шильдик"}` })
    const tons = parseTons(m)
    if (tons) lines.push({ k: "Номинал", v: `${tons} т (пример 27SPA660A003 = 5 т)` })
    else lines.push({ k: "Номинал", v: "в номере нет типового тоннажа 18–60" })
  } else {
    const bryant = m.match(/^([12])([349])/)
    if (bryant) {
      lines.push({ k: "Тип", v: bryant[1] === "1" ? "кондиционер" : "тепловой насос" })
      const tier: Record<string, string> = { "3": "Legacy", "4": "Preferred", "9": "Evolution, R-454B" }
      lines.push({ k: "Линейка", v: `${bryant[2]} — ${tier[bryant[2]]} [BRY_LK]` })
      const tons = parseTons(m)
      if (tons) lines.push({ k: "Номинал", v: `${tons} т (036 в 293VAN03600A = 3 т)` })
      if (/A$|ANA/.test(m) && /R|RNA/.test(m)) lines.push({ k: "Хладагент", v: "буква A = Puron R-410A, R = R-22 [BRY_NOM]" })
      else if (m.includes("RNA") || /R(?!454)/.test(m)) {
        /* keep quiet */
      }
      if (bryant[2] === "9") lines.push({ k: "Хладагент", v: "Evolution в этой волне — R-454B [BRY_LK]" })
    } else {
      lines.push({ k: "Номер", v: "не разобран правилами Carrier/Bryant из листа «Номенклатура»" })
    }
  }
  const hit = units.find((u) => m.startsWith(u.model.replace(/[^A-Z0-9]/g, "")) || u.model.replace(/[^A-Z0-9]/g, "") === m)
  if (hit) lines.push({ k: "В каталоге", v: `${hit.brand} ${hit.model} · ${hit.refrigerant} · ${hit.status}` })
  return { title: m, lines, unit: hit ?? null }
}

function brandsOk(a: Unit, b: Unit): boolean {
  if (a.family === "shared" || b.family === "shared") return true
  if (a.family === "twin" || b.family === "twin") return true
  return a.family === b.family
}

function sameGas(a: Refrig, b: Refrig): boolean {
  if (a === "unknown" || b === "unknown") return false
  return a === b
}

export function match(pick: Pick): Finding[] {
  if (pick.mode === "goodman") return matchGoodman(pick)
  const out: Finding[] = []
  const outdoor = unitById(pick.outdoorId)
  const indoor = unitById(pick.indoorId)
  const furnace = unitById(pick.furnaceId)
  const coil = unitById(pick.coilId)
  const control = controlById(pick.controlId)
  const pieces = [outdoor, indoor, furnace, coil].filter(Boolean) as Unit[]

  if (!outdoor) {
    out.push({ level: "note", title: "Нет наружного блока", detail: "Сначала выбери конденсатор или наружный мини-сплит из каталога.", source: "Каталог" })
    return out
  }

  if (pick.mode === "ductless") {
    if (outdoor.role !== "ductless-out") {
      out.push({ level: "stop", title: "Это не мини-сплит", detail: `${outdoor.model} лежит в канальном каталоге. Для него нужен змеевик или фанкойл, не головка 45M.`, source: outdoor.sources || "Каталог" })
    }
    if (!indoor) {
      out.push({ level: "stop", title: "Нет внутреннего блока", detail: "У мини-сплита наружный блок без своей головки не собирается.", source: "Каталог Ductless" })
    } else if (indoor.role !== "ductless-in") {
      out.push({ level: "stop", title: "Внутренний блок не от мини-сплита", detail: `${indoor.model} — канальное оборудование.`, source: "Каталог" })
    } else if (!sameGas(outdoor.refrigerant, indoor.refrigerant)) {
      out.push({ level: "stop", title: "Разный хладагент", detail: `${outdoor.model} (${outdoor.refrigerant}) и ${indoor.model} (${indoor.refrigerant}). R-454B и R-410A не взаимозаменяемы.`, source: "CAR_TG, FE5B" })
    } else if (outdoor.refrigerant === "unknown" || indoor.refrigerant === "unknown") {
      out.push({ level: "stop", title: "Хладагент не разведён", detail: "В строке каталога смесь или пометка «не подтверждено». Такую пару не утверждаю.", source: outdoor.sources })
    } else {
      out.push({ level: "ok", title: "Пара мини-сплита по газу", detail: `${outdoor.brand} ${outdoor.model} + ${indoor.model}, ${outdoor.refrigerant}.`, source: outdoor.sources || "Каталог" })
    }
    if (furnace || coil) {
      out.push({ level: "stop", title: "Печь и змеевик тут лишние", detail: "Мини-сплит не сажается на газовую печь и cased coil из канального каталога.", source: "Каталог" })
    }
    if (outdoor.refrigerant === "R-454B") {
      out.push({ level: "note", title: "Порог сенсора 10% LFL", detail: "У ductless срабатывание сенсора — 10% LFL, не 20% как у канальных. Отдельная полевая dissipation board в записях не требуется.", source: "CAR_TG" })
    }
    if (outdoor.unverified) {
      out.push({ level: "note", title: "Строка не подтверждена", detail: outdoor.notes || outdoor.status, source: outdoor.sources })
    }
    return out
  }

  if (outdoor.role === "ductless-out") {
    out.push({ level: "stop", title: "Наружный блок мини-сплита", detail: `${outdoor.model} не ставится на канальный змеевик. Переключи режим на «Мини-сплит».`, source: "Каталог Ductless" })
    return out
  }

  if (indoor && furnace) {
    out.push({ level: "stop", title: "Два обработчика воздуха", detail: "Фанкойл и печь вместе не собираются: два вентилятора и два теплообменника.", source: "Каталог" })
  }
  if (indoor && coil) {
    out.push({ level: "stop", title: "Два змеевика", detail: "Фанкойл уже со своим теплообменником. Отдельный cased coil — только на печь.", source: "Каталог" })
  }
  if (!indoor && !coil) {
    out.push({ level: "stop", title: "Нет теплообменника", detail: "Нужен фанкойл или змеевик на печь. Одну печь без змеевика к наружному блоку не подключают.", source: "Каталог" })
  }
  if (coil && !furnace) {
    out.push({ level: "stop", title: "Змеевик без печи", detail: `${coil.model} в каталоге — furnace coil. Под ним нужна газовая печь, не пустой шкаф.`, source: coil.sources || "CAR_TG" })
  }

  const exchanger = indoor ?? coil
  if (exchanger && outdoor.refrigerant !== "unknown" && exchanger.refrigerant !== "unknown" && !sameGas(outdoor.refrigerant, exchanger.refrigerant)) {
    out.push({
      level: "stop",
      title: "Хладагент не совпал",
      detail: `${outdoor.model} — ${outdoor.refrigerant}, ${exchanger.model} — ${exchanger.refrigerant}. Змеевики R-454B не взаимозаменяемы с R-410A.`,
      source: "CAR_TG, FE5B",
    })
  } else if (exchanger && (outdoor.refrigerant === "unknown" || exchanger.refrigerant === "unknown")) {
    out.push({ level: "stop", title: "Хладагент в каталоге неоднозначен", detail: "Пока в строке R-22/R-410A без разбора, пару не закрываю.", source: outdoor.sources })
  } else if (exchanger) {
    out.push({ level: "ok", title: "Один хладагент", detail: `${outdoor.refrigerant} на наружном и на ${exchanger.model}.`, source: "CAR_TG" })
  }

  if (exchanger && !brandsOk(outdoor, exchanger)) {
    out.push({ level: "stop", title: "Чужой бренд", detail: `${outdoor.brand} ${outdoor.model} и ${exchanger.brand} ${exchanger.model}. В каталоге нет разрешения мешать Carrier и Bryant, кроме близнецов 59SC5B = 915SB и общих 37/45MU.`, source: "Каталог" })
  }
  if (furnace && exchanger && exchanger !== furnace && !brandsOk(furnace, exchanger) && exchanger.family !== "twin") {
    out.push({ level: "stop", title: "Печь и змеевик разных брендов", detail: `${furnace.model} и ${exchanger.model} не записаны парой.`, source: "Каталог" })
  }
  if (furnace && !brandsOk(outdoor, furnace)) {
    out.push({ level: "stop", title: "Печь другого бренда", detail: `${furnace.brand} ${furnace.model} не пара к ${outdoor.brand} ${outdoor.model}, если это не близнец 59SC5B / 915SB.`, source: "F59SC5_PD" })
  }

  if (outdoor.crossover) {
    if (exchanger && !exchanger.crossover) {
      out.push({ level: "stop", title: "Crossover только со своим внутренним", detail: `${outdoor.model} стыкуется с 40MUAA / 45MUAA / 45MUHA, не с обычным FE/FT или печным змеевиком.`, source: "CAR_TG" })
    } else if (exchanger) {
      out.push({ level: "ok", title: "Внутренний блок crossover", detail: `${exchanger.model} из ряда, который каталог помечает «только для crossover».`, source: "CAR_TG" })
    }
  } else if (exchanger?.crossover) {
    out.push({ level: "stop", title: "Внутренний блок только для crossover", detail: `${exchanger.model} не ставится на обычный ${outdoor.model}.`, source: "CAR_TG" })
  }

  if (!control) {
    out.push({ level: "stop", title: "Нет пульта", detail: "Выбери Infinity/Evolution или 24V-термостат. От этого зависит вся схема.", source: "UI_SI, F086" })
  } else if (outdoor.control === "abcd") {
    if (control.protocol !== "abcd") {
      out.push({ level: "stop", title: "Нужна шина ABCD", detail: `${outdoor.model} (${outdoor.line || outdoor.stages}) не работает с обычным 24V-термостатом. Нужен Infinity или Evolution.`, source: "UI_SI, INF_TS" })
    } else if (control.brand === "Carrier" && outdoor.family === "bryant") {
      out.push({ level: "stop", title: "Пульт не того бренда", detail: "На Bryant Evolution ставится Evolution (SYSTXBBUID01 / Connex), не Carrier Infinity.", source: "F086" })
    } else if (control.brand === "Bryant" && outdoor.family === "carrier") {
      out.push({ level: "stop", title: "Пульт не того бренда", detail: "На Carrier Infinity ставится SYSTXCC*, не Bryant Evolution.", source: "F086" })
    } else {
      out.push({ level: "ok", title: "Коммуникационный пульт", detail: `${control.name}. Клеммы A зелёный, B жёлтый, C белый (24V common), D красный (24V hot).`, source: "UI_SI" })
    }
    if (exchanger && exchanger.bus !== "abcd" && exchanger.bus !== "ductless") {
      out.push({ level: "stop", title: "Внутренний блок не на шине", detail: `${exchanger.model} не помечен как VS/Infinity. Пульт ищет indoor по ABCD и пишет Indoor Unit Not Found. Из каталога на шину явно ложатся фанкойлы FE и печь 59MN7.`, source: "F086, INF_TS" })
    }
  } else if (outdoor.control === "mura-24v") {
    if (control.protocol !== "24v") {
      out.push({ level: "stop", title: "Crossover — это 24V", detail: `${outdoor.model}: 24V-совместимый, DIP SW1-2. Коммуникационный Infinity на него не сажай. Никогда не подавай 24V на S1/S2.`, source: "MURA_IM" })
    } else {
      out.push({ level: "ok", title: "24V на crossover", detail: "Обычный термостат. S1/S2 оставь коммуникационными: 24V туда нельзя.", source: "MURA_IM" })
    }
  } else if (outdoor.control === "24v") {
    if (control.protocol !== "24v") {
      out.push({ level: "stop", title: "На этот блок не нужна шина", detail: `${outdoor.model} — ${outdoor.line || "24V"} ${outdoor.stages}. Infinity/Evolution его не найдёт как communicating indoor/outdoor.`, source: "Каталог, F086" })
    } else {
      out.push({ level: "ok", title: "Обычный 24V", detail: `${control.name} подходит к ${outdoor.stages || "одноступенчатому"} блоку.`, source: control.source })
    }
    if (exchanger?.bus === "abcd" && exchanger.role === "ahandler") {
      out.push({ level: "note", title: "Фанкойл VS с простым термостатом", detail: `${exchanger.model} описан как variable-speed. С 24V он может не отдать все ступени. Для одноступенчатого наружного блока спокойнее FT/FJ/FG/FMA без пометки VS.`, source: "Каталог FE" })
    }
  } else if (control) {
    out.push({ level: "note", title: "Тип управления в каталоге не закрыт", detail: `${outdoor.model}: инвертор без явной пометки ABCD или S1/S2. Схему возьми с шильдика, я её не дорисовываю.`, source: outdoor.sources })
  }

  if (control?.protocol === "24v" && control.wifi && !pick.hasC && !control.pek) {
    out.push({ level: "stop", title: "Нет провода C", detail: `${control.name} питается от 24V. Без жилы C экран гаснет. PEK в базе есть только у ecobee.`, source: "F004" })
  } else if (control?.protocol === "24v" && control.wifi && !pick.hasC && control.pek) {
    out.push({ level: "ok", title: "Питание через PEK", detail: "Жилы C нет — ставь Power Extender Kit по инструкции ecobee, не «power stealing».", source: "ECO_PREM, F004" })
  } else if (control?.protocol === "24v" && pick.hasC) {
    out.push({ level: "ok", title: "Провод C есть", detail: "Между R и C на термостате должно быть около 24–28 В.", source: "F004" })
  }

  if (control?.protocol === "24v" && /2-stage|2 ступ/i.test(outdoor.stages + outdoor.notes) && !control.y2) {
    out.push({ level: "note", title: "Вторая ступень", detail: "Наружный блок двухступенчатый. На пульте нужна клемма Y2, иначе он останется на первой.", source: outdoor.sources || "Каталог" })
  }

  if (outdoor.duty === "hp" && control?.protocol === "24v" && outdoor.control !== "abcd") {
    if (outdoor.control === "mura-24v") {
      out.push({ level: "ok", title: "Реверсивный клапан наоборот", detail: "У 37MURA / 37MUHA клапан под напряжением в нагреве, клемма B. У остальных Carrier/Bryant — O в охлаждении. Не копируй привычную настройку.", source: "F016, MURA_IM" })
    } else {
      out.push({ level: "ok", title: "Реверсивный клапан O", detail: "Carrier/Bryant: O под напряжением в охлаждении. Проверяй O–C = 24 В в режиме Cool.", source: "F016, SM_9" })
    }
  }

  const needsRds = outdoor.refrigerant === "R-454B" || exchanger?.refrigerant === "R-454B"
  const crossoverOnly = (outdoor.crossover || !!exchanger?.crossover) && !furnace && !coil
  if (needsRds && crossoverOnly) {
    if (pick.rds !== "none") {
      out.push({ level: "stop", title: "Чужая плата A2L", detail: "Для 37MURA / 45MU записи F094 не дают ни встроенную FE5B, ни полевую плату печи. Чужую коробку не переноси. Сенсор бери из IM и не обходи.", source: "F094, MURA_IM" })
    } else {
      out.push({ level: "note", title: "Сенсор crossover — по IM", detail: "Хладагент R-454B, но полевая плата печи и встроенная FE5B к 45MU не относятся. Какой разъём сенсора — в IM 37MURA. Обход сенсора запрещён так же, как на канальных.", source: "F094, MURA_IM" })
    }
  } else if (needsRds) {
    if (indoor?.builtinRds && pick.rds === "builtin") {
      out.push({ level: "ok", title: "Плата A2L встроена", detail: `${indoor.model}: dissipation board в корпусе. Её не обходят. Сенсор канальный — 20% LFL, после срабатывания блоуэр ещё 5 минут.`, source: "FE5B, F094, CAR_TG" })
    } else if (indoor?.builtinRds && pick.rds !== "builtin") {
      out.push({ level: "stop", title: "У этого фанкойла плата уже внутри", detail: `${indoor.model} — FE5B, FJ5 или FT5. Отдельная «полевая» или пустое место дублирует и путает Y.`, source: "F094" })
    } else if (coil && pick.rds === "field") {
      out.push({ level: "ok", title: "Полевая плата на змеевике", detail: "Y с термостата идёт через dissipation board и только потом на наружный блок. Коды 7 и 8 — неверная проводка Y/W.", source: "F095, CAR_R454_IS" })
    } else if (coil && pick.rds !== "field") {
      out.push({ level: "stop", title: "На R-454B змеевик печи нужна полевая плата", detail: "F094: CVAMA и соседние cased coil + печь работают через field-installed board. Без неё сборка не закрыта. Плату не отключать.", source: "F094, FE5B" })
    } else if (!indoor?.builtinRds && pick.rds === "none") {
      out.push({ level: "stop", title: "Нет dissipation board", detail: "Канальный R-454B без платы митигации не собирается. Обход сенсора в базе записан как ошибка.", source: "F094" })
    } else if (pick.rds === "builtin" && !indoor?.builtinRds) {
      out.push({ level: "stop", title: "Встроенной платы у этого блока нет", detail: "Встроенная названа для FE5B, FJ5 и FT5. Для остальных R-454B — полевая плата.", source: "F094" })
    }
  } else if (pick.rds !== "none") {
    out.push({ level: "stop", title: "Плата A2L на старом хладагенте", detail: "Dissipation board и сенсор R-454B не ставятся на систему R-410A / R-22.", source: "CAR_TG" })
  } else if (outdoor.refrigerant === "R-410A") {
    out.push({ level: "ok", title: "Плата A2L не нужна", detail: "R-410A. Сенсор утечки A2L сюда не относится.", source: "CAR_TG" })
  }

  if (furnace) {
    if (furnace.vent === "unknown") {
      out.push({ level: "note", title: "Класс вентиляции не записан", detail: `${furnace.model}: в особенностях нет 80% или 90%+. Смотри шильдик, не угадывай B-vent или PVC.`, source: furnace.sources || "Каталог" })
    } else if (pick.vent === "none") {
      out.push({ level: "stop", title: "Не выбрана вентиляция печи", detail: `${furnace.model} — ${furnace.vent === "pvc" ? "конденсационная, Cat IV" : "80% / Cat I"}. Вент делается сразу, не «потом».`, source: "INS-005, каталог" })
    } else if ((furnace.vent === "pvc" && pick.vent !== "pvc") || (furnace.vent === "b" && pick.vent !== "b")) {
      out.push({ level: "stop", title: "Вентиляция не того класса", detail: furnace.vent === "pvc" ? "90%+ и Cat IV — PVC, не Type B." : "80% / Cat I — Type B. PVC от конденсационной печи сюда не переносить.", source: "каталог, INS-005" })
    } else {
      out.push({ level: "ok", title: "Вентиляция совпала с печью", detail: `${furnace.model}: ${furnace.vent === "pvc" ? "PVC / Cat IV" : "Type B / 80%"}.`, source: furnace.sources || "Каталог" })
    }
    if (furnace.uln) {
      out.push({ level: "note", title: "Ultra-low NOx", detail: `${furnace.model} помечен ULN. Для Калифорнии это отдельное требование, не просто «печь на 80 или 95».`, source: furnace.sources || "CAR_WEB_F" })
    }
    if (furnace.unverified) {
      out.push({ level: "note", title: "Печь не сверена с документом", detail: furnace.notes || furnace.status, source: furnace.sources })
    }
  }

  const tonsOut = parseTons(pick.outdoorSerial)
  const tonsIn = parseTons(pick.indoorSerial)
  if (outdoor.maxTons && tonsOut && tonsOut > outdoor.maxTons) {
    out.push({ level: "stop", title: "Выше потолка серии", detail: `${outdoor.model} — cold-climate до ${outdoor.maxTons} т. В номере выходит ${tonsOut} т.`, source: "CAR_TG, BRY_LK" })
  } else if (tonsOut && tonsIn && tonsOut !== tonsIn) {
    out.push({ level: "stop", title: "Номинал не совпал", detail: `Наружный ${tonsOut} т, внутренний ${tonsIn} т. В номенклатуре тоннаж — это 18/24/30/36/42/48/60.`, source: "CAR_TG, BRY_LK" })
  } else if (tonsOut && tonsIn) {
    out.push({ level: "ok", title: "Один номинал", detail: `${tonsOut} т и там, и там.`, source: "CAR_TG" })
  } else if (pick.outdoorSerial.trim() || pick.indoorSerial.trim()) {
    out.push({ level: "note", title: "Номинал из номера не прочитан", detail: "Жду полный номер вида 27SPA660A003 или 293VAN03600A. Серия без цифр тоннажа размер не доказывает.", source: "лист Номенклатура" })
  } else {
    out.push({ level: "note", title: "Тоннаж ещё не задан", detail: "Серии в каталоге без размера. Впиши полные номера, если нужно сверить 2 т с 2 т, а не серию с серией.", source: "CAR_TG" })
  }

  if (outdoor.threePhase) {
    out.push({ level: "note", title: "Три фазы", detail: `${outdoor.model} в каталоге помечен как 3-фазный. Однофазный ввод к нему не подходит.`, source: "CAR_TG" })
  }
  if (outdoor.unverified) {
    out.push({ level: "note", title: "Наружный блок сверен не до конца", detail: outdoor.notes || outdoor.status, source: outdoor.sources })
  }

  if (!out.some((f) => f.level === "stop")) {
    out.unshift({ level: "ok", title: "Сборка сходится с базой", detail: "Жёстких противоречий с каталогом и правилами подключения нет. Всё, что ниже помечено «смотри», сверь с шильдиком.", source: "HVAC Game, волна 2" })
  }
  return out
}

function matchGoodman(pick: Pick): Finding[] {
  const out: Finding[] = []
  if (pick.goodmanCoil === "r32" && pick.a2e === "off") {
    out.push({ level: "stop", title: "A2E выключен на R-32", detail: "На змеевике R-32 функцию A2L не отключают. Это как раз та ошибка, от которой предостерегает F113.", source: "F113, GD_A2L_JS" })
  } else if (pick.goodmanCoil === "r32" && pick.a2e === "on") {
    out.push({ level: "ok", title: "A2E оставлен включённым", detail: "Печь Goodman/Amana 2025+ с R-32: сенсор на месте, жгут для cased coil — SER2A08012S, 8 футов. Код EAL — митигация, газ гасится, вентилятор на максимум, потом ещё 5 минут.", source: "F112, F114, GD_A2L_JS" })
  } else if (pick.a2e === "on") {
    out.push({ level: "stop", title: "Старый змеевик, а A2E включён", detail: "Новая печь Goodman по умолчанию ждёт сенсор R-32. Со старым змеевиком R-410A или R-22 нагрев не стартует, крутится только вентилятор. Меню: A2E → NO → подтвердить → снять питание.", source: "F113, GD_A2L_JS" })
  } else {
    out.push({ level: "ok", title: "A2E выключен под старый змеевик", detail: `Змеевик ${pick.goodmanCoil === "r22" ? "R-22" : "R-410A"}: A2E = NO и обязательный power cycle. На системе R-32 так делать нельзя.`, source: "F113" })
  }
  out.push({ level: "note", title: "Посерийного каталога Goodman в базе нет", detail: "Папка Goodman/Amana/Daikin заведена, модели наружных блоков в лист «Каталог» ещё не разложены. Здесь только правило платы A2L из F112–F114.", source: "Индекс 0.2" })
  return out
}

export type Scheme = { title: string; chips: { name: string; hint: string }[]; steps: string[]; source: string }

export function schemeFor(pick: Pick, findings: Finding[]): Scheme | null {
  if (pick.mode === "goodman") {
    return {
      title: "Goodman / Amana — плата A2L",
      chips: [
        { name: "A2E", hint: pick.a2e === "on" ? "остаётся ON" : "перевести в NO" },
        { name: "Сенсор", hint: pick.goodmanCoil === "r32" ? "SER2A08012S" : "сенсора R-32 нет" },
        { name: "EAL", hint: "утечка: газ стоп, вентилятор max" },
      ],
      steps: [
        "Змеевик R-32: A2E не трогать, проверить разъём сенсора.",
        "Старый R-410A или R-22: A2E → NO, два подтверждения, снять и подать питание.",
        "Краску, клей PVC и растворители у сенсора убрать — ложные EAL.",
      ],
      source: "F112, F113, F114",
    }
  }
  if (findings.some((f) => f.level === "stop")) return null
  const outdoor = unitById(pick.outdoorId)
  const control = controlById(pick.controlId)
  if (!outdoor || !control) return null
  if (pick.mode === "ductless") {
    return {
      title: "Мини-сплит — межблочный кабель и фреоновая трасса",
      chips: [
        { name: "L1 L2", hint: "питание по шильдику" },
        { name: "S1 S2", hint: "связь, не путать с 24V канального" },
        { name: "Фланец", hint: "момент по IM, без тефлона" },
      ],
      steps: [
        "Головка и наружный блок одной серии и одного хладагента.",
        "Вальцовка: масло или Nylog, динамометрический ключ. Тефлон и Leak Lock на фланец не ставить.",
        outdoor.refrigerant === "R-454B" ? "Сенсор ductless: порог 10% LFL." : "Наследие R-410A: сенсор A2L не добавлять.",
      ],
      source: "INS-008, CAR_TG",
    }
  }
  if (control.protocol === "abcd") {
    return {
      title: "Шина ABCD — Infinity / Evolution",
      chips: [
        { name: "A", hint: "зелёный, данные" },
        { name: "B", hint: "жёлтый, данные" },
        { name: "C", hint: "белый, 24V common" },
        { name: "D", hint: "красный, 24V hot" },
      ],
      steps: [
        "Порядок жил важнее привычных цветов термостата. A и B не менять местами.",
        "Длинная шина — 18 AWG. Сначала только пульт и внутренний блок, потом наружный, каждый раз заново install.",
        "На печи DIP SW-4 в OFF.",
        "Напряжения: C–D ≈ 24 VAC; A–B ≈ 3.5–4.5 VDC без пульта.",
        pick.rds === "builtin" ? "Dissipation board в фанкойле не обходится и в шину Y не превращается." : "Отдельной клеммы Y на этой шине нет.",
      ],
      source: "UI_SI, F086, INF_TS",
    }
  }
  const hp = outdoor.duty === "hp"
  const mura = outdoor.control === "mura-24v"
  const two = /2-stage/i.test(outdoor.stages)
  const chips = [
    { name: "R", hint: "24V hot, float switch рвёт именно R" },
    { name: "C", hint: pick.hasC ? "common, обязателен для Wi-Fi" : "нет жилы — только PEK ecobee" },
    { name: "G", hint: "вентилятор" },
    { name: "Y", hint: pick.rds === "field" ? "через dissipation board, потом на блок" : "охлаждение / компрессор" },
  ]
  if (two) chips.push({ name: "Y2", hint: "вторая ступень" })
  if (hp) chips.push({ name: mura ? "B" : "O", hint: mura ? "реверс под напряжением в нагреве" : "реверс под напряжением в охлаждении" })
  chips.push({ name: "W", hint: furnaceTone(pick) })
  if (two) chips.push({ name: "W2", hint: "вторая ступень нагрева, если печь двухступенчатая" })
  const steps = [
    "Цвета не доказывают клемму. Звони жилу и подписывай по клемме платы.",
    "Предохранитель платы — того же номинала, обычно 3 A на печи. Перемычку вместо него не ставить.",
    "Поплавок конденсата разрывает R, не «землю».",
  ]
  if (mura) steps.push("DIP SW1-2 по IM. На S1/S2 24 вольта не подавать.")
  if (pick.rds === "field") steps.push("Y (и проверка W) проходит через dissipation board. Мигание 7 или 8 — проводка Y/W.")
  if (hp && !mura) steps.push("В ISU / Equipment выбери heat pump, не conventional. O energized in cooling.")
  if (mura) steps.push("Не ставь привычный Carrier O. Здесь реверс — B, напряжение в heat.")
  steps.push("После вызова подожди до 5 минут: защитная пауза компрессора — не неисправность.")
  return {
    title: mura ? "24V crossover — 37MURA / 37MUHA" : hp ? (two ? "24V тепловой насос, 2 ступени" : "24V тепловой насос, 1 ступень") : two ? "24V кондиционер, 2 ступени" : "24V кондиционер, 1 ступень",
    chips,
    steps,
    source: mura ? "MURA_IM, F016" : "F002, F004, F016, INS-012",
  }
}

function furnaceTone(pick: Pick) {
  return unitById(pick.furnaceId) ? "нагрев печи" : "нагрев, если есть электротены"
}

export const jobs: { id: string; title: string; brief: string; apply: Partial<Pick>; pass: (p: Pick, f: Finding[]) => boolean }[] = [
  {
    id: "infinity",
    title: "Infinity на R-454B",
    brief: "Тепловой насос variable speed, хладагент R-454B, пульт на шине, фанкойл со встроенной платой. Печь не нужна.",
    apply: { mode: "ducted", furnaceId: null, coilId: null, vent: "none" },
    pass: (p, f) => {
      const o = unitById(p.outdoorId)
      const i = unitById(p.indoorId)
      const c = controlById(p.controlId)
      return !f.some((x) => x.level === "stop") && !!o && o.duty === "hp" && o.control === "abcd" && o.refrigerant === "R-454B" && !!i?.builtinRds && c?.protocol === "abcd" && !p.furnaceId
    },
  },
  {
    id: "comfort-hp",
    title: "Одноступенчатый HP и печь",
    brief: "Comfort или Legacy, не Infinity. R-454B, печной змеевик, полевая плата, вентиляция по проценту печи, термостат 24V. Клапан — O, не B.",
    apply: { mode: "ducted", indoorId: null },
    pass: (p, f) => {
      const o = unitById(p.outdoorId)
      return !f.some((x) => x.level === "stop") && !!o && o.duty === "hp" && o.control === "24v" && o.refrigerant === "R-454B" && p.rds === "field" && !!p.furnaceId && !!p.coilId
    },
  },
  {
    id: "mura",
    title: "Crossover 37MURA",
    brief: "Наружный 37MURA или 37MUHA, свой внутренний блок, обычный 24V. Не подавать 24V на S1/S2. Реверс — клемма B.",
    apply: { mode: "ducted", furnaceId: null, coilId: null, vent: "none", rds: "none" },
    pass: (p, f) => {
      const o = unitById(p.outdoorId)
      const c = controlById(p.controlId)
      return !f.some((x) => x.level === "stop") && !!o && o.control === "mura-24v" && c?.protocol === "24v"
    },
  },
  {
    id: "mini",
    title: "Мини-сплит R-454B",
    brief: "Наружный 37M** и головка 45M** или Bryant 615. Один хладагент. Печь не трогать.",
    apply: { mode: "ductless", furnaceId: null, coilId: null, rds: "none", vent: "none" },
    pass: (p, f) => {
      const o = unitById(p.outdoorId)
      const i = unitById(p.indoorId)
      return p.mode === "ductless" && !f.some((x) => x.level === "stop") && o?.refrigerant === "R-454B" && i?.refrigerant === "R-454B"
    },
  },
  {
    id: "goodman",
    title: "Новая печь Goodman и старый змеевик",
    brief: "Змеевик ещё R-410A. Что сделать с A2E, чтобы нагрев вообще стартовал?",
    apply: { mode: "goodman", goodmanCoil: "r410a" },
    pass: (p, f) => p.mode === "goodman" && p.goodmanCoil !== "r32" && p.a2e === "off" && !f.some((x) => x.level === "stop"),
  },
]

export const traps: { title: string; body: string; source: string }[] = [
  { title: "R на C при замене термостата", body: "Перепутанные R и C сажают предохранитель 3 A на плате печи. Новый предохранитель не ставят, пока не измерен кабель Y–C: почти 0 Ом — это короткое в трассе, не «слабый предохранитель».", source: "F002" },
  { title: "Wi-Fi термостат без C", body: "Экран пустой или перезагружается. Норма R–C около 24–28 В. У ecobee без запасной жилы — PEK, не power stealing. Infinity это не лечит: там шина ABCD.", source: "F004" },
  { title: "O вместо B на 37MURA", body: "Обычный Carrier греет реверсом O в охлаждении. Crossover 37MURA/37MUHA держит клапан под напряжением в нагреве, клемма B. После замены пульта дом греет вместо холода.", source: "F016, MURA_IM" },
  { title: "A и B перепутаны", body: "Пульт пишет Searching… Indoor Unit Not Found. A — данные, зелёный; B — данные, жёлтый; C — common, белый; D — hot, красный. Искать неисправность надо с одним коротким кабелем пульт–внутренний блок.", source: "F086, UI_SI" },
  { title: "Y мимо dissipation board", body: "На R-454B провод Y идёт через плату и только потом на наружный блок. Мигание 7 или 8 — ошибка Y/W. Мигание 1 — сенсор увидел ≥20% LFL. Плату не отключают.", source: "F094, F095" },
  { title: "Поплавок не в той жиле", body: "Float switch разрывает R. Если экран погас, а на плате 24 В есть, смотри, не разомкнут ли поплавок в разрыве R.", source: "F004, INS-012" },
  { title: "Предохранитель толще", body: "Вместо 3 A ставят 5 A или перемычку и сжигают трансформатор или дорожку. Номинал — как на плате.", source: "F002" },
]

export function listBy(role: Role | Role[]): Unit[] {
  const roles = Array.isArray(role) ? role : [role]
  return units.filter((u) => roles.includes(u.role))
}

export type Orient = {
  kicker: string
  answer: string
  wrong: string
  chips: { name: string; hint: string }[]
  steps: string[]
  source: string
}

export function orientUnit(unit: Unit): Orient {
  if (unit.role === "ductless-out" || unit.role === "ductless-in") {
    return {
      kicker: "Мини-сплит",
      answer: "Свой межблочный кабель. Это не 24V канального термостата.",
      wrong: "S1/S2 не сажать на R, C, Y.",
      chips: [
        { name: "L1 L2", hint: "питание по шильдику" },
        { name: "S1 S2", hint: "связь блоков, не 24V" },
      ],
      steps: [
        "Головка и наружный блок одного хладагента.",
        unit.refrigerant === "R-454B" ? "Сенсор ductless срабатывает на 10% LFL, не на 20% как канальный." : "На R-410A плату A2L не добавлять.",
      ],
      source: "INS-008, CAR_TG",
    }
  }
  if (unit.control === "mura-24v" || (unit.crossover && unit.role !== "furnace" && unit.role !== "coil")) {
    return {
      kicker: "Термостат · 37MURA / 37MUHA",
      answer: "B. Под напряжением в нагреве.",
      wrong: "Не копируй обычный Carrier: там O в охлаждении. На S1/S2 24 вольта нельзя.",
      chips: [
        { name: "R", hint: "24V hot" },
        { name: "C", hint: "common" },
        { name: "Y", hint: "компрессор" },
        { name: "B", hint: "реверс, напряжение в HEAT" },
        { name: "W", hint: "догрев" },
        { name: "G", hint: "вентилятор" },
      ],
      steps: [
        "В пульте: heat pump. Реверсивный клапан — B, energized in heating.",
        "DIP SW1-2 по IM. S1/S2 оставь связью.",
        "Полевую RDS с печи и встроенную FE5B сюда не переноси. Сенсор бери из IM и не обходи.",
      ],
      source: "MURA_IM, F016, F094",
    }
  }
  if (unit.builtinRds) {
    const talking = unit.bus === "abcd"
    return {
      kicker: "RDS во фанкойле",
      answer: "Коробка уже внутри. FE5B, FJ5 или FT5.",
      wrong: "Вторую, полевую, сверху не ставить. Y не обходить.",
      chips: talking
        ? [
            { name: "Плата", hint: "в корпусе, сенсор 20% LFL" },
            { name: "A", hint: "зелёный, данные" },
            { name: "B", hint: "жёлтый, данные" },
            { name: "C", hint: "белый, common" },
            { name: "D", hint: "красный, 24V hot" },
          ]
        : [
            { name: "Плата", hint: "в корпусе фанкойла" },
            { name: "Сенсор", hint: "20% LFL" },
          ],
      steps: [
        talking ? "Пульт только Infinity / Evolution. Обычный 24V этот фанкойл не найдёт. A и B не менять." : "Обход сенсора в базе записан как ошибка.",
        "После срабатывания нагрев гасится, вентилятор ещё 5 минут.",
      ],
      source: "FE5B, F094, F086",
    }
  }
  if (unit.control === "abcd" || unit.bus === "abcd") {
    return {
      kicker: "Пульт Infinity / Evolution",
      answer: "Только шина ABCD. Обычный термостат блок не найдёт.",
      wrong: "A и B здесь данные, не клапан теплового насоса. Местами не менять.",
      chips: [
        { name: "A", hint: "зелёный, данные" },
        { name: "B", hint: "жёлтый, данные" },
        { name: "C", hint: "белый, 24V common" },
        { name: "D", hint: "красный, 24V hot" },
      ],
      steps: [
        "Сначала пульт и внутренний блок коротким кабелем. Потом наружный, каждый раз заново install.",
        unit.builtinRds ? "Плата A2L уже в корпусе. Вторую коробку не ставить." : "Отдельной клеммы Y на этой шине нет.",
        "На печи DIP SW-4 в OFF. C–D около 24 В.",
      ],
      source: "UI_SI, F086",
    }
  }
  if (unit.role === "coil") {
    const a2l = unit.refrigerant === "R-454B"
    return {
      kicker: "RDS на змеевике печи",
      answer: a2l ? "Полевая коробка. Y с термостата в неё, и только потом на блок." : "Коробку A2L не ставить.",
      wrong: a2l ? "Напрямую на наружный Y не кидать." : "Это не R-454B. Чужую dissipation board не вешать.",
      chips: a2l
        ? [
            { name: "Y", hint: "термостат → плата → наружный" },
            { name: "W", hint: "тоже через плату, иначе код 7/8" },
            { name: "Сенсор", hint: "20% LFL, не обходить" },
          ]
        : [{ name: "Y", hint: "с термостата сразу на блок" }],
      steps: a2l
        ? ["Мигание 7 или 8 — перепутаны Y/W.", "Мигание 1 — сенсор увидел утечку. Плату не отключают, блоуэр ещё 5 минут."]
        : ["R-410A и R-22 живут без сенсора и без dissipation board."],
      source: "F094, F095",
    }
  }
  if (unit.role === "furnace") {
    const vent = unit.vent === "pvc" ? "PVC, Cat IV. Не в Type B." : unit.vent === "b" ? "Type B, 80%. Не в PVC." : "Процент печи смотри на шильдике, не угадывай."
    return {
      kicker: "Печь",
      answer: vent,
      wrong: "Поплавок рвёт R, не землю. Предохранитель как на плате, обычно 3 A.",
      chips: [
        { name: "R", hint: "24V hot, поплавок здесь" },
        { name: "C", hint: "common" },
        { name: "W", hint: "нагрев" },
        { name: "G", hint: "вентилятор" },
      ],
      steps: ["Перепутанные R и C сажают предохранитель. Новый не ставь, пока не прозвонишь кабель."],
      source: "F002, INS-005",
    }
  }
  if (unit.duty === "hp") {
    const two = /2-stage|2 ступ/i.test(unit.stages + unit.notes)
    return {
      kicker: "Термостат · тепловой насос Carrier / Bryant",
      answer: "O. Под напряжением в охлаждении.",
      wrong: "Не в нагреве и не на клемме B. B — только у 37MURA / 37MUHA.",
      chips: [
        { name: "R", hint: "24V hot, поплавок рвёт R" },
        { name: "C", hint: "common" },
        { name: "Y", hint: unit.refrigerant === "R-454B" ? "через RDS, если змеевик печи" : "компрессор" },
        { name: "O", hint: "реверс, напряжение в COOL" },
        { name: "W", hint: "догрев" },
        { name: "G", hint: "вентилятор" },
        ...(two ? [{ name: "Y2", hint: "вторая ступень" }] : []),
      ],
      steps: [
        "В настройках пульта: heat pump, не conventional. O/B = O. Energized in cooling.",
        "Проверка: в режиме Cool между O и C около 24 В. В Heat на O напряжения нет.",
        unit.refrigerant === "R-454B" ? "Змеевик печи на R-454B: Y сначала в полевую RDS, потом на блок. Фанкойл FE5B / FJ5 / FT5: коробка уже внутри." : "R-410A: dissipation board не нужна.",
      ],
      source: "F016, SM_9, F094",
    }
  }
  const two = /2-stage|2 ступ/i.test(unit.stages + unit.notes)
  return {
    kicker: "Термостат · кондиционер",
    answer: "Клапана нет. O и B не подключать.",
    wrong: "Не ставь heat pump в настройках пульта. Это conventional.",
    chips: [
      { name: "R", hint: "24V hot" },
      { name: "C", hint: "common" },
      { name: "Y", hint: "охлаждение" },
      { name: "W", hint: "нагрев печи или тенов" },
      { name: "G", hint: "вентилятор" },
      ...(two ? [{ name: "Y2", hint: "вторая ступень" }] : []),
    ],
    steps: [unit.refrigerant === "R-454B" ? "На змеевике печи Y идёт через полевую RDS." : "Плата A2L не нужна."],
    source: "F004, F094",
  }
}
