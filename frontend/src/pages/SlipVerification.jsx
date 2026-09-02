import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function SlipVerification() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchSlips();
  }, []);

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/participants/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSlips(res.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('ยืนยันสลิปนี้? ระบบจะส่งข้อความแจ้งยอดลงกลุ่มทันที')) return;
    try {
      await axios.post(`${backendUrl}/api/participants/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSlips(slips.filter(s => s.id !== id));
      alert('ยืนยันและส่งข้อความลงกลุ่มเรียบร้อยแล้ว');
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <div className="p-4">กำลังโหลด...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">ตรวจสอบสลิปโอนเงิน (รอยืนยัน)</h1>
      {slips.length === 0 ? (
        <div className="bg-white p-6 rounded-lg border text-center text-slate-500">ไม่มีสลิปที่รอการตรวจสอบ</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slips.map((slip) => (
            <div key={slip.id} className="bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                <span className="font-semibold text-sm">{slip.display_name}</span>
                <span className="text-xs text-slate-500">{slip.group?.name || 'ไม่มีชื่อกลุ่ม'}</span>
              </div>
              
              <div className="p-4 flex-1 flex flex-col items-center">
                <a href={`${backendUrl}/uploads/slips/${slip.slip_image}`} target="_blank" rel="noreferrer">
                  <img 
                    src={`${backendUrl}/uploads/slips/${slip.slip_image}`} 
                    alt="Slip" 
                    className="max-h-64 object-contain rounded mb-3 border hover:opacity-90 cursor-pointer"
                  />
                </a>
                
                <div className="text-sm w-full space-y-1">
                  <p><span className="text-slate-500">วันที่บนสลิป:</span> {slip.slip_timestamp || '-'}</p>
                  <p><span className="text-slate-500">ยอดเงิน:</span> {slip.slip_amount ? `${slip.slip_amount} บาท` : '-'}</p>
                </div>
              </div>
              
              <div className="p-3 border-t bg-slate-50">
                <button
                  onClick={() => handleApprove(slip.id)}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
                >
                  ✅ ยืนยันว่าโอนเงินจริง
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
