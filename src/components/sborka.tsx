import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  controls,
  emptyPick,
  match,
  orientUnit,
  parseTons,
  placeNeeds,
  suggestRds,
  unitById,
  units,
  type Control,
  type Place,
  type Stance,
  type Unit,
} from "@/lib/hvac";

const shopKey = "sborka-shop"
const jobKey = "sborka-job"

const brandChoices = ["Carrier", "Bryant"]

const places: { id: Place; name: string }[] = [
  { id: "closet", name: "Клозет" },
  { id: "garage", name: "Гараж" },
  { id: "attic", name: "Чердак" },
  { id: "basement", name: "Подвал" },
  { id: "open", name: "Открыто" },
]

const stances: { id: Stance; name: string }[] = [
  { id: "up", name: "Вверх" },
  { id: "down", name: "Вниз" },
  { id: "horizontal", name: "Горизонтально" },
]

type Shop = { brands: string[]; controlIds: string[] }

type Job = {
  place: Place
  stance: Stance
  outdoorId: string | null
  indoorId: string | null
  furnaceId: string | null
  coilId: string | null
  outdoorSerial: string
  indoorSerial: string
  controlId: string | null
}

const emptyJob: Job = {
  place: "closet",
  stance: "up",
  outdoorId: null,
  indoorId: null,
  furnaceId: null,
  coilId: null,
  outdoorSerial: "",
  indoorSerial: "",
  controlId: null,
}

function norm(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

function inShop(unit: Unit, brands: string[]) {
  return unit.brand.split("/").some((b) => brands.includes(b.trim()))
}

function searchUnits(q: string, brands: string[]): Unit[] {
  const n = norm(q)
  if (n.length < 2) return []
  return units
    .filter((u) => inShop(u, brands))
    .map((u) => {
      const m = norm(u.model)
      let score = 0
      if (m === n) score = 200
      else if (m.startsWith(n) || (n.startsWith(m) && m.length >= 4)) score = 100
      else if (m.includes(n)) score = 40
      return { u, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.u.model.localeCompare(b.u.model))
    .slice(0, 6)
    .map((x) => x.u)
}

const roleName: Record<Unit["role"], string> = {
  outdoor: "наружный",
  ahandler: "фанкойл",
  coil: "змеевик",
  furnace: "печь",
  "ductless-out": "мини-сплит",
  "ductless-in": "головка",
}

export function Sborka() {
  const [shop, setShop] = useState<Shop | null>(null)
  const [ready, setReady] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(shopKey)
      if (raw) {
        const parsed = JSON.parse(raw) as Shop
        if (parsed.brands?.length && parsed.controlIds?.length) setShop(parsed)
      }
    } catch {
      /* пустая настройка */
    }
    setReady(true)
  }, [])

  function saveShop(next: Shop) {
    localStorage.setItem(shopKey, JSON.stringify(next))
    setShop(next)
    setEditing(false)
  }

  if (!ready) return <main className="min-h-screen bg-bg" />
  if (!shop || editing) {
    return <ShopForm initial={shop} onSave={saveShop} onCancel={shop ? () => setEditing(false) : null} />
  }
  return <Today shop={shop} onEdit={() => setEditing(true)} />
}

function ShopForm({ initial, onSave, onCancel }: { initial: Shop | null; onSave: (shop: Shop) => void; onCancel: (() => void) | null }) {
  const [brands, setBrands] = useState<string[]>(initial?.brands ?? [])
  const [controlIds, setControlIds] = useState<string[]>(initial?.controlIds ?? [])
  const ok = brands.length > 0 && controlIds.length > 0

  function toggle(list: string[], id: string, set: (next: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-5">
      <p className="font-mono text-xs tracking-widest text-brass">ОДИН РАЗ</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">С чем работаешь</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Отметь марки и пульты, которые возишь. На заказе список будет только из этого, без чужих моделей.
      </p>

      <h2 className="mt-6 text-sm font-semibold">Блоки</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {brandChoices.map((brand) => (
          <Chip key={brand} on={brands.includes(brand)} onClick={() => toggle(brands, brand, setBrands)}>
            {brand}
          </Chip>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">Payne и другие марки блоков в каталоге ещё не заведены. Payne можно отметить ниже как пульт.</p>

      <h2 className="mt-6 text-sm font-semibold">Пульты</h2>
      <div className="mt-2 flex flex-col gap-2">
        {controls.map((control) => (
          <button
            key={control.id}
            type="button"
            onClick={() => toggle(controlIds, control.id, setControlIds)}
            className={`min-h-14 rounded-xl border px-3 text-left ${controlIds.includes(control.id) ? "border-brass bg-surface" : "border-ink/15 bg-surface"}`}
          >
            <span className="block font-medium">{control.name}</span>
            <span className="block text-xs text-muted">{control.protocol === "abcd" ? "шина ABCD" : "обычный 24V"} · {control.brand}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!ok}
        onClick={() => onSave({ brands, controlIds })}
        className="mt-6 min-h-12 w-full rounded-xl bg-ink font-medium text-bg disabled:opacity-40"
      >
        Готово
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="mt-2 min-h-11 w-full text-sm text-muted">
          Назад к заказу
        </button>
      )}
    </main>
  )
}

function Today({ shop, onEdit }: { shop: Shop; onEdit: () => void }) {
  const [job, setJob] = useState<Job>(emptyJob)
  const [ready, setReady] = useState(false)
  const [q, setQ] = useState("")

  useEffect(() => {
    try {
      const raw = localStorage.getItem(jobKey)
      if (raw) setJob({ ...emptyJob, ...JSON.parse(raw) })
    } catch {
      /* новый заказ */
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) localStorage.setItem(jobKey, JSON.stringify(job))
  }, [job, ready])

  const mine = controls.filter((c) => shop.controlIds.includes(c.id))
  const outdoor = unitById(job.outdoorId)
  const indoor = unitById(job.indoorId)
  const furnace = unitById(job.furnaceId)
  const coil = unitById(job.coilId)
  const control = mine.find((c) => c.id === job.controlId) ?? mine[0] ?? null
  const ductless = outdoor?.role === "ductless-out"
  const complete = !!outdoor && (ductless ? !!indoor : !!indoor || (!!furnace && !!coil))
  const hits = useMemo(() => searchUnits(q, shop.brands), [q, shop.brands])

  const findings = useMemo(() => {
    if (!complete || !outdoor || !control) return []
    return match({
      ...emptyPick,
      mode: ductless ? "ductless" : "ducted",
      outdoorId: outdoor.id,
      indoorId: indoor?.id ?? null,
      furnaceId: ductless ? null : furnace?.id ?? null,
      coilId: ductless ? null : coil?.id ?? null,
      controlId: control.id,
      rds: suggestRds(outdoor, indoor, coil),
      vent: furnace?.vent === "pvc" ? "pvc" : furnace?.vent === "b" ? "b" : "none",
      hasC: true,
      outdoorSerial: job.outdoorSerial,
      indoorSerial: job.indoorSerial,
    })
  }, [complete, outdoor, indoor, furnace, coil, control, ductless, job.outdoorSerial, job.indoorSerial])

  const stops = findings.filter((f) => f.level === "stop")

  function placeUnit(unit: Unit) {
    const typed = norm(q)
    const serial = typed.length > norm(unit.model).length ? q.trim() : ""
    setJob((prev) => {
      const next = { ...prev }
      if (unit.role === "outdoor" || unit.role === "ductless-out") {
        next.outdoorId = unit.id
        next.outdoorSerial = serial
        if (unit.role === "ductless-out") {
          next.furnaceId = null
          next.coilId = null
        }
      } else if (unit.role === "ahandler") {
        next.indoorId = unit.id
        next.furnaceId = null
        next.coilId = null
        next.indoorSerial = serial
      } else if (unit.role === "furnace") {
        next.furnaceId = unit.id
        next.indoorId = null
      } else if (unit.role === "coil") {
        next.coilId = unit.id
        next.indoorId = null
        next.indoorSerial = serial
      } else {
        next.indoorId = unit.id
        next.furnaceId = null
        next.coilId = null
        next.indoorSerial = serial
      }
      return next
    })
    setQ("")
  }

  function clear(role: Unit["role"]) {
    setJob((prev) => {
      const next = { ...prev }
      if (role === "outdoor" || role === "ductless-out") {
        next.outdoorId = null
        next.outdoorSerial = ""
      } else if (role === "furnace") next.furnaceId = null
      else if (role === "coil") {
        next.coilId = null
        next.indoorSerial = ""
      } else {
        next.indoorId = null
        next.indoorSerial = ""
      }
      return next
    })
  }

  const chosen = [outdoor, indoor, furnace, coil].filter(Boolean) as Unit[]
  const orient = outdoor ? orientUnit(outdoor) : null
  const needs = orderLines(outdoor, indoor, furnace, coil, control, job.place, job.stance)

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-widest text-brass">СЕГОДНЯ</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Этот заказ</h1>
        </div>
        <button type="button" onClick={onEdit} className="min-h-11 shrink-0 text-sm font-medium text-brass">
          Моё
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">{shop.brands.join(" · ")}. Чужие марки в поиск не попадают.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {places.map((item) => (
          <Chip key={item.id} on={job.place === item.id} onClick={() => setJob({ ...job, place: item.id })}>
            {item.name}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {stances.map((item) => (
          <Chip key={item.id} on={job.stance === item.id} onClick={() => setJob({ ...job, stance: item.id })}>
            {item.name}
          </Chip>
        ))}
      </div>

      <label className="mt-4 flex min-h-12 items-center gap-2 rounded-xl border border-ink/20 bg-surface px-3">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="27SPA636, FE5B, 59TP6…"
          className="min-h-12 w-full bg-transparent font-mono text-base outline-none"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
      {hits.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-ink/15 bg-surface">
          {hits.map((unit) => (
            <li key={unit.id} className="border-b border-ink/10 last:border-b-0">
              <button type="button" onClick={() => placeUnit(unit)} className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left">
                <span>
                  <span className="block font-mono text-base font-semibold">{unit.model}</span>
                  <span className="block text-xs text-muted">
                    {roleName[unit.role]} · {unit.refrigerant === "unknown" ? "газ не разведён" : unit.refrigerant}
                  </span>
                </span>
                <span className="text-sm font-medium text-brass">В заказ</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {chosen.map((unit) => (
          <div key={unit.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink/15 bg-surface px-3 py-2">
            <div>
              <p className="font-mono text-xs text-brass">{roleName[unit.role]}</p>
              <p className="font-mono text-lg font-semibold">{unit.model}</p>
              <p className="text-xs text-muted">
                {unit.brand} · {unit.refrigerant === "unknown" ? "газ не разведён" : unit.refrigerant}
                {unit.line ? ` · ${unit.line}` : ""}
              </p>
            </div>
            <button type="button" aria-label="Убрать" onClick={() => clear(unit.role)} className="grid size-11 place-items-center text-muted">
              <X className="size-4" />
            </button>
          </div>
        ))}
        {chosen.length === 0 && <p className="text-sm text-muted">Вбей номера с заказа. Наружный, фанкойл или печь со змеевиком встанут сами.</p>}
      </div>

      {mine.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-muted">Пульт на этом заказе</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {mine.map((item) => (
              <Chip key={item.id} on={control?.id === item.id} onClick={() => setJob({ ...job, controlId: item.id })}>
                {item.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <section className="mt-5 rounded-xl border border-ink/15 bg-surface p-4">
        <p className="font-mono text-xs tracking-wide text-brass">{complete ? (stops.length ? `НЕ СХОДИТСЯ · ${stops.length}` : "СХОДИТСЯ") : "ЗАКАЗ"}</p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">
          {!outdoor && "Добавь оборудование"}
          {outdoor && !complete && "Ещё не весь заказ"}
          {complete && stops.length > 0 && stops[0].title}
          {complete && stops.length === 0 && "Стыкуется"}
        </h2>
        {complete && stops.length > 0 && <p className="mt-2 text-sm leading-relaxed">{stops[0].detail}</p>}
        {outdoor && !complete && (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {furnace && !coil ? "К печи нужен змеевик." : ductless ? "Нужна головка того же мини-сплита." : "Нужен фанкойл или печь со змеевиком."}
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed">{sizeLine(job.outdoorSerial, job.indoorSerial, outdoor, coil ?? indoor)}</p>
        {needs.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2 border-t border-ink/10 pt-3">
            {needs.map((item) => (
              <li key={item.title}>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm leading-relaxed text-muted">{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
        {orient && outdoor && control && <Strip outdoor={outdoor} control={control} rds={suggestRds(outdoor, indoor, coil)} />}
      </section>

      {chosen.length > 0 && (
        <button
          type="button"
          onClick={() => setJob({ ...emptyJob, place: job.place, stance: job.stance, controlId: job.controlId })}
          className="mt-4 min-h-11 text-sm text-muted"
        >
          Очистить заказ
        </button>
      )}
    </main>
  )
}

function orderLines(
  outdoor: Unit | null,
  indoor: Unit | null,
  furnace: Unit | null,
  coil: Unit | null,
  control: Control | null,
  place: Place,
  stance: Stance,
) {
  const lines: { title: string; detail: string }[] = []
  if (outdoor) {
    const orient = orientUnit(outdoor)
    lines.push({ title: orient.answer, detail: orient.wrong })
    const rds = suggestRds(outdoor, indoor, coil)
    if (rds === "builtin") lines.push({ title: "RDS уже в фанкойле", detail: "Отдельную коробку в заказ не класть и Y не обходить." })
    else if (rds === "field") lines.push({ title: "В заказ: полевая RDS", detail: "Y с пульта в коробку и только потом на наружный блок." })
    else if (outdoor.refrigerant === "R-454B" && (outdoor.crossover || indoor?.crossover)) lines.push({ title: "Чужую RDS не заказывать", detail: "37MURA / 45MU: ни плата FE5B, ни полевая с печи. Сенсор по IM." })
    else if (outdoor.refrigerant === "R-410A") lines.push({ title: "Плату A2L не заказывать", detail: "Это R-410A." })
    if (furnace?.vent === "pvc") lines.push({ title: "Вент: PVC", detail: "Печь конденсационная. Type B в заказ не класть." })
    if (furnace?.vent === "b") lines.push({ title: "Вент: Type B", detail: "Печь 80%. PVC от конденсационной сюда не переносить." })
    if (control?.protocol === "24v" && control.wifi) lines.push({ title: "Жила C", detail: control.pek ? "Wi-Fi пульт. Нет жилы C — PEK, не power stealing." : "Wi-Fi пульт без жилы C не держит экран." })
  }
  lines.push(...placeNeeds(place, stance, !!furnace))
  return lines
}

function sizeLine(outdoorSerial: string, indoorSerial: string, outdoor: Unit | null, indoor: Unit | null) {
  const a = parseTons(outdoorSerial) ?? parseTons(outdoor?.model ?? "")
  const b = parseTons(indoorSerial) ?? parseTons(indoor?.model ?? "")
  if (a && b) return a === b ? `Номинал совпал: ${a} т и ${a} т.` : `Номинал не совпал: наружный ${a} т, внутренний ${b} т.`
  if (a || b) return `Из номера читается ${a ?? b} т. Второй размер в серии не записан.`
  return "Ширину и высоту шкафа база не хранит. Тоннаж появится из полного номера, например 27SPA636."
}

function Strip({ outdoor, control, rds }: { outdoor: Unit; control: Control; rds: "none" | "builtin" | "field" }) {
  if (control.protocol === "abcd" || outdoor.control === "abcd") {
    return <Wires title="Шина, не клеммы клапана" rows={[
      ["A", "зелёный, данные"],
      ["B", "жёлтый, данные"],
      ["C", "белый, common"],
      ["D", "красный, 24V"],
    ]} hot="A" />
  }
  if (outdoor.control === "mura-24v") {
    return <Wires title="Клапан на B, напряжение в нагреве" rows={[
      ["R", "24V, поплавок здесь"],
      ["C", "common"],
      ["Y", "компрессор"],
      ["B", "24 В в Heat"],
      ["W", "догрев"],
    ]} hot="B" />
  }
  if (outdoor.duty === "hp") {
    const y = rds === "field" ? "через RDS, потом на блок" : "компрессор"
    return <Wires title="Клапан на O, напряжение в охлаждении" rows={[
      ["R", "24V, поплавок здесь"],
      ["C", "common"],
      ["Y", y],
      ["O", "24 В в Cool"],
      ["W", "догрев"],
    ]} hot="O" />
  }
  return <Wires title="Клапана нет" rows={[
    ["R", "24V"],
    ["C", "common"],
    ["Y", rds === "field" ? "через RDS" : "охлаждение"],
    ["W", "нагрев"],
  ]} hot="Y" />
}

function Wires({ title, rows, hot }: { title: string; rows: [string, string][]; hot: string }) {
  return (
    <div className="mt-4 border-t border-ink/10 pt-3">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-2 flex justify-between font-mono text-xs text-muted">
        <span>Пульт</span>
        <span>Куда</span>
      </div>
      {rows.map(([name, to]) => (
        <div key={name} className="grid grid-cols-[2.5rem_1fr_minmax(0,9rem)] items-center gap-2 py-1">
          <span className="font-mono text-lg font-semibold">{name}</span>
          <span className={`h-px ${name === hot ? "bg-brass" : "bg-ink/25"}`} />
          <span className={`text-right text-xs leading-snug ${name === hot ? "font-medium text-brass" : "text-muted"}`}>{to}</span>
        </div>
      ))}
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full border px-3 text-sm ${on ? "border-brass bg-surface font-medium" : "border-ink/15 bg-surface text-muted"}`}
    >
      {children}
    </button>
  )
}
