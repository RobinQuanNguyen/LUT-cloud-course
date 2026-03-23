import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

const QUICK_RANGES = [
  { label: "Last 1 day", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last month", days: 30 },
  { label: "Last 3 months", days: 90 },
  { label: "Last 6 months", days: 180 },
];

const formatWindowLabel = (windowData) => {
  if (!windowData?.mode) return "Unknown";
  if (windowData.mode === "custom_range") return "Custom range";
  return windowData.mode.replaceAll("_", " ");
};

const toIsoIfValue = (value) => (value ? new Date(value).toISOString() : null);

function MonitoringPage() {
  const [selectedDays, setSelectedDays] = useState(7);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const hourlyBreakdown = data?.hourly_breakdown ?? [];
  const maxHourlyCount = useMemo(() => {
    const highest = Math.max(...hourlyBreakdown.map((item) => item.count), 0);
    return highest || 1;
  }, [hourlyBreakdown]);

  const pieStyle = useMemo(() => {
    const textPercent = data?.message_types?.text?.percentage ?? 0;
    return {
      background: `conic-gradient(#06b6d4 0% ${textPercent}%, #f59e0b ${textPercent}% 100%)`,
    };
  }, [data]);

  const fetchAnalytics = async () => {
    setError("");
    setIsLoading(true);

    const params = new URLSearchParams();
    const startIso = toIsoIfValue(startTime);
    const endIso = toIsoIfValue(endTime);

    if (startIso || endIso) {
      if (!startIso || !endIso) {
        setError("Please provide both start and end time for custom range.");
        setIsLoading(false);
        return;
      }

      params.set("start_time", startIso);
      params.set("end_time", endIso);
    } else {
      params.set("days", String(selectedDays));
    }

    try {
      const response = await fetch(`/usage-analytics/summary?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.detail || "Failed to fetch analytics data");
      }

      const payload = await response.json();
      setData(payload);
    } catch (fetchError) {
      setError(fetchError.message || "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-7xl">
      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 backdrop-blur-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Usage Analytics Monitor</h1>
            <p className="text-sm text-slate-300 mt-1">
              Filter by quick range or custom time period, then inspect hourly and message-type trends.
            </p>
          </div>

          <div className="flex gap-2">
            <Link to="/" className="auth-link">
              Back to chat
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <p className="text-sm text-slate-300 mb-3">Quick ranges</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_RANGES.map((range) => (
              <button
                key={range.days}
                type="button"
                onClick={() => setSelectedDays(range.days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedDays === range.days
                    ? "bg-cyan-500 text-white border-cyan-400"
                    : "bg-slate-800 text-slate-200 border-slate-600 hover:border-cyan-400"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <label className="text-sm text-slate-300">
              Start time
              <input
                type="datetime-local"
                className="input pl-3 mt-1"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              End time
              <input
                type="datetime-local"
                className="input pl-3 mt-1"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button type="button" className="auth-btn w-auto px-4" onClick={fetchAnalytics} disabled={isLoading}>
              {isLoading ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-600 text-slate-200 hover:border-cyan-400"
              onClick={() => {
                setStartTime("");
                setEndTime("");
              }}
            >
              Clear custom range
            </button>
          </div>

          {error ? <p className="text-red-400 text-sm mt-3">{error}</p> : null}
        </div>

        <div className="grid md:grid-cols-4 gap-3 mt-6">
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <p className="text-xs text-slate-400">Total messages</p>
            <p className="text-2xl font-semibold text-white">{data?.totals?.messages ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <p className="text-xs text-slate-400">Business hours</p>
            <p className="text-2xl font-semibold text-white">{data?.totals?.business_hours_messages ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <p className="text-xs text-slate-400">Off-hours</p>
            <p className="text-2xl font-semibold text-white">{data?.totals?.off_hours_messages ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <p className="text-xs text-slate-400">Window mode</p>
            <p className="text-lg font-semibold text-white">{formatWindowLabel(data?.window)}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mt-6">
          <div className="lg:col-span-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Hourly message volume (24h)</h2>
            <div className="overflow-x-auto">
              <div className="min-w-[720px] h-72 flex items-end gap-2">
                {hourlyBreakdown.map((item) => {
                  const barHeightPx = Math.max(
                    Math.round((item.count / maxHourlyCount) * 180),
                    item.count > 0 ? 8 : 3
                  );

                  return (
                    <div key={item.hour_24} className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-[11px] text-slate-300">{item.count}</div>
                      <div className="w-full h-48 flex items-end">
                        <div
                          className="w-full rounded-t-md bg-cyan-500/80 border border-cyan-300/40"
                          style={{ height: `${barHeightPx}px` }}
                          title={`${item.hour}: ${item.count} messages`}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400">{item.hour_24}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h2 className="text-sm font-semibold text-white mb-4">Text vs image (%)</h2>

            <div className="mx-auto w-44 h-44 rounded-full border-4 border-slate-700" style={pieStyle} />

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-full bg-cyan-400" /> Text
                </span>
                <span>
                  {data?.message_types?.text?.count ?? 0} ({data?.message_types?.text?.percentage ?? 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-full bg-amber-400" /> Image
                </span>
                <span>
                  {data?.message_types?.image?.count ?? 0} ({data?.message_types?.image?.percentage ?? 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-white mb-2">Fetched JSON</h2>
          <pre className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-200 overflow-auto max-h-80">
            {data ? JSON.stringify(data, null, 2) : "No response yet"}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default MonitoringPage;
