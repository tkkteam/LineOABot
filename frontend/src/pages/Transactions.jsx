import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchTransactions = async (m) => {
    try {
      setLoading(true);
      const res = await api.get(`/transactions?month=${m}&pageSize=500`);
      setTransactions(res.data.rows || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(month);
  }, [month]);

  const handleMonthChange = (e) => {
    setMonth(e.target.value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายการโอนเงิน</h1>
          <p className="text-sm text-slate-500">ประวัติการรับยอดที่ผ่านการยืนยันแล้ว</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">เดือน:</label>
          <input
            type="month"
            value={month}
            onChange={handleMonthChange}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-900">
              <tr>
                <th className="px-4 py-3">วันที่อนุมัติ</th>
                <th className="px-4 py-3">ผู้ใช้</th>
                <th className="px-4 py-3">กลุ่ม</th>
                <th className="px-4 py-3">ยอดเงิน (บาท)</th>
                <th className="px-4 py-3">วันที่โอน (ตามสลิป)</th>
                <th className="px-4 py-3 text-center">สลิป</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    ไม่มีรายการในเดือนที่เลือก
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {new Date(tx.approved_at).toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {tx.participant?.display_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      {tx.group?.name || 'แชทส่วนตัว'}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">
                      {tx.amount ? Number(tx.amount).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {tx.slip_timestamp || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tx.slip_image ? (
                        <a
                          href={`/uploads/slips/${tx.slip_image}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-600 hover:underline"
                        >
                          ดูสลิป
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
