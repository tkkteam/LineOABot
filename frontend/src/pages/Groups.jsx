import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

export default function Groups() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [nameDraft, setNameDraft] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/groups', { params: { page: 1, pageSize: 100 } });
      setItems(res.data.data.items);
      setTotal(res.data.data.total);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startEdit = (g) => {
    setEditing(g.id);
    setNameDraft(g.name || '');
  };

  const saveName = async (g) => {
    try {
      await api.patch(`/groups/${g.id}`, { name: nameDraft });
      setEditing(null);
      fetchData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const syncGroup = async (g) => {
    try {
      await api.post(`/groups/${g.id}/sync`);
      fetchData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleDelete = async (g) => {
    const confirmMsg =
      `ลบกลุ่ม "${g.name || g.line_group_id}"?\n` +
      `ข้อมูลผู้เข้าร่วม (${g.participant_count} คน) และประวัติผู้โชคดี (${g.winner_count} ครั้ง) จะถูกลบทั้งหมด`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.delete(`/groups/${g.id}`);
      fetchData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Groups</h1>
        <p className="text-sm text-slate-500">LINE กลุ่มที่ Bot ถูกเชิญเข้า · ทั้งหมด {total} กลุ่ม</p>
      </div>

      {error && <div className="card !border-red-200 bg-red-50 text-sm text-red-700">{error}</div>}

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] whitespace-nowrap">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="table-th">กลุ่ม</th>
                  <th className="table-th">LINE Group ID</th>
                  <th className="table-th">ผู้เข้าร่วม</th>
                  <th className="table-th">ผู้โชคดี</th>
                  <th className="table-th">สร้างเมื่อ</th>
                  <th className="table-th">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="table-td text-center text-slate-400">
                      ยังไม่มีกลุ่ม — เชิญ Bot เข้ากลุ่ม LINE แล้วพิมพ์ "สมัคร"
                    </td>
                  </tr>
                )}
                {items.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="table-td">
                      {editing === g.id ? (
                        <div className="flex gap-2">
                          <input
                            className="input !py-1 !text-sm"
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            autoFocus
                          />
                          <button className="btn-primary !px-3 !py-1" onClick={() => saveName(g)}>
                            บันทึก
                          </button>
                          <button className="btn-secondary !px-3 !py-1" onClick={() => setEditing(null)}>
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium">{g.name || 'ไม่ทราบชื่อ'}</span>
                      )}
                    </td>
                    <td className="table-td font-mono text-xs">{g.line_group_id}</td>
                    <td className="table-td">{g.participant_count} คน</td>
                    <td className="table-td">{g.winner_count} ครั้ง</td>
                    <td className="table-td text-xs text-slate-500">
                      {new Date(g.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="table-td">
                      <div className="flex gap-3 text-xs">
                        <button className="text-brand-600 hover:underline" onClick={() => startEdit(g)}>
                          เปลี่ยนชื่อ
                        </button>
                        <button className="text-emerald-600 hover:underline" onClick={() => syncGroup(g)}>
                          Sync
                        </button>
                        <button className="text-red-600 hover:underline" onClick={() => handleDelete(g)}>
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
