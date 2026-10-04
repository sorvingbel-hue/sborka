import { useEffect, useMemo, useState } from "react";
import { Ban, Check, Info, Search } from "lucide-react";
import {
  controls,
  decodeModel,
  emptyPick,
  jobs,
  listBy,
  match,
  rdsChoices,
  schemeFor,
  traps,
  unitById,
  units,
  ventChoices,
  type Finding,
  type Pick,
  type RdsId,
  type Role,
  type Unit,
  type VentId,
} from "@/lib/hvac";

type Tab = "bench" | "catalog" | "number" | "traps";

const archetypes: { title: string; body: string; source: string }[] = [
  { title: "ABCD — Infinity / Evolution", body: "A зелёный и B жёлтый — данные, C белый — 24V common, D красный — 24V hot. Variable speed без этого пульта не собирается. A и B не менять.", source: "UI_SI, F086" },
  { title: "24V, кондиционер", body: "R, C, G, Y, W. Две ступени добавляют Y2 и W2. Поплавок рвёт R. Предохранитель платы — штатный, обычно 3 A.", source: "F002, F004, INS-012" },
  { title: "24V, тепловой насос Carrier/Bryant", body: "Те же клеммы плюс O: реверсивный клапан под напряжением в охлаждении. В настройках пульта — heat pump, не conventional.", source: "F016, SM_9" },
  { title: "24V, crossover 37MURA / 37MUHA", body: "Обычный термостат и DIP SW1-2. 24V на S1/S2 нельзя. Реверс здесь на B и под напряжением в нагреве, не как у остальных Carrier.", source: "MURA_IM, F016" },
  { title: "R-454B, канальный змеевик печи", body: "Y идёт через dissipation board и только потом на наружный блок. Мигание 7/8 — ошибка Y/W. Сенсор 20% LFL, плату не обходят.", source: "F094, F095" },
  { title: "Мини-сплит", body: "Своя головка и тот же хладагент. Межблочный кабель не путать с канальным 24V. Порог сенсора R-454B у ductless — 10% LFL.", source: "CAR_TG, INS-008" },
  { title: "Goodman A2E", body: "Новая печь и старый змеевик R-410A/R-22: A2E → NO и снять питание. На R-32 A2E не выключать, жгут сенсора SER2A08012S.", source: "F112, F113, F114" },
];

export function Sborka() {
  const [tab, setTab] = useState<Tab>("bench");
  const [pick, setPick] = useState<Pick>(emptyPick);
  const [ready, setReady] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sborka-pick");
      if (raw) setPick({ ...emptyPick, ...JSON.parse(raw) });
    } catch {
      /* keep empty */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("sborka-pick", JSON.stringify(pick));
  }, [pick, ready]);

  const findings = useMemo(() => match(pick), [pick]);
  const scheme = useMemo(() => schemeFor(pick, findings), [pick, findings]);
  const stops = findings.filter((f) => f.level === "stop").length;

  function patch(partial: Partial<Pick>) {
    setPick((p) => ({ ...p, ...partial }));
    setChecked(false);
  }

  function loadJob(id: string) {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    setPick({ ...emptyPick, ...job.apply });
    setJobId(id);
    setChecked(false);
    setTab("bench");
  }

  const job = jobs.find((j) => j.id === jobId) ?? null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 border-b border-ink/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-widest text-brass">ПОЛЕВОЙ РАЗБОР · НЕ ИГРА</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Сборка</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Что с чем стыкуется: хладагент, номинал, пульт, вентиляция печи и плата A2L. Правила взяты из базы «HVAC Game», лист «Каталог» и записи по 24V, ABCD и R-454B. Где строки нет — пара не считается разрешённой.
          </p>
        </div>
        <p className="font-mono text-xs text-muted">134 строки · Carrier / Bryant · 4 окт 2026</p>
      </header>

      <nav className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["bench", "Стенд"],
            ["catalog", "Каталог"],
            ["number", "Номер"],
            ["traps", "Как не собрать"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-h-11 rounded-full px-4 text-sm font-medium ${tab === id ? "bg-ink text-bg" : "bg-surface text-ink"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "bench" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ducted", "Канальная"],
                  ["ductless", "Мини-сплит"],
                  ["goodman", "Goodman A2L"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => patch({ mode: id, outdoorId: null, indoorId: null, furnaceId: null, coilId: null })}
                  className={`min-h-11 rounded-md px-3 text-sm ${pick.mode === id ? "bg-brass text-bg" : "bg-surface text-ink"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-ink/15 bg-surface p-4">
              <h2 className="text-sm font-semibold">Задания</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {jobs.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => loadJob(item.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left ${jobId === item.id ? "bg-ink text-bg" : "bg-bg text-ink"}`}
                    >
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className={`mt-1 block text-xs leading-relaxed ${jobId === item.id ? "text-bg/80" : "text-muted"}`}>{item.brief}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {pick.mode === "goodman" ? (
              <GoodmanForm pick={pick} patch={patch} />
            ) : (
              <DuctForm pick={pick} patch={patch} />
            )}
          </section>

          <section className="flex flex-col gap-4">
            <div className="rounded-xl border border-ink/15 bg-surface p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold">Вердикт</h2>
                <p className="font-mono text-xs text-brass">{stops === 0 ? "СТОПОВ НЕТ" : `СТОП: ${stops}`}</p>
              </div>
              <ul className="mt-3 flex flex-col gap-3">
                {findings.map((f, i) => (
                  <FindingRow key={`${f.title}-${i}`} finding={f} />
                ))}
              </ul>
              {job && (
                <div className="mt-4 border-t border-ink/15 pt-4">
                  <button type="button" onClick={() => setChecked(true)} className="min-h-11 rounded-md bg-ink px-4 text-sm font-medium text-bg">
                    Проверить задание
                  </button>
                  {checked && (
                    <p className="mt-3 text-sm font-medium">
                      {job.pass(pick, findings) ? "Сходится. Эту связку база пропускает." : "Пока нет. Смотри стопы сверху и условие задания."}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-ink/15 bg-surface p-4">
              <h2 className="text-sm font-semibold">Схема этой связки</h2>
              {scheme ? (
                <>
                  <p className="mt-2 font-medium">{scheme.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {scheme.chips.map((chip) => (
                      <div key={chip.name} className="min-w-28 rounded-md border border-ink/15 bg-bg px-3 py-2">
                        <p className="font-mono text-lg font-semibold">{chip.name}</p>
                        <p className="text-xs leading-snug text-muted">{chip.hint}</p>
                      </div>
                    ))}
                  </div>
                  <ol className="mt-4 flex list-decimal flex-col gap-2 pl-4 text-sm leading-relaxed">
                    {scheme.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="mt-3 font-mono text-xs text-muted">{scheme.source}</p>
                </>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-muted">Схему не рисую, пока в вердикте есть стоп. Иначе получится картинка неправильного монтажа.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "catalog" && (
        <Catalog
          query={q}
          setQuery={setQ}
          onUse={(unit) => {
            const slot =
              unit.role === "outdoor" || unit.role === "ductless-out"
                ? "outdoorId"
                : unit.role === "furnace"
                  ? "furnaceId"
                  : unit.role === "coil"
                    ? "coilId"
                    : "indoorId";
            const mode = unit.role === "ductless-out" || unit.role === "ductless-in" ? "ductless" : "ducted";
            patch({ mode, [slot]: unit.id });
            setTab("bench");
          }}
        />
      )}

      {tab === "number" && <Decoder onUse={(id, serial) => { patch({ mode: "ducted", outdoorId: id, outdoorSerial: serial }); setTab("bench"); }} />}

      {tab === "traps" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {traps.map((trap) => (
            <article key={trap.title} className="rounded-xl border border-ink/15 bg-surface p-4">
              <h2 className="font-medium">{trap.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{trap.body}</p>
              <p className="mt-3 font-mono text-xs text-brass">{trap.source}</p>
            </article>
          ))}
          {archetypes.map((item) => (
            <article key={item.title} className="rounded-xl border border-ink/15 bg-bg p-4">
              <h2 className="font-medium">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed">{item.body}</p>
              <p className="mt-3 font-mono text-xs text-muted">{item.source}</p>
            </article>
          ))}
        </div>
      )}

      <footer className="mt-8 border-t border-ink/15 pt-4 text-xs leading-relaxed text-muted">
        Индекс базы 0.2. Посерийно разложены Carrier и Bryant. Папки Lennox, Trane, Rheem, Goodman, Mitsubishi в Drive есть, каталогов моделей в них ещё нет — эти марки в подбор не подставлены. Goodman разобран только по плате A2E (F112–F114). Это обучалка по записям базы, не замена шильдика и мануала на объекте.
      </footer>
    </main>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const Icon = finding.level === "stop" ? Ban : finding.level === "ok" ? Check : Info;
  const tone = finding.level === "stop" ? "text-brass" : finding.level === "ok" ? "text-ink" : "text-muted";
  return (
    <li className="flex gap-3">
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden="true" />
      <div>
        <p className={`text-sm font-medium ${tone}`}>{finding.level === "stop" ? "Стоп. " : finding.level === "ok" ? "Можно. " : "Смотри. "}{finding.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{finding.detail}</p>
        <p className="mt-1 font-mono text-xs text-muted">{finding.source}</p>
      </div>
    </li>
  );
}

function DuctForm({ pick, patch }: { pick: Pick; patch: (p: Partial<Pick>) => void }) {
  const ductless = pick.mode === "ductless";
  return (
    <div className="flex flex-col gap-3">
      <UnitSelect
        label={ductless ? "Наружный мини-сплит" : "Наружный блок"}
        units={listBy(ductless ? "ductless-out" : "outdoor")}
        value={pick.outdoorId}
        onChange={(outdoorId) => patch({ outdoorId })}
      />
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Полный номер наружного, если есть</span>
        <input
          value={pick.outdoorSerial}
          onChange={(e) => patch({ outdoorSerial: e.target.value })}
          placeholder="27SPA660A003"
          className="min-h-11 w-full rounded-md border border-ink/15 bg-bg px-3 font-mono text-sm"
        />
      </label>
      <UnitSelect
        label={ductless ? "Внутренний блок" : "Фанкойл"}
        units={listBy(ductless ? "ductless-in" : "ahandler")}
        value={pick.indoorId}
        onChange={(indoorId) => patch({ indoorId })}
      />
      {!ductless && (
        <>
          <UnitSelect label="Печь" units={listBy("furnace")} value={pick.furnaceId} onChange={(furnaceId) => patch({ furnaceId })} />
          <UnitSelect label="Змеевик на печь" units={listBy("coil")} value={pick.coilId} onChange={(coilId) => patch({ coilId })} />
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Полный номер змеевика или фанкойла</span>
            <input
              value={pick.indoorSerial}
              onChange={(e) => patch({ indoorSerial: e.target.value })}
              placeholder="293VAN03600A"
              className="min-h-11 w-full rounded-md border border-ink/15 bg-bg px-3 font-mono text-sm"
            />
          </label>
          <SelectRow
            label="Вентиляция печи"
            value={pick.vent}
            onChange={(vent) => patch({ vent: vent as VentId })}
            options={ventChoices.map((v) => ({ id: v.id, label: v.name }))}
          />
          <SelectRow
            label="Плата A2L / RDS"
            value={pick.rds}
            onChange={(rds) => patch({ rds: rds as RdsId })}
            options={rdsChoices.map((v) => ({ id: v.id, label: v.name }))}
          />
        </>
      )}
      <SelectRow
        label="Пульт"
        value={pick.controlId ?? ""}
        onChange={(controlId) => patch({ controlId: controlId || null })}
        options={[{ id: "", label: "Не выбран" }, ...controls.map((c) => ({ id: c.id, label: c.name }))]}
      />
      {!ductless && (
        <button
          type="button"
          onClick={() => patch({ hasC: !pick.hasC })}
          className="min-h-11 rounded-md border border-ink/15 bg-bg px-3 text-left text-sm"
        >
          {pick.hasC ? "Жила C в кабеле есть" : "Жилы C нет"}
        </button>
      )}
    </div>
  );
}

function GoodmanForm({ pick, patch }: { pick: Pick; patch: (p: Partial<Pick>) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink/15 bg-surface p-4">
      <h2 className="text-sm font-semibold">Печь Goodman / Amana 2025+ и змеевик</h2>
      <p className="text-sm leading-relaxed text-muted">Моделей наружных блоков Goodman в листе каталога нет. Здесь только развилка A2E из сервисных записей.</p>
      <SelectRow
        label="Змеевик"
        value={pick.goodmanCoil}
        onChange={(goodmanCoil) => patch({ goodmanCoil: goodmanCoil as Pick["goodmanCoil"] })}
        options={[
          { id: "r32", label: "R-32, сенсор на месте" },
          { id: "r410a", label: "Старый R-410A" },
          { id: "r22", label: "Старый R-22" },
        ]}
      />
      <SelectRow
        label="Плата, пункт A2E"
        value={pick.a2e}
        onChange={(a2e) => patch({ a2e: a2e as Pick["a2e"] })}
        options={[
          { id: "on", label: "A2E включён, как с завода" },
          { id: "off", label: "A2E переведён в NO" },
        ]}
      />
    </div>
  );
}

function UnitSelect({ label, units: list, value, onChange }: { label: string; units: Unit[]; value: string | null; onChange: (id: string | null) => void }) {
  const [filter, setFilter] = useState("");
  const shown = list.filter((u) => `${u.brand} ${u.model} ${u.line} ${u.refrigerant}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const current = unitById(value);
  return (
    <div className="rounded-xl border border-ink/15 bg-surface p-3">
      <label className="block text-sm font-medium">
        {label}
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Фильтр по модели"
          className="mt-2 min-h-11 w-full rounded-md border border-ink/15 bg-bg px-3 text-sm"
        />
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="mt-2 min-h-11 w-full rounded-md border border-ink/15 bg-bg px-3 text-sm"
        >
          <option value="">Не выбран</option>
          {shown.map((u) => (
            <option key={u.id} value={u.id}>
              {u.brand} {u.model} · {u.refrigerant === "unknown" ? ventLabel(u) : u.refrigerant}
              {u.stages ? ` · ${u.stages}` : ""}
            </option>
          ))}
        </select>
      </label>
      {current && <p className="mt-2 text-xs leading-relaxed text-muted">{current.line ? `${current.line}. ` : ""}{current.notes || current.status}</p>}
    </div>
  );
}

function ventLabel(u: Unit) {
  if (u.vent === "pvc") return "90%+ PVC";
  if (u.vent === "b") return "80% B-vent";
  if (u.role === "furnace") return "вент не указан";
  return "хладагент не разведён";
}

function SelectRow({ label, value, onChange, options }: { label: string; value: string; onChange: (id: string) => void; options: { id: string; label: string }[] }) {
  return (
    <label className="block rounded-xl border border-ink/15 bg-surface p-3 text-sm font-medium">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-ink/15 bg-bg px-3 font-normal">
        {options.map((o) => (
          <option key={o.id || "empty"} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Catalog({ query, setQuery, onUse }: { query: string; setQuery: (q: string) => void; onUse: (u: Unit) => void }) {
  const [role, setRole] = useState<Role | "all">("all");
  const list = units.filter((u) => {
    if (role !== "all" && u.role !== role) return false;
    const blob = `${u.brand} ${u.model} ${u.notes} ${u.refrigerant} ${u.line}`.toLowerCase();
    return blob.includes(query.trim().toLowerCase());
  });
  const roles: { id: Role | "all"; label: string }[] = [
    { id: "all", label: "Все" },
    { id: "outdoor", label: "Наружные" },
    { id: "ahandler", label: "Фанкойлы" },
    { id: "coil", label: "Змеевики" },
    { id: "furnace", label: "Печи" },
    { id: "ductless-out", label: "Мини наружные" },
    { id: "ductless-in", label: "Мини внутренние" },
  ];
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 rounded-md border border-ink/15 bg-surface px-3">
        <Search className="size-4 text-muted" aria-hidden="true" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Модель, хладагент, пометка" className="min-h-11 w-full bg-transparent text-sm outline-none" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {roles.map((r) => (
          <button key={r.id} type="button" onClick={() => setRole(r.id)} className={`min-h-11 rounded-full px-3 text-sm ${role === r.id ? "bg-ink text-bg" : "bg-surface text-ink"}`}>
            {r.label}
          </button>
        ))}
      </div>
      <p className="mb-3 font-mono text-xs text-muted">{list.length} из {units.length}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {list.slice(0, 80).map((u) => (
          <li key={u.id} className="rounded-xl border border-ink/15 bg-surface p-4">
            <p className="font-mono text-xs text-brass">{u.brand}</p>
            <h2 className="mt-1 font-mono text-lg font-semibold">{u.model}</h2>
            <p className="mt-2 text-sm text-muted">{u.refrigerant} · {u.role}{u.stages ? ` · ${u.stages}` : ""}</p>
            {u.notes && <p className="mt-2 text-sm leading-relaxed">{u.notes}</p>}
            <button type="button" onClick={() => onUse(u)} className="mt-3 min-h-11 text-sm font-medium text-brass">
              Поставить на стенд
            </button>
          </li>
        ))}
      </ul>
      {list.length > 80 && <p className="mt-3 text-sm text-muted">Показаны первые 80. Сузь фильтр.</p>}
    </div>
  );
}

function Decoder({ onUse }: { onUse: (id: string, serial: string) => void }) {
  const [raw, setRaw] = useState("27SPA660A003");
  const decoded = decodeModel(raw);
  return (
    <div className="max-w-xl">
      <label className="block text-sm font-medium">
        Номер с шильдика
        <input value={raw} onChange={(e) => setRaw(e.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-ink/15 bg-surface px-3 font-mono" />
      </label>
      <ul className="mt-4 flex flex-col gap-2">
        {decoded.lines.map((line) => (
          <li key={line.k} className="rounded-md border border-ink/15 bg-surface px-3 py-2">
            <p className="font-mono text-xs text-brass">{line.k}</p>
            <p className="text-sm">{line.v}</p>
          </li>
        ))}
      </ul>
      {decoded.unit && (decoded.unit.role === "outdoor" || decoded.unit.role === "ductless-out") && (
        <button type="button" onClick={() => onUse(decoded.unit!.id, raw.trim())} className="mt-4 min-h-11 rounded-md bg-ink px-4 text-sm font-medium text-bg">
          Поставить {decoded.unit.model} на стенд
        </button>
      )}
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Carrier: 24/25 — R-410A кондиционер и тепловой насос, 26/27 — то же на R-454B. Третья буква S/T/V — ступени, четвёртая C/P/N — Comfort / Performance / Infinity. Две цифры номинала: 60 = 5 т. Bryant: первая цифра 1 или 2 — кондиционер или насос, вторая 3/4/9 — Legacy / Preferred / Evolution.
      </p>
    </div>
  );
}
