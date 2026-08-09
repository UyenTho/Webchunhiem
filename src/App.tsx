import React, { useState, useEffect } from 'react';
import { 
  Users, Wallet, CheckCircle, XCircle, Plus, Trash2, Edit3, Award, LogOut, LogIn, Lock, Key, ShieldAlert, Eye, Calendar, Trophy, ToggleLeft, ToggleRight, X, FileSpreadsheet, ShieldCheck, HelpCircle
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
  teacher_id?: string;
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

const CLASS_ROLES = [
  'Thành viên',
  'Lớp trưởng',
  'Lớp phó',
  'Bí thư',
  'Tổ trưởng Tổ 1',
  'Tổ trưởng Tổ 2',
  'Tổ trưởng Tổ 3',
  'Tổ trưởng Tổ 4',
  'Thư ký',
  'Thủ quỹ'
];

export default function App() {
  const [currentView, setCurrentView] = useState<'teacher' | 'student_login' | 'student_portal'>('student_login');
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);
  const [teacherUser, setTeacherUser] = useState<any>(null);

  // Modal Đăng nhập / Đăng ký / Quên mật khẩu
  const [isTeacherAuthModalOpen, setIsTeacherAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');

  // State Form Đăng nhập
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  
  // State Form Đăng ký
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regKeyCode, setRegKeyCode] = useState('');

  // State Quên Mật Khẩu
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');

  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setTeacherUser(user);
    });
  }, []);

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: teacherEmail.trim(),
        password: teacherPassword,
      });

      if (error || !data.user) {
        setAuthError('Email hoặc Mật khẩu Giáo viên không chính xác!');
        setAuthLoading(false);
        return;
      }

      const { data: subData } = await supabase
        .from('teacher_subscriptions')
        .select('*')
        .eq('teacher_id', data.user.id)
        .single();

      const today = new Date().toISOString().split('T')[0];

      if (subData) {
        if (!subData.is_active) {
          setAuthError('Tài khoản của bạn đã bị khóa bởi Admin!');
          await supabase.auth.signOut();
          setAuthLoading(false);
          return;
        }

        if (subData.expire_date < today) {
          setAuthError(`Tài khoản đã hết hạn vào ngày ${subData.expire_date}. Vui lòng gia hạn!`);
          await supabase.auth.signOut();
          setAuthLoading(false);
          return;
        }
      }

      setTeacherUser(data.user);
      setIsTeacherAuthModalOpen(false);
      setCurrentView('teacher');
    } catch {
      setAuthError('Lỗi kết nối máy chủ!');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleTeacherRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const { data: keyData, error: keyError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('key_code', regKeyCode.trim().toUpperCase())
        .eq('is_used', false)
        .single();

      if (keyError || !keyData) {
        setAuthError('Mã Kích Hoạt (API Key) không đúng hoặc đã được sử dụng!');
        setAuthLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
      });

      if (authError || !authData.user) {
        setAuthError('Lỗi đăng ký: ' + (authError?.message || 'Không thể tạo tài khoản'));
        setAuthLoading(false);
        return;
      }

      const expireDateObj = new Date();
      expireDateObj.setDate(expireDateObj.getDate() + (keyData.duration_days || 365));
      const expireDateStr = expireDateObj.toISOString().split('T')[0];

      await supabase.from('teacher_subscriptions').insert([{
        teacher_id: authData.user.id,
        email: regEmail.trim(),
        full_name: regFullName.trim(),
        expire_date: expireDateStr,
        is_active: true
      }]);

      await supabase
        .from('license_keys')
        .update({ is_used: true, used_by_email: regEmail.trim() })
        .eq('id', keyData.id);

      alert(`Đăng ký & Kích hoạt tài khoản thành công!\nHạn sử dụng đến ngày: ${expireDateStr}`);
      setAuthMode('login');
      setTeacherEmail(regEmail);
      setTeacherPassword(regPassword);
    } catch {
      setAuthError('Đã có lỗi xảy ra trong quá trình đăng ký!');
    } finally {
      setAuthLoading(false);
    }
  };

  // HÀM XỬ LÝ GỬI YÊU CẦU QUÊN MẬT KHẨU
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    setForgotSuccessMsg('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) {
        setAuthError('Không thể gửi yêu cầu. Vui lòng kiểm tra lại email!');
      } else {
        setForgotSuccessMsg('Đã gửi liên kết khôi phục mật khẩu tới email của bạn. Vui lòng kiểm tra hộp thư!');
      }
    } catch {
      setAuthError('Lỗi kết nối máy chủ!');
    } finally {
      setAuthLoading(false);
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
            setAuthError('');
            setForgotSuccessMsg('');
            setIsTeacherAuthModalOpen(true);
          }}
        />

        {/* MODAL XÁC THỰC GIÁO VIÊN (ĐĂNG NHẬP / ĐĂNG KÝ / QUÊN MẬT KHẨU) */}
        {isTeacherAuthModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" /> 
                  {authMode === 'login' && 'Đăng Nhập Giáo Viên'}
                  {authMode === 'register' && 'Đăng Ký Bằng API Key'}
                  {authMode === 'forgot_password' && 'Khôi Phục Mật Khẩu'}
                </h3>
                <button onClick={() => setIsTeacherAuthModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* TÁC VỤ 1: ĐĂNG NHẬP */}
              {authMode === 'login' && (
                <form onSubmit={handleTeacherLogin} className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Email Giáo Viên (*)</label>
                    <input
                      type="email"
                      required
                      placeholder="giaovien@gmail.com"
                      value={teacherEmail}
                      onChange={e => setTeacherEmail(e.target.value)}
                      className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-semibold text-slate-600">Mật Khẩu (*)</label>
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot_password'); setAuthError(''); setForgotSuccessMsg(''); }}
                        className="text-indigo-600 text-[11px] font-semibold hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={teacherPassword}
                      onChange={e => setTeacherPassword(e.target.value)}
                      className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                    />
                  </div>

                  {authError && <p className="text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{authError}</p>}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow transition"
                  >
                    {authLoading ? 'Đang xác thực...' : 'Đăng Nhập'}
                  </button>

                  <p className="text-center text-slate-500 pt-2 border-t">
                    Chưa có tài khoản?{' '}
                    <button type="button" onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-indigo-600 font-bold hover:underline">
                      Đăng ký ngay
                    </button>
                  </p>
                </form>
              )}

              {/* TÁC VỤ 2: ĐĂNG KÝ BẰNG KEY */}
              {authMode === 'register' && (
                <form onSubmit={handleTeacherRegister} className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Họ và Tên Giáo Viên (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Cô Nguyễn Thị A"
                      value={regFullName}
                      onChange={e => setRegFullName(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Email (*)</label>
                    <input
                      type="email"
                      required
                      placeholder="giaovien@gmail.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Mật Khẩu Tự Chọn (*)</label>
                    <input
                      type="password"
                      required
                      placeholder="Tối thiểu 6 ký tự..."
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-slate-50"
                    />
                  </div>
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-1">
                    <label className="font-bold text-amber-900 block">Mã Kích Hoạt / API Key (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: GV2026-VIP"
                      value={regKeyCode}
                      onChange={e => setRegKeyCode(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white uppercase font-bold text-indigo-700"
                    />
                  </div>

                  {authError && <p className="text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{authError}</p>}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow transition"
                  >
                    {authLoading ? 'Đang kích hoạt...' : 'Kích Hoạt Tài Khoản'}
                  </button>

                  <p className="text-center text-slate-500 pt-2 border-t">
                    Đã có tài khoản?{' '}
                    <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-indigo-600 font-bold hover:underline">
                      Đăng nhập
                    </button>
                  </p>
                </form>
              )}

              {/* TÁC VỤ 3: QUÊN MẬT KHẨU */}
              {authMode === 'forgot_password' && (
                <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
                  <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 text-indigo-900 leading-relaxed">
                    <p className="font-semibold flex items-center gap-1">
                      <HelpCircle className="w-4 h-4 text-indigo-600" /> Hướng dẫn lấy lại mật khẩu:
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Nhập email đã đăng ký của bạn bên dưới. Hệ thống sẽ gửi email tự động đặt lại mật khẩu hoặc bạn có thể liên hệ <strong>Admin (Zalo)</strong> để nhận mật khẩu tạm thời.
                    </p>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Email đã đăng ký (*)</label>
                    <input
                      type="email"
                      required
                      placeholder="giaovien@gmail.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                    />
                  </div>

                  {authError && <p className="text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{authError}</p>}
                  {forgotSuccessMsg && <p className="text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">{forgotSuccessMsg}</p>}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow transition"
                  >
                    {authLoading ? 'Đang gửi...' : 'Gửi Yêu Cầu Đặt Lại Mật Khẩu'}
                  </button>

                  <p className="text-center text-slate-500 pt-2 border-t">
                    Quay lại{' '}
                    <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-indigo-600 font-bold hover:underline">
                      Đăng nhập
                    </button>
                  </p>
                </form>
              )}
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
      teacherUser={teacherUser}
      onLogoutTeacher={async () => {
        await supabase.auth.signOut();
        setTeacherUser(null);
        setCurrentView('student_login');
      }} 
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
// 2. MÀN HÌNH CÁ NHÂN HỌC SINH
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
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-600 px-2.5 py-1 rounded font-semibold">{currentStudent.code}</span>
            {currentStudent.class_role && currentStudent.class_role !== 'Thành viên' && (
              <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {currentStudent.class_role}
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold mt-1">{currentStudent.full_name} (Tổ {currentStudent.group_number || 1})</h1>
        </div>
        <button onClick={onLogout} className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
          <LogOut className="w-3.5 h-3.5" /> Đăng xuất
        </button>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
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
function TeacherDashboard({ teacherUser, onLogoutTeacher }: { teacherUser: any; onLogoutTeacher: () => void }) {
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

  // Modal Đổi Mật Khẩu Cá Nhân
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);
  const [newPassInput, setNewPassInput] = useState('');
  const [changePassError, setChangePassError] = useState('');

  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeePaidAll, setNewFeePaidAll] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const [violationStudentId, setViolationStudentId] = useState('');
  const [violationContent, setViolationContent] = useState('');
  const [violationPenalty, setViolationPenalty] = useState(1);
  const [violationDate, setViolationDate] = useState(todayStr);

  const [commendationStudentId, setCommendationStudentId] = useState('');
  const [commendationContent, setCommendationContent] = useState('');
  const [commendationBonus, setCommendationBonus] = useState(1);
  const [commendationDate, setCommendationDate] = useState(todayStr);

  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    code: '', full_name: '', phone: '', group_number: 1, class_role: 'Thành viên', hobbies: '', policy_status: 'Không', policy_note: '',
    father_name: '', father_job: '', father_phone: '', mother_name: '', mother_job: '', mother_phone: ''
  });

  const fetchData = async () => {
    if (!teacherUser) return;
    setLoading(true);
    try {
      const [settingRes, stRes, itemRes, payRes, vioRes, comRes, grpRes] = await Promise.all([
        supabase.from('system_settings').select('value_boolean').eq('key', 'is_survey_open').single(),
        supabase.from('students').select('*').eq('teacher_id', teacherUser.id).order('code', { ascending: true }),
        supabase.from('fee_items').select('*').eq('teacher_id', teacherUser.id).order('created_at', { ascending: true }),
        supabase.from('fee_payments').select('*').eq('teacher_id', teacherUser.id),
        supabase.from('weekly_violations').select('*').eq('teacher_id', teacherUser.id),
        supabase.from('weekly_commendations').select('*').eq('teacher_id', teacherUser.id),
        supabase.from('group_scores').select('*').eq('teacher_id', teacherUser.id)
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

  useEffect(() => { fetchData(); }, [teacherUser]);

  const handleChangeSelfPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassInput || newPassInput.length < 6) {
      setChangePassError('Mật khẩu mới phải từ 6 ký tự trở lên!');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassInput });
    if (error) {
      setChangePassError('Không thể cập nhật mật khẩu: ' + error.message);
    } else {
      alert('Đã đổi mật khẩu thành công!');
      setIsChangePassModalOpen(false);
      setNewPassInput('');
      setChangePassError('');
    }
  };

  const handleExportExcel = () => {
    const dataStudents = students.map((s, idx) => ({
      'STT': idx + 1,
      'Mã Số HS': s.code,
      'Họ và Tên': s.full_name,
      'Tổ': `Tổ ${s.group_number || 1}`,
      'Chức Vụ Lớp': s.class_role || 'Thành viên',
      'SĐT Học Sinh': s.phone || '',
      'Diện Chính Sách': s.policy_status || 'Không',
      'Khối Thi ĐH': s.exam_block || '',
      'Mục Tiêu Danh Hiệu': s.grade_target || '',
      'Họ Tên Bố': s.father_name || '',
      'SĐT Bố': s.father_phone || '',
      'Họ Tên Mẹ': s.mother_name || '',
      'SĐT Mẹ': s.mother_phone || ''
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataStudents), '1. Danh Sách & Lý Lịch');
    XLSX.writeFile(wb, `Bao_Cao_Lop_Chu_Nhiem_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUpdateStudentRole = async (studentId: string, newRole: string) => {
    await supabase.from('students').update({ class_role: newRole }).eq('id', studentId);
    setStudents(students.map(s => s.id === studentId ? { ...s, class_role: newRole } : s));
  };

  const handleToggleGlobalSurvey = async () => {
    const nextState = !isSurveyOpen;
    await supabase.from('system_settings').upsert({ key: 'is_survey_open', value_boolean: nextState });
    setIsSurveyOpen(nextState);
    alert(nextState ? 'Đã MỞ mục khảo sát cho học sinh!' : 'Đã ĐÓNG (ẨN) mục khảo sát toàn lớp!');
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherUser) return;

    if (editingStudent) {
      await supabase.from('students').update(formData).eq('id', editingStudent.id);
    } else {
      await supabase.from('students').insert([{ 
        ...formData, 
        code: formData.code.toUpperCase(),
        teacher_id: teacherUser.id
      }]);
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
      <header className="bg-indigo-700 text-white shadow-lg py-4 px-6 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Hệ Thống Quản Lý Lớp Chủ Nhiệm</h1>
          <p className="text-xs text-indigo-200 mt-0.5">Tài khoản: <strong>{teacherUser?.email}</strong> • Sĩ Số: {students.length} HS</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất Báo Cáo Excel
          </button>

          <button 
            onClick={handleToggleGlobalSurvey}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition ${
              isSurveyOpen ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-slate-600 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isSurveyOpen ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {isSurveyOpen ? 'Khảo Sát: BẬT' : 'Khảo Sát: ĐÓNG'}
          </button>

          <button onClick={() => { setNewPassInput(''); setChangePassError(''); setIsChangePassModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
            <Key className="w-3.5 h-3.5" /> Đổi Mật Khẩu
          </button>

          <button onClick={onLogoutTeacher} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" /> Thoát Đăng Nhập
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
                  <button onClick={() => { setEditingStudent(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow">
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
                        <th className="p-3 border-r bg-purple-100/70 text-purple-900">Ban Cán Sự Lớp</th>
                        <th className="p-3 border-r text-center">Khảo Sát</th>
                        <th className="p-3 border-r text-center">Xem Phiếu</th>
                        <th className="p-3 border-r bg-amber-100/70 text-amber-900">Diện Chính Sách</th>
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
                          <td className="p-3 border-r bg-purple-50/40">
                            <select
                              value={s.class_role || 'Thành viên'}
                              onChange={e => handleUpdateStudentRole(s.id, e.target.value)}
                              className="p-1.5 border rounded-lg bg-white font-semibold text-purple-800 text-xs focus:ring-2 focus:ring-purple-500"
                            >
                              {CLASS_ROLES.map(role => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </td>
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
                          <td className="p-3 text-center sticky right-0 bg-white shadow-left flex justify-center gap-1">
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
          </>
        )}
      </main>

      {/* MODAL ĐỔI MẬT KHẨU CÁ NHÂN */}
      {isChangePassModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" /> Đổi Mật Khẩu Cá Nhân
              </h3>
              <button onClick={() => setIsChangePassModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangeSelfPassword} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Mật khẩu mới (*)</label>
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 6 ký tự..."
                  value={newPassInput}
                  onChange={e => setNewPassInput(e.target.value)}
                  className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>

              {changePassError && <p className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{changePassError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsChangePassModalOpen(false)} className="px-4 py-2 border rounded-lg">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow">Lưu Mật Khẩu Mới</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM HS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-800">Thêm Học Sinh Mới</h3>
            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600">MSHS (*)</label>
                <input type="text" required placeholder="VD: HS001" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full p-2 border rounded mt-1 uppercase" />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Họ và Tên (*)</label>
                <input type="text" required placeholder="VD: Nguyễn Văn A" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full p-2 border rounded mt-1" />
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
