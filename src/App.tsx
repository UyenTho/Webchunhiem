import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { 
  Users, Wallet, CheckCircle, XCircle, Plus, Trash2, Edit3, Award, LogOut, LogIn, Lock, Key, ShieldAlert, Eye, Calendar, Trophy, Mail, Clock, Sparkles, Megaphone, Bell
} from 'lucide-react';
import { supabase } from './supabaseClient';

export interface Student {
  id: string;
  code: string;
  full_name: string;
  dob?: string;
  pob?: string;
  address?: string;
  phone?: string;
  group_number: number;
  class_role?: string;
  
  father_name?: string;
  father_job?: string;
  father_phone?: string;
  mother_name?: string;
  mother_job?: string;
  mother_phone?: string;
  emergency_contact?: string;
  living_with?: string;
  policy_status?: string;
  policy_note?: string;

  exam_block?: string;
  grade_target?: string;
  weak_subject_target?: string;

  medical_history?: string;
  seating_preference?: string;
  talents?: string;
  certificates?: string;
  past_roles?: string;
  apply_role?: string;

  personality?: string;
  hobbies?: string;
  teacher_style_expectation?: string;
  teacher_support?: string;
  secret_message?: string;

  is_survey_submitted?: boolean;
}

export interface FeeItem {
  id: string;
  title: string;
  amount: number;
  due_date?: string;
}

export interface FeePayment {
  student_id: string;
  fee_item_id: string;
  is_paid: boolean;
}

export interface WeeklyViolation {
  id: string;
  student_id: string;
  week_number: number;
  content: string;
  penalty_points: number;
}

export interface WeeklyCommendation {
  id: string;
  student_id: string;
  week_number: number;
  content: string;
  bonus_points: number;
}

export interface Announcement {
  id: string;
  week_number: number;
  title: string;
  content: string;
  created_date?: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'teacher_login' | 'teacher_dashboard' | 'student_login' | 'student_portal'>('student_login');
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);

  // Cấu hình Đăng nhập Giáo viên
  const [teacherEmail] = useState<string>('truonguyentho@gmail.com');
  const [teacherAuthCode, setTeacherAuthCode] = useState<string>(() => localStorage.getItem('teacher_password') || '123456');

  return (
    <div>
      {/* THANH CHUYỂN ĐỔI NHANH GIAO DIỆN */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white text-xs py-2 px-4 font-bold flex justify-between items-center shadow-md flex-wrap gap-2">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-200" /> Quản Lý Lớp Chủ Nhiệm
        </span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentView(currentView.startsWith('teacher') ? 'student_login' : 'teacher_login')} 
            className="bg-white text-indigo-900 px-3 py-1 rounded-full text-[11px] font-extrabold hover:bg-indigo-50 transition shadow"
          >
            {currentView.startsWith('teacher') ? '👉 Chuyển Sang Màn Hình Học Sinh' : '👉 Chuyển Sang Màn Hình Giáo Viên'}
          </button>
        </div>
      </div>

      {currentView === 'teacher_login' && (
        <TeacherLogin 
          registeredEmail={teacherEmail}
          authCode={teacherAuthCode}
          onLoginSuccess={() => setCurrentView('teacher_dashboard')}
          onResetCodeSuccess={(newCode) => {
            setTeacherAuthCode(newCode);
            localStorage.setItem('teacher_password', newCode);
          }}
        />
      )}

      {currentView === 'student_login' && (
        <StudentLogin
          onLoginSuccess={(student) => {
            setLoggedInStudent(student);
            setCurrentView('student_portal');
          }}
          onOpenTeacherLogin={() => setCurrentView('teacher_login')}
        />
      )}

      {currentView === 'student_portal' && loggedInStudent && (
        <StudentPortal
          student={loggedInStudent}
          onLogout={() => {
            setLoggedInStudent(null);
            setCurrentView('student_login');
          }}
        />
      )}

      {currentView === 'teacher_dashboard' && (
        <TeacherDashboard
          teacherEmail={teacherEmail}
          teacherPass={teacherAuthCode}
          onUpdatePass={(newPass) => {
            setTeacherAuthCode(newPass);
            localStorage.setItem('teacher_password', newPass);
            alert('Đã cập nhật mật khẩu Giáo viên thành công!');
          }}
          onLogoutTeacher={() => setCurrentView('student_login')}
        />
      )}
    </div>
  );
}

// 1. MÀN HÌNH ĐĂNG NHẬP GIÁO VIÊN (EMAILJS THẬT)
function TeacherLogin({ registeredEmail, authCode, onLoginSuccess, onResetCodeSuccess }: { registeredEmail: string; authCode: string; onLoginSuccess: () => void; onResetCodeSuccess: (code: string) => void }) {
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [isSendingMail, setIsSendingMail] = useState(false);

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim().toLowerCase() === registeredEmail.toLowerCase() && codeInput.trim() === authCode) {
      onLoginSuccess();
    } else {
      setError('Gmail hoặc Mật khẩu/Mã xác thực không chính xác!');
    }
  };

  const handleResetMail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmailInput) return;

    setIsSendingMail(true);
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    const SERVICE_ID = 'service_8a2xypd';
    const TEMPLATE_ID = 'template_u1p4eui';
    const PUBLIC_KEY = 'LjF9xTLuBZ1QcfYdy';

    emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: resetEmailInput,
        pass_code: newCode,
      },
      PUBLIC_KEY
    )
    .then(() => {
      setIsSendingMail(false);
      onResetCodeSuccess(newCode);
      alert(`Mã đăng nhập mới (${newCode}) đã được gửi thành công tới Gmail: ${resetEmailInput}`);
      setIsForgotModalOpen(false);
    })
    .catch((err) => {
      setIsSendingMail(false);
      alert('Gửi email thất bại! Vui lòng kiểm tra lại dịch vụ EmailJS.');
      console.error('EmailJS Error:', err);
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-indigo-600">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Cổng Quản Lý Giáo Viên</h2>
          <p className="text-xs text-slate-500">Đăng nhập bằng Gmail và Mã truy cập dành cho Giáo viên</p>
        </div>

        <form onSubmit={handleTeacherLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Gmail Giáo Viên:</label>
            <input
              type="email"
              required
              placeholder="truonguyentho@gmail.com"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Mật khẩu / Mã xác thực:</label>
            <input
              type="password"
              required
              placeholder="Nhập mã truy cập (Mặc định: 123456)"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{error}</p>}

          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> Đăng Nhập Quản Lý
          </button>
        </form>

        <div className="pt-2 text-center text-xs">
          <button onClick={() => setIsForgotModalOpen(true)} className="text-indigo-600 font-semibold hover:underline">
            Quên mật khẩu / Cấp lại mã qua Gmail?
          </button>
        </div>
      </div>

      {isForgotModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 space-y-4 text-xs shadow-2xl">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" /> Cấp Lại Mã Qua Email
            </h3>
            <p className="text-slate-500">Nhập địa chỉ Gmail của bạn, hệ thống sẽ gửi mã xác thực mới tới hòm thư.</p>
            <form onSubmit={handleResetMail} className="space-y-3">
              <input
                type="email"
                required
                placeholder="Nhập Gmail của bạn..."
                value={resetEmailInput}
                onChange={e => setResetEmailInput(e.target.value)}
                className="w-full p-2.5 border rounded-lg text-xs"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsForgotModalOpen(false)} className="px-3 py-1.5 border rounded">Hủy</button>
                <button type="submit" disabled={isSendingMail} className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded flex items-center gap-1">
                  {isSendingMail ? 'Đang gửi mail...' : 'Gửi Mã Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. MÀN HÌNH ĐĂNG NHẬP HỌC SINH
function StudentLogin({ onLoginSuccess, onOpenTeacherLogin }: { onLoginSuccess: (s: Student) => void, onOpenTeacherLogin: () => void }) {
  const [studentCode, setStudentCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim()) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('code', studentCode.trim().toUpperCase())
        .single();

      setLoading(false);

      if (error || !data) {
        setErrorMsg('Mã số học sinh không tồn tại trong hệ thống!');
      } else {
        onLoginSuccess(data);
      }
    } catch {
      setLoading(false);
      setErrorMsg('Lỗi kết nối CSDL Supabase!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Cổng Thông Tin Học Sinh</h2>
          <p className="text-xs text-slate-500">Đăng nhập bằng MSHS cá nhân (VD: <strong>HS001</strong>, <strong>HS002</strong>)</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Mã Số Học Sinh (MSHS):</label>
            <input
              type="text"
              required
              placeholder="VD: HS001"
              value={studentCode}
              onChange={e => setStudentCode(e.target.value)}
              className="w-full p-3 border rounded-xl text-sm font-semibold uppercase bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{errorMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" /> {loading ? 'Đang kiểm tra...' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="pt-4 border-t text-center">
          <button onClick={onOpenTeacherLogin} className="text-xs text-indigo-600 font-semibold hover:underline flex items-center justify-center gap-1 mx-auto">
            <Lock className="w-3.5 h-3.5" /> Chuyển sang Màn hình Giáo viên
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. MÀN HÌNH CÁ NHÂN HỌC SINH (NÚT ĐĂNG XUẤT + ĐẦY ĐỦ THU CHI, THI ĐUA, THÔNG BÁO & PHIẾU LÝ LỊCH)
function StudentPortal({ student, onLogout }: { student: Student; onLogout: () => void }) {
  const [currentStudent, setCurrentStudent] = useState<Student>(student);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [myViolations, setMyViolations] = useState<WeeklyViolation[]>([]);
  const [myCommendations, setMyCommendations] = useState<WeeklyCommendation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [surveyForm, setSurveyForm] = useState<Student>({ ...student });
  const [isSavingSurvey, setIsSavingSurvey] = useState(false);

  useEffect(() => {
    async function loadStudentData() {
      const [feeRes, payRes, vioRes, comRes, ancRes] = await Promise.all([
        supabase.from('fee_items').select('*'),
        supabase.from('fee_payments').select('*').eq('student_id', student.id),
        supabase.from('weekly_violations').select('*').eq('student_id', student.id).order('week_number', { ascending: true }),
        supabase.from('weekly_commendations').select('*').eq('student_id', student.id).order('week_number', { ascending: true }),
        supabase.from('announcements').select('*').order('created_at', { ascending: false })
      ]);

      setFeeItems(feeRes.data || []);
      setFeePayments(payRes.data || []);
      setMyViolations(vioRes.data || []);
      setMyCommendations(comRes.data || []);
      setAnnouncements(ancRes.data || []);
    }
    loadStudentData();
  }, [student.id]);

  const handleSaveSurvey = async () => {
    setIsSavingSurvey(true);
    const updatedData = { ...surveyForm, is_survey_submitted: true };
    const { error } = await supabase.from('students').update(updatedData).eq('id', student.id);
    setIsSavingSurvey(false);

    if (!error) {
      setCurrentStudent(updatedData);
      alert('Đã lưu và nộp thành công Phiếu Khảo Sát Lý Lịch!');
    } else {
      alert('Lỗi khi lưu dữ liệu!');
    }
  };

  const totalBonus = myCommendations.reduce((sum, item) => sum + (Number(item.bonus_points) || 0), 0);
  const totalPenalty = myViolations.reduce((sum, item) => sum + (Number(item.penalty_points) || 0), 0);
  const finalScore = 100 + totalBonus - totalPenalty;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* HEADER CÓ NÚT ĐĂNG XUẤT RÕ RÀNG */}
      <header className="bg-indigo-700 text-white py-4 px-6 flex justify-between items-center shadow-md">
        <div>
          <span className="text-xs bg-indigo-600 px-2.5 py-1 rounded font-semibold">{currentStudent.code}</span>
          <h1 className="text-lg font-bold mt-1">{currentStudent.full_name} (Tổ {currentStudent.group_number || 1})</h1>
        </div>
        <button onClick={onLogout} className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition">
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* 1. THÔNG BÁO TỪ GIÁO VIÊN CHỦ NHIỆM */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2 text-amber-800 border-b pb-2">
            <Bell className="w-4 h-4 text-amber-600 animate-bounce" /> Thông Báo Từ Giáo Viên Chủ Nhiệm
          </h2>
          {announcements.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Chưa có thông báo mới trong tuần.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm">{a.title}</span>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-bold">Tuần {a.week_number}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. BẢNG THU CHI CÁ NHÂN */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 border-b pb-3">
            <Wallet className="w-5 h-5" />
            <h2 className="font-bold text-base text-slate-800">Tình Trạng Thu Chi & Các Khoản Cần Nộp</h2>
          </div>
          {feeItems.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Chưa có khoản thu nào được thông báo.</p>
          ) : (
            <div className="divide-y">
              {feeItems.map(item => {
                const payment = feePayments.find(p => p.fee_item_id === item.id);
                const isPaid = payment?.is_paid || false;
                return (
                  <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.title}</p>
                      <p className="text-slate-500 mt-0.5">Số tiền: <strong className="text-indigo-600">{item.amount.toLocaleString()} VNĐ</strong> • Hạn hoàn thành: {item.due_date || 'Chưa quy định'}</p>
                    </div>
                    {isPaid ? (
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Đã nộp
                      </span>
                    ) : (
                      <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Chưa nộp
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. THI ĐỦA TỔNG KẾT & VI PHẠM/KHEN THƯỞNG CHI TIẾT */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-md flex justify-between items-center flex-wrap gap-4">
          <div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Thi Đua Cá Nhân</span>
            <h2 className="text-xl font-bold mt-1">Điểm Thi Đua Tổng Kết Sau Cùng</h2>
            <p className="text-xs text-indigo-100 mt-0.5">Điểm cơ bản (100) + Khen thưởng (+{totalBonus}) - Vi phạm (-{totalPenalty})</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold">{finalScore}</span>
            <span className="text-sm font-semibold"> / 100 ĐIỂM</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
            <div className="flex justify-between items-center border-b pb-2 text-amber-600">
              <h3 className="font-bold text-sm flex items-center gap-1.5"><Award className="w-4 h-4" /> Khen Thưởng & Điểm Cộng (+{totalBonus})</h3>
            </div>
            {myCommendations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có khen thưởng trong các tuần.</p>
            ) : (
              <div className="divide-y">
                {myCommendations.map(item => (
                  <div key={item.id} className="py-2 flex justify-between items-center text-xs">
                    <span>[Tuần {item.week_number}] {item.content}</span>
                    <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">+{item.bonus_points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
            <div className="flex justify-between items-center border-b pb-2 text-rose-600">
              <h3 className="font-bold text-sm flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> Lỗi Vi Phạm & Điểm Trừ (-{totalPenalty})</h3>
            </div>
            {myViolations.length === 0 ? (
              <p className="text-xs text-emerald-600 font-medium italic">Rất tốt! Em chưa vi phạm lỗi nào.</p>
            ) : (
              <div className="divide-y">
                {myViolations.map(item => (
                  <div key={item.id} className="py-2 flex justify-between items-center text-xs">
                    <span>[Tuần {item.week_number}] {item.content}</span>
                    <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">-{item.penalty_points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. PHIẾU KHẢO SÁT LÝ LỊCH 5 PHẦN */}
        <div className="bg-white rounded-2xl border-2 border-indigo-500 shadow-xl p-6 space-y-6 text-xs">
          <div className="border-b pb-3 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-slate-800 text-base">PHIẾU KHẢO SÁT LÝ LỊCH HỌC SINH ĐẦU NĂM HỌC</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Em hãy điền đầy đủ thông tin để Giáo viên chủ nhiệm hỗ trợ tốt nhất.</p>
            </div>
            {currentStudent.is_survey_submitted && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">Đã hoàn thành</span>}
          </div>

          <div className="space-y-5">
            {/* PHẦN 1 */}
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-800 text-xs uppercase bg-indigo-50 p-2 rounded border border-indigo-100">1. Thông Tin Cá Nhân & Liên Hệ</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Họ và Tên (*):</label>
                  <input type="text" value={surveyForm.full_name || ''} className="w-full p-2 border rounded font-semibold bg-slate-50" readOnly />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Ngày sinh (*):</label>
                  <input type="date" value={surveyForm.dob || ''} onChange={e => setSurveyForm({ ...surveyForm, dob: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nơi sinh (*):</label>
                  <input type="text" placeholder="VD: Quảng Ngãi" value={surveyForm.pob || ''} onChange={e => setSurveyForm({ ...surveyForm, pob: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold block mb-1">Địa chỉ thường trú / tạm trú (*):</label>
                  <input type="text" placeholder="Tên đường, phường/xã, quận/huyện..." value={surveyForm.address || ''} onChange={e => setSurveyForm({ ...surveyForm, address: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">SĐT / Zalo riêng của em:</label>
                  <input type="text" placeholder="VD: 0912..." value={surveyForm.phone || ''} onChange={e => setSurveyForm({ ...surveyForm, phone: e.target.value })} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            {/* PHẦN 2 */}
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-800 text-xs uppercase bg-indigo-50 p-2 rounded border border-indigo-100">2. Thông Tin Phụ Huynh & Gia Đình</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Họ tên Cha:</label>
                  <input type="text" value={surveyForm.father_name || ''} onChange={e => setSurveyForm({ ...surveyForm, father_name: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nghề nghiệp Cha:</label>
                  <input type="text" value={surveyForm.father_job || ''} onChange={e => setSurveyForm({ ...surveyForm, father_job: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">SĐT / Zalo Cha:</label>
                  <input type="text" value={surveyForm.father_phone || ''} onChange={e => setSurveyForm({ ...surveyForm, father_phone: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Họ tên Mẹ:</label>
                  <input type="text" value={surveyForm.mother_name || ''} onChange={e => setSurveyForm({ ...surveyForm, mother_name: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nghề nghiệp Mẹ:</label>
                  <input type="text" value={surveyForm.mother_job || ''} onChange={e => setSurveyForm({ ...surveyForm, mother_job: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">SĐT / Zalo Mẹ:</label>
                  <input type="text" value={surveyForm.mother_phone || ''} onChange={e => setSurveyForm({ ...surveyForm, mother_phone: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Người liên lạc chính khi gấp (*):</label>
                  <input type="text" placeholder="Cha / Mẹ / Khác..." value={surveyForm.emergency_contact || ''} onChange={e => setSurveyForm({ ...surveyForm, emergency_contact: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Hiện em sống cùng ai? (*):</label>
                  <input type="text" placeholder="Bố mẹ / Bố / Mẹ / Ông bà / Ở trọ..." value={surveyForm.living_with || ''} onChange={e => setSurveyForm({ ...surveyForm, living_with: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Diện chính sách / Đặc biệt:</label>
                  <input type="text" placeholder="Hộ nghèo, thương binh, mồ côi..." value={surveyForm.policy_status || ''} onChange={e => setSurveyForm({ ...surveyForm, policy_status: e.target.value })} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            {/* PHẦN 3 */}
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-800 text-xs uppercase bg-indigo-50 p-2 rounded border border-indigo-100">3. Định Hướng & Mục Tiêu Học Tập</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Dự định Khối thi ĐH (*):</label>
                  <input type="text" placeholder="A00, A01, B00, C00, D01..." value={surveyForm.exam_block || ''} onChange={e => setSurveyForm({ ...surveyForm, exam_block: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Mục tiêu danh hiệu lớp 10 (*):</label>
                  <input type="text" placeholder="Học sinh Giỏi / Xuất sắc" value={surveyForm.grade_target || ''} onChange={e => setSurveyForm({ ...surveyForm, grade_target: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Mục tiêu môn yếu nhất:</label>
                  <input type="text" placeholder="Đạt trên 6.5 môn Tiếng Anh..." value={surveyForm.weak_subject_target || ''} onChange={e => setSurveyForm({ ...surveyForm, weak_subject_target: e.target.value })} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            {/* PHẦN 4 */}
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-800 text-xs uppercase bg-indigo-50 p-2 rounded border border-indigo-100">4. Sức Khỏe, Sở Trường & Kỹ Năng</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Tiền sử bệnh lý cần lưu ý:</label>
                  <input type="text" placeholder="Tim mạch, hen suyễn, cận thị..." value={surveyForm.medical_history || ''} onChange={e => setSurveyForm({ ...surveyForm, medical_history: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Năng khiếu đặc biệt (Hát, thể thao, vẽ...):</label>
                  <input type="text" value={surveyForm.talents || ''} onChange={e => setSurveyForm({ ...surveyForm, talents: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Cán sự từng làm cấp 2:</label>
                  <input type="text" value={surveyForm.past_roles || ''} onChange={e => setSurveyForm({ ...surveyForm, past_roles: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nguyện vọng ứng cử Ban cán sự lớp:</label>
                  <input type="text" placeholder="Lớp trưởng / Lớp phó / Thủ quỹ..." value={surveyForm.apply_role || ''} onChange={e => setSurveyForm({ ...surveyForm, apply_role: e.target.value })} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            {/* PHẦN 5 */}
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-800 text-xs uppercase bg-indigo-50 p-2 rounded border border-indigo-100">5. Tính Cách & Tâm Tư Với GVCN</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Tự đánh giá tính cách:</label>
                  <input type="text" placeholder="Hướng nội/Hướng ngoại, hòa đồng..." value={surveyForm.personality || ''} onChange={e => setSurveyForm({ ...surveyForm, personality: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                  <label className="font-bold text-amber-900 block mb-1">Thông điệp bí mật gửi riêng Cô chủ nhiệm (Cam kết bảo mật 100%):</label>
                  <textarea rows={3} placeholder="Có điều gì về bản thân/gia đình em chỉ muốn thầy/cô biết riêng để hỗ trợ em tốt hơn không?..." value={surveyForm.secret_message || ''} onChange={e => setSurveyForm({ ...surveyForm, secret_message: e.target.value })} className="w-full p-2 border rounded bg-white" />
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSaveSurvey} disabled={isSavingSurvey} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition text-sm">
            {isSavingSurvey ? 'Đang lưu...' : 'Lưu & Nộp Phiếu Khảo Sát Lý Lịch'}
          </button>
        </div>
      </main>
    </div>
  );
}

// 4. MÀN HÌNH QUẢN LÝ GIÁO VIÊN (CÓ NÚT THOÁT QUẢN LÝ + NHẬP THÔNG BÁO TUẦN)
function TeacherDashboard({ teacherEmail, teacherPass, onUpdatePass, onLogoutTeacher }: { teacherEmail: string; teacherPass: string; onUpdatePass: (p: string) => void; onLogoutTeacher: () => void }) {
  const [activeTab, setActiveTab] = useState<'students' | 'finance' | 'emulation' | 'announcements'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [weeklyViolations, setWeeklyViolations] = useState<WeeklyViolation[]>([]);
  const [weeklyCommendations, setWeeklyCommendations] = useState<WeeklyCommendation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Thông Báo
  const [ancTitle, setAncTitle] = useState('');
  const [ancContent, setAncContent] = useState('');
  const [ancWeek, setAncWeek] = useState(1);

  // Form Khoản Thu Mới
  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDueDate, setNewFeeDueDate] = useState('');

  // Form Vi Phạm / Khen Thưởng
  const [violationStudentId, setViolationStudentId] = useState('');
  const [violationContent, setViolationContent] = useState('');
  const [violationPenalty, setViolationPenalty] = useState(1);

  const [commendationStudentId, setCommendationStudentId] = useState('');
  const [commendationContent, setCommendationContent] = useState('');
  const [commendationBonus, setCommendationBonus] = useState(1);

  // Modal
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({ code: '', full_name: '', phone: '', group_number: 1 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stRes, itemRes, payRes, vioRes, comRes, ancRes] = await Promise.all([
        supabase.from('students').select('*').order('code', { ascending: true }),
        supabase.from('fee_items').select('*').order('created_at', { ascending: true }),
        supabase.from('fee_payments').select('*'),
        supabase.from('weekly_violations').select('*'),
        supabase.from('weekly_commendations').select('*'),
        supabase.from('announcements').select('*').order('created_at', { ascending: false })
      ]);

      setStudents(stRes.data || []);
      setFeeItems(itemRes.data || []);
      setFeePayments(payRes.data || []);
      setWeeklyViolations(vioRes.data || []);
      setWeeklyCommendations(comRes.data || []);
      setAnnouncements(ancRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ancTitle || !ancContent) return;

    await supabase.from('announcements').insert([{
      title: ancTitle,
      content: ancContent,
      week_number: Number(ancWeek)
    }]);

    setAncTitle('');
    setAncContent('');
    alert('Đã gửi thông báo cho học sinh thành công!');
    fetchData();
  };

  const handleAddFeeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeeTitle || !newFeeAmount) return;

    await supabase.from('fee_items').insert([{ 
      title: newFeeTitle, 
      amount: Number(newFeeAmount),
      due_date: newFeeDueDate || 'Không giới hạn'
    }]);

    setNewFeeTitle('');
    setNewFeeAmount('');
    setNewFeeDueDate('');
    fetchData();
  };

  const handleTogglePayment = async (studentId: string, feeItemId: string, currentPaid: boolean) => {
    await supabase.from('fee_payments').upsert({
      student_id: studentId,
      fee_item_id: feeItemId,
      is_paid: !currentPaid
    });
    fetchData();
  };

  const handleAddViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!violationStudentId || !violationContent) return;

    await supabase.from('weekly_violations').insert([{
      student_id: violationStudentId,
      week_number: selectedWeek,
      content: violationContent,
      penalty_points: Number(violationPenalty)
    }]);

    setViolationContent('');
    fetchData();
  };

  const handleAddCommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commendationStudentId || !commendationContent) return;

    await supabase.from('weekly_commendations').insert([{
      student_id: commendationStudentId,
      week_number: selectedWeek,
      content: commendationContent,
      bonus_points: Number(commendationBonus)
    }]);

    setCommendationContent('');
    fetchData();
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      await supabase.from('students').update(formData).eq('id', editingStudent.id);
    } else {
      await supabase.from('students').insert([{ ...formData, code: formData.code.toUpperCase() }]);
    }
    setIsModalOpen(false);
    fetchData();
  };

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* HEADER CÓ NÚT THOÁT QUẢN LÝ */}
      <header className="bg-indigo-700 text-white shadow-lg py-4 px-6 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Hệ Thống Quản Lý Lớp Chủ Nhiệm</h1>
          <p className="text-xs text-indigo-200 mt-0.5">Tài khoản: {teacherEmail} • Sĩ Số: {students.length} HS</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { const p = prompt('Mật khẩu mới:', teacherPass); if (p) onUpdatePass(p); }} className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
            <Key className="w-3.5 h-3.5" /> Đổi Mật Khẩu
          </button>
          <button onClick={onLogoutTeacher} className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition">
            <LogOut className="w-4 h-4" /> Thoát Quản Lý
          </button>
        </div>
      </header>

      <nav className="bg-white border-b px-6 flex space-x-6 overflow-x-auto">
        <button onClick={() => setActiveTab('students')} className={`py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'students' ? 'border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Danh sách & Lý lịch
        </button>
        <button onClick={() => setActiveTab('finance')} className={`py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'finance' ? 'border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Quản Lý Thu Chi
        </button>
        <button onClick={() => setActiveTab('emulation')} className={`py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'emulation' ? 'border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Thi Đua & Vi Phạm
        </button>
        <button onClick={() => setActiveTab('announcements')} className={`py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'announcements' ? 'border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Thông Báo Tuần
        </button>
      </nav>

      <main className="flex-1 p-6 max-w-full mx-auto w-full">
        {loading ? (
          <p className="text-center text-slate-500 py-12 font-medium">Đang tải dữ liệu Supabase...</p>
        ) : (
          <>
            {/* TAB DANH SÁCH & LÝ LỊCH */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc MSHS..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="p-2 border rounded-lg text-sm bg-white max-w-md w-full"
                  />
                  <button onClick={() => { setEditingStudent(null); setFormData({ code: '', full_name: '', phone: '', group_number: 1 }); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow">
                    <Plus className="w-4 h-4" /> Thêm HS Mới
                  </button>
                </div>

                <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                    <thead className="bg-indigo-50 text-indigo-900 uppercase font-bold border-b">
                      <tr>
                        <th className="p-3 border-r text-center w-12">STT</th>
                        <th className="p-3 border-r">MSHS</th>
                        <th className="p-3 border-r">Họ và Tên</th>
                        <th className="p-3 border-r text-center">Tổ</th>
                        <th className="p-3 border-r text-center">Xem Phiếu Lý Lịch</th>
                        <th className="p-3 border-r">Khối Thi</th>
                        <th className="p-3 border-r">SĐT HS</th>
                        <th className="p-3 text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {filteredStudents.map((s, index) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-3 border-r text-center font-bold text-slate-500">{index + 1}</td>
                          <td className="p-3 border-r font-bold text-indigo-600">{s.code}</td>
                          <td className="p-3 border-r font-bold text-slate-800">{s.full_name}</td>
                          <td className="p-3 border-r text-center font-bold text-amber-700">Tổ {s.group_number || 1}</td>
                          <td className="p-3 border-r text-center">
                            <button onClick={() => setSelectedStudentDetail(s)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded font-semibold text-[11px] inline-flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" /> Xem lý lịch
                            </button>
                          </td>
                          <td className="p-3 border-r">{s.exam_block || '---'}</td>
                          <td className="p-3 border-r">{s.phone || '---'}</td>
                          <td className="p-3 text-center flex justify-center gap-1">
                            <button onClick={() => { setEditingStudent(s); setFormData({ code: s.code, full_name: s.full_name, phone: s.phone || '', group_number: s.group_number || 1 }); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={async () => { if (confirm(`Xóa HS ${s.full_name}?`)) { await supabase.from('students').delete().eq('id', s.id); fetchData(); } }} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB QUẢN LÝ THU CHI */}
            {activeTab === 'finance' && (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-600" /> Tạo Khoản Thu Mới</h3>
                  <form onSubmit={handleAddFeeItem} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-xs">
                    <div>
                      <label className="font-semibold block mb-1">Tên Khoản Thu (*)</label>
                      <input type="text" required placeholder="VD: Bảo hiểm y tế..." value={newFeeTitle} onChange={e => setNewFeeTitle(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Số Tiền (VNĐ) (*)</label>
                      <input type="number" required placeholder="VD: 680000" value={newFeeAmount} onChange={e => setNewFeeAmount(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Hạn Hoàn Thành</label>
                      <input type="date" value={newFeeDueDate} onChange={e => setNewFeeDueDate(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">+ Tạo Khoản Thu</button>
                  </form>
                </div>

                <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                    <thead className="bg-slate-50 font-bold border-b">
                      <tr>
                        <th className="p-3 border-r text-center w-12">STT</th>
                        <th className="p-3 border-r min-w-[180px]">Học sinh</th>
                        {feeItems.map(item => (
                          <th key={item.id} className="p-3 border-r text-center">
                            {item.title} ({item.amount.toLocaleString()}đ)
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {students.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="p-3 border-r text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-semibold border-r">{student.full_name} ({student.code})</td>
                          {feeItems.map(item => {
                            const payment = feePayments.find(p => p.student_id === student.id && p.fee_item_id === item.id);
                            const isPaid = payment?.is_paid || false;
                            return (
                              <td key={item.id} className="p-3 border-r text-center">
                                <button onClick={() => handleTogglePayment(student.id, item.id, isPaid)} className={`px-3 py-1 rounded font-bold text-[11px] ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {isPaid ? '✓ Đã nộp' : '✗ Chưa nộp'}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB THI ĐỦA */}
            {activeTab === 'emulation' && (
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-sm">Chọn Tuần Học:</span>
                  <select value={selectedWeek} onChange={e => setSelectedWeek(Number(e.target.value))} className="p-2 border rounded font-bold text-indigo-900 text-xs">
                    {Array.from({ length: 35 }, (_, i) => i + 1).map(w => <option key={w} value={w}>Tuần {w}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* VI PHẠM */}
                  <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3 text-xs">
                    <h3 className="font-bold text-rose-700 text-sm flex items-center gap-2 border-b pb-2"><ShieldAlert className="w-4 h-4" /> Thêm Vi Phạm Tuần {selectedWeek}</h3>
                    <form onSubmit={handleAddViolation} className="space-y-3">
                      <select value={violationStudentId} onChange={e => setViolationStudentId(e.target.value)} className="w-full p-2 border rounded" required>
                        <option value="">-- Chọn Học Sinh --</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.code})</option>)}
                      </select>
                      <input type="text" placeholder="Nội dung vi phạm..." value={violationContent} onChange={e => setViolationContent(e.target.value)} className="w-full p-2 border rounded" required />
                      <input type="number" min="1" value={violationPenalty} onChange={e => setViolationPenalty(Number(e.target.value))} className="w-full p-2 border rounded" required />
                      <button type="submit" className="w-full bg-rose-600 text-white font-bold py-2 rounded">+ Thêm Vi Phạm</button>
                    </form>
                  </div>

                  {/* KHEN THƯỞNG */}
                  <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3 text-xs">
                    <h3 className="font-bold text-amber-700 text-sm flex items-center gap-2 border-b pb-2"><Award className="w-4 h-4" /> Thêm Khen Thưởng Tuần {selectedWeek}</h3>
                    <form onSubmit={handleAddCommendation} className="space-y-3">
                      <select value={commendationStudentId} onChange={e => setCommendationStudentId(e.target.value)} className="w-full p-2 border rounded" required>
                        <option value="">-- Chọn Học Sinh --</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.code})</option>)}
                      </select>
                      <input type="text" placeholder="Nội dung tuyên dương..." value={commendationContent} onChange={e => setCommendationContent(e.target.value)} className="w-full p-2 border rounded" required />
                      <input type="number" min="1" value={commendationBonus} onChange={e => setCommendationBonus(Number(e.target.value))} className="w-full p-2 border rounded" required />
                      <button type="submit" className="w-full bg-amber-600 text-white font-bold py-2 rounded">+ Thêm Khen Thưởng</button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* TAB THÔNG BÁO TUẦN DÀNH CHO GIÁO VIÊN */}
            {activeTab === 'announcements' && (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm space-y-3 text-xs">
                  <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2 border-b pb-2">
                    <Megaphone className="w-4 h-4 text-indigo-600" /> Đăng Thông Báo Mới Trong Tuần Đến Học Sinh
                  </h3>
                  <form onSubmit={handleAddAnnouncement} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-3">
                        <label className="font-semibold block mb-1">Tiêu đề thông báo (*):</label>
                        <input type="text" placeholder="VD: Lịch thi giữa kỳ I & Nhắc nhở họp phụ huynh" value={ancTitle} onChange={e => setAncTitle(e.target.value)} className="w-full p-2 border rounded" required />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1">Áp dụng cho Tuần (*):</label>
                        <input type="number" min="1" value={ancWeek} onChange={e => setAncWeek(Number(e.target.value))} className="w-full p-2 border rounded" required />
                      </div>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Nội dung chi tiết dặn dò học sinh (*):</label>
                      <textarea rows={3} placeholder="Nhập các nội dung dặn dò của giáo viên dành cho cả lớp..." value={ancContent} onChange={e => setAncContent(e.target.value)} className="w-full p-2 border rounded" required />
                    </div>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg shadow">
                      + Gửi Thông Báo Cho Cả Lớp
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3 text-xs">
                  <h3 className="font-bold text-slate-800 text-sm border-b pb-2">Danh Sách Thông Báo Đã Đăng</h3>
                  <div className="space-y-3">
                    {announcements.map((a) => (
                      <div key={a.id} className="p-3.5 bg-slate-50 rounded-xl border space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-indigo-900 text-sm">{a.title}</span>
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">Tuần {a.week_number}</span>
                        </div>
                        <p className="text-slate-600">{a.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL XEM CHI TIẾT SƠ YẾU LÝ LỊCH */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8 shadow-2xl text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Sơ Yếu Lý Lịch: {selectedStudentDetail.full_name} ({selectedStudentDetail.code})</h3>
              <button onClick={() => setSelectedStudentDetail(null)} className="text-slate-400 font-bold text-base">✕</button>
            </div>

            <div className="space-y-3 text-slate-700">
              <p>• <strong>1. Ngày sinh:</strong> {selectedStudentDetail.dob || 'Chưa nhập'} | <strong>Nơi sinh:</strong> {selectedStudentDetail.pob || 'N/A'}</p>
              <p>• <strong>Địa chỉ:</strong> {selectedStudentDetail.address || 'Chưa nhập'}</p>
              <p>• <strong>SĐT HS:</strong> {selectedStudentDetail.phone || 'Chưa nhập'}</p>
              <p>• <strong>2. Phụ huynh:</strong> Bố: {selectedStudentDetail.father_name || 'N/A'} ({selectedStudentDetail.father_phone}) - Mẹ: {selectedStudentDetail.mother_name || 'N/A'} ({selectedStudentDetail.mother_phone})</p>
              <p>• <strong>3. Khối thi ĐH dự định:</strong> {selectedStudentDetail.exam_block || 'Chưa chọn'}</p>
              <p>• <strong>4. Tiền sử bệnh lý:</strong> {selectedStudentDetail.medical_history || 'Không'} | <strong>Năng khiếu:</strong> {selectedStudentDetail.talents || 'Không'}</p>
              <p className="bg-amber-50 p-2.5 rounded border border-amber-200">• <strong>5. Tin nhắn riêng gửi Cô chủ nhiệm:</strong> <span className="italic font-bold text-indigo-700">{selectedStudentDetail.secret_message || 'Không có'}</span></p>
            </div>

            <div className="text-right pt-2 border-t">
              <button onClick={() => setSelectedStudentDetail(null)} className="px-4 py-1.5 bg-indigo-600 text-white rounded font-semibold">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA HS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="font-bold text-slate-800 text-sm">{editingStudent ? 'Chỉnh Sửa HS' : 'Thêm Học Sinh Mới'}</h3>
            <form onSubmit={handleSaveStudent} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">MSHS (*)</label>
                <input type="text" required placeholder="VD: HS001" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full p-2 border rounded uppercase" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Họ và Tên (*)</label>
                <input type="text" required placeholder="VD: Nguyễn Văn A" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Phân Tổ (*)</label>
                <select value={formData.group_number} onChange={e => setFormData({ ...formData, group_number: Number(e.target.value) })} className="w-full p-2 border rounded">
                  <option value={1}>Tổ 1</option>
                  <option value={2}>Tổ 2</option>
                  <option value={3}>Tổ 3</option>
                  <option value={4}>Tổ 4</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 border rounded">Hủy</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded">Lưu Dữ Liệu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
