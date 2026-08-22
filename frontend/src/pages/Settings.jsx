import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api, { errorMessage } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

const SETTING_META = {
  wheel_enabled: { label: 'เปิดใช้งานการจับสลาก', desc: 'ถ้าปิด Bot จะตอบว่าปิดรับการจับสลากชั่วคราว' },
  spin_requires_admin: { label: 'เฉพาะผู้ดูแลกลุ่มเท่านั้นที่หมุนได้', desc: 'ผู้สมัครคนแรกของกลุ่มเป็นผู้ดูแลอัตโนมัติ' },
  winners_can_repeat: { label: 'ผู้ชนะแล้วสามารถชนะซ้ำได้', desc: 'ถ้าปิด ผู้ที่เคยชนะจะถูกตัดออกจากรอบถัดไป' },
  list_max_lines: { label: 'จำนวนรายชื่อสูงสุดที่แสดงใน LINE (บรรทัด)', desc: 'คำสั่ง "รายชื่อ" ในกลุ่ม' },
};

export default function Settings() {
  const { user, isSuperAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Change password form
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setSettings(res.data.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const update = async (key, value) => {
    setBusyKey(key);
    setError('');
    setNotice('');
    try {
      const res = await api.put('/settings', { key, value });
      setSettings(res.data.data);
      setNotice(`บันทึก "${SETTING_META[key]?.label || key}" แล้ว`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwdBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post('/auth/change-password', {
        current_password: currentPwd,
        new_password: newPwd,
      });
      setCurrentPwd('');
      setNewPwd('');
      setNotice('เปลี่ยนรหัสผ่านสำเร็จ');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPwdBusy(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">ตั้งค่าระบบและการใช้งาน Bot</p>
      </div>

      {error && <div className="card !border-red-200 bg-red-50 text-sm text-red-700">{error}</div>}
      {notice && <div className="card !border-emerald-200 bg-emerald-50 text-sm text-emerald-700">{notice}</div>}

      {/* Bot behavior */}
      <div className="card">
        <h2 className="mb-4 font-semibold text-slate-900">🤖 พฤติกรรม Bot ใน LINE</h2>
        <div className="divide-y divide-slate-100">
          {Object.entries(SETTING_META).map(([key, meta]) => {
            const isBool = ['wheel_enabled', 'spin_requires_admin', 'winners_can_repeat'].includes(key);
            const value = settings[key];
            return (
              <div key={key} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium text-slate-800">{meta.label}</div>
                  <div className="text-sm text-slate-500">{meta.desc}</div>
                </div>
                {isBool ? (
                  <button
                    onClick={() => update(key, value === 'true' ? 'false' : 'true')}
                    disabled={busyKey === key}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                      value === 'true' ? 'bg-brand-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        value === 'true' ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className="input !w-24 !py-1.5"
                      defaultValue={value}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (v >= 1 && v <= 100 && String(v) !== value) update(key, v);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Account */}
      <div className="card">
        <h2 className="mb-4 font-semibold text-slate-900">🔐 บัญชีผู้ใช้</h2>
        <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          เข้าสู่ระบบในฐานะ <span className="font-semibold text-slate-900">{user?.username}</span> (
          {isSuperAdmin ? 'Super Admin' : 'Admin'})
          {isSuperAdmin && <span className="ml-2 text-xs text-slate-400">— มีสิทธิ์จัดการผู้ใช้ได้ทุกคน</span>}
        </div>

        <form onSubmit={changePassword} className="grid max-w-lg gap-4 sm:grid-cols-3">
          <div>
            <label className="label">รหัสผ่านปัจจุบัน</label>
            <input className="input" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required />
          </div>
          <div>
            <label className="label">รหัสผ่านใหม่</label>
            <input className="input" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required minLength={8} />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={pwdBusy} className="btn-secondary w-full">
              {pwdBusy ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
