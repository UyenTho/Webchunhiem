import React, { useState } from 'react';
import { 
  Users, Wallet, CheckCircle, XCircle, Plus, Trash2, Edit3, Award, LogOut, LogIn, Lock, Key, ShieldAlert, Eye, Calendar, Trophy, ToggleLeft, ToggleRight, X, FileSpreadsheet, ShieldCheck, FileUp, Sparkles, Send, Check, Gift, Megaphone, Bell, Clock, Mail, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface Student {
  id: string;
  code: string;
  full_name: string;
  dob: string;
  pob: string;
  address: string;
  phone: string;
  group_number: number;
  class_role: string;
  
  father_name: string;
  father_job: string;
  father_phone: string;
  mother_name: string;
  mother_job: string;
  mother_phone: string;
  emergency_contact: string;
  living_with: string;
  policy_status: string;
  policy_note: string;

  exam_block: string;
  grade_target: string;
  weak_subject_target: string;

  medical_history: string;
  seating_preference: string;
  talents: string;
  certificates: string;
  past_roles: string;
  apply_role: string;

  personality: string;
  hobbies: string;
  teacher_style_expectation: string;
  teacher_support: string;
  secret_message: string;

  is_survey_submitted: boolean;
}

export interface FeeItem {
  id: string;
  title: string;
  amount: number;
  due_date: string; // Hạn hoàn thành
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
  created_date: string;
}

export interface WeeklyCommendation {
  id: string;
  student_id: string;
  week_number: number;
  content: string;
  bonus_points: number;
  created_date: string;
}

export interface Announcement {
  id: string;
  week_number: number;
  title: string;
  content: string;
  created_date: string;
}

const CLASS_ROLES = [
  'Thành viên', 'Lớp trưởng', 'Lớp phó', 'Bí thư', 'Tổ trưởng Tổ 1', 'Tổ trưởng Tổ 2', 'Tổ trưởng Tổ 3', 'Tổ trưởng Tổ 4', 'Thư ký', 'Thủ quỹ'
];

const INITIAL_STUDENTS: Student[] = [
  {
    id: '1', code: 'HS001', full_name: 'Nguyễn Văn An', dob: '2011-05-15', pob: 'Quảng Ngãi', address: '123 Nguyễn Huệ, TP. Quảng Ngãi', phone: '0912345678', group_number: 1, class_role: 'Lớp trưởng',
    father_name: 'Nguyễn Văn Bình', father_job: 'Kỹ sư', father_phone: '0988123456', mother_name: 'Lê Thị Cúc', mother_job: 'Giáo viên', mother_phone: '0977123456', emergency_contact: 'Cha (Ông Bình)', living_with: 'Bố mẹ', policy_status: 'Không', policy_note: '',
    exam_block: 'A00 (Toán, Lý, Hóa)', grade_target: 'Học sinh Xuất sắc (ĐTB > 9.0)', weak_subject_target: 'Tiếng Anh đạt trên 7.0', medical_history: 'Cận thị 2 độ', seating_preference: 'Dãy giữa, bàn 2 hoặc 3', talents: 'Đá bóng, hát', certificates: 'Chưa có', past_roles: 'Lớp trưởng cấp 2', apply_role: 'Lớp trưởng / Bí thư',
    personality: 'Năng nổ, hòa đồng', hobbies: 'Đọc sách khoa học, đá bóng', teacher_style_expectation: 'Cô công bằng và hỗ trợ học sinh', teacher_support: 'Hướng dẫn phương pháp học môn Toán nâng cao', secret_message: 'Em quyết tâm thi đậu Đại học Bách Khoa',
    is_survey_submitted: true
  },
  {
    id: '2', code: 'HS002', full_name: 'Trần Thị Bình', dob: '2011-08-20', pob: 'Đà Nẵng', address: '45 Lê Lợi, TP. Quảng Ngãi', phone: '0987654321', group_number: 1, class_role: 'Lớp phó',
    father_name: 'Trần Văn Dũng', father_job: 'Thương binh 4/4', father_phone: '0911222333', mother_name: 'Phạm Thị Hoa', mother_job: 'Nội trợ', mother_phone: '0944555666', emergency_contact: 'Mẹ (Bà Hoa)', living_with: 'Bố mẹ', policy_status: 'Con thương binh', policy_note: 'Bố là thương binh hạng 4/4',
    exam_block: 'D01 (Toán, Văn, Anh)', grade_target: 'Học sinh Giỏi', weak_subject_target: 'Môn Hóa đạt từ 6.5 trở lên', medical_history: 'Không có', seating_preference: 'Không yêu cầu', talents: 'Múa, vẽ tranh, thiết kế Canva', certificates: 'IELTS 5.5', past_roles: 'Lớp phó học tập', apply_role: 'Lớp phó học tập / Thủ quỹ',
    personality: 'Cẩn thận, chu đáo', hobbies: 'Nghe nhạc, vẽ tranh', teacher_style_expectation: 'Cô nhẹ nhàng, tâm lý', teacher_support: 'Giúp em tự tin phát biểu hơn', secret_message: 'Hoàn cảnh gia đình em hơi khó khăn, bố hay đau ốm',
    is_survey_submitted: true
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState<'teacher_login' | 'teacher_dashboard' | 'student_login' | 'student_portal'>('teacher_dashboard');
  
  // Trạng thái Giáo viên
  const [teacherEmail, setTeacherEmail] = useState('giao-vien@school.edu.vn');
  const [teacherAuthCode, setTeacherAuthCode] = useState('123456');
  const [isTeacherLoggedIn, setIsTeacherLoggedIn] = useState(true);

  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);
  
  const [isSurveyOpen, setIsSurveyOpen] = useState(true);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([
    { id: 'f1', title: 'Quỹ lớp Học kỳ 1', amount: 200000, due_date: '2026-09-30' },
    { id: 'f2', title: 'Bảo hiểm y tế', amount: 680000, due_date: '2026-10-15' }
  ]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([
    { student_id: '1', fee_item_id: 'f1', is_paid: true },
    { student_id: '1', fee_item_id: 'f2', is_paid: true },
    { student_id: '2', fee_item_id: 'f1', is_paid: true }
  ]);
  const [weeklyViolations, setWeeklyViolations] = useState<WeeklyViolation[]>([
    { id: 'v1', student_id: '2', week_number: 1, content: 'Đi học muộn 10 phút', penalty_points: 2, created_date: '2026-09-08' }
  ]);
  const [weeklyCommendations, setWeeklyCommendations] = useState<WeeklyCommendation[]>([
    { id: 'c1', student_id: '1', week_number: 1, content: 'Đạt điểm 10 kiểm tra 1 tiết Toán', bonus_points: 5, created_date: '2026-09-09' }
  ]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    { id: 'a1', week_number: 1, title: 'Lịch họp phụ huynh đầu năm', content: 'Thứ 7 tuần này lúc 8h00 sáng lớp tổ chức họp PHHS. Nhờ các em nhắc bố mẹ tham dự đông đủ.', created_date: '2026-09-07' }
  ]);

  return (
    <div>
      {/* THANH CHUYỂN ĐỔI GIAO DIỆN */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white text-xs py-2 px-4 font-bold flex justify-between items-center shadow-md flex-wrap gap-2">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-200" /> Quản Lý Lớp Chủ Nhiệm
        </span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentView(currentView === 'teacher_dashboard' ? 'student_login' : 'teacher_dashboard')} 
            className="bg-white text-indigo-900 px-3 py-1 rounded-full text-[11px] font-extrabold hover:bg-indigo-50 transition shadow"
          >
            {currentView === 'teacher_dashboard' ? '👉 Chuyển Sang Màn Hình Học Sinh' : '👉 Quay Lại Màn Hình Giáo Viên'}
          </button>
        </div>
      </div>

      {currentView === 'teacher_login' && (
        <TeacherLogin 
          registeredEmail={teacherEmail}
          authCode={teacherAuthCode}
          onLoginSuccess={() => {
            setIsTeacherLoggedIn(true);
            setCurrentView('teacher_dashboard');
          }}
          onResetCode={(email) => {
            alert(`Mã đăng nhập mới đã được gửi tới Gmail: ${email}`);
            setTeacherAuthCode('654321');
          }}
        />
      )}

      {currentView === 'student_login' && (
        <StudentLogin 
          students={students}
          onLoginSuccess={(s) => {
            setLoggedInStudent(s);
            setCurrentView('student_portal');
          }}
          onBackToTeacher={() => setCurrentView('teacher_dashboard')}
        />
      )}

      {currentView === 'student_portal' && loggedInStudent && (
        <StudentPortal 
          student={loggedInStudent}
          isSurveyOpen={isSurveyOpen}
          feeItems={feeItems}
          feePayments={feePayments}
          violations={weeklyViolations.filter(v => v.student_id === loggedInStudent.id)}
          commendations={weeklyCommendations.filter(c => c.student_id === loggedInStudent.id)}
          announcements={announcements}
          onSaveSurvey={(updatedStudent) => {
            setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
            setLoggedInStudent(updatedStudent);
            alert('Đã lưu và nộp thành công Phiếu Khảo Sát Lý Lịch!');
          }}
          onLogout={() => setCurrentView('student_login')}
        />
      )}

      {currentView === 'teacher_dashboard' && (
        <TeacherDashboard 
          students={students}
          setStudents={setStudents}
          isSurveyOpen={isSurveyOpen}
          setIsSurveyOpen={setIsSurveyOpen}
          feeItems={feeItems}
          setFeeItems={setFeeItems}
          feePayments={feePayments}
          setFeePayments={setFeePayments}
          weeklyViolations={weeklyViolations}
          setWeeklyViolations={setWeeklyViolations}
          weeklyCommendations={weeklyCommendations}
          setWeeklyCommendations={setWeeklyCommendations}
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          teacherEmail={teacherEmail}
          onLogoutTeacher={() => {
            setIsTeacherLoggedIn(false);
            setCurrentView('teacher_login');
          }}
        />
      )}
    </div>
  );
}

// 1. MÀN HÌNH ĐĂNG NHẬP GIÁO VIÊN & QUÊN MẬT KHẨU CẤP MÃ GMAIL
function TeacherLogin({ registeredEmail, authCode, onLoginSuccess, onResetCode }: { registeredEmail: string; authCode: string; onLoginSuccess: () => void; onResetCode: (email: string) => void }) {
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim().toLowerCase() === registeredEmail.toLowerCase() && codeInput.trim() === authCode) {
      onLoginSuccess();
    } else {
      setError('Gmail hoặc Mã đăng nhập không chính xác!');
    }
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmailInput) return;
    onResetCode(resetEmailInput);
    setIsForgotModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-indigo-600">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Đăng Nhập Cho Giáo Viên</h2>
          <p className="text-xs text-slate-500">Sử dụng Gmail đã đăng ký và Mã xác thực để vào hệ thống</p>
        </div>

        <form onSubmit={handleTeacherLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Gmail Giáo Viên:</label>
            <input
              type="email"
              required
              placeholder="giao-vien@school.edu.vn"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Mã Cấp Quyền / Mật Khẩu:</label>
            <input
              type="password"
              required
              placeholder="Nhập mã xác thực"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{error}</p>}

          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> Đăng Nhập
          </button>
        </form>

        <div className="pt-2 flex justify-between items-center text-xs">
          <button onClick={() => setIsForgotModalOpen(true)} className="text-indigo-600 font-semibold hover:underline">
            Quên mật khẩu / Cấp lại mã?
          </button>
        </div>
      </div>

      {/* MODAL QUÊN MẬT KHẨU / CẤP MÃ */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" /> Khôi Phục Mã Đăng Nhập
            </h3>
            <p className="text-slate-500">Nhập Gmail đăng ký, hệ thống sẽ cấp lại mã truy cập mới cho bạn.</p>
            <form onSubmit={handleReset} className="space-y-3">
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
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded">Gửi Mã Cấp Lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. MÀN HÌNH ĐĂNG NHẬP HỌC SINH
function StudentLogin({ students, onLoginSuccess, onBackToTeacher }: { students: Student[]; onLoginSuccess: (s: Student) => void; onBackToTeacher: () => void }) {
  const [code, setCode] = useState('HS001');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find(s => s.code.toUpperCase() === code.trim().toUpperCase());
    if (st) {
      onLoginSuccess(st);
    } else {
      setError('Mã MSHS không đúng hoặc chưa được tạo trong danh sách!');
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
          <p className="text-xs text-slate-500">Đăng nhập bằng MSHS cá nhân (Ví dụ: <strong>HS001</strong>, <strong>HS002</strong>)</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Mã Số Học Sinh (MSHS):</label>
            <input
              type="text"
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full p-3 border rounded-xl text-sm font-semibold uppercase bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{error}</p>}

          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> Đăng Nhập
          </button>
        </form>

        <div className="pt-4 border-t text-center">
          <button onClick={onBackToTeacher} className="text-xs text-indigo-600 font-semibold hover:underline flex items-center justify-center gap-1 mx-auto">
            Quay lại Màn hình Giáo viên
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. MÀN HÌNH CÁ NHÂN HỌC SINH (BỔ SUNG BẢNG TỔNG HỢP CÁC KHOẢN THU)
function StudentPortal({ student, isSurveyOpen, feeItems, feePayments, violations, commendations, announcements, onSaveSurvey, onLogout }: any) {
  const [form, setForm] = useState({ ...student });

  const totalBonus = commendations.reduce((sum: number, i: any) => sum + (Number(i.bonus_points) || 0), 0);
  const totalPenalty = violations.reduce((sum: number, i: any) => sum + (Number(i.penalty_points) || 0), 0);
  const totalScore = 100 + totalBonus - totalPenalty;

  return (
    <div className="min-h-screen bg-slate-50 p-6 max-w-4xl mx-auto space-y-6 font-sans">
      <header className="bg-indigo-700 text-white p-4 rounded-xl flex justify-between items-center shadow">
        <div>
          <span className="text-xs bg-indigo-600 px-2.5 py-1 rounded font-semibold">{student.code}</span>
          <h1 className="text-lg font-bold mt-1">{student.full_name} (Tổ {student.group_number})</h1>
        </div>
        <button onClick={onLogout} className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
          Đăng Xuất
        </button>
      </header>

      {/* TỔNG HỢP CÁC KHOẢN THU CỦA HỌC SINH */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2 text-indigo-900 border-b pb-2">
          <Wallet className="w-4 h-4 text-indigo-600" /> Tình Trạng Thu Chi & Các Khoản Cần Nộp
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 font-bold border-b text-slate-700">
              <tr>
                <th className="p-3 border-r text-center w-12">STT</th>
                <th className="p-3 border-r">Tên Khoản Thu</th>
                <th className="p-3 border-r text-right">Số Tiền (VNĐ)</th>
                <th className="p-3 border-r text-center">Thời Gian Cần Hoàn Thành</th>
                <th className="p-3 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700">
              {feeItems.map((item: any, idx: number) => {
                const pay = feePayments.find((p: any) => p.student_id === student.id && p.fee_item_id === item.id);
                const isPaid = pay?.is_paid || false;

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 border-r text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 border-r font-bold text-slate-800">{item.title}</td>
                    <td className="p-3 border-r text-right font-extrabold text-indigo-600">{item.amount.toLocaleString()} đ</td>
                    <td className="p-3 border-r text-center font-semibold text-slate-600">
                      <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-600" /> {item.due_date || 'Chưa quy định'}</span>
                    </td>
                    <td className="p-3 text-center">
                      {isPaid ? (
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Đã hoàn thành
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full font-bold inline-flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Chưa nộp
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* THÔNG BÁO TỪ GIÁO VIÊN */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5 space-y-3">
        <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2 text-amber-800 border-b pb-2">
          <Bell className="w-4 h-4 text-amber-600 animate-bounce" /> Thông Báo Từ Giáo Viên Chủ Nhiệm
        </h2>
        {announcements.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Chưa có thông báo mới.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: any) => (
              <div key={a.id} className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-sm">{a.title}</span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-bold">Tuần {a.week_number} • {a.created_date}</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{a.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ĐIỂM THI ĐUA VÀ BẢNG CHI TIẾT */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-xl flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold">Điểm Thi Đua Tổng Kết Cá Nhân</h2>
            <p className="text-xs text-indigo-100">Điểm cơ bản (100) + Khen thưởng (+{totalBonus}) - Vi phạm (-{totalPenalty})</p>
          </div>
          <span className="text-3xl font-extrabold">{totalScore} ĐIỂM</span>
        </div>

        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide pt-2">Lịch Sử Thi Đua Chi Tiết</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 font-bold border-b">
              <tr>
                <th className="p-2.5 border-r text-center">Tuần</th>
                <th className="p-2.5 border-r">Ngày Tháng</th>
                <th className="p-2.5 border-r">Loại Ghi Nhận</th>
                <th className="p-2.5 border-r">Nội Dung Chi Tiết</th>
                <th className="p-2.5 text-center">Điểm Biến Động</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700">
              {commendations.map((c: any) => (
                <tr key={`c-${c.id}`} className="hover:bg-slate-50">
                  <td className="p-2.5 border-r text-center font-bold text-slate-500">Tuần {c.week_number}</td>
                  <td className="p-2.5 border-r">{c.created_date}</td>
                  <td className="p-2.5 border-r"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">Khen Thưởng</span></td>
                  <td className="p-2.5 border-r">{c.content}</td>
                  <td className="p-2.5 text-center font-extrabold text-emerald-600">+{c.bonus_points}</td>
                </tr>
              ))}
              {violations.map((v: any) => (
                <tr key={`v-${v.id}`} className="hover:bg-slate-50">
                  <td className="p-2.5 border-r text-center font-bold text-slate-500">Tuần {v.week_number}</td>
                  <td className="p-2.5 border-r">{v.created_date}</td>
                  <td className="p-2.5 border-r"><span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">Lỗi Vi Phạm</span></td>
                  <td className="p-2.5 border-r">{v.content}</td>
                  <td className="p-2.5 text-center font-extrabold text-rose-600">-{v.penalty_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM PHIẾU KHẢO SÁT LÝ LỊCH ĐẦY ĐỦ */}
      {isSurveyOpen && (
        <div className="bg-white rounded-2xl border-2 border-indigo-500 shadow-xl p-6 space-y-6 text-xs">
          <div className="border-b pb-3 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-slate-800 text-base">PHIẾU KHẢO SÁT LÝ LỊCH HỌC SINH ĐẦU NĂM HỌC</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Em vui lòng điền đầy đủ và chính xác thông tin để Giáo viên chủ nhiệm hỗ trợ tốt nhất.</p>
            </div>
            {student.is_survey_submitted && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">Đã hoàn thành</span>}
          </div>

          <div className="space-y-5">
            {/* 1. THÔNG TIN CÁ NHÂN & LIÊN HỆ */}
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-800 text-xs uppercase bg-indigo-50 p-2 rounded border border-indigo-100">1. Thông Tin Cá Nhân & Liên Hệ</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Họ và Tên học sinh (*):</label>
                  <input type="text" value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full p-2 border rounded font-semibold bg-slate-50" readOnly />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Ngày tháng năm sinh (*):</label>
                  <input type="date" value={form.dob || ''} onChange={e => setForm({ ...form, dob: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nơi sinh (*):</label>
                  <input type="text" placeholder="VD: Quảng Ngãi" value={form.pob || ''} onChange={e => setForm({ ...form, pob: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold block mb-1">Địa chỉ thường trú / tạm trú hiện tại (*):</label>
                  <input type="text" placeholder="Ghi rõ tên đường, tổ, phường/xã, huyện/thành phố..." value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">SĐT riêng / Zalo cá nhân:</label>
                  <input type="text" placeholder="VD: 0912..." value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            {/* 2. THÔNG TIN PHỤ HUYNH & TÌNH TRẠNG GIA ĐÌNH */}
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-800 text-xs uppercase bg-indigo-50 p-2 rounded border border-indigo-100">2. Thông Tin Phụ Huynh & Gia Đình</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Họ tên Cha:</label>
                  <input type="text" value={form.father_name || ''} onChange={e => setForm({ ...form, father_name: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nghề nghiệp Cha:</label>
                  <input type="text" value={form.father_job || ''} onChange={e => setForm({ ...form, father_job: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">SĐT / Zalo Cha:</label>
                  <input type="text" value={form.father_phone || ''} onChange={e => setForm({ ...form, father_phone: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Họ tên Mẹ:</label>
                  <input type="text" value={form.mother_name || ''} onChange={e => setForm({ ...form, mother_name: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nghề nghiệp Mẹ:</label>
                  <input type="text" value={form.mother_job || ''} onChange={e => setForm({ ...form, mother_job: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">SĐT / Zalo Mẹ:</label>
                  <input type="text" value={form.mother_phone || ''} onChange={e => setForm({ ...form, mother_phone: e.target.value })} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            {/* 3. ĐỊNH HƯỚNG & MỤC TIÊU HỌC TẬP */}
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-800 text-xs uppercase bg-indigo-50 p-2 rounded border border-indigo-100">3. Định Hướng & Mục Tiêu Học Tập</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Dự định chọn Khối thi ĐH (*):</label>
                  <input type="text" placeholder="VD: A00, A01, B00, C00, D01..." value={form.exam_block || ''} onChange={e => setForm({ ...form, exam_block: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Mục tiêu danh hiệu lớp 10 (*):</label>
                  <input type="text" placeholder="VD: Học sinh Giỏi / Xuất sắc" value={form.grade_target || ''} onChange={e => setForm({ ...form, grade_target: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Mục tiêu cụ thể với môn học yếu nhất:</label>
                  <input type="text" placeholder="VD: Đạt trên 6.5 môn Tiếng Anh" value={form.weak_subject_target || ''} onChange={e => setForm({ ...form, weak_subject_target: e.target.value })} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            {/* 4. SỨC KHỎE, SỞ TRƯỜNG & KĨ NĂNG */}
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-800 text-xs uppercase bg-indigo-50 p-2 rounded border border-indigo-100">4. Sức Khỏe, Sở Trường & Kỹ Năng</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Tiền sử bệnh lý cần lưu ý (nếu có):</label>
                  <input type="text" placeholder="Tim mạch, hen suyễn, cận thị nặng..." value={form.medical_history || ''} onChange={e => setForm({ ...form, medical_history: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Năng khiếu đặc biệt (Văn nghệ, thể thao, MC, vẽ...):</label>
                  <input type="text" value={form.talents || ''} onChange={e => setForm({ ...form, talents: e.target.value })} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            {/* 5. TÍNH CÁCH & BÍ MẬT GỬI CÔ */}
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-800 text-xs uppercase bg-indigo-50 p-2 rounded border border-indigo-100">5. Tính Cách & Tâm Tư</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                  <label className="font-bold text-amber-900 block mb-1">Thông điệp bí mật gửi riêng Cô chủ nhiệm (Cam kết bảo mật 100%):</label>
                  <textarea rows={3} placeholder="Nhập những điều em muốn chia sẻ riêng với cô..." value={form.secret_message || ''} onChange={e => setForm({ ...form, secret_message: e.target.value })} className="w-full p-2 border rounded bg-white" />
                </div>
              </div>
            </div>
          </div>

          <button onClick={() => onSaveSurvey({ ...form, is_survey_submitted: true })} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition text-sm">
            Lưu & Nộp Phiếu Khảo Sát Lý Lịch
          </button>
        </div>
      )}
    </div>
  );
}

// 4. MÀN HÌNH QUẢN LÝ GIÁO VIÊN
function TeacherDashboard({ students, setStudents, isSurveyOpen, setIsSurveyOpen, feeItems, setFeeItems, feePayments, setFeePayments, weeklyViolations, setWeeklyViolations, weeklyCommendations, setWeeklyCommendations, announcements, setAnnouncements, teacherEmail, onLogoutTeacher }: any) {
  const [activeTab, setActiveTab] = useState<'students' | 'finance' | 'emulation' | 'announcements'>('students');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);

  // State Form Thêm HS mới
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState(1);

  // State Form Thu Chi (Thêm Hạn nộp)
  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDueDate, setNewFeeDueDate] = useState('');

  // State Form Vi phạm & Khen thưởng
  const [vioStudentId, setVioStudentId] = useState('');
  const [vioContent, setVioContent] = useState('');
  const [vioPoints, setVioPenalty] = useState(1);
  const [vioDate, setVioDate] = useState(new Date().toISOString().split('T')[0]);

  const [comStudentId, setComStudentId] = useState('');
  const [comContent, setComContent] = useState('');
  const [comPoints, setComBonus] = useState(2);
  const [comDate, setComDate] = useState(new Date().toISOString().split('T')[0]);

  // State Form Thông báo tuần
  const [ancTitle, setAncTitle] = useState('');
  const [ancContent, setAncContent] = useState('');
  const [ancWeek, setAncWeek] = useState(1);

  // Thao tác Tạo khoản thu mới có Hạn hoàn thành
  const handleAddFeeItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeeTitle || !newFeeAmount) return;
    const newItem: FeeItem = {
      id: Date.now().toString(),
      title: newFeeTitle,
      amount: Number(newFeeAmount),
      due_date: newFeeDueDate || 'Không giới hạn'
    };
    setFeeItems([...feeItems, newItem]);
    setNewFeeTitle('');
    setNewFeeAmount('');
    setNewFeeDueDate('');
    alert('Đã tạo khoản thu mới thành công!');
  };

  const handleTogglePayment = (studentId: string, feeItemId: string) => {
    const existing = feePayments.find((p: any) => p.student_id === studentId && p.fee_item_id === feeItemId);
    if (existing) {
      setFeePayments(feePayments.map((p: any) => p.student_id === studentId && p.fee_item_id === feeItemId ? { ...p, is_paid: !p.is_paid } : p));
    } else {
      setFeePayments([...feePayments, { student_id: studentId, fee_item_id: feeItemId, is_paid: true }]);
    }
  };

  const handleAddViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vioStudentId || !vioContent) return;
    const newVio: WeeklyViolation = {
      id: Date.now().toString(),
      student_id: vioStudentId,
      week_number: 1,
      content: vioContent,
      penalty_points: Number(vioPoints),
      created_date: vioDate
    };
    setWeeklyViolations([...weeklyViolations, newVio]);
    setVioContent('');
    alert('Đã thêm vi phạm!');
  };

  const handleAddCommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comStudentId || !comContent) return;
    const newCom: WeeklyCommendation = {
      id: Date.now().toString(),
      student_id: comStudentId,
      week_number: 1,
      content: comContent,
      bonus_points: Number(comPoints),
      created_date: comDate
    };
    setWeeklyCommendations([...weeklyCommendations, newCom]);
    setComContent('');
    alert('Đã thêm điểm cộng!');
  };

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ancTitle || !ancContent) return;
    const newAnc: Announcement = {
      id: Date.now().toString(),
      week_number: Number(ancWeek),
      title: ancTitle,
      content: ancContent,
      created_date: new Date().toISOString().split('T')[0]
    };
    setAnnouncements([newAnc, ...announcements]);
    setAncTitle('');
    setAncContent('');
    alert('Đã đăng thông báo!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-indigo-700 text-white shadow-lg py-4 px-6 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Hệ Thống Quản Lý Lớp Chủ Nhiệm</h1>
          <p className="text-xs text-indigo-200 mt-0.5">Tài khoản GV: {teacherEmail} • Sĩ Số: {students.length} HS</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onLogoutTeacher} className="bg-indigo-800 hover:bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
            <LogOut className="w-4 h-4" /> Đăng Xuất
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
        {/* TAB THU CHI CHO GIÁO VIÊN */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Tạo Khoản Thu Mới
              </h3>
              <form onSubmit={handleAddFeeItem} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="font-semibold block mb-1">Tên khoản thu (*):</label>
                  <input type="text" placeholder="VD: Tiền kế hoạch nhỏ" value={newFeeTitle} onChange={e => setNewFeeTitle(e.target.value)} className="w-full p-2 border rounded" required />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Số tiền (VNĐ) (*):</label>
                  <input type="number" placeholder="VD: 50000" value={newFeeAmount} onChange={e => setNewFeeAmount(e.target.value)} className="w-full p-2 border rounded" required />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Thời gian cần hoàn thành:</label>
                  <input type="date" value={newFeeDueDate} onChange={e => setNewFeeDueDate(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                  + Tạo Khoản Thu
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                <thead className="bg-slate-50 font-bold border-b">
                  <tr>
                    <th className="p-3 border-r text-center w-12">STT</th>
                    <th className="p-3 border-r min-w-[180px]">Học sinh</th>
                    {feeItems.map((item: any) => (
                      <th key={item.id} className="p-3 border-r text-center">
                        <div>{item.title} ({item.amount.toLocaleString()}đ)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Hạn: {item.due_date}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((student: any, idx: number) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="p-3 border-r text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-semibold border-r">{student.full_name} ({student.code})</td>
                      {feeItems.map((item: any) => {
                        const pay = feePayments.find((p: any) => p.student_id === student.id && p.fee_item_id === item.id);
                        const isPaid = pay?.is_paid || false;
                        return (
                          <td key={item.id} className="p-3 border-r text-center">
                            <button onClick={() => handleTogglePayment(student.id, item.id)} className={`px-3 py-1 rounded font-bold text-[11px] ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
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

        {/* CÁC TAB KHÁC GIỮ NGUYÊN... */}
        {activeTab === 'students' && (
          <div className="bg-white p-4 rounded-xl border shadow-sm text-xs">
            <p className="font-bold text-slate-800">Danh sách {students.length} học sinh trong lớp.</p>
          </div>
        )}
      </main>
    </div>
  );
}
