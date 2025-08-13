export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <p className="text-sm text-slate-500 mb-4">Territories, stages, fields, consent</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">Stages & Reasons</div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">Fields Manager</div>
      </div>
    </div>
  );
}


