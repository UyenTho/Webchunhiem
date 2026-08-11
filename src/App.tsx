import React, { useState, useEffect } from 'react';
import { 
  Users, Wallet, CheckCircle, XCircle, Plus, Trash2, Award, LogOut, LogIn, Lock, Key, ShieldAlert, Eye, Calendar, Trophy, ToggleLeft, ToggleRight, X, FileSpreadsheet, ShieldCheck, FileUp, Sparkles, Send
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';

export interface Student {
  id: string;
  code: string;
  full_name: string;
  phone: string;
  group_number: number;
  class_role: string;
  hobbies: string;
  father_name: string;
  father_job: string;
  father_phone: string;
  mother_name: string;
  mother_job: string;
  mother_phone: string;
  policy_status: string;
  policy_note: string;
  exam_block: string;
  grade_target: string;
  medical_history: string;
  talents: string;
  past_roles: string;
  apply_role: string;
  personality: string;
  teacher_expectation: string;
  teacher_support: string;
  secret_message: string;
  is_survey_submitted: boolean;
}

export interface StudentRecord {
  id?: string;
  student_id: string;
  week_number: number;
  record_type: 'violation' | 'commendation';
  content: string;
  points: number;
  record_date: string;
}

export interface GroupScore {
  id?: string;
  group_number: number;
  week_number: number;
  score: number;
  note: string;
}

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // State nhập điểm thi đua (Dùng dạng string để không bị lỗi dính số 010)
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [recordType, setRecordType] = useState<'violation' | 'commendation'>('commendation');
  const [recordContent, setRecordContent] = useState<string>('');
  const [recordPoints, setRecordPoints] = useState<string>('10'); // Khởi tạo chuẩn
  const [recordDate, setRecordDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // State điểm tổ (Dùng chuỗi string để xóa không bị đè số 0)
  const [group1Score, setGroup1Score] = useState<string>('100');
  const [group2Score, setGroup2Score] = useState<string>('100');
  const [group3Score, setGroup3Score] = useState<string>('100');
  const [group4Score, setGroup4Score] = useState<string>('100');
  const [groupNote, setGroupNote] = useState<string>('');

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [stRes, recRes] = await Promise.all([
        supabase.from('students').select('*').order('code', { ascending: true }),
        supabase.from('student_records').select('*').order('created_at', { ascending: false })
      ]);

      if (stRes.data) setStudents(stRes.data);
      if (recRes.data) setRecords(recRes.data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAllData(); }, []);

  // Xử lý lưu điểm học sinh
  const handleSaveStudentRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert('Vui lòng chọn học sinh!');
      return;
    }
    if (!recordContent.trim()) {
      alert('Vui lòng nhập nội dung chi tiết!');
      return;
    }

    const pointsNum = parseInt(recordPoints, 10);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      alert('Số điểm phải là một số nguyên dương!');
      return;
    }

    try {
      const newRecord = {
        student_id: selectedStudentId,
        week_number: selectedWeek,
        record_type: recordType,
        content: recordContent.trim(),
        points: pointsNum,
        record_date: recordDate
      };

      const { error } = await supabase.from('student_records').insert([newRecord]);

      if (error) {
        alert('Lỗi khi lưu điểm: ' + error.message);
      } else {
        alert('Lưu điểm cho học sinh thành công!');
        setRecordContent('');
        setRecordPoints('10');
        loadAllData();
      }
    } catch (err: any) {
      alert('Không thể kết nối máy chủ: ' + err.message);
    }
  };

  // Xử lý lưu báo cáo thi đua tổ
  const handleSaveGroupScores = async (e: React.FormEvent) => {
    e.preventDefault();
    const scores = [
      { group_number: 1, score: parseInt(group1Score, 10) || 0, week_number: selectedWeek, note: groupNote },
      { group_number: 2, score: parseInt(group2Score, 10) || 0, week_number: selectedWeek, note: groupNote },
      { group_number: 3, score: parseInt(group3Score, 10) || 0, week_number: selectedWeek, note: groupNote },
      { group_number: 4, score: parseInt(group4Score, 10) || 0, week_number: selectedWeek, note: groupNote }
    ];

    await supabase.from('group_scores').upsert(scores, { onConflict: 'group_number,week_number' });
    alert('Đã gửi báo cáo thi đua lớp thành công!');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans max-w-2xl mx-auto space-y-6">
      <header className="bg-indigo-700 text-white p-4 rounded-2xl shadow-md text-center">
        <h1 className="text-lg font-bold">Hệ Thống Quản Lý Lớp Học</h1>
        <p className="text-xs text-indigo-200 mt-1">Ghi Nhận Thi Đua & Báo Cáo Tuần</p>
      </header>

      {/* KHỐI 1: GHI NHẬN ĐIỂM THI ĐUA HỌC SINH */}
      <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-600" /> Nhập Điểm Vi Phạm / Khen Thưởng
        </h2>

        <form onSubmit={handleSaveStudentRecord} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Chọn Tuần Học (*):</label>
              <select 
                value={selectedWeek} 
                onChange={e => setSelectedWeek(Number(e.target.value))}
                className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Tuần {w}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ngày Tháng Cụ Thể (*):</label>
              <input 
                type="date" 
                value={recordDate} 
                onChange={e => setRecordDate(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Chọn Học Sinh Trong Lớp (*):</label>
            <select 
              value={selectedStudentId} 
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full p-3 border rounded-xl bg-slate-50 font-semibold text-slate-800 focus:bg-white"
            >
              <option value="">-- Chọn Học Sinh --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name} (Tổ {s.group_number || 1}) - MSHS: {s.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Loại Ghi Nhận (*):</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRecordType('violation')}
                className={`py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  recordType === 'violation' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <ShieldAlert className="w-4 h-4" /> Vi Phạm
              </button>
              <button
                type="button"
                onClick={() => setRecordType('commendation')}
                className={`py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  recordType === 'commendation' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Award className="w-4 h-4" /> Khen Thưởng
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Nội dung chi tiết vi phạm / khen thưởng:</label>
            <input 
              type="text"
              placeholder="VD: Điểm 10 môn toán, Đi muộn 10 phút..."
              value={recordContent}
              onChange={e => setRecordContent(e.target.value)}
              className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Số điểm cộng / trừ (*):</label>
            {/* GIẢI QUYẾT TRIỆT ĐỂ LỖI DÍNH SỐ 010: DÙNG INPUT TYPE="TEXT" VỚI PATTERN NUMBER */}
            <input 
              type="text"
              inputMode="numeric"
              value={recordPoints}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, ''); // Chỉ cho nhập số, xóa sạch số 0 vô lý ở đầu
                setRecordPoints(val);
              }}
              placeholder="Nhập số điểm..."
              className="w-full p-3 border rounded-xl bg-slate-50 font-bold text-indigo-700 text-center text-base focus:bg-white"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition"
          >
            Lưu Điểm Cho Học Sinh
          </button>
        </form>
      </div>

      {/* KHỐI 2: BÁO CÁO ĐIỂM THI ĐUA CÁC TỔ */}
      <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Báo Cáo Điểm Thi Đua Các Tổ Trong Tuần
        </h2>

        <form onSubmit={handleSaveGroupScores} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Điểm Tổ 1:</label>
              <input 
                type="text" inputMode="numeric" 
                value={group1Score} 
                onChange={e => setGroup1Score(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full p-2.5 border rounded-xl font-bold text-center text-indigo-700" 
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Điểm Tổ 2:</label>
              <input 
                type="text" inputMode="numeric" 
                value={group2Score} 
                onChange={e => setGroup2Score(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full p-2.5 border rounded-xl font-bold text-center text-indigo-700" 
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Điểm Tổ 3:</label>
              <input 
                type="text" inputMode="numeric" 
                value={group3Score} 
                onChange={e => setGroup3Score(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full p-2.5 border rounded-xl font-bold text-center text-indigo-700" 
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Điểm Tổ 4:</label>
              <input 
                type="text" inputMode="numeric" 
                value={group4Score} 
                onChange={e => setGroup4Score(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full p-2.5 border rounded-xl font-bold text-center text-indigo-700" 
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">Ghi chú nhận xét gửi GVCN:</label>
            <textarea 
              rows={2}
              placeholder="VD: Lớp vệ sinh tốt, phát biểu bài tích cực..."
              value={groupNote}
              onChange={e => setGroupNote(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md transition"
          >
            Gửi Báo Cáo Thi Đua Lớp
          </button>
        </form>
      </div>
    </div>
  );
}
