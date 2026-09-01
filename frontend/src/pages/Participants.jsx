import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

export default function Participants() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [filterGroup, setFilterGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Add Manual State
  const [newName, setNewName] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, pageSize };
      if (search.trim()) params.search = search.trim();
      if (filterGroup) params.group_id = filterGroup;
      const res = await api.get('/participants', { params });
      setItems(res.data.data.items);
      setTotal(res.data.data.total);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterGroup]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    api
      .get('/groups/all')
      .then((res) => setGroups(res.data.data))
      .catch(() => {});
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`ลบผู้เข้าร่วม "${name}" ออกจากรายชื่อ?`)) return;
    try {
      await api.delete(`/participants/${id}`);
      fetchData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleToggleAdmin = async (id) => {
    try {
      await api.put(`/participants/${id}/admin`);
      fetchData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    if (!newGroupId || !newName.trim()) return;
    
    setAddBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post('/participants', {
        group_id: newGroupId,
        display_name: newName.trim(),
      });
      setNewName('');
      setNotice('เพิ่มรายชื่อสำเร็จ');
      fetchData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAddBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Participants</h1>
        <p className="text-sm text-slate-500">
          ผู้เข้าร่วมทั้งหมด {total} คน · สมัครผ่าน LINE หรือเพิ่มแบบ Manual
        </p>
      </div>

      {error && <div className="card !border-red-200 bg-red-50 text-sm text-red-700">{error}</div>}
      {notice && <div className="card !border-emerald-200 bg-emerald-50 text-sm text-emerald-700">{notice}</div>}

      {/* Add Manual Form */}
      <div className="card">
        <h2 className="mb-4 font-semibold text-slate-900">➕ เพิ่มรายชื่อเอง (Manual)</h2>
        <form onSubmit={handleAddManual} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="label">เลือกกลุ่ม</label>
            <select
              className="input"
              value={newGroupId}
              onChange={(e) => setNewGroupId(e.target.value)}
              required
            >
              <option value="">-- เลือกกลุ่ม --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name || g.line_group_id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="label">ชื่อผู้เข้าร่วม</label>
            <input
              className="input"
              placeholder="พิมพ์ชื่อ..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="sm:w-32">
            <button type="submit" disabled={addBusy} className="btn-primary w-full">
              {addBusy ? 'รอสักครู่...' : 'เพิ่ม'}
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 sm:flex-row">
        <input
          className="input sm:max-w-xs"
          placeholder="🔍 ค้นหาชื่อ..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input sm:max-w-xs"
          value={filterGroup}
          onChange={(e) => {
            setFilterGroup(e.target.value);
            setPage(1);
          }}
        >
          <option value="">ทุกกลุ่ม</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name || g.line_group_id}
            </option>
          ))}
        </select>
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">ชื่อ</th>
                  <th className="table-th">กลุ่ม</th>
                  <th className="table-th">LINE User ID</th>
                  <th className="table-th">บทบาท</th>
                  <th className="table-th">สมัครเมื่อ</th>
                  <th className="table-th text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table-td text-center text-slate-400">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
                {items.map((p, i) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="table-td">{(page - 1) * pageSize + i + 1}</td>
                    <td className="table-td font-medium">{p.display_name}</td>
                    <td className="table-td">{p.group?.name || p.group?.line_group_id || '-'}</td>
                    <td className="table-td font-mono text-xs">{p.user_id}</td>
                    <td className="table-td">
                      {p.is_group_admin ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">👑 ผู้ดูแล</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">สมาชิก</span>
                      )}
                    </td>
                    <td className="table-td text-xs text-slate-500">
                      {new Date(p.created_at).toLocaleString('th-TH')}
                    </td>
                    <td className="table-td text-right space-x-3">
                      <button onClick={() => handleToggleAdmin(p.id)} className="text-xs text-brand-600 hover:underline">
                        {p.is_group_admin ? 'ปลดผู้ดูแล' : 'ตั้งเป็นผู้ดูแล'}
                      </button>
                      <button onClick={() => handleDelete(p.id, p.display_name)} className="text-xs text-red-600 hover:underline">
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <span className="text-xs text-slate-500">
            หน้า {page} / {totalPages} · ทั้งหมด {total} รายการ
          </span>
          <div className="flex gap-2">
            <button className="btn-secondary !py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ก่อนหน้า
            </button>
            <button className="btn-secondary !py-1.5" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
