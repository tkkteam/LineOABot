import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../api/client.js';

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
      setTransactions(res.data.data?.items || []);
    } catch (err) {
      console.error(err);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลรายการโอนเงินได้', 'error');
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

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'ต้องการลบประวัตินี้ใช่หรือไม่?',
      text: 'ข้อมูลจะถูกลบออกจากระบบอย่างถาวร',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444'
    });
    if (!result.isConfirmed) return;
    
    try {
      await api.delete(`/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t.id !== id));
      Swal.fire('สำเร็จ', 'ลบประวัติเรียบร้อยแล้ว', 'success');
    } catch (err) {
      Swal.fire('เกิดข้อผิดพลาด', err?.response?.data?.message || err.message, 'error');
    }
  };

  const handleNotify = async (id) => {
    const result = await Swal.fire({
      title: 'แจ้งรับยอดทาง LINE?',
      text: 'ระบบจะส่งข้อความแจ้งรับยอดไปยังผู้ใช้คนนี้',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ส่งข้อความ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981'
    });
    if (!result.isConfirmed) return;

    try {
      await api.post(`/transactions/${id}/notify`);
      Swal.fire('สำเร็จ', 'ส่งข้อความแจ้งรับยอดเรียบร้อยแล้ว', 'success');
    } catch (err) {
      Swal.fire('เกิดข้อผิดพลาด', err?.response?.data?.message || err.message, 'error');
    }
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
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
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
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      <button
                        onClick={() => handleNotify(tx.id)}
                        className="px-2 py-1 bg-brand-500 text-white rounded hover:bg-brand-600 transition text-xs"
                        title="แจ้งรับยอดทาง LINE"
                      >
                        💬 แจ้งรับยอด
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs"
                        title="ลบรายการ"
                      >
                        🗑️ ลบ
                      </button>
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
