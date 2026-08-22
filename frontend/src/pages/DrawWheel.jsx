import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import Wheel from '../components/Wheel.jsx';
import Spinner from '../components/Spinner.jsx';

export default function DrawWheel() {
  const [searchParams] = useSearchParams();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(searchParams.get('group') || '');
  const [wheelData, setWheelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [error, setError] = useState('');

  // Load group list
  useEffect(() => {
    api
      .get('/groups/all')
      .then((res) => {
        const list = res.data.data || [];
        setGroups(list);
        if (!selectedGroup && list.length > 0) setSelectedGroup(String(list[0].id));
      })
      .catch((err) => setError(errorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load wheel data when group changes
  useEffect(() => {
    if (!selectedGroup) {
      setWheelData(null);
      return;
    }
    setLoading(true);
    setWinner(null);
    api
      .get('/wheel/data', { params: { group_id: selectedGroup } })
      .then((res) => setWheelData(res.data.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [selectedGroup]);

  const handleSpin = useCallback(async () => {
    if (!selectedGroup) return null;
    setSpinning(true);
    setWinner(null);
    try {
      const res = await api.post('/wheel/spin', { group_id: parseInt(selectedGroup, 10) });
      setWinner(res.data.data);
      return res.data.data.winner_name;
    } catch (err) {
      setError(errorMessage(err, 'สุ่มไม่สำเร็จ'));
      setSpinning(false);
      return null;
    }
  }, [selectedGroup]);

  const handleFinished = useCallback(() => setSpinning(false), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Draw Wheel</h1>
        <p className="text-sm text-slate-500">หมุนวงล้อสุ่มผู้โชคดีจากรายชื่อผู้เข้าร่วม</p>
      </div>

      {/* Group selector */}
      <div className="card">
        <label className="label">เลือกกลุ่ม LINE</label>
        <select className="input" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
          <option value="">-- เลือกกลุ่ม --</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name || g.line_group_id}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="card !border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : wheelData ? (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <div className="text-sm font-medium text-slate-500">
                ผู้เข้าร่วมทั้งหมด: <span className="font-bold text-slate-900">{wheelData.total_participants}</span> คน
              </div>
            </div>

            <Wheel
              names={wheelData.names}
              onSpin={handleSpin}
              onFinished={handleFinished}
              disabled={spinning}
            />

            {winner && (
              <div className="w-full max-w-sm rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center shadow">
                <div className="text-4xl">🏆</div>
                <div className="mt-2 text-sm text-slate-500">ผู้โชคดีคือ</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{winner.winner_name}</div>
                <div className="mt-2 text-xs text-slate-400">
                  {new Date(winner.draw_time).toLocaleString('th-TH')}
                </div>
                <div className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800">
                  ผลการสุ่มถูกบันทึกลงประวัติแล้ว (ใช้ทุกคนในรายชื่อ ไม่จำกัดเฉพาะชื่อบนวงล้อ)
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">กรุณาเลือกกลุ่มเพื่อเริ่มหมุนวงล้อ</div>
        )}
      </div>
    </div>
  );
}
