"use client";

import { useState } from "react";
import { updateDailyWordGoal } from "@/app/actions/posts";

export default function StreakGoalCard({
  streak,
  todayWords,
  goal,
}: {
  streak: number;
  todayWords: number;
  goal: number;
}) {
  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState(String(goal));
  const [currentGoal, setCurrentGoal] = useState(goal);
  const [pending, setPending] = useState(false);

  const pct = Math.min(100, Math.round((todayWords / currentGoal) * 100));
  const metToday = todayWords >= currentGoal;

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(goalInput, 10);
    if (isNaN(num)) return;
    setPending(true);
    const res = await updateDailyWordGoal(num);
    setPending(false);
    if (res?.success) {
      setCurrentGoal(res.goal);
      setEditing(false);
    }
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--rule)", padding: "1.6rem", marginBottom: "2.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: ".6rem" }}>
            <span style={{ fontFamily: "var(--serif)", fontSize: "2.2rem", lineHeight: 1 }}>
              {streak > 0 ? "🔥" : "✍️"} {streak}
            </span>
            <span style={{ color: "var(--muted)", fontSize: ".85rem" }}>
              day{streak === 1 ? "" : "s"} streak
            </span>
          </div>
          <p style={{ color: "var(--muted)", fontSize: ".82rem", marginTop: ".3rem" }}>
            {streak === 0
              ? "Write today to start a new streak."
              : metToday
              ? "Today's goal met — streak continues."
              : "Keep writing today to extend your streak."}
          </p>
        </div>

        <div style={{ minWidth: "220px", flex: 1, maxWidth: "320px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem", marginBottom: ".4rem" }}>
            <span>
              {todayWords} / {currentGoal} words today
            </span>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: ".78rem" }}
              >
                Edit goal
              </button>
            )}
          </div>
          <div style={{ height: "8px", background: "var(--rule)", borderRadius: "4px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: metToday ? "var(--green)" : "var(--accent)",
                transition: "width .3s",
              }}
            />
          </div>
          {editing && (
            <form onSubmit={saveGoal} style={{ display: "flex", gap: ".4rem", marginTop: ".6rem" }}>
              <input
                type="number"
                min={50}
                max={10000}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                style={{ width: "90px", padding: ".3rem .5rem", fontSize: ".85rem" }}
              />
              <button className="btn btn-primary btn-sm" type="submit" disabled={pending}>
                Save
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}