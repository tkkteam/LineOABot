import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

export default function WinnerHistory() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [filterGroup, setFilterGroup] = useState(searchParams.get('group') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, pageSize };
      if (search.trim()) params.search = search.trim();
      if (filterGroup) params.group_id = filterGroup;
      const res = await api.get('/winners', { params });
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

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (filterGroup) params.set('group_id', filterGroup);
    window.open(`/api/winners/export?${params.toString()}`, '_blank');
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`ลบบันทึกผู้โชคดี "${name}"?`)) return;
    try {
      await api.delete(`/winners/${id}`);
      fetchData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Winner History</h1>
          <p className="text-sm text-slate-500">ประวัติผู้โชคดีทั้งหมด {total} ครั้ง</p>
        </div>
        <button onClick={exportCsv} className="btn-primary">
          📥 Export Excel (CSV)
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 sm:flex-row">
        <input
          className="input sm:max-w-xs"
          placeholder="🔍 ค้นหาผู้โชคดี..."
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

      {error && <div className="card !border-red-200 bg-red-50 text-sm text-red-700">{error}</div>}

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] whitespace-nowrap">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">ผู้โชคดี</th>
                  <th className="table-th">กลุ่ม</th>
                  <th className="table-th">วันที่สุ่ม</th>
                  <th className="table-th">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="table-td text-center text-slate-400">
                      ยังไม่มีประวัติผู้โชคดี
                    </td>
                  </tr>
                )}
                {items.map((w, i) => (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="table-td">{(page - 1) * pageSize + i + 1}</td>
                    <td className="table-td">
                      <div className="font-medium">{w.winner_name}</div>
                      <div className="font-mono text-xs text-slate-400">{w.winner_user_id}</div>
                    </td>
                    <td className="table-td">{w.group?.name || w.group?.line_group_id || '-'}</td>
                    <td className="table-td text-xs text-slate-500">
                      {new Date(w.draw_time).toLocaleString('th-TH')}
                    </td>
                    <td className="table-td">
                      <button onClick={() => handleDelete(w.id, w.winner_name)} className="text-xs text-red-600 hover:underline">
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
