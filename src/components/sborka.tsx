import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { orientUnit, units, type Orient, type Unit } from "@/lib/hvac";

type Sheet = Orient & { id: string };

const sheets: Sheet[] = [
  {
    id: "hp",
    kicker: "Термостат · обычный Carrier / Bryant",
    answer: "O. Под напряжением в охлаждении.",
    wrong: "Не в нагреве. Не клемма B. В пульте: heat pump, O/B = O, energized in cooling.",
    chips: [
      { name: "R", hint: "24V hot. Поплавок рвёт именно R" },
      { name: "C", hint: "common" },
      { name: "Y", hint: "компрессор. На R-454B с печью — через RDS" },
      { name: "O", hint: "реверс. 24 В в Cool, в Heat пусто" },
      { name: "W", hint: "догрев" },
      { name: "G", hint: "вентилятор" },
    ],
    steps: [
      "Проверка на объекте: Cool, замер O–C ≈ 24 В. Heat — на O напряжения нет, дом не должен холодить.",
      "Если после замены пульта греет вместо холода, клапан стоит наоборот.",
      "Две ступени добавляют Y2. Цвет провода ничего не значит, звони жилу.",
    ],
    source: "F016, SM_9",
  },
  {
    id: "mura",
    kicker: "Исключение · 37MURA / 37MUHA",
    answer: "B. Под напряжением в нагреве.",
    wrong: "Привычный Carrier O сюда не копировать. 24V на S1/S2 нельзя. Infinity этот блок не ведёт.",
    chips: [
      { name: "R", hint: "24V hot" },
      { name: "C", hint: "common" },
      { name: "Y", hint: "компрессор" },
      { name: "B", hint: "реверс. 24 В в Heat" },
      { name: "W", hint: "догрев" },
      { name: "S1 S2", hint: "только связь. Не 24V" },
    ],
    steps: [
      "Пульт обычный 24V. DIP SW1-2 по IM.",
      "В настройках: heat pump, reversing valve energized in heating, клемма B.",
      "Чужую полевую RDS с печи и плату из FE5B не переносить. Сенсор — из IM, не обходить.",
    ],
    source: "MURA_IM, F016, F094",
  },
  {
    id: "rds",
    kicker: "RDS-коробки · R-454B",
    answer: "Три разных коробки. Чужую не ставить.",
    wrong: "Y мимо платы — ошибка. Сенсор не обходить и плату не отключать.",
    chips: [
      { name: "Внутри", hint: "FE5B, FJ5, FT5. Второй коробки нет" },
      { name: "Полевая", hint: "змеевик печи. Y: пульт → плата → блок" },
      { name: "Не эта", hint: "37MURA / 45MU и весь R-410A" },
    ],
    steps: [
      "Канальный сенсор: 20% LFL. После срабатывания вентилятор ещё 5 минут.",
      "Мигание 7 или 8 — перепутаны Y/W. Мигание 1 — сенсор увидел утечку.",
      "Мини-сплит R-454B: порог 10% LFL, полевую коробку с печи туда не вешать.",
    ],
    source: "F094, F095, CAR_TG",
  },
  {
    id: "abcd",
    kicker: "Infinity / Evolution",
    answer: "A B C D. Обычный термостат не подойдёт.",
    wrong: "A и B — данные, не клапан. Зелёный и жёлтый местами не менять.",
    chips: [
      { name: "A", hint: "зелёный, данные" },
      { name: "B", hint: "жёлтый, данные" },
      { name: "C", hint: "белый, 24V common" },
      { name: "D", hint: "красный, 24V hot" },
    ],
    steps: [
      "Искать обрыв одним коротким кабелем: пульт и внутренний блок. Потом наружный.",
      "Пульт пишет Indoor Unit Not Found — почти всегда перепутаны A и B.",
      "На печи DIP SW-4 в OFF. C–D около 24 В, A–B около 4 В без пульта.",
    ],
    source: "UI_SI, F086",
  },
  {
    id: "fuse",
    kicker: "Поплавок и предохранитель",
    answer: "Поплавок рвёт R. Предохранитель 3 A, как на плате.",
    wrong: "Не в разрыв C и не «на землю». Пятёрку и перемычку вместо 3 A не ставить.",
    chips: [
      { name: "R", hint: "сюда поплавок" },
      { name: "C", hint: "не путать с R" },
      { name: "3 A", hint: "номинал платы печи" },
    ],
    steps: [
      "Экран погас, а на плате 24 В есть — смотри поплавок в разрыве R.",
      "Предохранитель сгорел: сначала прозвон Y–C. Почти 0 Ом — короткое в кабеле, не «слабый предохранитель».",
    ],
    source: "F002, F004, INS-012",
  },
  {
    id: "goodman",
    kicker: "Goodman / Amana, печь 2025+",
    answer: "Старый змеевик: A2E в NO и снять питание.",
    wrong: "На R-32 так делать нельзя. A2E оставить включённым, жгут сенсора SER2A08012S.",
    chips: [
      { name: "R-410A", hint: "A2E → NO, power cycle" },
      { name: "R-22", hint: "то же самое" },
      { name: "R-32", hint: "A2E не трогать" },
    ],
    steps: [
      "Если A2E забыли выключить на старом змеевике, нагрев не стартует, крутится только вентилятор.",
      "Краску, клей PVC и растворитель от сенсора убрать — ложный EAL.",
    ],
    source: "F112, F113, F114",
  },
];

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
      else if (m.startsWith(n) || (n.startsWith(m) && m.length >= 4)) score = 100;
      else if (m.includes(n)) score = 40;
      return { u, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.u.model.localeCompare(b.u.model))
    .slice(0, 6)
    .map((x) => x.u);
}

export function Sborka() {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const hits = useMemo(() => searchUnits(q), [q]);
  const unit = units.find((u) => u.id === picked) ?? null;
  const orient = unit ? orientUnit(unit) : null;

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-5">
      <header className="mb-4">
        <p className="font-mono text-xs tracking-widest text-brass">НА ОБЪЕКТЕ</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Как подключать</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Забыл настройку — ответ на карточке, без сборки всей системы. Номер с шильдика сужает карточку под эту модель.
        </p>
      </header>

      <label className="flex min-h-12 items-center gap-2 rounded-xl border border-ink/20 bg-surface px-3">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPicked(null);
          }}
          placeholder="27SPA, 37MURA, FE5B…"
          className="min-h-12 w-full bg-transparent font-mono text-base outline-none"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        {q && (
          <button
            type="button"
            aria-label="Стереть"
            onClick={() => {
              setQ("");
              setPicked(null);
            }}
            className="grid size-11 place-items-center text-muted"
          >
            <X className="size-4" />
          </button>
        )}
      </label>

      {hits.length > 0 && !unit && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-ink/15 bg-surface">
          {hits.map((u) => (
            <li key={u.id} className="border-b border-ink/10 last:border-b-0">
              <button type="button" onClick={() => setPicked(u.id)} className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left">
                <span>
                  <span className="block font-mono text-base font-semibold">{u.model}</span>
                  <span className="block text-xs text-muted">
                    {u.brand} · {u.refrigerant === "unknown" ? "хладагент не разведён" : u.refrigerant}
                    {u.line ? ` · ${u.line}` : ""}
                  </span>
                </span>
                <span className="text-sm font-medium text-brass">Как подключать</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {orient && unit && (
        <div className="mt-4">
          <p className="mb-2 font-mono text-xs text-muted">
            {unit.brand} {unit.model}
            {unit.refrigerant !== "unknown" ? ` · ${unit.refrigerant}` : ""}
          </p>
          <Card sheet={{ ...orient, id: unit.id }} />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {sheets.map((sheet) => (
          <Card key={sheet.id} sheet={sheet} />
        ))}
      </div>

      <footer className="mt-8 border-t border-ink/15 pt-4 text-xs leading-relaxed text-muted">
        Сверка с базой HVAC Game, не замена шильдика и IM. Carrier и Bryant разложены по моделям. Goodman здесь только по плате A2E.
      </footer>
    </main>
  );
}

function Card({ sheet }: { sheet: Sheet }) {
  return (
    <article className="rounded-xl border border-ink/15 bg-surface p-4">
      <p className="font-mono text-xs tracking-wide text-brass">{sheet.kicker}</p>
      <h2 className="mt-2 text-2xl font-semibold leading-tight">{sheet.answer}</h2>
      <p className="mt-2 text-sm leading-relaxed">{sheet.wrong}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {sheet.chips.map((chip) => (
          <div key={chip.name} className="min-w-24 rounded-md border border-ink/15 bg-bg px-3 py-2">
            <p className="font-mono text-lg font-semibold">{chip.name}</p>
            <p className="text-xs leading-snug text-muted">{chip.hint}</p>
          </div>
        ))}
      </div>
      <ol className="mt-3 flex list-decimal flex-col gap-1 pl-4 text-sm leading-relaxed text-muted">
        {sheet.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-3 font-mono text-xs text-muted">{sheet.source}</p>
    </article>
  );
}
