export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Analytics</h1>
      <p className="text-sm text-slate-500 mb-4">Funnels, cohorts, UTMs</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">Funnel chart</div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">Source ROI</div>
      </div>
    </div>
  );
}


