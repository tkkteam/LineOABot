import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import LineChart from '../components/LineChart.jsx';
import Spinner from '../components/Spinner.jsx';

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${accent}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="card text-red-600">{error || 'โหลดข้อมูลไม่สำเร็จ'}</div>;
  }

  const { totals, daily } = data;
  const labels = daily.map((d) => d.date.slice(5)); // MM-DD
  const datasets = [
    {
      label: 'ผู้โชคดี (รายวัน)',
      data: daily.map((d) => d.winners),
      borderColor: '#4f46e5',
      backgroundColor: 'rgba(79,70,229,0.08)',
      fill: true,
      tension: 0.3,
    },
    {
      label: 'ผู้สมัครใหม่ (รายวัน)',
      data: daily.map((d) => d.participants),
      borderColor: '#0ea5e9',
      backgroundColor: 'rgba(14,165,233,0.08)',
      fill: true,
      tension: 0.3,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">ภาพรวมระบบจับสลาก</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="👥" label="สมาชิกทั้งหมด" value={totals.participants} accent="bg-blue-100" />
        <StatCard icon="💬" label="กลุ่มทั้งหมด" value={totals.groups} accent="bg-emerald-100" />
        <StatCard icon="🏆" label="ผู้ชนะทั้งหมด" value={totals.winners} accent="bg-amber-100" />
        <StatCard icon="🎉" label="กิจกรรม" value={totals.events} accent="bg-violet-100" />
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold text-slate-900">📈 สถิติ 30 วันล่าสุด</h2>
        <LineChart labels={labels} datasets={datasets} />
      </div>
    </div>
  );
}
