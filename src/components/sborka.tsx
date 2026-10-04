import { useEffect, useMemo, useState } from "react";
import { Ban, Check, Info, Search, X } from "lucide-react";
import {
  controls,
  emptyPick,
  jobs,
  match,
  schemeFor,
  traps,
  unitById,
  units,
  type Finding,
  type Pick,
  type Unit,
} from "@/lib/hvac";

const examples = ["27SPA", "24ACC", "59TP6", "37MURA", "FE5B", "CVAMA"];

const roleName: Record<Unit["role"], string> = {
  outdoor: "наружный",
  ahandler: "фанкойл",
  coil: "змеевик",
  furnace: "печь",
  "ductless-out": "мини-сплит",
  "ductless-in": "головка",
};

function norm(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function searchUnits(q: string): Unit[] {
  const n = norm(q);
  if (n.length < 2) return [];
  return units
    .map((u) => {
      const m = norm(u.model);
      let score = 0;
      if (m === n) score = 200;
      else if (m.startsWith(n)) score = 120;
      else if (n.startsWith(m) && m.length >= 4) score = 110;
      else if (m.includes(n)) score = 60;
      else if (norm(`${u.brand}${u.line}`).includes(n)) score = 20;
      return { u, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.u.model.localeCompare(b.u.model))
    .slice(0, 8)
    .map((x) => x.u);
}

function defaultControl(unit: Unit): string | null {
  if (unit.control === "abcd") return unit.family === "bryant" ? "systxbbuid01" : "systxccitc01";
  if (unit.control === "24v" || unit.control === "mura-24v") return "t6";
  return null;
}

export function Sborka() {
  const [pick, setPick] = useState<Pick>(emptyPick);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

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
  const stops = findings.filter((f) => f.level === "stop");
  const oks = findings.filter((f) => f.level === "ok");
  const notes = findings.filter((f) => f.level === "note");
  const hits = searchUnits(q);
  const started =
    pick.mode === "goodman" || !!(pick.outdoorId || pick.indoorId || pick.furnaceId || pick.coilId);
  const job = jobs.find((j) => j.id === jobId) ?? null;

  function place(unit: Unit) {
    const typed = q.trim();
    const fuller = norm(typed).startsWith(norm(unit.model)) && norm(typed).length > norm(unit.model).length;
    setPick((p) => {
      const next: Pick = { ...p, mode: unit.role.startsWith("ductless") ? "ductless" : "ducted" };
      const outdoor = unitById(p.outdoorId);
      if (unit.role === "outdoor" || unit.role === "ductless-out") {
        next.outdoorId = unit.id;
        if (fuller) next.outdoorSerial = typed;
        const control = defaultControl(unit);
        if (control) next.controlId = control;
        if (unit.role === "ductless-out") {
          next.furnaceId = null;
          next.coilId = null;
          next.rds = "none";
          next.vent = "none";
          const indoor = unitById(next.indoorId);
          if (indoor && indoor.role !== "ductless-in") next.indoorId = null;
        } else {
          const indoor = unitById(next.indoorId);
          if (indoor?.role === "ductless-in") next.indoorId = null;
        }
      } else if (unit.role === "ductless-in") {
        next.indoorId = unit.id;
        next.furnaceId = null;
        next.coilId = null;
        next.rds = "none";
        if (outdoor && outdoor.role !== "ductless-out") next.outdoorId = null;
      } else if (unit.role === "ahandler") {
        next.indoorId = unit.id;
        next.furnaceId = null;
        next.coilId = null;
        next.vent = "none";
        next.rds = unit.builtinRds ? "builtin" : "none";
        if (fuller) next.indoorSerial = typed;
        if (outdoor?.role === "ductless-out") next.outdoorId = null;
      } else if (unit.role === "furnace") {
        next.furnaceId = unit.id;
        next.indoorId = null;
        next.vent = unit.vent === "pvc" ? "pvc" : unit.vent === "b" ? "b" : "none";
        if (outdoor?.role === "ductless-out") next.outdoorId = null;
      } else {
        next.coilId = unit.id;
        next.indoorId = null;
        if (fuller) next.indoorSerial = typed;
        const gas = unit.refrigerant === "R-454B" || outdoor?.refrigerant === "R-454B";
        next.rds = gas ? "field" : "none";
        if (outdoor?.role === "ductless-out") next.outdoorId = null;
      }
      return next;
    });
    setQ("");
    setControlsOpen(false);
  }

  function clearSlot(key: "outdoorId" | "indoorId" | "furnaceId" | "coilId") {
    setPick((p) => ({
      ...p,
      [key]: null,
      ...(key === "outdoorId" ? { outdoorSerial: "" } : {}),
      ...(key === "indoorId" || key === "coilId" ? { indoorSerial: "" } : {}),
      ...(key === "furnaceId" ? { vent: "none" as const } : {}),
    }));
  }

  const slots = [
    unitById(pick.outdoorId),
    unitById(pick.indoorId),
    unitById(pick.furnaceId),
    unitById(pick.coilId),
  ].filter(Boolean) as Unit[];

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-5">
      <header className="mb-4">
        <p className="font-mono text-xs tracking-widest text-brass">ПОЛЕ · CARRIER / BRYANT</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Сборка</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Вбей номер с шильдика. Наружный, фанкойл, печь или змеевик сами встанут на свои места. Пульт и вентиляция подставятся из каталога — поменять можно ниже.
        </p>
      </header>

      <label className="flex min-h-12 items-center gap-2 rounded-xl border border-ink/20 bg-surface px-3">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="27SPA, FE5B, 59TP6…"
          className="min-h-12 w-full bg-transparent font-mono text-base outline-none"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        {q && (
          <button type="button" aria-label="Стереть" onClick={() => setQ("")} className="grid size-11 place-items-center text-muted">
            <X className="size-4" />
          </button>
        )}
      </label>

      {q.trim().length >= 2 && hits.length === 0 && (
        <p className="mt-3 text-sm text-muted">В каталоге такого номера нет. Это сверка с базой, не поиск по всем брендам.</p>
      )}
      {hits.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-ink/15 bg-surface">
          {hits.map((u) => (
            <li key={u.id} className="border-b border-ink/10 last:border-b-0">
              <button type="button" onClick={() => place(u)} className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left">
                <span>
                  <span className="block font-mono text-base font-semibold">{u.model}</span>
                  <span className="block text-xs text-muted">
                    {u.brand} · {roleName[u.role]} · {u.refrigerant === "unknown" ? "хладагент не разведён" : u.refrigerant}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-brass">Поставить</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!started && hits.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button key={ex} type="button" onClick={() => setQ(ex)} className="min-h-11 rounded-full bg-surface px-3 font-mono text-sm">
              {ex}
            </button>
          ))}
        </div>
      )}

      {slots.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-semibold">Связка</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {slots.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 rounded-xl border border-ink/15 bg-surface px-3 py-2">
                <span>
                  <span className="block font-mono text-xs text-brass">{roleName[u.role]}</span>
                  <span className="font-mono text-lg font-semibold">{u.model}</span>
                  <span className="block text-xs text-muted">
                    {u.brand}
                    {u.refrigerant !== "unknown" ? ` · ${u.refrigerant}` : ""}
                    {u.line ? ` · ${u.line}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Убрать ${u.model}`}
                  onClick={() =>
                    clearSlot(
                      u.role === "outdoor" || u.role === "ductless-out"
                        ? "outdoorId"
                        : u.role === "furnace"
                          ? "furnaceId"
                          : u.role === "coil"
                            ? "coilId"
                            : "indoorId",
                    )
                  }
                  className="grid size-11 place-items-center rounded-md text-muted"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pick.mode !== "goodman" && pick.outdoorId && unitById(pick.outdoorId)?.role !== "ductless-out" && (
        <p className="mt-3 text-sm text-muted">
          Пульт: {controls.find((c) => c.id === pick.controlId)?.name ?? "не выбран"}.{" "}
          <button type="button" onClick={() => setControlsOpen((v) => !v)} className="inline-flex min-h-11 items-center font-medium text-brass">
            {controlsOpen ? "Скрыть" : "Сменить"}
          </button>
        </p>
      )}

      {started && (
        <section className="mt-5 rounded-xl border border-ink/15 bg-surface p-4">
          <p className={`font-mono text-xs tracking-widest ${stops.length ? "text-brass" : "text-ink"}`}>
            {stops.length ? `СТОП · ${stops.length}` : "СХОДИТСЯ"}
          </p>
          <h2 className="mt-1 text-xl font-semibold leading-snug">
            {stops.length ? stops[0].title : oks[0]?.title ?? "База эту связку пропускает"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{stops.length ? stops[0].detail : oks[0]?.detail}</p>
          {(stops.length > 1 || notes.length > 0 || oks.length > 1) && (
            <details className="mt-3">
              <summary className="min-h-11 cursor-pointer text-sm font-medium">Остальные пункты</summary>
              <ul className="mt-2 flex flex-col gap-3">
                {[...stops.slice(1), ...oks.slice(stops.length ? 0 : 1), ...notes].map((f, i) => (
                  <FindingRow key={`${f.title}-${i}`} finding={f} />
                ))}
              </ul>
            </details>
          )}
          {job && (
            <p className="mt-3 border-t border-ink/15 pt-3 text-sm font-medium">
              {job.pass(pick, findings) ? "Задание закрыто." : "Задание пока не закрыто — смотри стоп."}
            </p>
          )}
        </section>
      )}

      {controlsOpen && pick.mode !== "goodman" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {controls.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setPick((p) => ({ ...p, controlId: c.id }));
                setControlsOpen(false);
              }}
              className={`min-h-11 rounded-full px-3 text-sm ${pick.controlId === c.id ? "bg-ink text-bg" : "bg-surface text-ink"}`}
            >
              {c.name.replace(/ SYSTX\w+/, "").replace(" / Connex", "")}
            </button>
          ))}
        </div>
      )}

      {scheme && (
        <section className="mt-4 rounded-xl border border-ink/15 bg-surface p-4">
          <h2 className="text-sm font-semibold">{scheme.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {scheme.chips.map((chip) => (
              <div key={chip.name} className="min-w-24 rounded-md border border-ink/15 bg-bg px-3 py-2">
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
        </section>
      )}

      <section className="mt-6">
        <button type="button" onClick={() => setMore((v) => !v)} className="min-h-11 text-sm font-medium text-brass">
          {more ? "Скрыть задания и ловушки" : "Задания и типичные ошибки"}
        </button>
        {more && (
          <div className="mt-3 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {jobs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPick({ ...emptyPick, ...item.apply });
                    setJobId(item.id);
                    setQ("");
                  }}
                  className={`rounded-xl px-3 py-3 text-left ${jobId === item.id ? "bg-ink text-bg" : "bg-surface"}`}
                >
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className={`mt-1 block text-xs leading-relaxed ${jobId === item.id ? "text-bg/80" : "text-muted"}`}>{item.brief}</span>
                </button>
              ))}
              {pick.mode === "goodman" && (
                <GoodmanBits pick={pick} setPick={setPick} />
              )}
            </div>
            {traps.map((trap) => (
              <article key={trap.title}>
                <h3 className="text-sm font-medium">{trap.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{trap.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-8 border-t border-ink/15 pt-4 text-xs leading-relaxed text-muted">
        Это сверка с записями базы, не замена шильдика. Lennox, Trane, Rheem и Mitsubishi в подбор не входят — каталогов моделей в базе ещё нет.
      </footer>
    </main>
  );
}

function GoodmanBits({ pick, setPick }: { pick: Pick; setPick: (p: Pick) => void }) {
  return (
    <div className="rounded-xl border border-ink/15 bg-surface p-3">
      <p className="text-sm font-medium">Goodman: змеевик и A2E</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(
          [
            ["r410a", "R-410A"],
            ["r22", "R-22"],
            ["r32", "R-32"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPick({ ...pick, goodmanCoil: id })}
            className={`min-h-11 rounded-full px-3 text-sm ${pick.goodmanCoil === id ? "bg-ink text-bg" : "bg-bg"}`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPick({ ...pick, a2e: pick.a2e === "on" ? "off" : "on" })}
          className="min-h-11 rounded-full bg-bg px-3 text-sm"
        >
          {pick.a2e === "on" ? "A2E включён" : "A2E в NO"}
        </button>
      </div>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const Icon = finding.level === "stop" ? Ban : finding.level === "ok" ? Check : Info;
  const tone = finding.level === "stop" ? "text-brass" : "text-ink";
  return (
    <li className="flex gap-3">
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden="true" />
      <div>
        <p className={`text-sm font-medium ${tone}`}>{finding.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{finding.detail}</p>
      </div>
    </li>
  );
}
