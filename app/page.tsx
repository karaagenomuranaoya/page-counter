"use client";

import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  name: string;
  unit: string;
};

type Log = {
  id: string;
  taskId: string;
  createdAt: string;
};

const STORAGE_KEY = "simple-done-log";

const defaultTasks: Task[] = [
  { id: "reading", name: "本を読む", unit: "1ページ" },
  { id: "aws", name: "AWSを勉強する", unit: "10分" },
  { id: "pushup", name: "腕立て伏せをする", unit: "1回" },
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskUnit, setNewTaskUnit] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as { tasks: Task[]; logs: Log[] };
      setTasks(parsed.tasks?.length ? parsed.tasks : defaultTasks);
      setLogs(parsed.logs ?? []);
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
      const latest = taskLogs[0]?.createdAt;

      return {
        ...task,
        count: taskLogs.length,
        latest,
      };
    });
  }, [tasks, logs]);

  const totalCount = logs.length;

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();

    return logs.filter((log) => {
      return new Date(log.createdAt).toDateString() === today;
    }).length;
  }, [logs]);

  function addTask() {
    const name = newTaskName.trim();
    const unit = newTaskUnit.trim();

    if (!name || !unit) return;

    const task: Task = {
      id: crypto.randomUUID(),
      name,
      unit,
    };

    setTasks((current) => [...current, task]);
    setNewTaskName("");
    setNewTaskUnit("");
  }

  function addLog(taskId: string) {
    const log: Log = {
      id: crypto.randomUUID(),
      taskId,
      createdAt: new Date().toISOString(),
    };

    setLogs((current) => [log, ...current]);
  }

  function undoLatest(taskId: string) {
    const latest = logs.find((log) => log.taskId === taskId);
    if (!latest) return;

    setLogs((current) => current.filter((log) => log.id !== latest.id));
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

    return (
      <main className="mx-auto min-h-screen max-w-3xl px-4 py-6">
        <button
          onClick={() => setSelectedTaskId(null)}
          className="mb-6 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
        >
          ← 一覧に戻る
        </button>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">記録するタスク</p>
          <h1 className="mt-2 text-3xl font-bold">{selectedTask.name}</h1>
          <p className="mt-2 text-slate-600">
            ボタンを押すたびに「{selectedTask.unit}」として記録します。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => addLog(selectedTask.id)}
              className="rounded-2xl bg-slate-900 px-5 py-5 text-lg font-bold text-white shadow-sm active:scale-[0.99]"
            >
              + {selectedTask.unit}
            </button>

            <button
              onClick={() => undoLatest(selectedTask.id)}
              disabled={selectedLogs.length === 0}
              className="rounded-2xl bg-slate-100 px-5 py-5 text-lg font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              直前を取り消す
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold">このタスクの振り返り</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="合計" value={`${selectedLogs.length}`} />
            <SummaryCard label="単位" value={selectedTask.unit} />
            <SummaryCard label="最新" value={formatDate(selectedLogs[0]?.createdAt)} />
          </div>

          <div className="mt-6">
            <h3 className="font-bold">最近の記録</h3>

            {selectedLogs.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 p-4 text-slate-500">
                まだ記録がありません。
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {selectedLogs.slice(0, 10).map((log) => (
                  <li
                    key={log.id}
                    className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    {formatDate(log.createdAt)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-6">
      <header className="mb-6">
        <p className="text-sm font-semibold text-slate-500">Simple Done Log</p>
        <h1 className="mt-1 text-3xl font-bold">やったこと記録</h1>
        <p className="mt-2 text-slate-600">
          小さくやったことを、単位ごとに残して振り返れます。
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="全体の合計" value={`${totalCount}`} />
        <SummaryCard label="今日の記録" value={`${todayCount}`} />
        <SummaryCard label="登録タスク" value={`${tasks.length}`} />
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-bold">タスク一覧</h2>

        <div className="mt-4 grid gap-3">
          {taskSummaries.map((task) => (
            <button
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">{task.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    1回の記録: {task.unit}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold">{task.count}</p>
                  <p className="text-xs text-slate-500">{formatDate(task.latest)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-bold">タスクを追加</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
          <input
            value={newTaskName}
            onChange={(event) => setNewTaskName(event.target.value)}
            placeholder="例: 英単語を覚える"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />

          <input
            value={newTaskUnit}
            onChange={(event) => setNewTaskUnit(event.target.value)}
            placeholder="例: 5個"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />

          <button
            onClick={addTask}
            className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"
          >
            追加
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-bold">全体の振り返り</h2>

        <div className="mt-4 space-y-3">
          {taskSummaries.map((task) => (
            <div key={task.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium">{task.name}</span>
                <span className="text-slate-500">
                  {task.count} / {totalCount || 1}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900"
                  style={{
                    width: `${totalCount ? (task.count / totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}