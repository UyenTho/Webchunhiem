import React, { useState } from 'react';
import { 
  Users, Wallet, CheckCircle, XCircle, Plus, Trash2, Edit3, Award, LogOut, LogIn, Lock, Key, ShieldAlert, Eye, Calendar, Trophy, ToggleLeft, ToggleRight, X, FileSpreadsheet, ShieldCheck, FileUp, Sparkles, Send, Check, Gift, Bell, Clock, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

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

export interface FeeItem {
  id: string;
  title: string;
  amount: number;
  deadline: string;
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
  title: string;
  content: string;
  created_date: string;
  important: boolean;
}

const CLASS_ROLES = [
  'Thành viên', 'Lớp trưởng', 'Lớp phó', 'Bí thư', 'Tổ trưởng Tổ 1', 'Tổ trưởng Tổ 2', 'Tổ trưởng Tổ 3', 'Tổ trưởng Tổ 4', 'Thư ký', 'Thủ quỹ'
];

const INITIAL_STUDENTS: Student[] = [
  {
    id: '1', code: 'HS001', full_name: 'Nguyễn Văn An', group_number: 1, class_role: 'Lớp trưởng', phone: '0912345678',
    policy_status: 'Không', policy_note: '', exam_block: 'A00', grade_target: 'Học sinh Giỏi', medical_history: 'Cận 2 độ',
    talents: 'Đá bóng, hát', past_roles: 'Lớp trưởng cấp 2', apply_role: 'Lớp trưởng', personality: 'Năng nổ, hòa đồng',
    hobbies: 'Đọc sách', teacher_expectation: 'Cô vui tính và công bằng', teacher_support: 'Hỗ trợ môn Toán', secret_message: 'Em quyết tâm thi đậu ĐH Bách Khoa',
    father_name: 'Nguyễn Văn Bình', father_job: 'Kỹ sư', father_phone: '0988123456', mother_name: 'Lê Thị Cúc', mother_job: 'Giáo viên', mother_phone: '0977123456',
    is_survey_submitted: true
  },
  {
    id: '2', code: 'HS002', full_name: 'Trần Thị Bình', group_number: 1, class_role: 'Lớp phó', phone: '0987654321',
    policy_status: 'Con thương binh / bệnh binh', policy_note: 'Bố là thương binh 4/4', exam_block: 'D01', grade_target: 'Học sinh Xuất sắc', medical_history: 'Không',
    talents: 'Múa, vẽ', past_roles: 'Lớp phó học tập', apply_role: 'Lớp phó', personality: 'Cẩn thận, chu đáo',
    hobbies: 'Nghe nhạc', teacher_expectation: 'Cô nhẹ nhàng nhắc nhở', teacher_support: 'Hướng dẫn phương pháp học', secret_message: 'Gia đình em hơi khó khăn',
    father_name: 'Trần Văn Dũng', father_job: 'Thương binh', father_phone: '0911222333', mother_name: 'Phạm Thị Hoa', mother_job: 'Nội trợ', mother_phone: '0944555666',
    is_survey_submitted: true
  },
  {
    id: '3', code: 'HS003', full_name: 'Lê Hoàng Cường', group_number: 2, class_role: 'Thành viên', phone: '0905123456',
    policy_status: 'Không', policy_note: '', exam_block: 'A01', grade_target: 'Học sinh Khá', medical_history: 'Không',
    talents: 'Cờ vua', past_roles: '', apply_role: '', personality: 'Hơi trầm tính',
    hobbies: 'Chơi game', teacher_expectation: 'Tạo nhiều hoạt động nhóm', teacher_support: 'Nhắc nhở học tập', secret_message: '',
    father_name: 'Lê Văn Giang', father_job: 'Kinh doanh', father_phone: '0903111222', mother_name: 'Nguyễn Thị Hải', mother_job: 'Kế toán', mother_phone: '0903333444',
    is_survey_submitted: false
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState<'teacher' | 'student_login' | 'student_portal'>('teacher');
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);
  
  const [isSurveyOpen, setIsSurveyOpen] = useState(true);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([
    { id: 'f1', title: 'Quỹ lớp Học kỳ 1', amount: 200000, deadline: '2026-09-30' },
    { id: 'f2', title: 'Bảo hiểm y tế', amount: 680000, deadline: '2026-10-15' }
  ]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([
    { student_id: '1', fee_item_id: 'f1', is_paid: true },
    { student_id: '1', fee_item_id: 'f2', is_paid: true },
    { student_id: '2', fee_item_id: 'f1', is_paid: true }
  ]);
  const [weeklyViolations, setWeeklyViolations] = useState<WeeklyViolation[]>([
    { id: 'v1', student_id: '3', week_number: 1, content: 'Đi muộn 10 phút', penalty_points: 2, created_date: '2026-09-08' }
  ]);
  const [weeklyCommendations, setWeeklyCommendations] = useState<WeeklyCommendation[]>([
    { id: 'c1', student_id: '1', week_number: 1, content: 'Đạt điểm 10 kiểm tra Toán', bonus_points: 5, created_date: '2026-09-09' }
  ]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    { id: 'a1', title: 'Nộp lệ phí Bảo hiểm Y tế', content: 'Cả lớp hoàn thành nộp BHYT trước ngày 15/10 cho Thủ quỹ lớp.', created_date: '2026-09-10', important: true },
    { id: 'a2', title: 'Họp Tổ đầu tuần', content: 'Các Tổ trưởng chuẩn bị bảng chấm điểm thi đua của tổ mình trước giờ Sinh hoạt lớp.', created_date: '2026-09-12', important: false }
  ]);

  const handleLogout = () => {
    setLoggedInStudent(null);
    setCurrentView('student_login');
  };

  return (
    <div>
      {/* THANH ĐIỀU HƯỚNG TRÊN CÙNG */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white text-xs py-2 px-4 font-bold flex justify-between items-center shadow-md flex-wrap gap-2">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-200" /> Quản Lý Lớp Chủ Nhiệm
        </span>
        <div className="flex items-center gap-2">
          {currentView === 'teacher' ? (
            <button 
              onClick={() => setCurrentView('student_login')} 
              className="bg-white text-indigo-900 px-3 py-1 rounded-full text-[11px] font-extrabold hover:bg-indigo-50 transition shadow flex items-center gap-1"
            >
              👉 Chuyển Sang Màn Hình Học Sinh
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentView('teacher')} 
                className="bg-indigo-900 text-white border border-indigo-400 px-3 py-1 rounded-full text-[11px] font-extrabold hover:bg-indigo-800 transition"
              >
                👉 Chuyển Sang Màn Hình Giáo Viên
              </button>
              {loggedInStudent && (
                <button 
                  onClick={handleLogout} 
                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-full text-[11px] font-extrabold transition shadow flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" /> Đăng Xuất
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {currentView === 'student_login' && (
        <StudentLogin 
          students={students}
          onLoginSuccess={(s) => {
            setLoggedInStudent(s);
            setCurrentView('student_portal');
          }}
          onBackToTeacher={() => setCurrentView('teacher')}
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
            alert('Đã nộp phiếu khảo sát thành công!');
          }}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'teacher' && (
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
          onTeacherLogout={handleLogout}
        />
      )}
    </div>
  );
}

// 1. MÀN HÌNH ĐĂNG NHẬP HỌC SINH
function StudentLogin({ students, onLoginSuccess, onBackToTeacher }: { students: Student[]; onLoginSuccess: (s: Student) => void; onBackToTeacher: () => void }) {
  const [code, setCode] = useState('HS001');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find(s => s.code.toUpperCase() === code.trim().toUpperCase());
    if (st) {
      onLoginSuccess(st);
    } else {
      setError('Mã MSHS không có trong danh sách! Vui lòng kiểm tra lại.');
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
          <p className="text-xs text-slate-500">Nhập mã số học sinh để đăng nhập hệ thống</p>
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

// 2. MÀN HÌNH CÁ NHÂN HỌC SINH
function StudentPortal({ student, isSurveyOpen, feeItems, feePayments, violations, commendations, announcements, onSaveSurvey, onLogout }: any) {
  const [form, setForm] = useState({ ...student });

  const totalBonus = commendations.reduce((sum: number, i: any) => sum + (Number(i.bonus_points) || 0), 0);
  const totalPenalty = violations.reduce((sum: number, i: any) => sum + (Number(i.penalty_points) || 0), 0);
  const totalScore = 100 + totalBonus - totalPenalty;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 max-w-5xl mx-auto space-y-6 font-sans">
      <header className="bg-indigo-700 text-white p-4 rounded-2xl flex justify-between items-center shadow-md">
        <div>
          <span className="text-xs bg-indigo-600 border border-indigo-400 px-2.5 py-1 rounded font-bold">{student.code}</span>
          <h1 className="text-xl font-bold mt-1">{student.full_name} <span className="text-indigo-200 text-sm font-normal">(Tổ {student.group_number} - {student.class_role})</span></h1>
        </div>
        <button onClick={onLogout} className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow">
          <LogOut className="w-4 h-4" /> Đăng Xuất
        </button>
      </header>

      {/* THÔNG BÁO TỪ GIÁO VIÊN */}
      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
        <h2 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-2">
          <Bell className="w-5 h-5 text-indigo-600" /> Thông Báo & Nhiệm Vụ Trong Tuần
        </h2>
        {announcements.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Chưa có thông báo nào trong tuần.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: Announcement) => (
              <div key={a.id} className={`p-3.5 rounded-xl border text-xs space-y-1 ${a.important ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    {a.important && <AlertCircle className="w-4 h-4 text-amber-600 inline" />}
                    {a.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> {a.created_date}</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{a.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* TỔNG QUAN ĐIỂM THI ĐỦA CÁ NHÂN */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-2xl flex justify-between items-center shadow-md">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-300" /> Điểm Thi Đua Cá Nhân</h2>
          <p className="text-xs text-indigo-100 mt-1">
            Điểm cơ bản (100) + Điểm cộng (+{totalBonus}) - Điểm trừ (-{totalPenalty})
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-extrabold">{totalScore}</span>
          <span className="text-xs block text-indigo-200">ĐIỂM</span>
        </div>
      </div>

      {/* CHI TIẾT KHEN THƯỞNG & VI PHẠM CỦA BẢN THÂN */}
      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-2">
          <Award className="w-5 h-5 text-indigo-600" /> Chi Tiết Khen Thưởng & Vi Phạm
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30 space-y-2">
            <h3 className="font-bold text-emerald-800 text-xs flex items-center justify-between">
              <span>🌟 Khen Thưởng (+{totalBonus} điểm)</span>
              <span className="text-[11px] font-normal text-emerald-600">{commendations.length} lượt</span>
            </h3>
            {commendations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có ghi nhận khen thưởng.</p>
            ) : (
              <div className="space-y-2">
                {commendations.map((c: any) => (
                  <div key={c.id} className="bg-white p-2.5 rounded-lg border border-emerald-100 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800">{c.content}</p>
                      <p className="text-[10px] text-slate-400">{c.created_date}</p>
                    </div>
                    <span className="font-extrabold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded text-xs">+{c.bonus_points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-rose-200 rounded-xl p-4 bg-rose-50/30 space-y-2">
            <h3 className="font-bold text-rose-800 text-xs flex items-center justify-between">
              <span>⚠️ Vi Phạm / Điểm Trừ (-{totalPenalty} điểm)</span>
              <span className="text-[11px] font-normal text-rose-600">{violations.length} lượt</span>
            </h3>
            {violations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chúc mừng! Bạn chưa mắc vi phạm nào.</p>
            ) : (
              <div className="space-y-2">
                {violations.map((v: any) => (
                  <div key={v.id} className="bg-white p-2.5 rounded-lg border border-rose-100 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800">{v.content}</p>
                      <p className="text-[10px] text-slate-400">{v.created_date}</p>
                    </div>
                    <span className="font-extrabold text-rose-600 bg-rose-100 px-2 py-0.5 rounded text-xs">-{v.penalty_points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CHI TIẾT TÌNH HÌNH THU CHI & HẠN NỘP */}
      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
        <h2 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-2">
          <Wallet className="w-5 h-5 text-indigo-600" /> Tình Hình Các Khoản Thu - Học Phí
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 font-bold border-b text-slate-700">
              <tr>
                <th className="p-3 border-r">Tên Khoản Thu</th>
                <th className="p-3 border-r text-right">Số Tiền</th>
                <th className="p-3 border-r text-center">Hạn Cuối Nộp</th>
                <th className="p-3 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700">
              {feeItems.map((item: FeeItem) => {
                const pay = feePayments.find((p: any) => p.student_id === student.id && p.fee_item_id === item.id);
                const isPaid = pay?.is_paid || false;
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 border-r font-semibold text-slate-800">{item.title}</td>
                    <td className="p-3 border-r text-right font-bold text-indigo-700">{item.amount.toLocaleString()} đ</td>
                    <td className="p-3 border-r text-center text-slate-500">{item.deadline || 'Chưa quy định'}</td>
                    <td className="p-3 text-center">
                      {isPaid ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full font-bold inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Đã nộp
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-full font-bold inline-flex items-center gap-1">
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
      </section>

      {/* PHIẾU KHẢO SÁT */}
      {isSurveyOpen && !student.is_survey_submitted && (
        <div className="bg-white rounded-2xl border-2 border-indigo-500 shadow-lg p-6 space-y-4 text-xs">
          <h2 className="font-bold text-slate-800 text-base border-b pb-2">Phiếu Khảo Sát Thông Tin Học Sinh</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Khối thi ĐH:</label>
              <input type="text" value={form.exam_block || ''} onChange={e => setForm({ ...form, exam_block: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Mục tiêu danh hiệu:</label>
              <input type="text" value={form.grade_target || ''} onChange={e => setForm({ ...form, grade_target: e.target.value })} className="w-full p-2 border rounded" />
            </div>
          </div>
          <button onClick={() => onSaveSurvey({ ...form, is_survey_submitted: true })} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow">
            Lưu & Nộp Phiếu
          </button>
        </div>
      )}
    </div>
  );
}

// 3. MÀN HÌNH QUẢN LÝ GIÁO VIÊN (ĐÃ BỔ SUNG NÚT ĐĂNG XUẤT)
function TeacherDashboard({ students, setStudents, isSurveyOpen, setIsSurveyOpen, feeItems, setFeeItems, feePayments, setFeePayments, weeklyViolations, setWeeklyViolations, weeklyCommendations, setWeeklyCommendations, announcements, setAnnouncements, onTeacherLogout }: any) {
  const [activeTab, setActiveTab] = useState<'students' | 'finance' | 'emulation' | 'announcements'>('students');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);

  // Form Thêm HS mới
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState(1);

  // Form Thu Chi
  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDeadline, setNewFeeDeadline] = useState('');

  // Form Vi phạm
  const [vioStudentId, setVioStudentId] = useState('');
  const [vioContent, setVioContent] = useState('');
  const [vioPoints, setVioPenalty] = useState(1);
  const [vioDate, setVioDate] = useState(new Date().toISOString().split('T')[0]);

  // Form Khen thưởng
  const [comStudentId, setComStudentId] = useState('');
  const [comContent, setComContent] = useState('');
  const [comPoints, setComBonus] = useState(2);
  const [comDate, setComDate] = useState(new Date().toISOString().split('T')[0]);

  // Form Thông báo
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annImportant, setAnnImportant] = useState(false);

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;
    const newSt: Student = {
      id: Date.now().toString(),
      code: newCode.toUpperCase(),
      full_name: newName,
      group_number: Number(newGroup),
      class_role: 'Thành viên',
      phone: '', policy_status: 'Không', policy_note: '', exam_block: '', grade_target: '', medical_history: '', talents: '', past_roles: '', apply_role: '', personality: '', hobbies: '', teacher_expectation: '', teacher_support: '', secret_message: '', father_name: '', father_job: '', father_phone: '', mother_name: '', mother_job: '', mother_phone: '',
      is_survey_submitted: false
    };
    setStudents([...students, newSt]);
    setNewCode('');
    setNewName('');
    setIsAddStudentOpen(false);
    alert('Đã thêm học sinh mới thành công!');
  };

  const handleDeleteStudent = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa học sinh ${name}?`)) {
      setStudents(students.filter((s: any) => s.id !== id));
    }
  };

  const handleUpdateRole = (id: string, role: string) => {
    setStudents(students.map((s: any) => s.id === id ? { ...s, class_role: role } : s));
  };

  const handleAddFeeItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeeTitle || !newFeeAmount) return;
    const newItem: FeeItem = {
      id: Date.now().toString(),
      title: newFeeTitle,
      amount: Number(newFeeAmount),
      deadline: newFeeDeadline || 'Chưa quy định'
    };
    setFeeItems([...feeItems, newItem]);
    setNewFeeTitle('');
    setNewFeeAmount('');
    setNewFeeDeadline('');
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
    alert('Đã thêm ghi nhận vi phạm thành công!');
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
    alert('Đã thêm khen thưởng thành công!');
  };

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    const newAnn: Announcement = {
      id: Date.now().toString(),
      title: annTitle,
      content: annContent,
      created_date: new Date().toISOString().split('T')[0],
      important: annImportant
    };
    setAnnouncements([newAnn, ...announcements]);
    setAnnTitle('');
    setAnnContent('');
    setAnnImportant(false);
    alert('Đã đăng thông báo mới tới học sinh!');
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(announcements.filter((a: Announcement) => a.id !== id));
  };

  const handleExportExcel = () => {
    const dataStudents = students.map((s: any, idx: number) => ({
      'STT': idx + 1, 'MSHS': s.code, 'Họ và Tên': s.full_name, 'Tổ': `Tổ ${s.group_number}`, 'Chức Vụ Lớp': s.class_role, 'SĐT': s.phone
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataStudents), 'Danh Sách Học Sinh');
    XLSX.writeFile(wb, `Danh_Sach_Lop_Chu_Nhiem.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* HEADER GIÁO VIÊN VỚI NÚT ĐĂNG XUẤT NỔI BẬT */}
      <header className="bg-indigo-700 text-white shadow-lg py-4 px-6 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Hệ Thống Quản Lý Lớp Chủ Nhiệm (Giáo Viên)</h1>
          <p className="text-xs text-indigo-200 mt-0.5">Sĩ Số: {students.length} Học sinh</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition">
            <FileSpreadsheet className="w-4 h-4" /> Xuất File Excel
          </button>
          <button onClick={onTeacherLogout} className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition">
            <LogOut className="w-4 h-4" /> Đăng Xuất Giáo Viên
          </button>
        </div>
      </header>

      <nav className="bg-white border-b px-6 flex space-x-6">
        <button onClick={() => setActiveTab('students')} className={`py-3 px-2 border-b-2 font-medium text-sm ${activeTab === 'students' ? 'border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Danh sách & Lý lịch
        </button>
        <button onClick={() => setActiveTab('announcements')} className={`py-3 px-2 border-b-2 font-medium text-sm ${activeTab === 'announcements' ? 'border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Thông Báo Tuần
        </button>
        <button onClick={() => setActiveTab('finance')} className={`py-3 px-2 border-b-2 font-medium text-sm ${activeTab === 'finance' ? 'border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Quản Lý Thu Chi
        </button>
        <button onClick={() => setActiveTab('emulation')} className={`py-3 px-2 border-b-2 font-medium text-sm ${activeTab === 'emulation' ? 'border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Thi Đua & Vi Phạm
        </button>
      </nav>

      <main className="flex-1 p-6 max-w-full mx-auto w-full">
        {/* TAB 1: DANH SÁCH HỌC SINH */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <p className="text-xs text-slate-500">Quản lý danh sách, chức vụ và xem phiếu khảo sát lý lịch học sinh.</p>
              <button onClick={() => setIsAddStudentOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow">
                <Plus className="w-4 h-4" /> Thêm Học Sinh Mới
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
                    <th className="p-3 border-r bg-purple-100/70 text-purple-900">Chức Vụ</th>
                    <th className="p-3 border-r text-center">Khảo Sát</th>
                    <th className="p-3 border-r text-center">Chi Tiết</th>
                    <th className="p-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {students.map((s: any, idx: number) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3 border-r text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 border-r font-bold text-indigo-600">{s.code}</td>
                      <td className="p-3 border-r font-bold text-slate-800">{s.full_name}</td>
                      <td className="p-3 border-r text-center font-bold text-amber-700">Tổ {s.group_number}</td>
                      <td className="p-3 border-r bg-purple-50/40">
                        <select
                          value={s.class_role || 'Thành viên'}
                          onChange={e => handleUpdateRole(s.id, e.target.value)}
                          className="p-1 border rounded bg-white font-semibold text-purple-800"
                        >
                          {CLASS_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="p-3 border-r text-center">
                        {s.is_survey_submitted ? <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">Đã nộp</span> : <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">Chưa nộp</span>}
                      </td>
                      <td className="p-3 border-r text-center">
                        <button onClick={() => setSelectedStudentDetail(s)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded font-semibold inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Xem phiếu
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleDeleteStudent(s.id, s.full_name)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: THÔNG BÁO TUẦN */}
        {activeTab === 'announcements' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
                <Bell className="w-4 h-4 text-indigo-600" /> Tạo Thông Báo / Nhiệm Vụ Trong Tuần
              </h3>
              <form onSubmit={handleAddAnnouncement} className="space-y-3">
                <div>
                  <label className="font-semibold block mb-1">Tiêu đề thông báo (*):</label>
                  <input type="text" placeholder="VD: Nộp tiền Bảo hiểm y tế" value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="w-full p-2 border rounded" required />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nội dung phổ biến chi tiết (*):</label>
                  <textarea rows={3} placeholder="Nội dung cần dặn dò các em học sinh..." value={annContent} onChange={e => setAnnContent(e.target.value)} className="w-full p-2 border rounded" required />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="important" checked={annImportant} onChange={e => setAnnImportant(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
                  <label htmlFor="important" className="font-semibold text-slate-700">Đánh dấu là thông báo QUAN TRỌNG / KHẨN CẤP</label>
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1.5">
                  <Send className="w-4 h-4" /> Đăng Thông Báo Đến Học Sinh
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Danh Sách Thông Báo Đã Đăng</h3>
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa đăng thông báo nào.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((a: Announcement) => (
                    <div key={a.id} className="p-3 border rounded-xl flex justify-between items-start gap-3 bg-slate-50 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{a.title}</span>
                          {a.important && <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px]">Quan trọng</span>}
                          <span className="text-[10px] text-slate-400">({a.created_date})</span>
                        </div>
                        <p className="text-slate-600 whitespace-pre-line">{a.content}</p>
                      </div>
                      <button onClick={() => handleDeleteAnnouncement(a.id)} className="text-slate-400 hover:text-rose-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: THU CHI */}
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
                  <label className="font-semibold block mb-1">Hạn cuối nộp:</label>
                  <input type="date" value={newFeeDeadline} onChange={e => setNewFeeDeadline(e.target.value)} className="w-full p-2 border rounded" />
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
                        <div className="text-[10px] font-normal text-slate-500">Hạn: {item.deadline || 'Không có'}</div>
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

        {/* TAB 4: THI ĐỦA */}
        {activeTab === 'emulation' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm space-y-3 text-xs">
                <h3 className="font-bold text-emerald-700 text-sm flex items-center gap-2 border-b pb-2">
                  <Award className="w-4 h-4 text-emerald-600" /> Thêm Khen Thưởng / Điểm Cộng
                </h3>
                <form onSubmit={handleAddCommendation} className="space-y-3">
                  <div>
                    <label className="font-semibold block mb-1">Chọn Học Sinh (*):</label>
                    <select value={comStudentId} onChange={e => setComStudentId(e.target.value)} className="w-full p-2 border rounded" required>
                      <option value="">-- Chọn Học Sinh --</option>
                      {students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name} ({s.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Nội dung khen thưởng (*):</label>
                    <input type="text" placeholder="VD: Đạt điểm 10 kiểm tra Toán" value={comContent} onChange={e => setComContent(e.target.value)} className="w-full p-2 border rounded" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Điểm cộng (+):</label>
                      <input type="number" min="1" value={comPoints} onChange={e => setComBonus(Number(e.target.value))} className="w-full p-2 border rounded" required />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Ngày ghi nhận (*):</label>
                      <input type="date" value={comDate} onChange={e => setComDate(e.target.value)} className="w-full p-2 border rounded" required />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow">
                    + Thêm Điểm Cộng
                  </button>
                </form>
              </div>

              <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm space-y-3 text-xs">
                <h3 className="font-bold text-rose-700 text-sm flex items-center gap-2 border-b pb-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Thêm Vi Phạm / Điểm Trừ
                </h3>
                <form onSubmit={handleAddViolation} className="space-y-3">
                  <div>
                    <label className="font-semibold block mb-1">Chọn Học Sinh (*):</label>
                    <select value={vioStudentId} onChange={e => setVioStudentId(e.target.value)} className="w-full p-2 border rounded" required>
                      <option value="">-- Chọn Học Sinh --</option>
                      {students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name} ({s.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Nội dung vi phạm (*):</label>
                    <input type="text" placeholder="VD: Đi học muộn 10 phút" value={vioContent} onChange={e => setVioContent(e.target.value)} className="w-full p-2 border rounded" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Điểm trừ (-):</label>
                      <input type="number" min="1" value={vioPoints} onChange={e => setVioPenalty(Number(e.target.value))} className="w-full p-2 border rounded" required />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Ngày ghi nhận (*):</label>
                      <input type="date" value={vioDate} onChange={e => setVioDate(e.target.value)} className="w-full p-2 border rounded" required />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg shadow">
                    + Thêm Điểm Trừ
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Lịch Sử Khen Thưởng & Vi Phạm Chi Tiết</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead className="bg-slate-100 font-bold border-b">
                    <tr>
                      <th className="p-3 border-r text-center w-12">STT</th>
                      <th className="p-3 border-r">Ngày Tháng</th>
                      <th className="p-3 border-r">Học Sinh</th>
                      <th className="p-3 border-r">Loại Ghi Nhận</th>
                      <th className="p-3 border-r">Nội Dung Chi Tiết</th>
                      <th className="p-3 text-center">Điểm Biến Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {weeklyCommendations.map((c: any, idx: number) => {
                      const st = students.find((s: any) => s.id === c.student_id);
                      return (
                        <tr key={`com-${c.id}`} className="hover:bg-slate-50">
                          <td className="p-3 border-r text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 border-r font-semibold">{c.created_date}</td>
                          <td className="p-3 border-r font-bold text-slate-800">{st ? st.full_name : 'Học sinh'} ({st?.code})</td>
                          <td className="p-3 border-r"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Khen Thưởng</span></td>
                          <td className="p-3 border-r">{c.content}</td>
                          <td className="p-3 text-center font-extrabold text-emerald-600">+{c.bonus_points}</td>
                        </tr>
                      );
                    })}
                    {weeklyViolations.map((v: any, idx: number) => {
                      const st = students.find((s: any) => s.id === v.student_id);
                      return (
                        <tr key={`vio-${v.id}`} className="hover:bg-slate-50">
                          <td className="p-3 border-r text-center font-bold text-slate-400">{weeklyCommendations.length + idx + 1}</td>
                          <td className="p-3 border-r font-semibold">{v.created_date}</td>
                          <td className="p-3 border-r font-bold text-slate-800">{st ? st.full_name : 'Học sinh'} ({st?.code})</td>
                          <td className="p-3 border-r"><span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">Vi Phạm</span></td>
                          <td className="p-3 border-r">{v.content}</td>
                          <td className="p-3 text-center font-extrabold text-rose-600">-{v.penalty_points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL THÊM HS MỚI */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-slate-800 text-sm">Thêm Học Sinh Mới</h3>
            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">MSHS (*):</label>
                <input type="text" required placeholder="VD: HS004" value={newCode} onChange={e => setNewCode(e.target.value)} className="w-full p-2 border rounded uppercase" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Họ và Tên (*):</label>
                <input type="text" required placeholder="VD: Phạm Văn D" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Phân Tổ (*):</label>
                <select value={newGroup} onChange={e => setNewGroup(Number(e.target.value))} className="w-full p-2 border rounded">
                  <option value={1}>Tổ 1</option>
                  <option value={2}>Tổ 2</option>
                  <option value={3}>Tổ 3</option>
                  <option value={4}>Tổ 4</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddStudentOpen(false)} className="px-3 py-1.5 border rounded">Hủy</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded">Thêm Học Sinh</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM PHIẾU KHẢO SÁT */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Phiếu Khảo Sát: {selectedStudentDetail.full_name} ({selectedStudentDetail.code})</h3>
              <button onClick={() => setSelectedStudentDetail(null)} className="text-slate-400">✕</button>
            </div>
            <p><strong>1. Diện chính sách:</strong> {selectedStudentDetail.policy_status}</p>
            <p><strong>2. Khối thi ĐH:</strong> {selectedStudentDetail.exam_block}</p>
            <p><strong>3. Mục tiêu danh hiệu:</strong> {selectedStudentDetail.grade_target}</p>
            <p><strong>4. Tiền sử bệnh lý:</strong> {selectedStudentDetail.medical_history}</p>
            <p><strong>5. Năng khiếu:</strong> {selectedStudentDetail.talents}</p>
            <p><strong>6. Ghi chú gửi giáo viên:</strong> <span className="italic text-indigo-700">{selectedStudentDetail.secret_message || 'Không có'}</span></p>
            <div className="text-right pt-2 border-t">
              <button onClick={() => setSelectedStudentDetail(null)} className="px-4 py-1.5 bg-indigo-600 text-white rounded font-semibold">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
