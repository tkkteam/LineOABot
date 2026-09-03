import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api, { errorMessage } from '../api/client.js';

export default function SlipVerification() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSlips();
  }, []);

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const res = await api.get('/participants/pending');
      setSlips(res.data.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    const result = await Swal.fire({
      title: 'ยืนยันสลิปนี้?',
      text: 'ระบบจะส่งข้อความแจ้งยอดลงกลุ่มทันที',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    });
    if (!result.isConfirmed) return;
    try {
      await api.post(`/participants/${id}/approve`);
      setSlips(slips.filter(s => s.id !== id));
      Swal.fire('สำเร็จ', 'ยืนยันและบันทึกยอดเรียบร้อยแล้ว', 'success');
    } catch (err) {
      Swal.fire('เกิดข้อผิดพลาด', errorMessage(err), 'error');
    }
  };

  const handleReject = async (id) => {
    const result = await Swal.fire({
      title: 'คุณต้องการปฏิเสธ/ลบสลิปนี้ใช่หรือไม่?',
      text: 'ข้อมูลสลิปจะถูกลบออกไป',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
    });
    if (!result.isConfirmed) return;
    try {
      await api.post(`/participants/${id}/reject`);
      setSlips(slips.filter(s => s.id !== id));
      Swal.fire('สำเร็จ', 'ปฏิเสธและลบสลิปเรียบร้อยแล้ว', 'info');
    } catch (err) {
      Swal.fire('เกิดข้อผิดพลาด', errorMessage(err), 'error');
    }
  };

  if (loading) return <div className="p-4">กำลังโหลด...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">ตรวจสอบสลิปโอนเงิน (รอยืนยัน)</h1>
      {slips.length === 0 ? (
        <div className="bg-white p-10 rounded-lg border text-center text-slate-500 shadow-sm">
          <div className="text-4xl mb-3">📄</div>
          <div className="text-lg font-medium">ยังไม่มีข้อมูล</div>
          <div className="text-sm mt-1 text-slate-400">เมื่อมีผู้ใช้อัปโหลดสลิป รูปภาพจะมาปรากฏที่นี่ครับ</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slips.map((slip) => (
            <div key={slip.id} className="bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                <span className="font-semibold text-sm">{slip.display_name}</span>
                <span className="text-xs text-slate-500">{slip.group?.name || 'ไม่มีชื่อกลุ่ม'}</span>
              </div>
              
              <div className="p-4 flex-1 flex flex-col items-center">
                <a href={`/uploads/slips/${slip.slip_image}`} target="_blank" rel="noreferrer">
                  <img 
                    src={`/uploads/slips/${slip.slip_image}`} 
                    alt="Slip" 
                    className="max-h-64 object-contain rounded mb-3 border hover:opacity-90 cursor-pointer"
                  />
                </a>
                
                <div className="text-sm w-full space-y-1">
                  <p><span className="text-slate-500">วันที่บนสลิป:</span> {slip.slip_timestamp || '-'}</p>
                  <p><span className="text-slate-500">ยอดเงิน:</span> {slip.slip_amount ? `${slip.slip_amount} บาท` : '-'}</p>
                </div>
              </div>
              
              <div className="p-3 border-t bg-slate-50 flex gap-2">
                <button
                  onClick={() => handleReject(slip.id)}
                  className="flex-1 bg-white text-red-500 border border-red-200 py-2 rounded-lg font-medium hover:bg-red-50 transition text-sm"
                >
                  ❌ ปฏิเสธ/ลบ
                </button>
                <button
                  onClick={() => handleApprove(slip.id)}
                  className="flex-[2] bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition text-sm"
                >
                  ✅ ยืนยันสลิป
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
