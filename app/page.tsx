"use client";

import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  name: string;
  amount: number;
  unit: string;
  goal?: number;
  color: string;
};

type Log = {
  id: string;
  taskId: string;
  amount: number;
  unit: string;
  createdAt: string;
};

const STORAGE_KEY = "simple-done-log";

const taskColors = [
  "#f97316",
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#84cc16",
  "#eab308",
  "#ef4444",
];

const defaultTasks: Task[] = [
  { id: "reading", name: "本を読む", amount: 1, unit: "ページ", goal: 100, color: "#f97316" },
  { id: "aws", name: "AWSを勉強する", amount: 10, unit: "分", goal: 600, color: "#3b82f6" },
  { id: "pushup", name: "腕立て伏せをする", amount: 1, unit: "回", color: "#10b981" },
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskAmount, setNewTaskAmount] = useState("1");
  const [newTaskUnit, setNewTaskUnit] = useState("");
  const [newTaskGoal, setNewTaskGoal] = useState("");
  const [newTaskColor, setNewTaskColor] = useState(taskColors[0]);
  const [poppedTaskId, setPoppedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        tasks: Partial<Task>[];
        logs: Partial<Log>[];
      };

      const loadedTasks = parsed.tasks?.length
        ? parsed.tasks.map((task, index) => {
            const fallback = splitOldUnit(task.unit ?? "");
            const goal = Number(task.goal);

            return {
              id: task.id ?? crypto.randomUUID(),
              name: task.name ?? "無名のタスク",
              amount: Number(task.amount ?? fallback.amount),
              unit: task.amount ? task.unit ?? "" : fallback.unit,
              goal: Number.isFinite(goal) && goal > 0 ? goal : undefined,
              color: task.color ?? taskColors[index % taskColors.length],
            };
          })
        : defaultTasks;

      const loadedLogs =
        parsed.logs?.map((log) => {
          const task = loadedTasks.find((item) => item.id === log.taskId);

          return {
            id: log.id ?? crypto.randomUUID(),
            taskId: log.taskId ?? "",
            amount: Number(log.amount ?? task?.amount ?? 1),
            unit: log.unit ?? task?.unit ?? "",
            createdAt: log.createdAt ?? new Date().toISOString(),
          };
        }) ?? [];

      setTasks(loadedTasks);
      setLogs(loadedLogs.filter((log) => log.taskId));
    } catch {
      setTasks(defaultTasks);
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, logs }));
  }, [tasks, logs]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const taskSummaries = useMemo(() => {
    return tasks.map((task) => {
      const taskLogs = logs.filter((log) => log.taskId === task.id);
      const total = taskLogs.reduce((sum, log) => sum + log.amount, 0);
      const percent = task.goal ? Math.min((total / task.goal) * 100, 100) : 0;
      const remaining = task.goal ? Math.max(task.goal - total, 0) : 0;

      return {
        ...task,
        total,
        percent,
        remaining,
        logCount: taskLogs.length,
        latest: taskLogs[0]?.createdAt,
      };
    });
  }, [tasks, logs]);

  const totalAmount = logs.reduce((sum, log) => sum + log.amount, 0);

  const todayAmount = useMemo(() => {
    const today = new Date().toDateString();

    return logs
      .filter((log) => new Date(log.createdAt).toDateString() === today)
      .reduce((sum, log) => sum + log.amount, 0);
  }, [logs]);

  function addTask() {
    const name = newTaskName.trim();
    const unit = newTaskUnit.trim();
    const amount = Number(newTaskAmount);
    const goal = Number(newTaskGoal);

    if (!name || !unit || !Number.isFinite(amount) || amount <= 0) return;

    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        amount,
        unit,
        goal: Number.isFinite(goal) && goal > 0 ? goal : undefined,
        color: newTaskColor,
      },
    ]);

    setNewTaskName("");
    setNewTaskAmount("1");
    setNewTaskUnit("");
    setNewTaskGoal("");
    setNewTaskColor(taskColors[0]);
  }

  function addLog(task: Task) {
    setLogs((current) => [
      {
        id: crypto.randomUUID(),
        taskId: task.id,
        amount: task.amount,
        unit: task.unit,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);

    setPoppedTaskId(task.id);
    window.setTimeout(() => setPoppedTaskId(null), 650);
  }

  function undoLatest(taskId: string) {
    const latest = logs.find((log) => log.taskId === taskId);
    if (!latest) return;

    setLogs((current) => current.filter((log) => log.id !== latest.id));
  }

  function deleteTask(taskId: string) {
    const ok = window.confirm("このタスクと記録を削除しますか？");
    if (!ok) return;

    setTasks((current) => current.filter((task) => task.id !== taskId));
    setLogs((current) => current.filter((log) => log.taskId !== taskId));

    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
  }

  function moveTask(taskId: string, direction: "up" | "down") {
    setTasks((current) => {
      const index = current.findIndex((task) => task.id === taskId);
      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function formatDate(value?: string) {
    if (!value) return "まだ記録なし";

    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  if (selectedTask) {
    const selectedLogs = logs.filter((log) => log.taskId === selectedTask.id);
    const selectedTotal = selectedLogs.reduce((sum, log) => sum + log.amount, 0);
    const selectedRemaining = selectedTask.goal
      ? Math.max(selectedTask.goal - selectedTotal, 0)
      : 0;
    const selectedPercent = selectedTask.goal
      ? Math.min((selectedTotal / selectedTask.goal) * 100, 100)
      : 0;
    const groupedSelectedLogs = groupLogsByDate(selectedLogs);

    return (
      <main
        className="min-h-screen px-4 py-5 sm:px-6 sm:py-8"
        style={{
          background: `linear-gradient(160deg, ${selectedTask.color}24, #f8fafc 45%, #ffffff)`,
        }}
      >
        <AppAnimations />

        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setSelectedTaskId(null)}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
            >
              ← 一覧に戻る
            </button>

            <button
              onClick={() => deleteTask(selectedTask.id)}
              className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-red-100"
            >
              削除
            </button>
          </div>

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div
              className="mb-4 h-3 w-16 rounded-full"
              style={{ backgroundColor: selectedTask.color }}
            />

            <p className="text-sm font-medium text-slate-500">記録するタスク</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{selectedTask.name}</h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              1回押すと「{selectedTask.amount}
              {selectedTask.unit}」が加算されます。
            </p>

            <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
              {poppedTaskId === selectedTask.id && (
                <div
                  className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-full px-4 py-2 text-lg font-black text-white shadow-lg"
                  style={{
                    backgroundColor: selectedTask.color,
                    animation: "float-pop 650ms ease-out forwards",
                  }}
                >
                  +{selectedTask.amount}
                  {selectedTask.unit}
                </div>
              )}

              <button
                onClick={() => addLog(selectedTask)}
                className="rounded-2xl px-5 py-5 text-lg font-bold text-white shadow-sm transition active:scale-95"
                style={{
                  backgroundColor: selectedTask.color,
                  boxShadow: `0 14px 30px ${selectedTask.color}55`,
                }}
              >
                + {selectedTask.amount}
                {selectedTask.unit}
              </button>

              <button
                onClick={() => undoLatest(selectedTask.id)}
                disabled={selectedLogs.length === 0}
                className="rounded-2xl bg-slate-100 px-5 py-5 text-lg font-bold text-slate-700 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                直前を取り消す
              </button>
            </div>
          </section>

          <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <h2 className="text-xl font-bold">このタスクの振り返り</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SummaryCard label="合計" value={`${selectedTotal}${selectedTask.unit}`} />
              <SummaryCard label="記録回数" value={`${selectedLogs.length}回`} />
              <SummaryCard label="最新" value={formatDate(selectedLogs[0]?.createdAt)} />
            </div>

            {selectedTask.goal && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold">
                    ゴールまであと {selectedRemaining}
                    {selectedTask.unit}
                  </span>
                  <span className="text-slate-500">
                    全体の{Math.round(selectedPercent)}%
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedPercent}%`,
                      backgroundColor: selectedTask.color,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="font-bold">記録</h3>

              {selectedLogs.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-4 text-slate-500">
                  まだ記録がありません。
                </p>
              ) : (
                <div className="mt-3 space-y-4">
                  {groupedSelectedLogs.map((group) => (
                    <div key={group.dateKey} className="rounded-2xl bg-slate-50 p-3">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="text-sm font-bold text-slate-700">
                          {group.label}
                        </h4>

                        <span
                          className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold"
                          style={{ color: selectedTask.color }}
                        >
                          合計 {group.total}
                          {selectedTask.unit}
                        </span>
                      </div>

                      <ul className="space-y-2">
                        {group.logs.map((log) => (
                          <li
                            key={log.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm text-slate-700"
                          >
                            <span>{formatTime(log.createdAt)}</span>

                            <span
                              className="shrink-0 font-bold"
                              style={{ color: selectedTask.color }}
                            >
                              +{log.amount}
                              {log.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-cyan-50 px-4 py-5 sm:px-6 sm:py-8">
      <AppAnimations />

      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <p className="text-sm font-semibold text-slate-500">Simple Done Log</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">やったこと記録</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            数字と単位を決めて、小さく積み上げていけます。
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="全体の合計" value={`${totalAmount}`} />
          <SummaryCard label="今日の加算" value={`${todayAmount}`} />
          <SummaryCard label="登録タスク" value={`${tasks.length}`} />
        </section>

        <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">タスク一覧</h2>
              <p className="text-sm text-slate-500">上下ボタンで並べ替えできます。</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {taskSummaries.map((task, index) => (
              <div
                key={task.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <button
                  onClick={() => setSelectedTaskId(task.id)}
                  className="w-full text-left"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <div
                        className="mt-1 h-10 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: task.color }}
                      />

                      <div>
                        <h3 className="text-lg font-bold">{task.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          1タップ: {task.amount}
                          {task.unit}
                        </p>
                        {task.goal && (
                          <p className="mt-1 text-sm text-slate-500">
                            ゴール: {task.goal}
                            {task.unit}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-bold" style={{ color: task.color }}>
                        {task.total}
                        <span className="ml-1 text-sm">{task.unit}</span>
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(task.latest)}</p>
                    </div>
                  </div>
                </button>

                <div className="mt-4">
                  {task.goal ? (
                    <>
                      <div className="mb-1 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          ゴールまであと {task.remaining}
                          {task.unit}
                        </span>
                        <span>全体の{Math.round(task.percent)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${task.percent}%`,
                            backgroundColor: task.color,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      合計 {task.total}
                      {task.unit}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => moveTask(task.id, "up")}
                    disabled={index === 0}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↑ 上へ
                  </button>

                  <button
                    onClick={() => moveTask(task.id, "down")}
                    disabled={index === taskSummaries.length - 1}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↓ 下へ
                  </button>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h2 className="text-xl font-bold">タスクを追加</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_100px_110px_130px_auto]">
            <input
              value={newTaskName}
              onChange={(event) => setNewTaskName(event.target.value)}
              placeholder="例: 本を読む"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />

            <input
              value={newTaskAmount}
              onChange={(event) => setNewTaskAmount(event.target.value)}
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              placeholder="数字"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />

            <input
              value={newTaskUnit}
              onChange={(event) => setNewTaskUnit(event.target.value)}
              placeholder="単位"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />

            <input
              value={newTaskGoal}
              onChange={(event) => setNewTaskGoal(event.target.value)}
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              placeholder="ゴール任意"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />

            <button
              onClick={addTask}
              className="rounded-xl px-5 py-3 font-bold text-white transition active:scale-95"
              style={{ backgroundColor: newTaskColor }}
            >
              追加
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {taskColors.map((color) => (
              <button
                key={color}
                onClick={() => setNewTaskColor(color)}
                aria-label={`色 ${color}`}
                className="h-9 w-9 rounded-full transition active:scale-90"
                style={{
                  backgroundColor: color,
                  boxShadow:
                    newTaskColor === color
                      ? "0 0 0 3px white, 0 0 0 6px #0f172a"
                      : "0 0 0 1px rgba(15, 23, 42, 0.12)",
                }}
              />
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h2 className="text-xl font-bold">全体の振り返り</h2>

          <div className="mt-4 space-y-4">
  {taskSummaries.map((task) => {
    const barPercent = task.goal
      ? task.percent
      : Math.min((task.total / 100) * 100, 100);

    return (
      <div key={task.id}>
        <div className="mb-1 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium">{task.name}</span>

          {task.goal ? (
            <span className="shrink-0 text-slate-500">
              ゴールまであと {task.remaining}
              {task.unit}・全体の{Math.round(task.percent)}%
            </span>
          ) : (
            <span className="shrink-0 text-slate-500">
              {task.total}
              {task.unit}
            </span>
          )}
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${barPercent}%`,
              backgroundColor: task.color,
            }}
          />
        </div>
      </div>
    );
  })}
</div>
        </section>
      </div>
    </main>
  );
}

function splitOldUnit(value: string) {
  const matched = value.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);

  if (!matched) {
    return {
      amount: 1,
      unit: value || "回",
    };
  }

  return {
    amount: Number(matched[1]),
    unit: matched[2] || "回",
  };
}

function formatDateGroup(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "今日";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "昨日";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function groupLogsByDate(logs: Log[]) {
  const groups = new Map<
    string,
    {
      dateKey: string;
      label: string;
      total: number;
      logs: Log[];
    }
  >();

  for (const log of logs) {
    const dateKey = new Date(log.createdAt).toISOString().slice(0, 10);

    const current = groups.get(dateKey) ?? {
      dateKey,
      label: formatDateGroup(log.createdAt),
      total: 0,
      logs: [],
    };

    current.total += log.amount;
    current.logs.push(log);
    groups.set(dateKey, current);
  }

  return Array.from(groups.values());
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function AppAnimations() {
  return (
    <style jsx global>{`
      @keyframes float-pop {
        0% {
          opacity: 0;
          transform: translate(-50%, 12px) scale(0.8);
        }
        20% {
          opacity: 1;
          transform: translate(-50%, -8px) scale(1.12);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -46px) scale(1);
        }
      }
    `}</style>
  );
}