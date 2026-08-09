import React, { useState, useEffect } from 'react';
import { 
  Users, Wallet, CheckCircle, XCircle, Plus, Trash2, Edit3, Award, LogOut, LogIn, Lock, Key, ShieldAlert, Eye, Calendar, Trophy, ToggleLeft, ToggleRight, X
} from 'lucide-react';
import { supabase } from './supabaseClient';

export interface Student {
  id: string;
  code: string;
  full_name: string;
  phone: string;
  group_number: number;
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

export interface GroupScore {
  id?: string;
  group_number: number;
  week_number: number;
  score: number;
  note: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'teacher' | 'student_login' | 'student_portal'>('teacher');
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);
  const [teacherPass, setTeacherPass] = useState<string>(() => localStorage.getItem('teacher_password') || '123456');
  
  // State điều khiển Modal nhập mật khẩu Giáo viên bảo mật
  const [isTeacherAuthModalOpen, setIsTeacherAuthModalOpen] = useState(false);
  const [inputPass, setInputPass] = useState('');
  const [authError, setAuthError] = useState('');

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPass === teacherPass) {
      setIsTeacherAuthModalOpen(false);
      setInputPass('');
      setAuthError('');
      setCurrentView('teacher');
    } else {
      setAuthError('Mật khẩu Giáo viên không chính xác!');
    }
  };

  if (currentView === 'student_login') {
    return (
      <>
        <StudentLogin 
          onLoginSuccess={(student) => {
            setLoggedInStudent(student);
            setCurrentView('student_portal');
          }} 
          onOpenTeacherAuth={() => {
            setInputPass('');
            setAuthError('');
            setIsTeacherAuthModalOpen(true);
          }}
        />

        {/* MODAL NHẬP MẬT KHẨU GIÁO VIÊN BẢO MẬT (ẨN DẠNG ••••••) */}
        {isTeacherAuthModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" /> Xác Nhận Quyền Giáo Viên
                </h3>
                <button onClick={() => setIsTeacherAuthModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTeacherLogin} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Mật khẩu Quản Lý (*)</label>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Nhập mật khẩu..."
                    value={inputPass}
                    onChange={e => setInputPass(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {authError && <p className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{authError}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsTeacherAuthModalOpen(false)} className="px-4 py-2 border rounded-xl font-medium">Hủy</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow">
                    Xác Nhận
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  if (currentView === 'student_portal' && loggedInStudent) {
    return (
      <StudentPortal 
        student={loggedInStudent} 
        onLogout={() => {
          setLoggedInStudent(null);
          setCurrentView('student_login');
        }} 
      />
    );
  }

  return (
    <TeacherDashboard 
      teacherPass={teacherPass}
      onUpdatePass={(newPass) => {
        setTeacherPass(newPass);
        localStorage.setItem('teacher_password', newPass);
      }}
      onLogoutTeacher={() => setCurrentView('student_login')} 
    />
  );
}

// ==========================================
// 1. MÀN HÌNH ĐĂNG NHẬP HỌC SINH
// ==========================================
function StudentLogin({ onLoginSuccess, onOpenTeacherAuth }: { onLoginSuccess: (s: Student) => void, onOpenTeacherAuth: () => void }) {
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
        setErrorMsg('Mã số học sinh không tồn tại!');
      } else {
        onLoginSuccess(data);
      }
    } catch {
      setLoading(false);
      setErrorMsg('Lỗi kết nối máy chủ Supabase!');
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
          <p className="text-xs text-slate-500">Nhập MSHS để điền phiếu khảo sát và xem kết quả</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Mã Số Học Sinh (MSHS)</label>
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
            <LogIn className="w-4 h-4" /> {loading ? 'Đang xác nhận...' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="pt-4 border-t text-center">
          <button onClick={onOpenTeacherAuth} className="text-xs text-indigo-600 font-semibold hover:underline flex items-center justify-center gap-1 mx-auto">
            <Lock className="w-3.5 h-3.5" /> Chuyển sang Màn hình Giáo viên
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. MÀN HÌNH CÁ NHÂN CỦA HỌC SINH
// ==========================================
function StudentPortal({ student, onLogout }: { student: Student; onLogout: () => void }) {
  const [currentStudent, setCurrentStudent] = useState<Student>(student);
  const [isSurveyOpen, setIsSurveyOpen] = useState<boolean>(true);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [myViolations, setMyViolations] = useState<WeeklyViolation[]>([]);
  const [myCommendations, setMyCommendations] = useState<WeeklyCommendation[]>([]);

  const [form, setForm] = useState({
    phone: student.phone || '',
    policy_status: student.policy_status || 'Không',
    policy_note: student.policy_note || '',
    exam_block: student.exam_block || '',
    grade_target: student.grade_target || '',
    medical_history: student.medical_history || '',
    talents: student.talents || '',
    past_roles: student.past_roles || '',
    apply_role: student.apply_role || '',
    personality: student.personality || '',
    hobbies: student.hobbies || '',
    teacher_expectation: student.teacher_expectation || '',
    teacher_support: student.teacher_support || '',
    secret_message: student.secret_message || '',
    father_name: student.father_name || '',
    father_job: student.father_job || '',
    father_phone: student.father_phone || '',
    mother_name: student.mother_name || '',
    mother_job: student.mother_job || '',
    mother_phone: student.mother_phone || ''
  });

  useEffect(() => {
    async function loadData() {
      const { data: setting } = await supabase.from('system_settings').select('value_boolean').eq('key', 'is_survey_open').single();
      if (setting) setIsSurveyOpen(setting.value_boolean);

      const [feeRes, payRes, vioRes, comRes] = await Promise.all([
        supabase.from('fee_items').select('*'),
        supabase.from('fee_payments').select('*').eq('student_id', student.id),
        supabase.from('weekly_violations').select('*').eq('student_id', student.id).order('created_date', { ascending: false }),
        supabase.from('weekly_commendations').select('*').eq('student_id', student.id).order('created_date', { ascending: false })
      ]);

      setFeeItems(feeRes.data || []);
      setFeePayments(payRes.data || []);
      setMyViolations(vioRes.data || []);
      setMyCommendations(comRes.data || []);
    }
    loadData();
  }, [student.id]);

  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm('Em có chắc chắn các thông tin đã điền là đúng?')) {
      const updateData = { ...form, is_survey_submitted: true };
      await supabase.from('students').update(updateData).eq('id', currentStudent.id);
      setCurrentStudent({ ...currentStudent, ...updateData });
      alert('Đã nộp phiếu khảo sát thành công!');
    }
  };

  const totalBonus = myCommendations.reduce((sum, item) => sum + (Number(item.bonus_points) || 0), 0);
  const totalPenalty = myViolations.reduce((sum, item) => sum + (Number(item.penalty_points) || 0), 0);
  const finalScore = 100 + totalBonus - totalPenalty;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-indigo-700 text-white py-4 px-6 flex justify-between items-center shadow-md">
        <div>
          <span className="text-xs bg-indigo-600 px-2.5 py-1 rounded font-semibold">{currentStudent.code}</span>
          <h1 className="text-lg font-bold mt-1">{currentStudent.full_name} (Tổ {currentStudent.group_number || 1})</h1>
        </div>
        <button onClick={onLogout} className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
          <LogOut className="w-3.5 h-3.5" /> Đăng xuất
        </button>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* PHẦN PHIẾU KHẢO SÁT THÔNG TIN */}
        {isSurveyOpen && !currentStudent.is_survey_submitted && (
          <div className="bg-white rounded-2xl border-2 border-indigo-500 shadow-lg p-6 space-y-6">
            <div className="border-b pb-3">
              <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Yêu cầu hoàn thành</span>
              <h2 className="font-bold text-slate-800 text-lg mt-1">Phiếu Khảo Sát Thông Tin Học Sinh Đầu Năm</h2>
            </div>

            <form onSubmit={handleSubmitSurvey} className="space-y-6 text-xs">
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
                <h4 className="font-bold text-amber-900 uppercase">1. Gia đình thuộc diện chính sách</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Diện gia đình (*):</label>
                    <select value={form.policy_status} onChange={e => setForm({ ...form, policy_status: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-medium">
                      <option value="Không">Không thuộc diện đặc biệt</option>
                      <option value="Hộ nghèo">Hộ nghèo</option>
                      <option value="Hộ cận nghèo">Hộ cận nghèo</option>
                      <option value="Con thương binh / bệnh binh">Con thương binh / bệnh binh</option>
                      <option value="Bố/Mẹ mất sớm (Mồ côi)">Bố/Mẹ mất sớm (Mồ côi)</option>
                      <option value="Bố mẹ ly hôn / ly thân">Bố mẹ ly hôn / ly thân</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Ghi chú hoàn cảnh:</label>
                    <input type="text" placeholder="VD: Ở với ông bà..." value={form.policy_note} onChange={e => setForm({ ...form, policy_note: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-indigo-600 uppercase">2 & 3. Định hướng & Mục tiêu</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Khối thi dự định:</label>
                    <input type="text" placeholder="VD: D01" value={form.exam_block} onChange={e => setForm({ ...form, exam_block: e.target.value })} className="w-full p-2.5 border rounded-lg bg-slate-50" />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Mục tiêu danh hiệu:</label>
                    <input type="text" placeholder="VD: Học sinh Giỏi" value={form.grade_target} onChange={e => setForm({ ...form, grade_target: e.target.value })} className="w-full p-2.5 border rounded-lg bg-slate-50" />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition shadow-lg">
                Lưu & Gửi Phiếu Khảo Sát Cho Giáo Viên
              </button>
            </form>
          </div>
        )}

        {/* TỔNG KẾT ĐIỂM THI ĐỦA SAU CÙNG */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-md flex justify-between items-center flex-wrap gap-4">
          <div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Tổng Kết Thi Đua</span>
            <h2 className="text-xl font-bold mt-1">Điểm Thi Đua Cá Nhân Sau Cùng</h2>
            <p className="text-xs text-indigo-100 mt-0.5">Điểm cơ bản (100) + Cộng ({totalBonus}) - Trừ ({totalPenalty})</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold">{finalScore}</span>
            <span className="text-sm font-semibold"> / 100 ĐIỂM</span>
          </div>
        </div>

        {/* BẢNG VI PHẠM VÀ KHEN THƯỞNG BỔ SUNG NGÀY THÁNG */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
            <div className="flex justify-between items-center border-b pb-2 text-amber-600">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <Award className="w-4 h-4" /> Khen Thưởng & Tuyên Dương
              </h3>
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-bold">
                +{totalBonus} điểm
              </span>
            </div>

            {myCommendations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có ghi nhận khen thưởng nào.</p>
            ) : (
              <div className="divide-y">
                {myCommendations.map(item => (
                  <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600">[Tuần {item.week_number}]</span>
                        {item.created_date && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">{formatDate(item.created_date)}</span>}
                      </div>
                      <p className="text-slate-800 mt-0.5">{item.content}</p>
                    </div>
                    <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      +{item.bonus_points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
            <div className="flex justify-between items-center border-b pb-2 text-rose-600">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Danh Sách Lỗi Vi Phạm
              </h3>
              <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-xs font-bold">
                -{totalPenalty} điểm
              </span>
            </div>

            {myViolations.length === 0 ? (
              <p className="text-xs text-emerald-600 font-medium italic">Rất tốt! Em chưa vi phạm lỗi nào.</p>
            ) : (
              <div className="divide-y">
                {myViolations.map(item => (
                  <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600">[Tuần {item.week_number}]</span>
                        {item.created_date && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">{formatDate(item.created_date)}</span>}
                      </div>
                      <p className="text-slate-800 mt-0.5">{item.content}</p>
                    </div>
                    <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      -{item.penalty_points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KHOẢN THU */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 border-b pb-3">
            <Wallet className="w-5 h-5" />
            <h2 className="font-bold text-base text-slate-800">Danh Sách Các Khoản Thu Của Em</h2>
          </div>
          {feeItems.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Chưa có khoản thu nào được tạo.</p>
          ) : (
            <div className="divide-y">
              {feeItems.map(item => {
                const payment = feePayments.find(p => p.fee_item_id === item.id);
                const isPaid = payment?.is_paid || false;
                return (
                  <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.title}</p>
                      <p className="text-slate-500 mt-0.5">Số tiền: <strong className="text-slate-700">{item.amount.toLocaleString()} VNĐ</strong></p>
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
      </main>
    </div>
  );
}

// ==========================================
// 3. MÀN HÌNH QUẢN LÝ GIÁO VIÊN
// ==========================================
function TeacherDashboard({ teacherPass, onUpdatePass, onLogoutTeacher }: { teacherPass: string; onUpdatePass: (p: string) => void; onLogoutTeacher: () => void }) {
  const [activeTab, setActiveTab] = useState<'students' | 'finance' | 'emulation'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [isSurveyOpen, setIsSurveyOpen] = useState<boolean>(true);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [weeklyViolations, setWeeklyViolations] = useState<WeeklyViolation[]>([]);
  const [weeklyCommendations, setWeeklyCommendations] = useState<WeeklyCommendation[]>([]);
  const [groupScores, setGroupScores] = useState<GroupScore[]>([]);

  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Đổi Mật Khẩu Giáo Viên Bảo Mật
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);
  const [oldPassInput, setOldPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [changePassError, setChangePassError] = useState('');

  // State Form Tạo Khoản Thu Mới
  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeePaidAll, setNewFeePaidAll] = useState(false);

  // State Form Vi Phạm & Khen Thưởng CÓ NGÀY THÁNG CỤ THỂ
  const todayStr = new Date().toISOString().split('T')[0];
  const [violationStudentId, setViolationStudentId] = useState('');
  const [violationContent, setViolationContent] = useState('');
  const [violationPenalty, setViolationPenalty] = useState(1);
  const [violationDate, setViolationDate] = useState(todayStr);

  const [commendationStudentId, setCommendationStudentId] = useState('');
  const [commendationContent, setCommendationContent] = useState('');
  const [commendationBonus, setCommendationBonus] = useState(1);
  const [commendationDate, setCommendationDate] = useState(todayStr);

  // Modal Sửa / Thêm HS
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    code: '', full_name: '', phone: '', group_number: 1, hobbies: '', policy_status: 'Không', policy_note: '',
    father_name: '', father_job: '', father_phone: '', mother_name: '', mother_job: '', mother_phone: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingRes, stRes, itemRes, payRes, vioRes, comRes, grpRes] = await Promise.all([
        supabase.from('system_settings').select('value_boolean').eq('key', 'is_survey_open').single(),
        supabase.from('students').select('*').order('code', { ascending: true }),
        supabase.from('fee_items').select('*').order('created_at', { ascending: true }),
        supabase.from('fee_payments').select('*'),
        supabase.from('weekly_violations').select('*'),
        supabase.from('weekly_commendations').select('*'),
        supabase.from('group_scores').select('*')
      ]);

      if (settingRes.data) setIsSurveyOpen(settingRes.data.value_boolean);
      setStudents(stRes.data || []);
      setFeeItems(itemRes.data || []);
      setFeePayments(payRes.data || []);
      setWeeklyViolations(vioRes.data || []);
      setWeeklyCommendations(comRes.data || []);
      setGroupScores(grpRes.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChangePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPassInput !== teacherPass) {
      setChangePassError('Mật khẩu hiện tại không đúng!');
      return;
    }
    if (!newPassInput.trim()) {
      setChangePassError('Mật khẩu mới không được để trống!');
      return;
    }
    onUpdatePass(newPassInput);
    setIsChangePassModalOpen(false);
    setOldPassInput('');
    setNewPassInput('');
    setChangePassError('');
    alert('Đã đổi mật khẩu Giáo viên thành công!');
  };

  const handleToggleGlobalSurvey = async () => {
    const nextState = !isSurveyOpen;
    await supabase.from('system_settings').upsert({ key: 'is_survey_open', value_boolean: nextState });
    setIsSurveyOpen(nextState);
    alert(nextState ? 'Đã MỞ mục khảo sát cho học sinh!' : 'Đã ĐÓNG (ẨN) mục khảo sát toàn lớp!');
  };

  const handleResetIndividualSurvey = async (studentId: string, name: string) => {
    if (confirm(`Mở lại quyền điền phiếu khảo sát cho ${name}?`)) {
      await supabase.from('students').update({ is_survey_submitted: false }).eq('id', studentId);
      fetchData();
    }
  };

  const handleAddFeeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeeTitle || !newFeeAmount) return;

    const amount = Number(newFeeAmount);
    const { data: item, error } = await supabase.from('fee_items').insert([{ title: newFeeTitle, amount }]).select().single();

    if (!error && item) {
      if (newFeePaidAll && students.length > 0) {
        const payments = students.map(s => ({
          student_id: s.id,
          fee_item_id: item.id,
          is_paid: true
        }));
        await supabase.from('fee_payments').insert(payments);
      }
      setNewFeeTitle('');
      setNewFeeAmount('');
      setNewFeePaidAll(false);
      fetchData();
    }
  };

  const handleTogglePayment = async (studentId: string, feeItemId: string, currentPaid: boolean) => {
    await supabase.from('fee_payments').upsert({
      student_id: studentId,
      fee_item_id: feeItemId,
      is_paid: !currentPaid
    });
    fetchData();
  };

  const handleDeleteFeeItem = async (id: string, title: string) => {
    if (confirm(`Xóa khoản thu "${title}"?`)) {
      await supabase.from('fee_items').delete().eq('id', id);
      fetchData();
    }
  };

  // THÊM VI PHẠM CÓ NGÀY THÁNG
  const handleAddViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!violationStudentId || !violationContent) return;

    await supabase.from('weekly_violations').insert([{
      student_id: violationStudentId,
      week_number: selectedWeek,
      content: violationContent,
      penalty_points: Number(violationPenalty),
      created_date: violationDate
    }]);

    setViolationContent('');
    setViolationPenalty(1);
    fetchData();
  };

  const handleDeleteViolation = async (id: string) => {
    await supabase.from('weekly_violations').delete().eq('id', id);
    fetchData();
  };

  // THÊM KHEN THƯỞNG CÓ NGÀY THÁNG
  const handleAddCommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commendationStudentId || !commendationContent) return;

    await supabase.from('weekly_commendations').insert([{
      student_id: commendationStudentId,
      week_number: selectedWeek,
      content: commendationContent,
      bonus_points: Number(commendationBonus),
      created_date: commendationDate
    }]);

    setCommendationContent('');
    setCommendationBonus(1);
    fetchData();
  };

  const handleDeleteCommendation = async (id: string) => {
    await supabase.from('weekly_commendations').delete().eq('id', id);
    fetchData();
  };

  const handleSaveGroupScore = async (groupNum: number, score: number, note: string) => {
    await supabase.from('group_scores').upsert({
      group_number: groupNum,
      week_number: selectedWeek,
      score,
      note
    }, { onConflict: 'group_number,week_number' });
    fetchData();
  };

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({ code: '', full_name: '', phone: '', group_number: 1, hobbies: '', policy_status: 'Không', policy_note: '', father_name: '', father_job: '', father_phone: '', mother_name: '', mother_job: '', mother_phone: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: Student) => {
    setEditingStudent(s);
    setFormData({
      code: s.code, full_name: s.full_name, phone: s.phone || '', group_number: s.group_number || 1, hobbies: s.hobbies || '', policy_status: s.policy_status || 'Không', policy_note: s.policy_note || '',
      father_name: s.father_name || '', father_job: s.father_job || '', father_phone: s.father_phone || '',
      mother_name: s.mother_name || '', mother_job: s.mother_job || '', mother_phone: s.mother_phone || ''
    });
    setIsModalOpen(true);
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-indigo-700 text-white shadow-lg py-4 px-6 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Hệ Thống Quản Lý Lớp Chủ Nhiệm</h1>
          <p className="text-xs text-indigo-200 mt-0.5">Trang Quản Lý Giáo Viên • Sĩ Số: {students.length} HS</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleToggleGlobalSurvey}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition ${
              isSurveyOpen ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-600 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isSurveyOpen ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {isSurveyOpen ? 'Khảo Sát: BẬT' : 'Khảo Sát: ĐÓNG'}
          </button>

          <button onClick={() => { setOldPassInput(''); setNewPassInput(''); setChangePassError(''); setIsChangePassModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
            <Key className="w-3.5 h-3.5" /> Đổi Mật Khẩu
          </button>
          <button onClick={onLogoutTeacher} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" /> Thoát Quản Lý
          </button>
        </div>
      </header>

      <nav className="bg-white border-b px-6 flex space-x-6">
        <button onClick={() => setActiveTab('students')} className={`py-3 px-2 border-b-2 font-medium text-sm ${activeTab === 'students' ? 'border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Danh sách & Lý lịch
        </button>
        <button onClick={() => setActiveTab('finance')} className={`py-3 px-2 border-b-2 font-medium text-sm ${activeTab === 'finance' ? 'border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Quản Lý Thu Chi
        </button>
        <button onClick={() => setActiveTab('emulation')} className={`py-3 px-2 border-b-2 font-medium text-sm ${activeTab === 'emulation' ? 'border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Thi Đua & Vi Phạm Theo Tuần
        </button>
      </nav>

      <main className="flex-1 p-6 max-w-full mx-auto w-full">
        {loading ? (
          <p className="text-center text-slate-500 py-12 font-medium">Đang tải dữ liệu...</p>
        ) : (
          <>
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
                  <button onClick={handleOpenAddModal} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow">
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
                        <th className="p-3 border-r text-center">Khảo Sát</th>
                        <th className="p-3 border-r text-center">Xem Phiếu</th>
                        <th className="p-3 border-r bg-amber-100/70 text-amber-900">Diện Chính Sách</th>
                        <th className="p-3 border-r">Khối Thi</th>
                        <th className="p-3 border-r">Ứng Cử Cán Sự</th>
                        <th className="p-3 border-r">SĐT Học Sinh</th>
                        <th className="p-3 text-center sticky right-0 bg-indigo-50">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {filteredStudents.map((s, index) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 border-r text-center font-bold text-slate-500">{index + 1}</td>
                          <td className="p-3 border-r font-bold text-indigo-600">{s.code}</td>
                          <td className="p-3 border-r font-bold text-slate-800">{s.full_name}</td>
                          <td className="p-3 border-r text-center font-bold text-amber-700">Tổ {s.group_number || 1}</td>
                          <td className="p-3 border-r text-center">
                            {s.is_survey_submitted ? (
                              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold text-[10px]">Đã nộp</span>
                            ) : (
                              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold text-[10px]">Chưa nộp</span>
                            )}
                          </td>
                          <td className="p-3 border-r text-center">
                            <button onClick={() => setSelectedStudentDetail(s)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded font-semibold text-[11px] inline-flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" /> Xem phiếu
                            </button>
                          </td>
                          <td className="p-3 border-r font-bold text-amber-800 bg-amber-50/40">{s.policy_status || 'Không'}</td>
                          <td className="p-3 border-r">{s.exam_block || '---'}</td>
                          <td className="p-3 border-r font-semibold text-indigo-600">{s.apply_role || '---'}</td>
                          <td className="p-3 border-r">{s.phone || '---'}</td>
                          <td className="p-3 text-center sticky right-0 bg-white shadow-left flex justify-center gap-1">
                            {s.is_survey_submitted && (
                              <button onClick={() => handleResetIndividualSurvey(s.id, s.full_name)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Mở lại quyền nộp khảo sát">
                                <ToggleLeft className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleOpenEditModal(s)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={async () => { if(confirm(`Xóa HS ${s.full_name}?`)) { await supabase.from('students').delete().eq('id', s.id); fetchData(); } }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-600" /> Thêm Khoản Thu Mới
                  </h3>
                  <form onSubmit={handleAddFeeItem} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-xs">
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Tên Khoản Thu (*)</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Bảo hiểm y tế..."
                        value={newFeeTitle}
                        onChange={e => setNewFeeTitle(e.target.value)}
                        className="w-full p-2 border rounded bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Số Tiền (VNĐ) (*)</label>
                      <input
                        type="number"
                        required
                        placeholder="VD: 200000"
                        value={newFeeAmount}
                        onChange={e => setNewFeeAmount(e.target.value)}
                        className="w-full p-2 border rounded bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                      <input
                        type="checkbox"
                        id="paidAll"
                        checked={newFeePaidAll}
                        onChange={e => setNewFeePaidAll(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <label htmlFor="paidAll" className="font-medium text-slate-700 cursor-pointer">
                        Đánh dấu tất cả HS đã nộp
                      </label>
                    </div>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition shadow">
                      + Tạo Khoản Thu
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b">
                      <tr>
                        <th className="p-3 border-r text-center w-12">STT</th>
                        <th className="p-3 border-r min-w-[180px]">Học sinh</th>
                        {feeItems.map(item => (
                          <th key={item.id} className="p-3 border-r text-center min-w-[150px]">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-bold">{item.title}</p>
                                <p className="text-[10px] text-indigo-600 font-semibold">{item.amount.toLocaleString()}đ</p>
                              </div>
                              <button onClick={() => handleDeleteFeeItem(item.id, item.title)} className="text-slate-400 hover:text-rose-600 p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {students.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="p-3 border-r text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-semibold border-r text-slate-800">
                            {student.full_name} <span className="text-slate-400 text-[10px]">({student.code})</span>
                          </td>
                          {feeItems.map(item => {
                            const payment = feePayments.find(p => p.student_id === student.id && p.fee_item_id === item.id);
                            const isPaid = payment?.is_paid || false;

                            return (
                              <td key={item.id} className="p-3 border-r text-center">
                                <button
                                  onClick={() => handleTogglePayment(student.id, item.id, isPaid)}
                                  className={`px-3 py-1 rounded font-bold text-[11px] transition ${
                                    isPaid ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                  }`}
                                >
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

            {/* TAB THI ĐỦA BỔ SUNG Ô CHỌN NGÀY THÁNG */}
            {activeTab === 'emulation' && (
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-slate-800 text-sm">Chọn Tuần Học:</span>
                    <select
                      value={selectedWeek}
                      onChange={e => setSelectedWeek(Number(e.target.value))}
                      className="p-2 border rounded-lg bg-indigo-50 font-bold text-indigo-900 text-xs"
                    >
                      {Array.from({ length: 35 }, (_, i) => i + 1).map(w => (
                        <option key={w} value={w}>Tuần {w}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* FORM VI PHẠM CÓ Ô CHỌN NGÀY */}
                <div className="bg-white rounded-xl border p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-rose-700 text-sm flex items-center gap-2 border-b pb-2">
                    <ShieldAlert className="w-4 h-4" /> Ghi Nhận Vi Phạm Tuần {selectedWeek}
                  </h3>

                  <form onSubmit={handleAddViolation} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end text-xs">
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Học sinh (*)</label>
                      <select
                        value={violationStudentId}
                        onChange={e => setViolationStudentId(e.target.value)}
                        className="w-full p-2 border rounded bg-slate-50"
                        required
                      >
                        <option value="">-- Chọn Học Sinh --</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.code})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Ngày vi phạm (*)</label>
                      <input
                        type="date"
                        value={violationDate}
                        onChange={e => setViolationDate(e.target.value)}
                        className="w-full p-2 border rounded bg-slate-50"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Nội dung vi phạm (*)</label>
                      <input
                        type="text"
                        placeholder="VD: Đi muộn 10 phút..."
                        value={violationContent}
                        onChange={e => setViolationContent(e.target.value)}
                        className="w-full p-2 border rounded bg-slate-50"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Điểm trừ (*)</label>
                      <input
                        type="number"
                        min="1"
                        value={violationPenalty}
                        onChange={e => setViolationPenalty(Number(e.target.value))}
                        className="w-full p-2 border rounded bg-slate-50"
                        required
                      />
                    </div>
                    <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg shadow">
                      + Thêm Vi Phạm
                    </button>
                  </form>

                  <div className="divide-y border-t pt-2">
                    {weeklyViolations.filter(v => v.week_number === selectedWeek).length === 0 ? (
                      <p className="text-xs text-emerald-600 italic py-2">Tuần này chưa có vi phạm nào!</p>
                    ) : (
                      weeklyViolations.filter(v => v.week_number === selectedWeek).map(v => {
                        const st = students.find(s => s.id === v.student_id);
                        return (
                          <div key={v.id} className="py-2.5 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-slate-800">{st?.full_name}</span> ({st?.code}) - <span className="text-rose-600 font-medium">{v.content}</span>
                              {v.created_date && <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Ngày: {formatDate(v.created_date)}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">-{v.penalty_points} điểm</span>
                              <button onClick={() => handleDeleteViolation(v.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* FORM KHEN THƯỞNG CÓ Ô CHỌN NGÀY */}
                <div className="bg-white rounded-xl border p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-amber-700 text-sm flex items-center gap-2 border-b pb-2">
                    <Award className="w-4 h-4" /> Tuyên Dương & Khen Thưởng Tuần {selectedWeek}
                  </h3>

                  <form onSubmit={handleAddCommendation} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end text-xs">
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Học sinh (*)</label>
                      <select
                        value={commendationStudentId}
                        onChange={e => setCommendationStudentId(e.target.value)}
                        className="w-full p-2 border rounded bg-slate-50"
                        required
                      >
                        <option value="">-- Chọn Học Sinh --</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.code})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Ngày khen thưởng (*)</label>
                      <input
                        type="date"
                        value={commendationDate}
                        onChange={e => setCommendationDate(e.target.value)}
                        className="w-full p-2 border rounded bg-slate-50"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Nội dung tuyên dương (*)</label>
                      <input
                        type="text"
                        placeholder="VD: Đạt điểm 10 KT 1 tiết..."
                        value={commendationContent}
                        onChange={e => setCommendationContent(e.target.value)}
                        className="w-full p-2 border rounded bg-slate-50"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Điểm cộng (*)</label>
                      <input
                        type="number"
                        min="1"
                        value={commendationBonus}
                        onChange={e => setCommendationBonus(Number(e.target.value))}
                        className="w-full p-2 border rounded bg-slate-50"
                        required
                      />
                    </div>
                    <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg shadow">
                      + Thêm Khen Thưởng
                    </button>
                  </form>

                  <div className="divide-y border-t pt-2">
                    {weeklyCommendations.filter(c => c.week_number === selectedWeek).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Tuần này chưa có tuyên dương nào.</p>
                    ) : (
                      weeklyCommendations.filter(c => c.week_number === selectedWeek).map(c => {
                        const st = students.find(s => s.id === c.student_id);
                        return (
                          <div key={c.id} className="py-2.5 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-slate-800">{st?.full_name}</span> ({st?.code}) - <span className="text-amber-700 font-medium">{c.content}</span>
                              {c.created_date && <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Ngày: {formatDate(c.created_date)}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">+{c.bonus_points} điểm</span>
                              <button onClick={() => handleDeleteCommendation(c.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* BẢNG ĐIỂM THEO TỔ */}
                <div className="bg-white rounded-xl border p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-indigo-700 text-sm flex items-center gap-2 border-b pb-2">
                    <Trophy className="w-4 h-4" /> Bảng Điểm Thi Đua Theo Tổ - Tuần {selectedWeek}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(gNum => {
                      const existing = groupScores.find(gs => gs.group_number === gNum && gs.week_number === selectedWeek);
                      const currentScore = existing ? existing.score : 100;
                      const currentNote = existing ? existing.note : '';

                      return (
                        <div key={gNum} className="bg-slate-50 p-4 rounded-xl border space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-indigo-900 text-sm">TỔ {gNum}</h4>
                            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold text-xs">{currentScore} Điểm</span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <label className="text-slate-600 font-medium">Điểm Thi Đua Tuần:</label>
                              <input
                                type="number"
                                value={currentScore}
                                onChange={e => handleSaveGroupScore(gNum, Number(e.target.value), currentNote)}
                                className="w-full p-2 border rounded bg-white mt-1 font-bold text-indigo-700"
                              />
                            </div>
                            <div>
                              <label className="text-slate-600 font-medium">Ghi chú nhận xét:</label>
                              <input
                                type="text"
                                placeholder="VD: Hạng 1 toàn lớp"
                                value={currentNote}
                                onChange={e => handleSaveGroupScore(gNum, currentScore, e.target.value)}
                                className="w-full p-2 border rounded bg-white mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL ĐỔI MẬT KHẨU BẢO MẬT */}
      {isChangePassModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" /> Đổi Mật Khẩu Giáo Viên
              </h3>
              <button onClick={() => setIsChangePassModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePass} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Mật khẩu hiện tại (*)</label>
                <input
                  type="password"
                  required
                  value={oldPassInput}
                  onChange={e => setOldPassInput(e.target.value)}
                  className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Mật khẩu mới (*)</label>
                <input
                  type="password"
                  required
                  value={newPassInput}
                  onChange={e => setNewPassInput(e.target.value)}
                  className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>

              {changePassError && <p className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{changePassError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsChangePassModalOpen(false)} className="px-4 py-2 border rounded-lg">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow">Lưu Mật Khẩu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT PHIẾU HỌC SINH */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded font-bold">{selectedStudentDetail.code}</span>
                <h3 className="font-bold text-slate-800 text-lg mt-1">Phiếu Khảo Sát: {selectedStudentDetail.full_name}</h3>
              </div>
              <button onClick={() => setSelectedStudentDetail(null)} className="text-slate-400">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 max-h-[60vh] overflow-y-auto pr-2">
              <p><strong>1. Diện chính sách:</strong> {selectedStudentDetail.policy_status} ({selectedStudentDetail.policy_note || 'Không ghi chú'})</p>
              <p><strong>2. Định hướng khối thi ĐH:</strong> {selectedStudentDetail.exam_block || 'Chưa điền'}</p>
              <p><strong>3. Mục tiêu lớp 10:</strong> {selectedStudentDetail.grade_target || 'Chưa điền'}</p>
              <p><strong>4. Tiền sử bệnh lý:</strong> {selectedStudentDetail.medical_history || 'Chưa điền'}</p>
              <p><strong>5. Năng khiếu:</strong> {selectedStudentDetail.talents || 'Chưa điền'}</p>
              <p><strong>6. Chức vụ cấp 2:</strong> {selectedStudentDetail.past_roles || 'Chưa điền'}</p>
              <p><strong>7. Vị trí ứng cử lớp 10:</strong> {selectedStudentDetail.apply_role || 'Chưa điền'}</p>
              <p><strong>8. Tính cách:</strong> {selectedStudentDetail.personality || 'Chưa điền'}</p>
              <p><strong>9. Mong muốn đối với Cô CN:</strong> {selectedStudentDetail.teacher_expectation || 'Chưa điền'}</p>
              <p><strong>Mong muốn hỗ trợ:</strong> {selectedStudentDetail.teacher_support || 'Chưa điền'}</p>
              {selectedStudentDetail.secret_message && (
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200 text-indigo-900">
                  <p className="font-bold">10. Thông điệp bí mật gửi Cô chủ nhiệm:</p>
                  <p className="mt-1 italic">{selectedStudentDetail.secret_message}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t text-right">
              <button onClick={() => setSelectedStudentDetail(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA HS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 my-8">
            <h3 className="font-bold text-slate-800">{editingStudent ? 'Chỉnh Sửa HS' : 'Thêm Học Sinh Mới'}</h3>
            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600">MSHS (*)</label>
                <input type="text" required placeholder="VD: HS001" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full p-2 border rounded mt-1 uppercase" />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Họ và Tên (*)</label>
                <input type="text" required placeholder="VD: Nguyễn Văn A" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full p-2 border rounded mt-1" />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Phân Tổ (*)</label>
                <select value={formData.group_number} onChange={e => setFormData({ ...formData, group_number: Number(e.target.value) })} className="w-full p-2 border rounded mt-1">
                  <option value={1}>Tổ 1</option>
                  <option value={2}>Tổ 2</option>
                  <option value={3}>Tổ 3</option>
                  <option value={4}>Tổ 4</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded font-semibold">Lưu Học Sinh</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
