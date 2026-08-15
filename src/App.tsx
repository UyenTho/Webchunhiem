import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Users, Wallet, CheckCircle, XCircle, Trash2, Award, LogOut,
  ShieldAlert, Trophy, Bell, AlertCircle, RefreshCw, BookOpen, FileText, PlusCircle,
  Coins, Receipt
} from 'lucide-react';
import { supabase } from './supabaseClient';

// ==================== INTERFACES ====================
interface Teacher {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  school?: string;
  is_approved: boolean;
  is_admin: boolean;
}

interface Student {
  id: string;
  teacher_id: string;
  code: string;
  full_name: string;
  password?: string;
  dob?: string;
  class_role?: string;
  group_number?: number;
  survey_completed?: boolean;
  survey_info?: any;
}

interface FeeItem {
  id: string;
  teacher_id: string;
  title: string;
  amount: number;
  deadline?: string;
  is_completed?: boolean;
}

interface FeePayment {
  id: string;
  student_id: string;
  fee_item_id: string;
  is_paid: boolean;
}

interface FeeExpense {
  id: string;
  teacher_id: string;
  title: string;
  amount: number;
  expense_date: string;
  note?: string;
}

interface GroupWeeklyScore {
  id: string;
  teacher_id: string;
  week_number: number;
  group_number: number;
  score: number;
  note?: string;
}

interface Announcement {
  id: string;
  teacher_id: string;
  title: string;
  content: string;
  important: boolean;
  created_date: string;
}

interface StudentRecord {
  id: string;
  student_id: string;
  teacher_id: string;
  week_number: number;
  type: 'violation' | 'commendation';
  content: string;
  points: number;
  record_date?: string;
  created_at?: string;
}

type ViewType =
  | 'login' | 'forgot_password' | 'reset_password' | 'register_payment'
  | 'admin' | 'teacher' | 'student_portal' | 'class_leader_portal' | 'treasurer_portal';

// ==================== BẢNG QUY ĐỊNH ĐIỂM THI ĐUA ====================
// Đồng bộ với Bảng Nội Quy Thi Đua hiển thị cho học sinh (mục II và III trong StudentPortal).
// Lớp trưởng sẽ CHỌN nội dung từ danh sách này, điểm sẽ tự động điền theo đúng quy định,
// tránh trường hợp nhập tay sai lệch điểm so với nội quy lớp.
const COMPETITION_RULES: { type: 'violation' | 'commendation'; content: string; points: number }[] = [
  // ==== II. BẢNG CỘNG ĐIỂM ====
  { type: 'commendation', content: 'Đạt điểm 10 trong bài kiểm tra (Miệng, 15 phút, Giữa kỳ, Cuối kỳ)', points: 3 },
  { type: 'commendation', content: 'Đạt điểm 9 trong bài kiểm tra (Miệng, 15 phút, Giữa kỳ, Cuối kỳ)', points: 2 },
  { type: 'commendation', content: 'Đạt giải Học sinh giỏi / KHKT / Thể thao cấp Trường (hoặc tương đương)', points: 5 },
  { type: 'commendation', content: 'Đạt giải Học sinh giỏi / KHKT cấp Tỉnh / Thành phố trở lên', points: 10 },
  { type: 'commendation', content: 'Ban cán sự lớp (Lớp trưởng, Lớp phó, Cờ đỏ) hoàn thành xuất sắc nhiệm vụ', points: 5 },
  { type: 'commendation', content: 'Nhặt được của rơi trả lại người mất / Hành động dũng cảm giúp đỡ cộng đồng', points: 5 },
  // ==== III. BẢNG TRỪ ĐIỂM HÀNG TUẦN ====
  { type: 'violation', content: 'Đi học muộn (sau tiếng trống vào lớp / giờ truy bài)', points: 2 },
  { type: 'violation', content: 'Bỏ giờ truy bài 15 phút đầu giờ', points: 3 },
  { type: 'violation', content: 'Nghỉ học không lý do (nghỉ chui)', points: 10 },
  { type: 'violation', content: 'Trốn tiết / Trốn học giữa giờ', points: 15 },
  { type: 'violation', content: 'Không làm bài tập về nhà / Không chuẩn bị bài theo yêu cầu GVBM', points: 3 },
  { type: 'violation', content: 'Không mang sách vở, dụng cụ học tập theo thời khóa biểu', points: 2 },
  { type: 'violation', content: 'Mất trật tự, làm việc riêng, ngủ gật trong giờ học', points: 2 },
  { type: 'violation', content: 'Sử dụng điện thoại di động khi chưa có sự cho phép của giáo viên', points: 5 },
  { type: 'violation', content: 'Gian lận trong kiểm tra, thi cử (quay cóp, sử dụng tài liệu)', points: 20 },
  { type: 'violation', content: 'Sai đồng phục, không đeo thẻ học sinh, đi dép lê không quai', points: 2 },
  { type: 'violation', content: 'Nhuộm tóc màu sáng, nhuộm Highlight, nam để tóc quá dài', points: 5 },
  { type: 'violation', content: 'Trang điểm đậm, sơn móng tay/móng chân màu nổi bật', points: 3 },
  { type: 'violation', content: 'Hút thuốc lá, thuốc lá điện tử trong trường (hoặc vi phạm ATGT)', points: 20 },
  { type: 'violation', content: 'Bỏ trực nhật / Trực nhật sơ sài, không đổ rác đúng quy định', points: 5 },
  { type: 'violation', content: 'Xả rác bừa bãi trong lớp hoặc khuôn viên trường', points: 3 },
  { type: 'violation', content: 'Nói tục, chửi thề, gây mất đoàn kết nội bộ lớp', points: 5 },
  { type: 'violation', content: 'Mang đồ ăn, nước ngọt vào sử dụng trong giờ học', points: 2 },
];

// ==================== DANH SÁCH CHỨC VỤ BAN CÁN SỰ LỚP ====================
// Dùng chung cho: dropdown đổi chức vụ trong bảng Danh Sách Học Sinh,
// form Thêm Học Sinh Mới, và tab Phân Chia Tổ & Ban Cán Sự.
const ROLES: string[] = ['Học sinh', 'Lớp trưởng', 'Lớp phó', 'Bí thư', 'Thư ký', 'Thủ quỹ', 'Tổ trưởng'];

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('login');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);
  // Token phiên đăng nhập của học sinh/lớp trưởng/thủ quỹ (bcrypt + session
  // token, KHÔNG còn dùng student.id trực tiếp cho các thao tác dữ liệu —
  // xem chi tiết trong migration_5_session_token.sql).
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: false });
      if (!error && data) setTeachers(data as Teacher[]);
    } catch (err) {
      console.error("Lỗi kết nối Supabase:", err);
    }
  };

  // Khôi phục phiên đăng nhập học sinh (nếu còn hạn) khi tải lại trang,
  // để người dùng không bị đăng xuất mỗi khi F5. Token lưu ở sessionStorage
  // (tự xóa khi đóng tab/trình duyệt) — KHÔNG lưu ở localStorage.
  const restoreStudentSession = async () => {
    const savedToken = sessionStorage.getItem('student_session_token');
    if (!savedToken) return;

    const { data, error } = await supabase.rpc('get_my_student', { p_session_token: savedToken });
    if (error || !data || !data[0]) {
      sessionStorage.removeItem('student_session_token');
      return;
    }

    const student = data[0] as Student;
    setLoggedInStudent(student);
    setSessionToken(savedToken);
    if (isRole(student.class_role, 'lớp trưởng', 'lop truong')) {
      setCurrentView('class_leader_portal');
    } else if (isRole(student.class_role, 'thủ quỹ', 'thu quy')) {
      setCurrentView('treasurer_portal');
    } else {
      setCurrentView('student_portal');
    }
  };

  useEffect(() => {
    fetchTeachers();
    restoreStudentSession();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('reset_password');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (sessionToken) {
      // Hủy hẳn session ở server, không chỉ xóa ở trình duyệt.
      await supabase.rpc('student_logout', { p_session_token: sessionToken }).catch(() => {});
      sessionStorage.removeItem('student_session_token');
    }
    setCurrentTeacher(null);
    setLoggedInStudent(null);
    setSessionToken(null);
    setCurrentView('login');
  };

  const isRole = (role: string | undefined, ...keywords: string[]) => {
    const r = (role || '').toLowerCase().trim();
    return keywords.some(k => r.includes(k));
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      {/* HEADER TỔNG */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white text-xs py-2.5 px-4 font-bold flex justify-between items-center shadow-md">
        <span className="flex items-center gap-1.5">
          ✨ Phần Mềm Quản Lý Lớp Chủ Nhiệm
        </span>
        <div className="flex items-center gap-2">
          {currentTeacher && <span className="bg-indigo-900/60 border border-indigo-400/30 px-2.5 py-1 rounded-full text-[11px]">👤 GV: {currentTeacher.full_name}</span>}
          {loggedInStudent && <span className="bg-purple-900/60 border border-purple-400/30 px-2.5 py-1 rounded-full text-[11px]">🎓 {loggedInStudent.full_name} ({loggedInStudent.class_role || 'Học sinh'})</span>}
          {(currentTeacher || loggedInStudent || currentView === 'admin') && (
            <button onClick={handleLogout} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 transition shadow">
              <LogOut className="w-3.5 h-3.5" /> Đăng Xuất
            </button>
          )}
        </div>
      </div>

      {/* ROUTING MÀN HÌNH */}
      {currentView === 'login' && (
        <LoginScreen
          onTeacherLogin={(teacher: Teacher) => { setCurrentTeacher(teacher); setCurrentView('teacher'); }}
          onStudentLogin={(student: Student, token: string) => {
            setLoggedInStudent(student);
            setSessionToken(token);
            sessionStorage.setItem('student_session_token', token);
            if (isRole(student.class_role, 'lớp trưởng', 'lop truong')) {
              setCurrentView('class_leader_portal');
            } else if (isRole(student.class_role, 'thủ quỹ', 'thu quy')) {
              setCurrentView('treasurer_portal');
            } else {
              setCurrentView('student_portal');
            }
          }}
          onAdminLogin={() => {
            fetchTeachers();
            setCurrentView('admin');
          }}
          onForgotPassword={() => setCurrentView('forgot_password')}
          onRegister={() => setCurrentView('register_payment')}
        />
      )}

      {currentView === 'register_payment' && (
        <RegisterWithPaymentScreen
          onSuccess={() => setCurrentView('login')}
          onCancel={() => setCurrentView('login')}
        />
      )}

      {currentView === 'forgot_password' && (
        <ForgotPasswordScreen onBackToLogin={() => setCurrentView('login')} />
      )}

      {currentView === 'reset_password' && (
        <ResetPasswordScreen onDone={() => setCurrentView('login')} />
      )}

      {currentView === 'admin' && (
        <AdminDashboard teachers={teachers} onRefresh={fetchTeachers} />
      )}

      {currentView === 'teacher' && currentTeacher && (
        <TeacherDashboard teacher={currentTeacher} />
      )}

      {currentView === 'class_leader_portal' && loggedInStudent && sessionToken && (
        <ClassLeaderPortal student={loggedInStudent} sessionToken={sessionToken} onSwitchToStudentView={() => setCurrentView('student_portal')} />
      )}

      {currentView === 'treasurer_portal' && loggedInStudent && sessionToken && (
        <TreasurerPortal student={loggedInStudent} sessionToken={sessionToken} onSwitchToStudentView={() => setCurrentView('student_portal')} />
      )}

      {currentView === 'student_portal' && loggedInStudent && sessionToken && (
        <div className="space-y-2">
          {isRole(loggedInStudent.class_role, 'lớp trưởng', 'lop truong') && (
            <div className="max-w-5xl mx-auto pt-4 px-4 text-right">
              <button
                onClick={() => setCurrentView('class_leader_portal')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow"
              >
                🚀 Mở Cổng Báo Cáo Thi Đua Lớp Trưởng
              </button>
            </div>
          )}
          {isRole(loggedInStudent.class_role, 'thủ quỹ', 'thu quy') && (
            <div className="max-w-5xl mx-auto pt-4 px-4 text-right">
              <button
                onClick={() => setCurrentView('treasurer_portal')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow"
              >
                💰 Mở Cổng Quản Lý Quỹ Lớp - Thủ Quỹ
              </button>
            </div>
          )}
          <StudentPortal
            student={loggedInStudent}
            sessionToken={sessionToken}
            onRefreshStudent={async () => {
              // Dùng RPC get_my_student với session token (không còn dùng student.id trực tiếp).
              const { data } = await supabase.rpc('get_my_student', { p_session_token: sessionToken });
              if (data && data[0]) setLoggedInStudent(data[0] as Student);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ==================== 2. MÀN HÌNH ĐĂNG NHẬP ====================
function LoginScreen({ onTeacherLogin, onStudentLogin, onAdminLogin, onForgotPassword, onRegister }: any) {
  const [role, setRole] = useState<'teacher' | 'student' | 'admin'>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [step, setStep] = useState<1 | 2>(1);
  const [classCode, setClassCode] = useState('');
  const [matchedTeacher, setMatchedTeacher] = useState<{ id: string; full_name: string; school: string } | null>(null);
  const [studentCode, setStudentCode] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetStudentFlow = () => {
    setStep(1);
    setClassCode('');
    setMatchedTeacher(null);
    setStudentCode('');
    setStudentPassword('');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const inputEmail = email.trim().toLowerCase();

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: inputEmail,
      password: password,
    });

    if (authErr || !authData.user) {
      setLoading(false);
      setError('Email hoặc mật khẩu không đúng!');
      return;
    }

    const { data: profile, error: profErr } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    setLoading(false);

    if (profErr) {
      setError('Lỗi cơ sở dữ liệu: ' + profErr.message);
      await supabase.auth.signOut();
      return;
    }

    if (!profile) {
      setError('Chưa tìm thấy hồ sơ tương ứng trong bảng teachers. Vui lòng liên hệ Admin.');
      await supabase.auth.signOut();
      return;
    }

    if (role === 'admin') {
      if (!profile.is_admin) {
        setError('Tài khoản này không có quyền Quản trị viên (is_admin = false).');
        await supabase.auth.signOut();
        return;
      }
      onAdminLogin();
      return;
    }

    if (!profile.is_approved) {
      setError('Tài khoản của thầy/cô ĐANG CHỜ ADMIN DUYỆT / CHƯA CHUYỂN TIỀN.');
      await supabase.auth.signOut();
      return;
    }

    onTeacherLogin(profile as Teacher);
  };

  const handleVerifyClassCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!classCode.trim()) return;
    setLoading(true);

    const { data, error: rpcErr } = await supabase.rpc('find_teacher_by_class_code', {
      p_class_code: classCode.trim(),
    });

    setLoading(false);

    if (rpcErr || !data || data.length === 0) {
      setError('Mã Lớp không tồn tại hoặc chưa được kích hoạt. Vui lòng hỏi lại Giáo viên chủ nhiệm.');
      return;
    }

    setMatchedTeacher(data[0]);
    setStep(2);
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!studentCode.trim() || !studentPassword.trim() || !matchedTeacher) return;
    setLoading(true);

    // Mật khẩu được đối chiếu bằng bcrypt (crypt()) ngay trong hàm RPC, và
    // hàm này tự tạo 1 session_token mới cho lượt đăng nhập này (xem
    // migration_5_session_token.sql). App KHÔNG còn dùng student.id trực
    // tiếp cho các thao tác sau đăng nhập nữa, mà dùng session_token.
    const { data, error: rpcErr } = await supabase.rpc('student_login', {
      p_teacher_id: matchedTeacher.id,
      p_code: studentCode.trim(),
      p_password: studentPassword.trim(),
    });

    setLoading(false);

    if (rpcErr || !data || data.length === 0) {
      setError('Mã Số Học Sinh hoặc Mật khẩu không đúng trong lớp này!');
      return;
    }

    const row = data[0] as Student & { session_token: string };
    onStudentLogin(row as Student, row.session_token);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-5">
        <div className="text-center space-y-1">
          <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Đăng Nhập Hệ Thống</h2>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button type="button" onClick={() => { setRole('teacher'); setError(''); resetStudentFlow(); }} className={`py-2 rounded-lg transition ${role === 'teacher' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600'}`}>Giáo Viên</button>
          <button type="button" onClick={() => { setRole('student'); setError(''); resetStudentFlow(); }} className={`py-2 rounded-lg transition ${role === 'student' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600'}`}>Học Sinh</button>
          <button type="button" onClick={() => { setRole('admin'); setError(''); resetStudentFlow(); }} className={`py-2 rounded-lg transition ${role === 'admin' ? 'bg-purple-700 text-white shadow' : 'text-slate-600'}`}>🛡️ Admin</button>
        </div>

        {error && <p className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium">{error}</p>}

        {(role === 'teacher' || role === 'admin') && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold block mb-1">Email Gmail:</label>
              <input type="email" required placeholder="teacher@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Mật khẩu:</label>
              <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow transition">
              {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
            </button>
            {role === 'teacher' && (
              <div className="flex justify-between text-xs pt-2">
                <button type="button" onClick={onForgotPassword} className="text-indigo-600 hover:underline font-medium">Quên mật khẩu?</button>
                <button type="button" onClick={onRegister} className="text-purple-700 font-bold hover:underline">Đăng ký mua bản quyền</button>
              </div>
            )}
          </form>
        )}

        {role === 'student' && step === 1 && (
          <form onSubmit={handleVerifyClassCode} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold block mb-1">Bước 1: Nhập Mã Lớp (*):</label>
              <input
                type="text" required placeholder="VD: 10A1-UYENTHO"
                value={classCode} onChange={e => setClassCode(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm uppercase font-mono"
              />
              <p className="text-[11px] text-indigo-600 mt-1.5 italic">* Mã Lớp do Giáo viên chủ nhiệm cung cấp riêng cho lớp của em.</p>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow transition">
              {loading ? 'Đang kiểm tra...' : 'Tiếp Tục →'}
            </button>
          </form>
        )}

        {role === 'student' && step === 2 && matchedTeacher && (
          <form onSubmit={handleStudentLogin} className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold">
              ✓ Lớp của GV: {matchedTeacher.full_name} ({matchedTeacher.school || 'THPT'})
              <button type="button" onClick={resetStudentFlow} className="block text-[11px] text-slate-500 underline mt-1 font-normal">Nhập sai Mã Lớp? Bấm để nhập lại</button>
            </div>
            <div>
              <label className="font-semibold block mb-1">Bước 2: Nhập Mã Số Học Sinh (MSHS):</label>
              <input
                type="text" required placeholder="VD: HS001"
                value={studentCode} onChange={e => setStudentCode(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm uppercase font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Mật khẩu (*):</label>
              <input
                type="password" required placeholder="Do Giáo viên chủ nhiệm cấp"
                value={studentPassword} onChange={e => setStudentPassword(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1 italic">* Nếu chưa có mật khẩu hoặc quên mật khẩu, vui lòng liên hệ Giáo viên chủ nhiệm để được cấp lại.</p>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow transition">
              {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ==================== 2b. MÀN HÌNH ĐĂNG KÝ VÀ THANH TOÁN ====================
function RegisterWithPaymentScreen({ onSuccess, onCancel }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [classCode, setClassCode] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (!classCode.trim()) {
      alert('Vui lòng đặt Mã Lớp riêng cho lớp của thầy/cô (VD: 10A1-TENGV).');
      return;
    }
    setLoading(true);
    const inputEmail = email.trim().toLowerCase();
    const inputClassCode = classCode.trim().toUpperCase();

    const { data: existing } = await supabase.rpc('find_teacher_by_class_code', {
      p_class_code: inputClassCode,
    });
    if (existing && existing.length > 0) {
      setLoading(false);
      alert('Mã Lớp này đã có người dùng. Vui lòng chọn Mã Lớp khác.');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: inputEmail,
      password: password,
      options: {
        data: { full_name: fullName, phone: phone, school: school, class_code: inputClassCode }
      }
    });

    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        alert('Email Gmail này ĐÃ ĐƯỢC ĐĂNG KÝ! Vui lòng đăng nhập hoặc dùng "Quên mật khẩu".');
      } else {
        alert('Lỗi đăng ký: ' + error.message);
      }
      return;
    }

    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-xs">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 space-y-5">
        <h2 className="text-xl font-bold text-slate-800 text-center">Đăng Ký Bản Quyền SaaS</h2>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Họ và tên Giáo viên (*):</label>
              <input type="text" required placeholder="Thầy Nguyễn Văn A" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Gmail đăng nhập (*):</label>
              <input type="email" required placeholder="teacher@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Tạo mật khẩu (*, tối thiểu 6 ký tự):</label>
              <input type="password" required minLength={6} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Số điện thoại (*):</label>
              <input type="tel" required placeholder="0912345678" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Trường đang công tác:</label>
              <input type="text" placeholder="THPT Chuyên..." value={school} onChange={e => setSchool(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Đặt Mã Lớp riêng (*, học sinh dùng mã này để đăng nhập):</label>
              <input type="text" required placeholder="VD: 10A1-TENGV" value={classCode} onChange={e => setClassCode(e.target.value)} className="w-full p-2.5 border rounded-xl uppercase font-mono" />
              <p className="text-[11px] text-slate-500 mt-1 italic">* Chỉ chia sẻ Mã Lớp cho học sinh trong lớp mình.</p>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-sm shadow transition">
              {loading ? 'Đang khởi tạo...' : 'Đăng Ký'}
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
              Đơn đăng ký đã ghi nhận! Vui lòng chuyển khoản/thanh toán học phí bản quyền cho Admin theo thông tin liên hệ, sau đó bấm nút bên dưới để báo Admin kích hoạt tài khoản.
            </div>
            <button onClick={onSuccess} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow">
              ✅ Tôi Đã Thanh Toán — Quay Lại Đăng Nhập
            </button>
          </div>
        )}
        <button onClick={onCancel} className="w-full text-center text-slate-400 hover:underline block">Hủy bỏ</button>
      </div>
    </div>
  );
}

// ==================== 3. CỔNG THÔNG TIN DÀNH CHO HỌC SINH ====================
function StudentPortal({ student, sessionToken, onRefreshStudent }: { student: Student; sessionToken: string; onRefreshStudent: () => void }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [allFeePayments, setAllFeePayments] = useState<FeePayment[]>([]);
  const [feeExpenses, setFeeExpenses] = useState<FeeExpense[]>([]);
  const [groupScores, setGroupScores] = useState<GroupWeeklyScore[]>([]);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const [surveyData, setSurveyData] = useState({
    p_fullname: student.full_name || '',
    p_dob: student.dob || '',
    p_pob: '',
    p_address: '',
    p_phone: '',
    father_name: '',
    father_job: '',
    father_phone: '',
    mother_name: '',
    mother_job: '',
    mother_phone: '',
    primary_contact: 'Cha',
    living_with: 'Bố mẹ',
    policy_category: 'Không',
    target_block: 'A00',
    target_title: 'Học sinh Giỏi',
    target_weak_subject: 'Đạt trên 6.5',
    health_notes: 'Bình thường',
    priority_seating: 'Không',
    talents: '',
    certificates: '',
    past_roles: '',
    desired_role: 'Không',
    personality: '',
    hobbies: '',
    teacher_expectations: '',
    secret_message: ''
  });

  useEffect(() => {
    fetchStudentData();
  }, [student.id, sessionToken]);

  // LƯU Ý BẢO MẬT: toàn bộ dữ liệu bên dưới được đọc qua các hàm RPC
  // get_class_*/get_my_* (SECURITY DEFINER) thay vì đọc trực tiếp bảng.
  // Các hàm này tự tra đúng teacher_id của lớp học sinh này rồi mới trả
  // dữ liệu, nên học sinh lớp A không thể đọc được dữ liệu của lớp B dù
  // biết được URL API — xem chi tiết trong migration_4_bao_mat_toan_dien.sql.
  const fetchStudentData = async () => {
    const [annRes, feeRes, payRes, recRes, expRes, scoreRes] = await Promise.all([
      supabase.rpc('get_class_announcements', { p_session_token: sessionToken }).order('created_date', { ascending: false }).order('id', { ascending: false }),
      supabase.rpc('get_class_fee_items', { p_session_token: sessionToken }),
      supabase.rpc('get_class_fee_payments', { p_session_token: sessionToken }),
      supabase.rpc('get_my_student_records', { p_session_token: sessionToken }).order('week_number', { ascending: false }),
      supabase.rpc('get_class_fee_expenses', { p_session_token: sessionToken }).order('expense_date', { ascending: false }),
      supabase.rpc('get_class_group_weekly_scores', { p_session_token: sessionToken }).order('week_number', { ascending: true })
    ]);

    if (annRes.error) console.error('Lỗi tải thông báo:', annRes.error.message);
    if (feeRes.error) console.error('Lỗi tải khoản thu:', feeRes.error.message);
    if (payRes.error) console.error('Lỗi tải lượt nộp tiền:', payRes.error.message);
    if (recRes.error) console.error('Lỗi tải nhật ký rèn luyện:', recRes.error.message);
    if (expRes.error) console.error('Lỗi tải khoản chi:', expRes.error.message);
    if (scoreRes.error) console.error('Lỗi tải điểm thi đua Tổ:', scoreRes.error.message);

    if (annRes.data) setAnnouncements(annRes.data as Announcement[]);
    if (feeRes.data) setFeeItems(feeRes.data as FeeItem[]);
    if (recRes.data) setRecords(recRes.data as StudentRecord[]);
    if (expRes.data) setFeeExpenses(expRes.data as FeeExpense[]);
    if (scoreRes.data) setGroupScores(scoreRes.data as GroupWeeklyScore[]);

    // get_class_fee_payments trả về TOÀN BỘ lượt nộp tiền của cả lớp (để tính
    // Tổng Quỹ Đã Thu công khai) — tách riêng lượt của CHÍNH học sinh này
    // (feePayments, dùng để hiển thị "Đã nộp/Chưa nộp" ở bảng cá nhân) và
    // toàn bộ lượt đã nộp (allFeePayments, dùng để tính tổng quỹ cả lớp).
    const allPayments = (payRes.data || []) as FeePayment[];
    setFeePayments(allPayments.filter(p => p.student_id === student.id));
    setAllFeePayments(allPayments.filter(p => p.is_paid));
  };

  // Lớp trưởng có thể gửi lại báo cáo thi đua tuần nhiều lần (mỗi lần gửi tạo 1 dòng thông báo mới).
  // Học sinh chỉ cần xem bản MỚI NHẤT của mỗi tuần (đã bao gồm cả điểm tổ và Ghi chú Lớp trưởng mới nhất),
  // nên ở đây lọc bỏ các bản báo cáo cũ hơn của cùng 1 tuần thi đua, chỉ giữ lại 1 bản duy nhất/tuần.
  // Danh sách "announcements" đã được sắp xếp mới nhất lên đầu (order theo created_date rồi id, giảm dần),
  // nên chỉ cần giữ lần xuất hiện ĐẦU TIÊN của mỗi tuần và bỏ qua các lần xuất hiện sau.
  const getDisplayAnnouncements = (list: Announcement[]) => {
    const seenWeeks = new Set<string>();
    const result: Announcement[] = [];
    for (const a of list) {
      const weeklyReportMatch = a.title.match(/^\[THI ĐUA LỚP TUẦN (\d+)\]$/);
      if (weeklyReportMatch) {
        const weekKey = weeklyReportMatch[1];
        if (seenWeeks.has(weekKey)) {
          continue; // Đã có bản mới hơn của tuần này rồi, bỏ qua bản cũ
        }
        seenWeeks.add(weekKey);
      }
      result.push(a);
    }
    return result;
  };

  const handleSaveSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    // Dùng RPC student_submit_survey thay vì update trực tiếp bảng students
    // (học sinh không có quyền update trực tiếp sau khi khóa RLS).
    const { error } = await supabase.rpc('student_submit_survey', {
      p_session_token: sessionToken,
      p_survey_info: surveyData,
    });

    if (error) {
      alert('Lỗi lưu khảo sát: ' + error.message);
    } else {
      alert('Đã hoàn thành phiếu khảo sát đầu năm thành công!');
      onRefreshStudent();
    }
  };

  // Cho phép học sinh TỰ đổi mật khẩu đăng nhập của chính mình (bảo mật hơn khi không phải
  // nhờ Giáo viên cấp lại). Việc xác thực mật khẩu hiện tại giờ được thực hiện HOÀN TOÀN
  // trên server qua RPC student_change_password (đối chiếu bcrypt hash) — trình duyệt
  // không còn giữ/so sánh mật khẩu dạng chữ thường của học sinh nữa.
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pwForm.current.trim() || !pwForm.next.trim() || !pwForm.confirm.trim()) {
      alert('Vui lòng nhập đầy đủ Mật khẩu hiện tại, Mật khẩu mới và Nhập lại mật khẩu mới.');
      return;
    }
    if (pwForm.next.length < 4) {
      alert('Mật khẩu mới phải có ít nhất 4 ký tự.');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      alert('Mật khẩu mới và Nhập lại mật khẩu mới không khớp!');
      return;
    }
    if (pwForm.next === pwForm.current) {
      alert('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }

    setPwSaving(true);
    const { error } = await supabase.rpc('student_change_password', {
      p_session_token: sessionToken,
      p_current_password: pwForm.current,
      p_new_password: pwForm.next,
    });
    setPwSaving(false);

    if (error) {
      alert('Mật khẩu hiện tại không đúng hoặc có lỗi xảy ra: ' + error.message);
      return;
    }

    alert('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới cho lần đăng nhập sau.');
    setPwForm({ current: '', next: '', confirm: '' });
    setShowChangePassword(false);
    onRefreshStudent();
  };

  const totalDeduction = (records || []).filter(r => r.type === 'violation').reduce((sum, r) => sum + Number(r.points || 0), 0);
  const totalBonus = (records || []).filter(r => r.type === 'commendation').reduce((sum, r) => sum + Number(r.points || 0), 0);
  const currentTotalScore = 100 - totalDeduction + totalBonus;

  const totalCollected = feeItems.reduce((sum, item) => {
    const paidCount = allFeePayments.filter(p => p.fee_item_id === item.id).length;
    return sum + Number(item.amount) * paidCount;
  }, 0);
  const totalExpense = feeExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fundBalance = totalCollected - totalExpense;

  const weeksWithScores = [...new Set(groupScores.map(s => s.week_number))].sort((a, b) => a - b);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 text-xs font-sans">
      <div className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div>
          <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-md font-bold">{student.code}</span>
          <h1 className="text-xl font-bold mt-1 text-slate-800">{student.full_name} <span className="text-sm text-slate-500 font-normal">(Tổ {student.group_number || 1})</span></h1>
          <p className="text-slate-500 mt-1">Chức vụ trong lớp: <strong className="text-indigo-700">{student.class_role || 'Học sinh'}</strong></p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right border-r pr-4">
            <span className="text-2xl font-black text-indigo-600">{currentTotalScore}</span>
            <span className="text-[10px] block text-slate-400 font-bold uppercase">ĐIỂM RÈN LUYỆN</span>
          </div>
          <button onClick={() => setShowChangePassword(!showChangePassword)} className="bg-indigo-50 text-indigo-800 border border-indigo-300 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-indigo-100">
            <ShieldAlert className="w-4 h-4 text-indigo-600" /> {showChangePassword ? 'Đóng' : 'Đổi Mật Khẩu'}
          </button>
          <button onClick={() => setShowRules(!showRules)} className="bg-amber-50 text-amber-800 border border-amber-300 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-amber-100">
            <BookOpen className="w-4 h-4 text-amber-600" /> {showRules ? 'Ẩn Nội Quy' : 'Xem Nội Quy Thi Đua'}
          </button>
        </div>
      </div>

      {showChangePassword && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm border-b pb-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" /> ĐỔI MẬT KHẨU ĐĂNG NHẬP
          </div>
          <p className="text-slate-500 italic">Nên đổi sang mật khẩu riêng mà chỉ em nhớ được, để tài khoản của em được bảo mật hơn.</p>
          <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
            <div>
              <label className="font-semibold block mb-1">Mật khẩu hiện tại (*):</label>
              <input
                type="password" required placeholder="Mật khẩu đang dùng để đăng nhập"
                value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Mật khẩu mới (*):</label>
              <input
                type="password" required placeholder="Tối thiểu 4 ký tự"
                value={pwForm.next} onChange={e => setPwForm({ ...pwForm, next: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Nhập lại mật khẩu mới (*):</label>
              <input
                type="password" required placeholder="Nhập lại mật khẩu mới"
                value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
            </div>
            <button type="submit" disabled={pwSaving} className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition">
              {pwSaving ? 'Đang lưu...' : 'Xác Nhận Đổi Mật Khẩu'}
            </button>
          </form>
        </div>
      )}

      {showRules && (
        <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-5">
          <div className="border-b pb-3 text-center">
            <h2 className="text-base font-bold text-slate-900 uppercase">BẢNG QUY ĐỊNH VÀ BẢNG ĐIỂM RÈN LUYỆN CHI TIẾT (ÁP DỤNG THPT)</h2>
            <p className="text-slate-500 text-[11px] mt-1">Quỹ điểm ban đầu: <strong>100 điểm / 1 Học kỳ</strong>. Cách quản lý: Trừ điểm phát sinh theo từng tuần.</p>
          </div>

          <div className="space-y-4 text-slate-700 leading-relaxed">
            <h3 className="font-bold text-indigo-800 text-xs uppercase border-l-4 border-indigo-600 pl-2">I. Khung Xếp Loại Rèn Luyện Cuối Học Kỳ</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="bg-indigo-50 font-bold text-indigo-900">
                  <tr>
                    <th className="p-2 border">Mức Điểm Tổng Kết</th>
                    <th className="p-2 border">Xếp Loại Hạnh Kiểm</th>
                    <th className="p-2 border">Tác Động & Hướng Xử Lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="p-2 border font-bold">≥ 85 điểm</td><td className="p-2 border text-emerald-700 font-bold">TỐT</td><td className="p-2 border">Tuyên dương, đề xuất khen thưởng Học sinh Tốt/Xuất sắc cuối kỳ.</td></tr>
                  <tr><td className="p-2 border font-bold">60 – 84 điểm</td><td className="p-2 border text-blue-700 font-bold">KHÁ</td><td className="p-2 border">Đạt mức nếp sống văn minh; cần duy trì và phát huy.</td></tr>
                  <tr><td className="p-2 border font-bold">40 – 59 điểm</td><td className="p-2 border text-amber-700 font-bold">ĐẠT</td><td className="p-2 border">Đạt mức tối thiểu; GVCN nhắc nhở và gửi thông báo về gia đình.</td></tr>
                  <tr><td className="p-2 border font-bold">&lt; 40 điểm</td><td className="p-2 border text-rose-700 font-bold">CHƯA ĐẠT (YẾU)</td><td className="p-2 border">Tạm hoãn xét thi đua, mời phụ huynh họp trực tiếp và thực hiện Kế hoạch rèn luyện đặc biệt.</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-bold text-indigo-800 text-xs uppercase border-l-4 border-indigo-600 pl-2">II. Bảng Cộng Điểm (Chỉ Cộng Điểm 9 & 10)</h3>
            <p className="italic text-slate-500">* Lưu ý: Các bài kiểm tra/thi đạt điểm từ 8.0 trở xuống KHÔNG được áp dụng cộng điểm rèn luyện.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="bg-emerald-50 font-bold text-emerald-900">
                  <tr><th className="p-2 border">Lĩnh Vực</th><th className="p-2 border">Hành Vi / Thành Tích Được Cộng Điểm</th><th className="p-2 border text-center">Mức Điểm Cộng</th></tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="p-2 border font-semibold" rowSpan={2}>Kiểm tra / Thi</td><td className="p-2 border">Đạt điểm 10 trong bài kiểm tra (Miệng, 15 phút, Giữa kỳ, Cuối kỳ)</td><td className="p-2 border text-center font-bold text-emerald-700">+3 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Đạt điểm 9 trong bài kiểm tra (Miệng, 15 phút, Giữa kỳ, Cuối kỳ)</td><td className="p-2 border text-center font-bold text-emerald-700">+2 điểm / lần</td></tr>
                  <tr><td className="p-2 border font-semibold" rowSpan={2}>Thi Đấu / Phong Trào</td><td className="p-2 border">Đạt giải Học sinh giỏi / KHKT / Thể thao cấp Trường (hoặc tương đương)</td><td className="p-2 border text-center font-bold text-emerald-700">+5 điểm / giải</td></tr>
                  <tr><td className="p-2 border">Đạt giải Học sinh giỏi / KHKT cấp Tỉnh / Thành phố trở lên</td><td className="p-2 border text-center font-bold text-emerald-700">+10 điểm / giải</td></tr>
                  <tr><td className="p-2 border font-semibold" rowSpan={2}>Đóng Góp Tập Thể</td><td className="p-2 border">Ban cán sự lớp (Lớp trưởng, Lớp phó, Cờ đỏ) hoàn thành xuất sắc nhiệm vụ</td><td className="p-2 border text-center font-bold text-emerald-700">+5 điểm / HK</td></tr>
                  <tr><td className="p-2 border">Nhặt được của rơi trả lại người mất / Hành động dũng cảm giúp đỡ cộng đồng</td><td className="p-2 border text-center font-bold text-emerald-700">+5 điểm / lần</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-bold text-indigo-800 text-xs uppercase border-l-4 border-indigo-600 pl-2">III. Bảng Trừ Điểm Hàng Tuần (Theo Sổ Cờ Đỏ / Ban Cán Sự Lớp)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="bg-rose-50 font-bold text-rose-900">
                  <tr><th className="p-2 border">Lĩnh Vực Vi Phạm</th><th className="p-2 border">Hành Vi Vi Phạm Nội Quy</th><th className="p-2 border text-center">Mức Điểm Trừ</th></tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="p-2 border font-semibold" rowSpan={4}>Chuyên Cần & Giờ Giấc</td><td className="p-2 border">Đi học muộn (sau tiếng trống vào lớp / giờ truy bài)</td><td className="p-2 border text-center font-bold text-rose-700">-2 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Bỏ giờ truy bài 15 phút đầu giờ</td><td className="p-2 border text-center font-bold text-rose-700">-3 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Nghỉ học không lý do (nghỉ chui)</td><td className="p-2 border text-center font-bold text-rose-700">-10 điểm / buổi</td></tr>
                  <tr><td className="p-2 border">Trốn tiết / Trốn học giữa giờ</td><td className="p-2 border text-center font-bold text-rose-700">-15 điểm / lần</td></tr>
                  <tr><td className="p-2 border font-semibold" rowSpan={5}>Nề Nếp Học Tập</td><td className="p-2 border">Không làm bài tập về nhà / Không chuẩn bị bài theo yêu cầu GVBM</td><td className="p-2 border text-center font-bold text-rose-700">-3 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Không mang sách vở, dụng cụ học tập theo thời khóa biểu</td><td className="p-2 border text-center font-bold text-rose-700">-2 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Mất trật tự, làm việc riêng, ngủ gật trong giờ học</td><td className="p-2 border text-center font-bold text-rose-700">-2 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Sử dụng điện thoại di động khi chưa có sự cho phép của giáo viên</td><td className="p-2 border text-center font-bold text-rose-700">-5 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Gian lận trong kiểm tra, thi cử (quay cóp, sử dụng tài liệu)</td><td className="p-2 border text-center font-bold text-rose-700">-20 điểm / lần</td></tr>
                  <tr><td className="p-2 border font-semibold" rowSpan={4}>Trang Phục & Rèn Luyện</td><td className="p-2 border">Sai đồng phục, không đeo thẻ học sinh, đi dép lê không quai</td><td className="p-2 border text-center font-bold text-rose-700">-2 điểm / lỗi / buổi</td></tr>
                  <tr><td className="p-2 border">Nhuộm tóc màu sáng, nhuộm Highlight, nam để tóc quá dài</td><td className="p-2 border text-center font-bold text-rose-700">-5 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Trang điểm đậm, sơn móng tay/móng chân màu nổi bật</td><td className="p-2 border text-center font-bold text-rose-700">-3 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Hút thuốc lá, thuốc lá điện tử trong trường (hoặc vi phạm ATGT)</td><td className="p-2 border text-center font-bold text-rose-700">-20 điểm / lần</td></tr>
                  <tr><td className="p-2 border font-semibold" rowSpan={4}>Môi Trường & Văn Hóa</td><td className="p-2 border">Bỏ trực nhật / Trực nhật sơ sài, không đổ rác đúng quy định</td><td className="p-2 border text-center font-bold text-rose-700">-5 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Xả rác bừa bãi trong lớp hoặc khuôn viên trường</td><td className="p-2 border text-center font-bold text-rose-700">-3 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Nói tục, chửi thề, gây mất đoàn kết nội bộ lớp</td><td className="p-2 border text-center font-bold text-rose-700">-5 điểm / lần</td></tr>
                  <tr><td className="p-2 border">Mang đồ ăn, nước ngọt vào sử dụng trong giờ học</td><td className="p-2 border text-center font-bold text-rose-700">-2 điểm / lần</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-bold text-indigo-800 text-xs uppercase border-l-4 border-indigo-600 pl-2">IV. Công Thức Tính Điểm Tổng Kết</h3>
            <div className="bg-slate-100 p-3 rounded-xl font-mono text-center text-indigo-900 border font-bold">
              Điểm Tổng Kết HK = 100 − (Tổng Điểm Trừ Các Tuần) + (Tổng Điểm Cộng)
            </div>
          </div>
        </div>
      )}

      {!student.survey_completed && (
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-2xl border border-indigo-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm border-b pb-2">
            <FileText className="w-5 h-5 text-indigo-600" /> PHIẾU THÔNG TIN KHẢO SÁT ĐẦU NĂM HỌC
          </div>
          <p className="text-slate-600 leading-relaxed">
            Chào em! Để Giáo viên chủ nhiệm hiểu rõ hơn về hoàn cảnh, định hướng và nguyện vọng cá nhân nhằm hỗ trợ em tốt nhất trong năm học, hãy hoàn thành phiếu thông tin khảo sát dưới đây.
          </p>

          <form onSubmit={handleSaveSurvey} className="space-y-4 bg-white p-5 rounded-xl border shadow-sm">
            <div className="font-bold text-indigo-800 border-b pb-1">1. Thông tin cá nhân & Gia đình</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Nơi sinh (Tỉnh/Thành phố):</label>
                <input type="text" required placeholder="VD: Quảng Ngãi" value={surveyData.p_pob} onChange={e => setSurveyData({ ...surveyData, p_pob: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Địa chỉ thường trú / tạm trú hiện tại:</label>
                <input type="text" required placeholder="Ghi rõ số nhà, đường, phường/xã..." value={surveyData.p_address} onChange={e => setSurveyData({ ...surveyData, p_address: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Họ tên Cha – Nghề nghiệp – SĐT/Zalo:</label>
                <input type="text" required placeholder="VD: Nguyễn Văn B - Làm nông - 09123..." value={surveyData.father_name} onChange={e => setSurveyData({ ...surveyData, father_name: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Họ tên Mẹ – Nghề nghiệp – SĐT/Zalo:</label>
                <input type="text" required placeholder="VD: Trần Thị C - Nội trợ - 09876..." value={surveyData.mother_name} onChange={e => setSurveyData({ ...surveyData, mother_name: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Người liên lạc chính khi có việc gấp:</label>
                <select value={surveyData.primary_contact} onChange={e => setSurveyData({ ...surveyData, primary_contact: e.target.value })} className="w-full p-2 border rounded-xl">
                  <option value="Cha">Cha (Bố)</option>
                  <option value="Mẹ">Mẹ</option>
                  <option value="Ông bà/Khác">Ông bà / Người giám hộ khác</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Học sinh đang sống cùng ai?</label>
                <input type="text" required placeholder="Bố mẹ, ông bà, người thân, ở trọ..." value={surveyData.living_with} onChange={e => setSurveyData({ ...surveyData, living_with: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
            </div>

            <div className="font-bold text-indigo-800 border-b pb-1 pt-2">2. Định hướng & Mục tiêu học tập</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold block mb-1">Tổ hợp xét tuyển đại học dự định:</label>
                <input type="text" required placeholder="VD: A00, A01, D01..." value={surveyData.target_block} onChange={e => setSurveyData({ ...surveyData, target_block: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Mục tiêu danh hiệu năm lớp 10:</label>
                <input type="text" required placeholder="Học sinh Giỏi / Xuất sắc" value={surveyData.target_title} onChange={e => setSurveyData({ ...surveyData, target_title: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Mục tiêu cụ thể môn học yếu nhất:</label>
                <input type="text" required placeholder="VD: Đạt trên 6.5 môn Tiếng Anh..." value={surveyData.target_weak_subject} onChange={e => setSurveyData({ ...surveyData, target_weak_subject: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
            </div>

            <div className="font-bold text-indigo-800 border-b pb-1 pt-2">3. Sức khỏe, Sở trường & Nguyện vọng Ban cán sự</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Tiền sử sức khỏe / Cần vị trí ưu tiên:</label>
                <input type="text" placeholder="VD: Cận thị nặng, cần ngồi bàn đầu..." value={surveyData.health_notes} onChange={e => setSurveyData({ ...surveyData, health_notes: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Năng khiếu / Chứng chỉ (IELTS, MOS...):</label>
                <input type="text" placeholder="Hát, đá bóng, vẽ, chứng chỉ IELTS..." value={surveyData.talents} onChange={e => setSurveyData({ ...surveyData, talents: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Chức vụ cán sự đã từng làm cấp 2:</label>
                <input type="text" placeholder="Lớp trưởng, Cờ đỏ, Tổ trưởng..." value={surveyData.past_roles} onChange={e => setSurveyData({ ...surveyData, past_roles: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Nguyện vọng ứng cử vào Ban cán sự lớp:</label>
                <input type="text" placeholder="Lớp phó học tập, Bí thư..." value={surveyData.desired_role} onChange={e => setSurveyData({ ...surveyData, desired_role: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
            </div>

            <div className="font-bold text-indigo-800 border-b pb-1 pt-2">4. Tính cách, Tâm tư & Thông điệp bí mật</div>
            <div className="space-y-2">
              <div>
                <label className="font-semibold block mb-1">Mong muốn đối với Giáo viên chủ nhiệm:</label>
                <textarea rows={2} placeholder="Em mong thầy/cô tâm lý, vui tính..." value={surveyData.teacher_expectations} onChange={e => setSurveyData({ ...surveyData, teacher_expectations: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Thông điệp bí mật (Chỉ thầy/cô biết để hỗ trợ em):</label>
                <textarea rows={2} placeholder="Những tâm sự thầm kín về hoàn cảnh hoặc bản thân..." value={surveyData.secret_message} onChange={e => setSurveyData({ ...surveyData, secret_message: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
            </div>

            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition">
              Nộp Phiếu Thông Tin Khảo Sát
            </button>
          </form>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
          <Award className="w-4.5 h-4.5 text-indigo-600" /> Nhật Ký Rèn Luyện / Điểm Thi Đua Cá Nhân
        </h2>
        {records.length === 0 ? (
          <p className="text-slate-400 italic">Chưa có ghi nhận vi phạm hoặc khen thưởng nào trong học kỳ.</p>
        ) : (
          <div className="space-y-2">
            {records.map((r: StudentRecord) => (
              <div key={r.id} className={`p-3 rounded-xl border flex justify-between items-center ${r.type === 'violation' ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-xs ${r.type === 'violation' ? 'text-rose-800' : 'text-emerald-800'}`}>
                      {r.type === 'violation' ? '⚠️ Vi Phạm' : '🌟 Khen Thưởng'} - Tuần {r.week_number}
                    </span>
                    {r.record_date && <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">📅 Ngày: {r.record_date}</span>}
                  </div>
                  <p className="text-slate-700 mt-1">{r.content}</p>
                </div>
                <span className={`font-black text-sm ${r.type === 'violation' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {r.type === 'violation' ? `-${r.points}` : `+${r.points}`}đ
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {weeksWithScores.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
            <Trophy className="w-4.5 h-4.5 text-amber-500" /> Thi Đua Các Tổ Theo Từng Tuần
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 font-bold border-b text-slate-700">
                <tr>
                  <th className="p-2 border-r text-center">Tuần</th>
                  <th className="p-2 border-r text-center">Tổ 1</th>
                  <th className="p-2 border-r text-center">Tổ 2</th>
                  <th className="p-2 border-r text-center">Tổ 3</th>
                  <th className="p-2 text-center">Tổ 4</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {weeksWithScores.map(week => (
                  <tr key={week} className={(student.group_number || 1) ? 'hover:bg-slate-50' : ''}>
                    <td className="p-2 border-r text-center font-bold">{week}</td>
                    {[1, 2, 3, 4].map(g => {
                      const row = groupScores.find(s => s.week_number === week && s.group_number === g);
                      const isMyGroup = (student.group_number || 1) === g;
                      return (
                        <td key={g} className={`p-2 border-r last:border-r-0 text-center font-bold ${isMyGroup ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}>
                          {row ? row.score : '—'}
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

      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
          <Wallet className="w-4.5 h-4.5 text-indigo-600" /> Các Khoản Thu & Quỹ Lớp
        </h2>
        {feeItems.length === 0 ? (
          <p className="text-slate-400 italic">Chưa có thông báo khoản thu nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 font-bold border-b text-slate-700">
                <tr>
                  <th className="p-3 border-r">Khoản Thu</th>
                  <th className="p-3 border-r text-right">Số Tiền</th>
                  <th className="p-3 border-r text-center">Hạn Hoàn Thành</th>
                  <th className="p-3 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {feeItems.map((item: FeeItem) => {
                  const pay = feePayments.find((p: FeePayment) => p.fee_item_id === item.id);
                  const isPaid = pay?.is_paid || false;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 border-r font-semibold text-slate-800">
                        {item.title}
                        {item.is_completed && (
                          <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold align-middle">✅ Đã Xong</span>
                        )}
                      </td>
                      <td className="p-3 border-r text-right font-bold text-indigo-700">{Number(item.amount).toLocaleString()} VNĐ</td>
                      <td className="p-3 border-r text-center text-slate-500 font-medium">{item.deadline || 'Không có'}</td>
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
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Tổng Đã Thu (Cả Lớp)</span>
            <span className="text-lg font-black text-emerald-700">{totalCollected.toLocaleString()} đ</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
            <span className="text-[10px] text-rose-700 font-bold uppercase block">Tổng Đã Chi</span>
            <span className="text-lg font-black text-rose-700">{totalExpense.toLocaleString()} đ</span>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
            <span className="text-[10px] text-indigo-700 font-bold uppercase block">Quỹ Lớp Còn Lại</span>
            <span className="text-lg font-black text-indigo-700">{fundBalance.toLocaleString()} đ</span>
          </div>
        </div>

        {feeExpenses.length > 0 && (
          <div className="pt-2">
            <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Receipt className="w-4 h-4 text-rose-600" /> Chi Tiết Các Khoản Đã Chi</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-rose-50 font-bold border-b text-rose-800">
                  <tr>
                    <th className="p-2 border-r">Ngày Chi</th>
                    <th className="p-2 border-r">Nội Dung Chi</th>
                    <th className="p-2 border-r text-right">Số Tiền</th>
                    <th className="p-2">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {feeExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="p-2 border-r font-mono text-slate-600">{e.expense_date}</td>
                      <td className="p-2 border-r font-semibold">{e.title}</td>
                      <td className="p-2 border-r text-right font-bold text-rose-700">{Number(e.amount).toLocaleString()} đ</td>
                      <td className="p-2 text-slate-500 italic">{e.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
          <Bell className="w-4.5 h-4.5 text-indigo-600" /> Thông Báo & Dặn Dò Từ Giáo Viên Chủ Nhiệm
        </h2>
        {(() => {
          const displayAnnouncements = getDisplayAnnouncements(announcements);
          return displayAnnouncements.length === 0 ? (
            <p className="text-slate-400 italic">Chưa có thông báo nào từ Giáo viên.</p>
          ) : (
            <div className="space-y-3">
              {displayAnnouncements.map((a: Announcement) => (
                <div key={a.id} className={`p-3.5 rounded-xl border ${a.important ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'} space-y-1`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                      {a.important && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />} {a.title}
                    </span>
                    <span className="text-[10px] text-slate-400">{a.created_date}</span>
                  </div>
                  <p className="text-slate-600 whitespace-pre-line leading-relaxed">{a.content}</p>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ==================== 4. CỔNG BÁO CÁO DÀNH CHO LỚP TRƯỞNG ====================
function ClassLeaderPortal({ student, sessionToken, onSwitchToStudentView }: { student: Student; sessionToken: string; onSwitchToStudentView: () => void }) {
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [recordDate, setRecordDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [recordType, setRecordType] = useState<'violation' | 'commendation'>('violation');
  const [content, setContent] = useState('');

  const [pointsStr, setPointsStr] = useState<string>('1');

  // Khi true: lớp trưởng chọn "Khác" và tự nhập nội dung + điểm.
  // Khi false: nội dung + điểm được lấy tự động từ COMPETITION_RULES theo lựa chọn dropdown.
  const [useCustomContent, setUseCustomContent] = useState(false);

  const [groupScores, setGroupScores] = useState({ group1: '100', group2: '100', group3: '100', group4: '100' });
  const [leaderNote, setLeaderNote] = useState('');
  const [scoreHistory, setScoreHistory] = useState<GroupWeeklyScore[]>([]);

  useEffect(() => {
    fetchClassData();
  }, [student.id, sessionToken]);

  // Đọc qua RPC get_class_students / get_class_group_weekly_scores thay vì
  // đọc trực tiếp bảng — đảm bảo Lớp trưởng chỉ thấy đúng dữ liệu lớp mình.
  const fetchClassData = async () => {
    const [stRes, gsRes] = await Promise.all([
      supabase.rpc('get_class_students', { p_session_token: sessionToken }).order('code', { ascending: true }),
      supabase.rpc('get_class_group_weekly_scores', { p_session_token: sessionToken }).order('week_number', { ascending: true }),
    ]);

    if (stRes.error) console.error('Lỗi tải danh sách lớp:', stRes.error.message);
    if (gsRes.error) console.error('Lỗi tải điểm thi đua Tổ:', gsRes.error.message);

    if (stRes.data) setClassStudents(stRes.data as Student[]);
    if (gsRes.data) setScoreHistory(gsRes.data as GroupWeeklyScore[]);
  };

  // Xử lý khi lớp trưởng chọn 1 nội dung trong dropdown quy định điểm
  const handleSelectRuleContent = (value: string) => {
    if (value === '__custom__') {
      setUseCustomContent(true);
      setContent('');
      setPointsStr('1');
      return;
    }
    const rule = COMPETITION_RULES.find(r => r.type === recordType && r.content === value);
    setUseCustomContent(false);
    setContent(value);
    setPointsStr(String(rule?.points ?? 1));
  };

  const handleAddIndividualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !content.trim()) {
      alert('Vui lòng chọn học sinh và nhập nội dung!');
      return;
    }
    const parsedPoints = parseInt(pointsStr, 10) || 1;

    // Gọi hàm _secure (dùng session token) thay vì hàm gốc leader_add_record
    // (hàm gốc vẫn tồn tại nhưng chỉ hàm _secure mới được phép gọi trực tiếp
    // từ client sau khi khóa lại ở Phần F của migration_5_session_token.sql).
    const { error } = await supabase.rpc('leader_add_record_secure', {
      p_session_token: sessionToken,
      p_target_student_id: selectedStudentId,
      p_week_number: weekNumber,
      p_record_date: recordDate,
      p_type: recordType,
      p_content: content.trim(),
      p_points: parsedPoints,
    });

    if (!error) {
      alert('Đã lưu điểm vi phạm/khen thưởng thành công cho học sinh!');
      setContent('');
      setPointsStr('1');
      setUseCustomContent(false);
    } else {
      alert('Lỗi khi lưu điểm: ' + error.message);
    }
  };

  const handleSubmitWeeklySummary = async (e: React.FormEvent) => {
    e.preventDefault();
    const g1 = parseInt(groupScores.group1, 10) || 0;
    const g2 = parseInt(groupScores.group2, 10) || 0;
    const g3 = parseInt(groupScores.group3, 10) || 0;
    const g4 = parseInt(groupScores.group4, 10) || 0;

    const title = `[THI ĐUA LỚP TUẦN ${weekNumber}]`;
    const summaryText = `📊 BÁO CÁO THI ĐUA TỔ TUẦN ${weekNumber}:\n- Tổ 1: ${g1}đ | Tổ 2: ${g2}đ\n- Tổ 3: ${g3}đ | Tổ 4: ${g4}đ\n\n📝 Ghi chú Lớp trưởng: ${leaderNote || 'Không có'}`;

    // Gọi hàm _secure (dùng session token) thay vì hàm gốc leader_submit_weekly_report.
    const { error } = await supabase.rpc('leader_submit_weekly_report_secure', {
      p_session_token: sessionToken,
      p_week_number: weekNumber,
      p_title: title,
      p_content: summaryText,
    });

    if (error) {
      alert('Lỗi nộp báo cáo: ' + error.message);
      return;
    }

    // Lưu điểm từng Tổ vào bảng có cấu trúc (group_weekly_scores) để GVCN và cả lớp
    // xem được dưới dạng bảng rõ ràng theo từng tuần, thay vì chỉ nằm trong văn bản thông báo.
    const { error: scoreErr } = await supabase.rpc('leader_submit_group_scores', {
      p_session_token: sessionToken,
      p_week_number: weekNumber,
      p_group1: g1,
      p_group2: g2,
      p_group3: g3,
      p_group4: g4,
      p_note: leaderNote || null,
    });

    if (scoreErr) {
      alert('Đã gửi thông báo nhưng lỗi khi lưu bảng điểm Tổ: ' + scoreErr.message);
    } else {
      alert('Đã gửi báo cáo thi đua tuần tới Giáo viên chủ nhiệm!');
    }
    setLeaderNote('');
    fetchClassData();
  };

  const weeksWithScores = [...new Set(scoreHistory.map(s => s.week_number))].sort((a, b) => a - b);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-xs font-sans">
      <div className="bg-indigo-800 text-white p-5 rounded-2xl shadow-lg flex justify-between items-center flex-wrap gap-3">
        <div>
          <span className="bg-indigo-600 border border-indigo-400 px-2.5 py-1 rounded text-[11px] font-bold uppercase">LỚP TRƯỞNG PORTAL</span>
          <h1 className="text-xl font-bold mt-1">Cổng Báo Cáo Thi Đua - Lớp Trưởng: {student.full_name}</h1>
        </div>
        <button onClick={onSwitchToStudentView} className="bg-white text-indigo-900 px-3.5 py-2 rounded-xl font-bold hover:bg-indigo-50 shadow transition">
          👁️ Xem Trang Cá Nhân Học Sinh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
            <PlusCircle className="w-4 h-4 text-indigo-600" /> Nhập Vi Phạm / Khen Thưởng Cá Nhân
          </h2>
          <form onSubmit={handleAddIndividualRecord} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Chọn Tuần Học (*):</label>
                <input type="number" min="1" max="52" value={weekNumber} onChange={e => setWeekNumber(Number(e.target.value))} className="w-full p-2 border rounded-xl font-bold" required />
              </div>
              <div>
                <label className="font-semibold block mb-1">Ngày Tháng Cụ Thể (*):</label>
                <input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} className="w-full p-2 border rounded-xl" required />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Chọn Học Sinh Trong Lớp (*):</label>
              <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full p-2 border rounded-xl text-xs" required>
                <option value="">-- Chọn Học Sinh --</option>
                {classStudents.map((s: Student) => (
                  <option key={s.id} value={s.id}>{s.full_name} (Tổ {s.group_number || 1}) - MSHS: {s.code}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Loại Ghi Nhận (*):</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setRecordType('violation'); setContent(''); setPointsStr('1'); setUseCustomContent(false); }}
                  className={`py-2 rounded-xl font-bold transition ${recordType === 'violation' ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 text-slate-600'}`}
                >⚠️ Vi Phạm</button>
                <button
                  type="button"
                  onClick={() => { setRecordType('commendation'); setContent(''); setPointsStr('1'); setUseCustomContent(false); }}
                  className={`py-2 rounded-xl font-bold transition ${recordType === 'commendation' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-600'}`}
                >🌟 Khen Thưởng</button>
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Chọn Nội Dung Theo Nội Quy Thi Đua (*):</label>
              <select
                value={useCustomContent ? '__custom__' : content}
                onChange={(e) => handleSelectRuleContent(e.target.value)}
                className="w-full p-2 border rounded-xl"
                required
              >
                <option value="">-- Chọn nội dung theo nội quy --</option>
                {COMPETITION_RULES.filter(r => r.type === recordType).map((r, idx) => (
                  <option key={idx} value={r.content}>
                    {r.content} ({r.type === 'violation' ? '-' : '+'}{r.points}đ)
                  </option>
                ))}
                <option value="__custom__">✏️ Khác (Tự nhập nội dung, tự nhập điểm)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1 italic">* Điểm sẽ tự động điền theo đúng Nội Quy Thi Đua của lớp khi chọn nội dung có sẵn.</p>
            </div>

            {useCustomContent && (
              <div>
                <label className="font-semibold block mb-1">Nội dung tự nhập:</label>
                <input
                  type="text"
                  placeholder="VD: Đi học muộn 10 phút, Đạt điểm 10 kiểm tra Miệng..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full p-2 border rounded-xl"
                  required
                />
              </div>
            )}

            <div>
              <label className="font-semibold block mb-1">Số điểm cộng / trừ (*):</label>
              <input
                type="text"
                inputMode="numeric"
                value={pointsStr}
                onChange={e => setPointsStr(e.target.value.replace(/[^0-9]/g, ''))}
                className={`w-full p-2 border rounded-xl font-bold text-indigo-700 ${!useCustomContent ? 'bg-slate-100' : ''}`}
                readOnly={!useCustomContent}
                required
              />
              {!useCustomContent && content && (
                <p className="text-[11px] text-slate-500 mt-1 italic">* Điểm tự động theo Nội Quy Thi Đua — chọn "Khác" ở trên nếu cần nhập tay.</p>
              )}
            </div>

            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition">
              Lưu Điểm Cho Học Sinh
            </button>
          </form>
        </div>

        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Báo Cáo Điểm Thi Đua Các Tổ Trong Tuần
          </h2>
          <form onSubmit={handleSubmitWeeklySummary} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Điểm Tổ 1:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={groupScores.group1}
                  onChange={e => setGroupScores({ ...groupScores, group1: e.target.value.replace(/[^0-9]/g, '') })}
                  className="w-full p-2 border rounded-xl font-bold text-center text-indigo-700"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Điểm Tổ 2:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={groupScores.group2}
                  onChange={e => setGroupScores({ ...groupScores, group2: e.target.value.replace(/[^0-9]/g, '') })}
                  className="w-full p-2 border rounded-xl font-bold text-center text-indigo-700"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Điểm Tổ 3:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={groupScores.group3}
                  onChange={e => setGroupScores({ ...groupScores, group3: e.target.value.replace(/[^0-9]/g, '') })}
                  className="w-full p-2 border rounded-xl font-bold text-center text-indigo-700"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Điểm Tổ 4:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={groupScores.group4}
                  onChange={e => setGroupScores({ ...groupScores, group4: e.target.value.replace(/[^0-9]/g, '') })}
                  className="w-full p-2 border rounded-xl font-bold text-center text-indigo-700"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Ghi chú nhận xét của Lớp trưởng gửi GVCN:</label>
              <textarea rows={3} placeholder="Nhận xét tình hình nề nếp chung của lớp trong tuần..." value={leaderNote} onChange={e => setLeaderNote(e.target.value)} className="w-full p-2 border rounded-xl" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow transition">
              Gửi Báo Cáo Thi Đua Lớp
            </button>
          </form>

          {weeksWithScores.length > 0 && (
            <div className="pt-3 border-t">
              <h3 className="font-bold text-slate-700 mb-2">Lịch Sử Điểm Thi Đua Các Tổ Đã Gửi</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 font-bold border-b text-slate-700">
                    <tr>
                      <th className="p-2 border-r text-center">Tuần</th>
                      <th className="p-2 border-r text-center">Tổ 1</th>
                      <th className="p-2 border-r text-center">Tổ 2</th>
                      <th className="p-2 border-r text-center">Tổ 3</th>
                      <th className="p-2 text-center">Tổ 4</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {weeksWithScores.map(week => (
                      <tr key={week} className="hover:bg-slate-50">
                        <td className="p-2 border-r text-center font-bold">{week}</td>
                        {[1, 2, 3, 4].map(g => {
                          const row = scoreHistory.find(s => s.week_number === week && s.group_number === g);
                          return <td key={g} className="p-2 border-r last:border-r-0 text-center font-bold text-indigo-700">{row ? row.score : '—'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 4b. CỔNG QUẢN LÝ QUỸ LỚP DÀNH CHO THỦ QUỸ ====================
function TreasurerPortal({ student, sessionToken, onSwitchToStudentView }: { student: Student; sessionToken: string; onSwitchToStudentView: () => void }) {
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [feeExpenses, setFeeExpenses] = useState<FeeExpense[]>([]);

  const [feeTitle, setFeeTitle] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDeadline, setFeeDeadline] = useState('');

  const [selectedFeeItemId, setSelectedFeeItemId] = useState('');

  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expNote, setExpNote] = useState('');

  useEffect(() => {
    fetchAll();
  }, [student.id, sessionToken]);

  // Đọc qua RPC get_class_* thay vì đọc trực tiếp bảng — đảm bảo Thủ quỹ
  // chỉ thấy đúng dữ liệu lớp mình.
  const fetchAll = async () => {
    const [stRes, feeRes, expRes] = await Promise.all([
      supabase.rpc('get_class_students', { p_session_token: sessionToken }).order('code', { ascending: true }),
      supabase.rpc('get_class_fee_items', { p_session_token: sessionToken }),
      supabase.rpc('get_class_fee_expenses', { p_session_token: sessionToken }).order('expense_date', { ascending: false }),
    ]);

    if (stRes.error) console.error('Lỗi tải danh sách lớp:', stRes.error.message);
    if (feeRes.error) console.error('Lỗi tải khoản thu:', feeRes.error.message);
    if (expRes.error) console.error('Lỗi tải khoản chi:', expRes.error.message);

    if (stRes.data) setClassStudents(stRes.data as Student[]);
    if (feeRes.data) {
      setFeeItems(feeRes.data as FeeItem[]);
      const { data: payData } = await supabase.rpc('get_class_fee_payments', { p_session_token: sessionToken });
      if (payData) setFeePayments(payData as FeePayment[]);
    }
    if (expRes.data) setFeeExpenses(expRes.data as FeeExpense[]);
  };

  const handleAddFeeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeTitle.trim() || !feeAmount) {
      alert('Vui lòng nhập đầy đủ Nội dung khoản thu và Số tiền!');
      return;
    }
    const { error } = await supabase.rpc('treasurer_add_fee_item', {
      p_session_token: sessionToken,
      p_title: feeTitle.trim(),
      p_amount: Number(feeAmount),
      p_deadline: feeDeadline || null,
    });
    if (error) {
      alert('Lỗi tạo khoản thu: ' + error.message);
      return;
    }
    setFeeTitle(''); setFeeAmount(''); setFeeDeadline('');
    fetchAll();
  };

  const handleTogglePayment = async (targetStudentId: string, feeItemId: string, currentStatus: boolean) => {
    const { error } = await supabase.rpc('treasurer_toggle_payment', {
      p_session_token: sessionToken,
      p_target_student_id: targetStudentId,
      p_fee_item_id: feeItemId,
      p_is_paid: !currentStatus,
    });
    if (error) {
      alert('Lỗi cập nhật trạng thái nộp tiền: ' + error.message);
      return;
    }
    fetchAll();
  };

  // Đánh dấu 1 khoản thu là "Đã Xong" (đã thu đủ / kết thúc đợt thu) hoặc mở lại "Đang thu"
  const handleToggleFeeCompleted = async (feeItemId: string, currentStatus: boolean) => {
    const { error } = await supabase.rpc('treasurer_toggle_fee_completed', {
      p_session_token: sessionToken,
      p_fee_item_id: feeItemId,
      p_is_completed: !currentStatus,
    });
    if (error) {
      alert('Lỗi cập nhật trạng thái khoản thu: ' + error.message);
      return;
    }
    fetchAll();
  };

  // Xóa hẳn 1 khoản thu (xóa luôn các lượt đã tick nộp tiền liên quan)
  const handleDeleteFeeItem = async (feeItemId: string) => {
    if (!confirm('Xóa khoản thu này? Toàn bộ trạng thái đã nộp/chưa nộp của khoản thu này cũng sẽ bị xóa.')) return;
    const { error } = await supabase.rpc('treasurer_delete_fee_item', {
      p_session_token: sessionToken,
      p_fee_item_id: feeItemId,
    });
    if (error) {
      alert('Lỗi xóa khoản thu: ' + error.message);
      return;
    }
    if (selectedFeeItemId === feeItemId) setSelectedFeeItemId('');
    fetchAll();
  };

  // Xóa hẳn 1 khoản chi
  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Xóa khoản chi này?')) return;
    const { error } = await supabase.rpc('treasurer_delete_expense', {
      p_session_token: sessionToken,
      p_expense_id: expenseId,
    });
    if (error) {
      alert('Lỗi xóa khoản chi: ' + error.message);
      return;
    }
    fetchAll();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount) {
      alert('Vui lòng nhập đầy đủ Nội dung chi và Số tiền!');
      return;
    }
    const { error } = await supabase.rpc('treasurer_add_expense', {
      p_session_token: sessionToken,
      p_title: expTitle.trim(),
      p_amount: Number(expAmount),
      p_expense_date: expDate,
      p_note: expNote.trim() || null,
    });
    if (error) {
      alert('Lỗi ghi nhận khoản chi: ' + error.message);
      return;
    }
    setExpTitle(''); setExpAmount(''); setExpNote('');
    fetchAll();
  };

  const totalCollected = feeItems.reduce((sum, item) => {
    const paidCount = feePayments.filter(p => p.fee_item_id === item.id && p.is_paid).length;
    return sum + Number(item.amount) * paidCount;
  }, 0);
  const totalExpense = feeExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fundBalance = totalCollected - totalExpense;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-xs font-sans">
      <div className="bg-emerald-700 text-white p-5 rounded-2xl shadow-lg flex justify-between items-center flex-wrap gap-3">
        <div>
          <span className="bg-emerald-600 border border-emerald-400 px-2.5 py-1 rounded text-[11px] font-bold uppercase">THỦ QUỸ PORTAL</span>
          <h1 className="text-xl font-bold mt-1">Cổng Quản Lý Quỹ Lớp - Thủ Quỹ: {student.full_name}</h1>
        </div>
        <button onClick={onSwitchToStudentView} className="bg-white text-emerald-900 px-3.5 py-2 rounded-xl font-bold hover:bg-emerald-50 shadow transition">
          👁️ Xem Trang Cá Nhân Học Sinh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <span className="text-[10px] text-emerald-700 font-bold uppercase block">Tổng Đã Thu</span>
          <span className="text-xl font-black text-emerald-700">{totalCollected.toLocaleString()} đ</span>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
          <span className="text-[10px] text-rose-700 font-bold uppercase block">Tổng Đã Chi</span>
          <span className="text-xl font-black text-rose-700">{totalExpense.toLocaleString()} đ</span>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
          <span className="text-[10px] text-indigo-700 font-bold uppercase block">Quỹ Lớp Còn Lại</span>
          <span className="text-xl font-black text-indigo-700">{fundBalance.toLocaleString()} đ</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
            <Coins className="w-4 h-4 text-emerald-600" /> Tạo Khoản Thu Mới
          </h2>
          <form onSubmit={handleAddFeeItem} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Nội dung khoản thu (*):</label>
              <input type="text" required placeholder="VD: Quỹ lớp học kỳ 1" value={feeTitle} onChange={e => setFeeTitle(e.target.value)} className="w-full p-2 border rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Số tiền / học sinh (*):</label>
                <input type="number" required placeholder="VD: 100000" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Hạn nộp:</label>
                <input type="date" value={feeDeadline} onChange={e => setFeeDeadline(e.target.value)} className="w-full p-2 border rounded-xl" />
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition">
              Tạo Khoản Thu
            </button>
          </form>

          <div className="pt-3 border-t space-y-2">
            <label className="font-semibold block">Danh sách khoản thu:</label>
            {feeItems.length === 0 ? (
              <p className="text-slate-400 italic">Chưa có khoản thu nào.</p>
            ) : (
              <div className="space-y-1.5">
                {feeItems.map(f => (
                  <div key={f.id} className={`flex items-center gap-2 p-2 rounded-xl border ${f.is_completed ? 'bg-slate-100 border-slate-200' : 'bg-white'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedFeeItemId(f.id)}
                      className={`flex-1 text-left ${selectedFeeItemId === f.id ? 'font-black text-emerald-700' : 'font-semibold text-slate-700'}`}
                    >
                      {f.title} <span className="text-slate-500 font-normal">({Number(f.amount).toLocaleString()} đ)</span>
                      {f.is_completed && <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">✅ Đã Xong</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFeeCompleted(f.id, !!f.is_completed)}
                      className={`text-[11px] px-2 py-1 rounded-lg font-bold ${f.is_completed ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}
                    >
                      {f.is_completed ? 'Mở Lại' : '✔ Đã Xong'}
                    </button>
                    <button type="button" onClick={() => handleDeleteFeeItem(f.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded">
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedFeeItemId && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-500 italic">Tick chọn học sinh đã nộp cho khoản thu: <strong>{feeItems.find(f => f.id === selectedFeeItemId)?.title}</strong></p>
              <div className="max-h-72 overflow-y-auto border rounded-xl divide-y">
                {classStudents.map(s => {
                  const pay = feePayments.find(p => p.student_id === s.id && p.fee_item_id === selectedFeeItemId);
                  const isPaid = pay?.is_paid || false;
                  return (
                    <label key={s.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 ${isPaid ? 'bg-emerald-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isPaid}
                        onChange={() => handleTogglePayment(s.id, selectedFeeItemId, isPaid)}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <span className="flex-1">
                        <span className="font-mono text-indigo-700 font-bold mr-1">{s.code}</span>
                        {s.full_name}
                      </span>
                      {isPaid ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Đã nộp</span>
                      ) : (
                        <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">Chưa nộp</span>
                      )}
                    </label>
                  );
                })}
                {classStudents.length === 0 && <p className="p-3 text-slate-400 italic">Lớp chưa có học sinh nào.</p>}
              </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
            <Receipt className="w-4 h-4 text-rose-600" /> Ghi Nhận Khoản Chi Ra
          </h2>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Nội dung chi (*):</label>
              <input type="text" required placeholder="VD: Mua hoa 20/11, in tài liệu..." value={expTitle} onChange={e => setExpTitle(e.target.value)} className="w-full p-2 border rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Số tiền (*):</label>
                <input type="number" required placeholder="VD: 200000" value={expAmount} onChange={e => setExpAmount(e.target.value)} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Ngày chi (*):</label>
                <input type="date" required value={expDate} onChange={e => setExpDate(e.target.value)} className="w-full p-2 border rounded-xl" />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Ghi chú:</label>
              <input type="text" placeholder="Ghi chú thêm (nếu có)" value={expNote} onChange={e => setExpNote(e.target.value)} className="w-full p-2 border rounded-xl" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow transition">
              Ghi Nhận Khoản Chi
            </button>
          </form>

          <div className="pt-3 border-t">
            <h3 className="font-bold text-slate-700 mb-2">Lịch Sử Các Khoản Đã Chi</h3>
            {feeExpenses.length === 0 ? (
              <p className="text-slate-400 italic">Chưa có khoản chi nào.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2">
                {feeExpenses.map(e => (
                  <div key={e.id} className="p-2.5 bg-rose-50/60 border border-rose-200 rounded-xl flex justify-between items-center gap-2">
                    <div className="flex-1">
                      <span className="font-bold text-slate-800">{e.title}</span>
                      <p className="text-[11px] text-slate-500">📅 {e.expense_date} {e.note ? `• ${e.note}` : ''}</p>
                    </div>
                    <span className="font-black text-rose-700 whitespace-nowrap">-{Number(e.amount).toLocaleString()} đ</span>
                    <button type="button" onClick={() => handleDeleteExpense(e.id)} className="p-1.5 text-rose-600 hover:bg-rose-100 rounded">
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 5. BẢNG ĐIỀU KHIỂN GIÁO VIÊN CHỦ NHIỆM ====================
function TeacherDashboard({ teacher }: { teacher: Teacher }) {
  const [activeTab, setActiveTab] = useState<'students' | 'fees' | 'announcements' | 'reports' | 'groups'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [feeExpenses, setFeeExpenses] = useState<FeeExpense[]>([]);
  const [groupWeeklyScores, setGroupWeeklyScores] = useState<GroupWeeklyScore[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ code: '', full_name: '', dob: '', class_role: 'Học sinh', group_number: 1, password: '' });
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedFeeForUnpaid, setSelectedFeeForUnpaid] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newStudentCode, setNewStudentCode] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentDob, setNewStudentDob] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentRole, setNewStudentRole] = useState('Học sinh');
  const [newStudentGroup, setNewStudentGroup] = useState(1);

  const [feeTitle, setFeeTitle] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDeadline, setFeeDeadline] = useState('');

  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expNote, setExpNote] = useState('');

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annImportant, setAnnImportant] = useState(false);

  useEffect(() => {
    fetchData();
  }, [teacher.id]);

  const fetchData = async () => {
    const [stRes, fRes, aRes, rRes, gsRes, expRes] = await Promise.all([
      supabase.from('students').select('*').eq('teacher_id', teacher.id).order('code', { ascending: true }),
      supabase.from('fee_items').select('*').eq('teacher_id', teacher.id),
      supabase.from('announcements').select('*').eq('teacher_id', teacher.id).order('created_date', { ascending: false }),
      supabase.from('student_records').select('*').eq('teacher_id', teacher.id).order('week_number', { ascending: false }),
      supabase.from('group_weekly_scores').select('*').eq('teacher_id', teacher.id).order('week_number', { ascending: true }),
      supabase.from('fee_expenses').select('*').eq('teacher_id', teacher.id).order('expense_date', { ascending: false }),
    ]);

    if (stRes.data) setStudents(stRes.data as Student[]);
    if (fRes.data) {
      setFeeItems(fRes.data as FeeItem[]);
      if (fRes.data.length > 0) {
        const { data: pData } = await supabase.from('fee_payments').select('*').in('fee_item_id', fRes.data.map((f: any) => f.id));
        if (pData) setFeePayments(pData as FeePayment[]);
      } else {
        setFeePayments([]);
      }
    }
    if (aRes.data) setAnnouncements(aRes.data as Announcement[]);
    if (rRes.data) setStudentRecords(rRes.data as StudentRecord[]);
    if (gsRes.data) setGroupWeeklyScores(gsRes.data as GroupWeeklyScore[]);
    if (expRes.data) setFeeExpenses(expRes.data as FeeExpense[]);
  };

  // Hàm thay đổi chức vụ trực tiếp cho học sinh
  const handleUpdateStudentRole = async (studentId: string, newRole: string) => {
    const { error } = await supabase
      .from('students')
      .update({ class_role: newRole })
      .eq('id', studentId);

    if (error) {
      alert('Lỗi cập nhật chức vụ: ' + error.message);
    } else {
      setStudents(prev =>
        prev.map(s => (s.id === studentId ? { ...s, class_role: newRole } : s))
      );
    }
  };

  // Hàm gán/đổi Tổ cho 1 học sinh (dùng trong tab Phân Chia Tổ & Ban Cán Sự).
  // Mỗi học sinh chỉ thuộc DUY NHẤT 1 Tổ tại một thời điểm — khi chuyển học sinh
  // sang Tổ mới, học sinh đó sẽ NGAY LẬP TỨC biến mất khỏi danh sách của Tổ cũ
  // (vì mỗi cột Tổ chỉ hiển thị đúng những học sinh có group_number = số Tổ đó).
  // Nếu học sinh đang là "Tổ trưởng" của Tổ cũ mà bị chuyển sang Tổ khác,
  // tự động thu hồi chức vụ Tổ trưởng (vì Tổ trưởng gắn liền với 1 Tổ cụ thể).
  const handleAssignGroup = async (studentId: string, groupNumber: number) => {
    const target = students.find(s => s.id === studentId);
    if (!target) return;
    const shouldResetRole = target.class_role === 'Tổ trưởng' && (target.group_number || 1) !== groupNumber;
    const updatePayload: any = { group_number: groupNumber };
    if (shouldResetRole) updatePayload.class_role = 'Học sinh';

    const { error } = await supabase.from('students').update(updatePayload).eq('id', studentId);
    if (error) {
      alert('Lỗi cập nhật Tổ: ' + error.message);
      return;
    }
    setStudents(prev => prev.map(s => (
      s.id === studentId
        ? { ...s, group_number: groupNumber, ...(shouldResetRole ? { class_role: 'Học sinh' } : {}) }
        : s
    )));
  };

  // Hàm phân công 1 chức vụ Ban cán sự (Lớp trưởng, Bí thư, Thư ký, Thủ quỹ, Tổ trưởng) cho 1 học sinh.
  // Tự động thu hồi chức vụ của người tiền nhiệm đang giữ chức vụ đó (trong phạm vi restrictGroup nếu có,
  // dùng cho Tổ trưởng vì mỗi Tổ chỉ có 1 Tổ trưởng riêng). Truyền studentId = '' để chỉ thu hồi (bỏ trống chức vụ).
  const handleAssignSpecialRole = async (role: string, studentId: string, restrictGroup?: number) => {
    const holders = students.filter(s =>
      s.class_role === role &&
      (restrictGroup ? (s.group_number || 1) === restrictGroup : true) &&
      s.id !== studentId
    );

    try {
      if (holders.length > 0) {
        const { error: resetErr } = await supabase
          .from('students')
          .update({ class_role: 'Học sinh' })
          .in('id', holders.map(h => h.id));
        if (resetErr) throw resetErr;
      }
      if (studentId) {
        const { error: setErr } = await supabase
          .from('students')
          .update({ class_role: role })
          .eq('id', studentId);
        if (setErr) throw setErr;
      }
      setStudents(prev => prev.map(s => {
        if (holders.some(h => h.id === s.id)) return { ...s, class_role: 'Học sinh' };
        if (studentId && s.id === studentId) return { ...s, class_role: role };
        return s;
      }));
    } catch (err: any) {
      alert('Lỗi cập nhật chức vụ: ' + err.message);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('students').insert([
      {
        teacher_id: teacher.id,
        code: newStudentCode.trim().toUpperCase(),
        full_name: newStudentName,
        password: newStudentPassword.trim(),
        dob: newStudentDob,
        class_role: newStudentRole,
        group_number: newStudentGroup
      }
    ]);

    if (error) alert('Lỗi thêm học sinh: ' + error.message);
    else {
      setNewStudentCode(''); setNewStudentName(''); setNewStudentDob(''); setNewStudentPassword('');
      fetchData();
    }
  };

  // Mở modal chỉnh sửa thông tin học sinh (dùng khi GV nhập sai Họ tên, Ngày sinh, MSHS...
  // hoặc cần cấp/đổi lại Mật khẩu đăng nhập cho học sinh).
  const handleOpenEditStudent = (s: Student) => {
    setEditingStudent(s);
    setEditForm({
      code: s.code || '',
      full_name: s.full_name || '',
      dob: s.dob || '',
      class_role: s.class_role || 'Học sinh',
      group_number: s.group_number || 1,
      password: '', // Để trống = không đổi mật khẩu hiện tại, chỉ nhập khi muốn cấp lại mật khẩu mới
    });
  };

  const handleCloseEditStudent = () => {
    setEditingStudent(null);
  };

  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const updatePayload: any = {
      code: editForm.code.trim().toUpperCase(),
      full_name: editForm.full_name.trim(),
      dob: editForm.dob || null,
      class_role: editForm.class_role,
      group_number: editForm.group_number,
    };
    // Chỉ cập nhật mật khẩu nếu GV có nhập mật khẩu mới (để trống thì giữ nguyên mật khẩu cũ)
    if (editForm.password.trim()) {
      updatePayload.password = editForm.password.trim();
    }

    const { error } = await supabase.from('students').update(updatePayload).eq('id', editingStudent.id);
    if (error) {
      alert('Lỗi cập nhật thông tin học sinh: ' + error.message);
      return;
    }
    alert('Đã cập nhật thông tin học sinh thành công!');
    setEditingStudent(null);
    fetchData();
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const mappedRaw = rows.map((r) => {
        let dob = r['Ngày sinh'] || r['DOB'] || '';
        if (dob instanceof Date) dob = dob.toISOString().slice(0, 10);
        const code = String(r['MSHS'] || r['Mã số'] || '').trim().toUpperCase();
        // Nếu file Excel không có cột Mật khẩu (hoặc để trống), mặc định lấy MSHS làm mật khẩu ban đầu
        // — Giáo viên nên vào "Sửa" từng học sinh để đổi lại mật khẩu riêng cho bảo mật.
        const password = String(r['Mật khẩu'] || r['Password'] || code || '').trim();
        return {
          teacher_id: teacher.id,
          code,
          full_name: String(r['Họ và tên'] || r['Họ tên'] || '').trim(),
          password,
          dob: dob || null,
          class_role: String(r['Chức vụ'] || 'Học sinh').trim() || 'Học sinh',
          group_number: Number(r['Tổ'] || r['Nhóm'] || 1) || 1,
        };
      }).filter(r => r.code && r.full_name);

      if (mappedRaw.length === 0) {
        alert('Không đọc được dữ liệu. Kiểm tra file có đúng cột: MSHS, Họ và tên, Ngày sinh, Chức vụ, Tổ không.');
        setImporting(false);
        return;
      }

      // Loại bỏ các dòng bị trùng MSHS ngay trong file Excel (giữ lại dòng CUỐI CÙNG nếu trùng),
      // vì Supabase upsert sẽ báo lỗi nếu trong cùng 1 lần gọi có nhiều dòng cùng khóa xung đột (teacher_id, code).
      const dedupedMap = new Map<string, typeof mappedRaw[number]>();
      const duplicateCodes = new Set<string>();
      for (const row of mappedRaw) {
        if (dedupedMap.has(row.code)) duplicateCodes.add(row.code);
        dedupedMap.set(row.code, row);
      }
      const mapped = Array.from(dedupedMap.values());

      const { error } = await supabase.from('students').upsert(mapped, { onConflict: 'teacher_id,code' });

      if (error) {
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          alert(
            'Lỗi: MSHS bị trùng và không thể lưu vì ràng buộc "duy nhất" trong cơ sở dữ liệu hiện đang áp dụng trên TOÀN HỆ THỐNG (không chỉ riêng lớp của thầy/cô).\n\n' +
            'Vui lòng liên hệ Admin/lập trình viên để cập nhật lại ràng buộc unique của bảng "students" thành (teacher_id, code) thay vì chỉ (code).'
          );
        } else {
          alert('Lỗi khi nhập danh sách: ' + error.message);
        }
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      let msg = `Đã nhập thành công ${mapped.length} học sinh!`;
      if (duplicateCodes.size > 0) {
        msg += `\n\n⚠️ Lưu ý: Phát hiện ${duplicateCodes.size} MSHS bị trùng trong file (${Array.from(duplicateCodes).join(', ')}) — hệ thống chỉ giữ lại dòng CUỐI CÙNG của mỗi MSHS trùng, vui lòng kiểm tra lại file gốc nếu cần.`;
      }
      alert(msg);
      fetchData();
    } catch (err: any) {
      alert('Lỗi đọc file Excel: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const handleExportStudents = () => {
    // LƯU Ý: từ khi mật khẩu học sinh được mã hóa (bcrypt) trong cơ sở dữ liệu,
    // cột "password" chỉ còn là chuỗi hash — KHÔNG xuất ra Excel nữa (vô nghĩa
    // và không nên phát tán). Muốn cấp/đổi mật khẩu cho học sinh, dùng nút
    // "Sửa" ở bảng danh sách học sinh.
    const data = students.map(s => ({
      'MSHS': s.code,
      'Họ và tên': s.full_name,
      'Ngày sinh': s.dob || '',
      'Chức vụ': s.class_role || 'Học sinh',
      'Tổ': s.group_number || 1,
      'Đã khảo sát': s.survey_completed ? 'Có' : 'Chưa',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHS');
    XLSX.writeFile(wb, `DanhSachHocSinh.xlsx`);
  };

  const handleExportFees = () => {
    const data: any[] = [];
    students.forEach(s => {
      feeItems.forEach(f => {
        const pay = feePayments.find(p => p.student_id === s.id && p.fee_item_id === f.id);
        data.push({
          'MSHS': s.code,
          'Họ và tên': s.full_name,
          'Khoản thu': f.title,
          'Số tiền': f.amount,
          'Trạng thái': pay?.is_paid ? 'Đã nộp' : 'Chưa nộp',
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KhoanThu');
    XLSX.writeFile(wb, `KhoanThu.xlsx`);
  };

  const handleExportRecords = () => {
    const data = studentRecords.map(r => {
      const st = students.find(s => s.id === r.student_id);
      return {
        'Tuần': r.week_number,
        'Ngày vi phạm': r.record_date || '',
        'MSHS': st?.code || '',
        'Họ và tên': st?.full_name || '',
        'Tổ': st?.group_number || '',
        'Loại': r.type === 'violation' ? 'Vi phạm' : 'Khen thưởng',
        'Nội dung': r.content,
        'Điểm': r.points,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ViPham_KhenThuong');
    XLSX.writeFile(wb, `NhatKyRenLuyen.xlsx`);
  };

  const handleExportExpenses = () => {
    const data = feeExpenses.map(e => ({
      'Ngày chi': e.expense_date,
      'Nội dung chi': e.title,
      'Số tiền': e.amount,
      'Ghi chú': e.note || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ChiTieuQuyLop');
    XLSX.writeFile(wb, `ChiTieuQuyLop.xlsx`);
  };

  const handleToggleFeePayment = async (studentId: string, feeItemId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('fee_payments').upsert(
      { student_id: studentId, fee_item_id: feeItemId, is_paid: !currentStatus },
      { onConflict: 'student_id,fee_item_id' }
    );
    if (error) alert('Lỗi: ' + error.message);
    else fetchData();
  };

  const handleAddFeeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('fee_items').insert([
      { teacher_id: teacher.id, title: feeTitle, amount: Number(feeAmount), deadline: feeDeadline }
    ]);
    if (!error) {
      setFeeTitle(''); setFeeAmount(''); setFeeDeadline('');
      fetchData();
    } else {
      alert('Lỗi: ' + error.message);
    }
  };

  // Đánh dấu 1 khoản thu là "Đã Xong" (kết thúc đợt thu) hoặc mở lại "Đang thu"
  const handleToggleFeeCompleted = async (feeItemId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('fee_items').update({ is_completed: !currentStatus }).eq('id', feeItemId);
    if (error) alert('Lỗi cập nhật trạng thái khoản thu: ' + error.message);
    else fetchData();
  };

  // Xóa hẳn 1 khoản thu (xóa luôn các lượt đã tick nộp tiền liên quan)
  const handleDeleteFeeItem = async (feeItemId: string) => {
    if (!confirm('Xóa khoản thu này? Toàn bộ trạng thái đã nộp/chưa nộp của khoản thu này cũng sẽ bị xóa.')) return;
    const { error: payErr } = await supabase.from('fee_payments').delete().eq('fee_item_id', feeItemId);
    if (payErr) { alert('Lỗi xóa dữ liệu nộp tiền liên quan: ' + payErr.message); return; }
    const { error } = await supabase.from('fee_items').delete().eq('id', feeItemId);
    if (error) { alert('Lỗi xóa khoản thu: ' + error.message); return; }
    if (selectedFeeForUnpaid === feeItemId) setSelectedFeeForUnpaid('');
    fetchData();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount) {
      alert('Vui lòng nhập đầy đủ Nội dung chi và Số tiền!');
      return;
    }
    const { error } = await supabase.from('fee_expenses').insert([
      { teacher_id: teacher.id, title: expTitle.trim(), amount: Number(expAmount), expense_date: expDate, note: expNote.trim() || null }
    ]);
    if (!error) {
      setExpTitle(''); setExpAmount(''); setExpNote('');
      fetchData();
    } else {
      alert('Lỗi: ' + error.message);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Xóa khoản chi này?')) {
      await supabase.from('fee_expenses').delete().eq('id', id);
      fetchData();
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('announcements').insert([
      { teacher_id: teacher.id, title: annTitle, content: annContent, important: annImportant, created_date: new Date().toISOString().slice(0, 10) }
    ]);
    if (!error) {
      setAnnTitle(''); setAnnContent('');
      fetchData();
    } else {
      alert('Lỗi: ' + error.message);
    }
  };

  // Xóa 1 thông báo (bao gồm cả các báo cáo thi đua tuần do Lớp trưởng cũ đã gửi trước đây,
  // ví dụ "[THI ĐUA LỚP TUẦN 0]", "[THI ĐUA LỚP TUẦN 1]"...). Đây là nơi duy nhất GVCN có
  // quyền dọn dẹp thông báo cũ/sai — học sinh và Lớp trưởng không có quyền xóa thông báo.
  const handleDeleteAnnouncement = async (id: string) => {
    if (confirm('Xóa thông báo này? Học sinh sẽ không còn thấy thông báo/báo cáo thi đua này nữa.')) {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) alert('Lỗi khi xóa thông báo: ' + error.message);
      else fetchData();
    }
  };

  // Xóa HÀNG LOẠT các báo cáo thi đua tuần cũ (dạng tiêu đề "[THI ĐUA LỚP TUẦN N]") — hữu ích
  // khi GVCN đã đổi Lớp trưởng mới và muốn dọn sạch các báo cáo do Lớp trưởng cũ gửi trước đó.
  // Các thông báo thường (không theo mẫu báo cáo tuần) sẽ KHÔNG bị ảnh hưởng.
  const handleDeleteAllWeeklyReports = async () => {
    const weeklyReportIds = announcements
      .filter(a => /^\[THI ĐUA LỚP TUẦN \d+\]$/.test(a.title))
      .map(a => a.id);

    if (weeklyReportIds.length === 0) {
      alert('Không có báo cáo thi đua tuần nào để xóa.');
      return;
    }
    if (!confirm(`Xóa toàn bộ ${weeklyReportIds.length} báo cáo thi đua tuần cũ? Các thông báo khác sẽ được giữ nguyên.`)) return;

    const { error } = await supabase.from('announcements').delete().in('id', weeklyReportIds);
    if (error) alert('Lỗi khi xóa: ' + error.message);
    else fetchData();
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm('Xóa học sinh này khỏi danh sách lớp?')) {
      await supabase.from('students').delete().eq('id', id);
      fetchData();
    }
  };

  const totalCollectedAll = feeItems.reduce((sum, item) => {
    const paidCount = feePayments.filter(p => p.fee_item_id === item.id && p.is_paid).length;
    return sum + Number(item.amount) * paidCount;
  }, 0);
  const totalExpenseAll = feeExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fundBalanceAll = totalCollectedAll - totalExpenseAll;

  const weeksWithScores = [...new Set(groupWeeklyScores.map(s => s.week_number))].sort((a, b) => a - b);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs font-sans">
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bảng Quản Lý Lớp Chủ Nhiệm - {teacher.full_name}</h1>
          <p className="text-slate-500 mt-0.5">Trường: {teacher.school || 'THPT'} | Quản lý riêng danh sách học sinh</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveTab('students')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>👨‍🎓 Danh Sách Học Sinh</button>
          <button onClick={() => setActiveTab('groups')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'groups' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>🗂️ Phân Chia Tổ & Ban Cán Sự</button>
          <button onClick={() => setActiveTab('fees')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'fees' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>💰 Quản Lý Khoản Thu & Quỹ Lớp</button>
          <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>📊 Thi Đua & Báo Cáo</button>
          <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'announcements' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>📢 Thông Báo & Dặn Dò</button>
        </div>
      </div>

      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Nhập / Xuất Danh Sách Từ Excel</h2>
              <p className="text-slate-500 text-[11px] mt-1">File Excel cần có cột: MSHS, Họ và tên, Ngày sinh, Chức vụ, Tổ. Cột "Mật khẩu" không bắt buộc — nếu bỏ trống, hệ thống tự lấy MSHS làm mật khẩu ban đầu.</p>
            </div>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" id="excel-import" />
              <label htmlFor="excel-import" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold cursor-pointer shadow">
                {importing ? 'Đang nhập...' : '📤 Nhập Từ Excel'}
              </label>
              <button onClick={handleExportStudents} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold shadow">📥 Xuất Excel</button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h2 className="font-bold text-slate-800 text-sm mb-3">Thêm Học Sinh Mới Vào Lớp (Thủ công)</h2>
            <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-7 gap-3">
              <input type="text" required placeholder="MSHS (VD: HS001)" value={newStudentCode} onChange={e => setNewStudentCode(e.target.value)} className="p-2 border rounded-xl uppercase font-mono" />
              <input type="text" required placeholder="Họ và tên" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="p-2 border rounded-xl" />
              <input type="date" required value={newStudentDob} onChange={e => setNewStudentDob(e.target.value)} className="p-2 border rounded-xl" />
              <input type="text" required placeholder="Mật khẩu đăng nhập" value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)} className="p-2 border rounded-xl font-mono" />
              <select value={newStudentRole} onChange={e => setNewStudentRole(e.target.value)} className="p-2 border rounded-xl">
                {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
              <input type="number" min="1" max="4" value={newStudentGroup} onChange={e => setNewStudentGroup(Number(e.target.value))} className="p-2 border rounded-xl" placeholder="Tổ (1-4)" />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow">Thêm Học Sinh</button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 font-bold border-b text-slate-700 uppercase">
                <tr>
                  <th className="p-3 border-r">MSHS</th>
                  <th className="p-3 border-r">Họ và Tên</th>
                  <th className="p-3 border-r text-center">Ngày Sinh</th>
                  <th className="p-3 border-r text-center">Chức Vụ</th>
                  <th className="p-3 border-r text-center">Khảo Sát Đầu Năm</th>
                  <th className="p-3 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {students.map((s: Student) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 border-r font-mono font-bold text-indigo-700">{s.code}</td>
                    <td className="p-3 border-r font-bold">{s.full_name}</td>
                    <td className="p-3 border-r text-center">{s.dob || 'Chưa nhập'}</td>
                    {/* CHO PHÉP GIÁO VIÊN CHỌN ĐỔI CHỨC VỤ TRỰC TIẾP */}
                    <td className="p-3 border-r text-center">
                      <select
                        value={s.class_role || 'Học sinh'}
                        onChange={(e) => handleUpdateStudentRole(s.id, e.target.value)}
                        className="p-1.5 border border-purple-200 bg-purple-50 text-purple-800 font-bold rounded-xl text-xs focus:ring-2 focus:ring-purple-400 outline-none"
                      >
                        {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </td>
                    <td className="p-3 border-r text-center">
                      {s.survey_completed ? (
                        <button onClick={() => setSelectedStudentForModal(s)} className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold hover:bg-emerald-200">
                          ✓ Xem Thông Tin Điều Tra
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Chưa nộp</span>
                      )}
                    </td>
                    <td className="p-3 text-center space-x-1">
                      <button onClick={() => handleOpenEditStudent(s)} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold hover:bg-indigo-100">
                        ✏️ Sửa
                      </button>
                      <button onClick={() => handleDeleteStudent(s.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">📌 Phân Chia Học Sinh Theo Tổ (1 - 4)</h2>
              <p className="text-slate-500 text-[11px] mt-1">Mỗi học sinh chỉ thuộc 1 Tổ duy nhất. Dùng ô chọn "Chuyển sang Tổ..." ở mỗi học sinh để đổi Tổ — học sinh sẽ biến mất khỏi danh sách Tổ cũ và xuất hiện ngay trong danh sách Tổ mới.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(groupNum => {
                const groupMembers = students.filter(s => (s.group_number || 1) === groupNum);
                return (
                  <div key={groupNum} className="border rounded-2xl overflow-hidden">
                    <div className="bg-indigo-600 text-white font-bold px-3 py-2 flex justify-between items-center">
                      <span>Tổ {groupNum}</span>
                      <span className="bg-indigo-800/60 px-2 py-0.5 rounded-full text-[10px]">{groupMembers.length} HS</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y">
                      {groupMembers.map(s => (
                        <div key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                          <span className="flex-1">
                            <span className="font-mono text-indigo-700 font-bold mr-1">{s.code}</span>
                            {s.full_name}
                            {s.class_role === 'Tổ trưởng' && (
                              <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Tổ trưởng</span>
                            )}
                          </span>
                          <select
                            value={groupNum}
                            onChange={(e) => handleAssignGroup(s.id, Number(e.target.value))}
                            className="p-1 border rounded-lg text-[11px] bg-white"
                          >
                            {[1, 2, 3, 4].map(g => <option key={g} value={g}>Chuyển sang Tổ {g}</option>)}
                          </select>
                        </div>
                      ))}
                      {groupMembers.length === 0 && <p className="p-3 text-slate-400 italic">Chưa có học sinh nào trong Tổ này.</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">👥 Phân Công Ban Cán Sự Lớp</h2>
              <p className="text-slate-500 text-[11px] mt-1">Chọn học sinh đảm nhiệm từng chức vụ. Hệ thống tự động thu hồi chức vụ cũ của người tiền nhiệm (nếu có).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['Lớp trưởng', 'Bí thư', 'Thư ký', 'Thủ quỹ'].map(role => {
                const currentHolder = students.find(s => s.class_role === role);
                return (
                  <div key={role} className="p-3 border rounded-xl bg-slate-50 space-y-1.5">
                    <label className="font-bold text-slate-700 block">{role}:</label>
                    <select
                      value={currentHolder?.id || ''}
                      onChange={(e) => handleAssignSpecialRole(role, e.target.value)}
                      className="w-full p-2 border rounded-xl bg-white"
                    >
                      <option value="">-- Chưa phân công --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name} (MSHS: {s.code})</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-bold text-slate-700 mb-2">Tổ Trưởng Các Tổ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(groupNum => {
                  const groupStudents = students.filter(s => (s.group_number || 1) === groupNum);
                  const currentLeader = groupStudents.find(s => s.class_role === 'Tổ trưởng');
                  return (
                    <div key={groupNum} className="p-3 border rounded-xl bg-slate-50 space-y-1.5">
                      <label className="font-bold text-slate-700 block">Tổ trưởng Tổ {groupNum}:</label>
                      <select
                        value={currentLeader?.id || ''}
                        onChange={(e) => handleAssignSpecialRole('Tổ trưởng', e.target.value, groupNum)}
                        className="w-full p-2 border rounded-xl bg-white"
                      >
                        <option value="">-- Chưa phân công --</option>
                        {groupStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.full_name} (MSHS: {s.code})</option>
                        ))}
                      </select>
                      {groupStudents.length === 0 && <p className="text-[10px] text-slate-400 italic">Tổ chưa có học sinh nào.</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Tổng Đã Thu</span>
              <span className="text-xl font-black text-emerald-700">{totalCollectedAll.toLocaleString()} đ</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
              <span className="text-[10px] text-rose-700 font-bold uppercase block">Tổng Đã Chi</span>
              <span className="text-xl font-black text-rose-700">{totalExpenseAll.toLocaleString()} đ</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
              <span className="text-[10px] text-indigo-700 font-bold uppercase block">Quỹ Lớp Còn Lại</span>
              <span className="text-xl font-black text-indigo-700">{fundBalanceAll.toLocaleString()} đ</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h2 className="font-bold text-slate-800 text-sm mb-3">Tạo Khoản Thu / Quỹ Lớp Mới</h2>
            <form onSubmit={handleAddFeeItem} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input type="text" required placeholder="Tên khoản thu" value={feeTitle} onChange={e => setFeeTitle(e.target.value)} className="p-2 border rounded-xl" />
              <input type="number" required placeholder="Số tiền (VNĐ)" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} className="p-2 border rounded-xl" />
              <input type="date" value={feeDeadline} onChange={e => setFeeDeadline(e.target.value)} className="p-2 border rounded-xl" />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow">Tạo Khoản Thu</button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 font-bold border-b text-slate-700">
                <tr>
                  <th className="p-3 border-r">Tên Khoản Thu</th>
                  <th className="p-3 border-r text-right">Số Tiền</th>
                  <th className="p-3 border-r text-center">Hạn Hoàn Thành</th>
                  <th className="p-3 border-r text-center">Trạng Thái</th>
                  <th className="p-3 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {feeItems.map((f: FeeItem) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="p-3 border-r font-bold">{f.title}</td>
                    <td className="p-3 border-r text-right font-bold text-indigo-700">{Number(f.amount).toLocaleString()} VNĐ</td>
                    <td className="p-3 border-r text-center">{f.deadline || 'Không có'}</td>
                    <td className="p-3 border-r text-center">
                      {f.is_completed ? (
                        <span className="bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-bold">✅ Đã Xong</span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold">⏳ Đang Thu</span>
                      )}
                    </td>
                    <td className="p-3 text-center space-x-1">
                      <button
                        onClick={() => handleToggleFeeCompleted(f.id, !!f.is_completed)}
                        className={`px-2.5 py-1 rounded-lg font-bold ${f.is_completed ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}
                      >
                        {f.is_completed ? 'Mở Lại' : '✔ Đã Xong'}
                      </button>
                      <button onClick={() => handleDeleteFeeItem(f.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {feeItems.length === 0 && <p className="text-slate-400 italic p-3">Chưa có khoản thu nào.</p>}
          </div>

          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Receipt className="w-4 h-4 text-rose-600" /> Ghi Nhận Chi Tiêu Quỹ Lớp</h2>
              <button onClick={handleExportExpenses} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl font-bold">📥 Xuất Excel</button>
            </div>
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input type="text" required placeholder="Nội dung chi" value={expTitle} onChange={e => setExpTitle(e.target.value)} className="p-2 border rounded-xl md:col-span-2" />
              <input type="number" required placeholder="Số tiền (VNĐ)" value={expAmount} onChange={e => setExpAmount(e.target.value)} className="p-2 border rounded-xl" />
              <input type="date" required value={expDate} onChange={e => setExpDate(e.target.value)} className="p-2 border rounded-xl" />
              <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow">Ghi Nhận Chi</button>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-rose-50 font-bold border-b text-rose-800">
                  <tr>
                    <th className="p-2 border-r">Ngày Chi</th>
                    <th className="p-2 border-r">Nội Dung Chi</th>
                    <th className="p-2 border-r text-right">Số Tiền</th>
                    <th className="p-2 border-r">Ghi Chú</th>
                    <th className="p-2 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {feeExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="p-2 border-r font-mono text-slate-600">{e.expense_date}</td>
                      <td className="p-2 border-r font-semibold">{e.title}</td>
                      <td className="p-2 border-r text-right font-bold text-rose-700">{Number(e.amount).toLocaleString()} đ</td>
                      <td className="p-2 border-r text-slate-500 italic">{e.note || '—'}</td>
                      <td className="p-2 text-center">
                        <button onClick={() => handleDeleteExpense(e.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded">
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {feeExpenses.length === 0 && <p className="text-slate-400 italic p-3">Chưa có khoản chi nào.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="font-bold text-slate-800 text-sm">Nhật Ký Vi Phạm / Khen Thưởng Toàn Lớp (Lớp trưởng nộp)</h2>
              <div className="flex gap-2 items-center">
                <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="p-2 border rounded-xl">
                  <option value="all">Tất cả các tuần</option>
                  {[...new Set(studentRecords.map(r => r.week_number))].sort((a, b) => a - b).map(w => (
                    <option key={w} value={String(w)}>Tuần {w}</option>
                  ))}
                </select>
                <button onClick={handleExportRecords} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl font-bold">📥 Xuất Excel</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 font-bold border-b text-slate-700">
                  <tr>
                    <th className="p-2 border-r">Tuần</th>
                    <th className="p-2 border-r text-center">Ngày ghi nhận</th>
                    <th className="p-2 border-r">MSHS</th>
                    <th className="p-2 border-r">Họ Tên</th>
                    <th className="p-2 border-r text-center">Tổ</th>
                    <th className="p-2 border-r">Loại</th>
                    <th className="p-2 border-r">Nội dung vi phạm / khen thưởng</th>
                    <th className="p-2 text-center">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {studentRecords
                    .filter(r => selectedWeek === 'all' || String(r.week_number) === selectedWeek)
                    .map(r => {
                      const st = students.find(s => s.id === r.student_id);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-2 border-r text-center font-bold">{r.week_number}</td>
                          <td className="p-2 border-r text-center text-slate-600 font-mono">{r.record_date || 'N/A'}</td>
                          <td className="p-2 border-r font-mono">{st?.code}</td>
                          <td className="p-2 border-r font-semibold">{st?.full_name}</td>
                          <td className="p-2 border-r text-center">{st?.group_number || 1}</td>
                          <td className={`p-2 border-r font-bold ${r.type === 'violation' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {r.type === 'violation' ? 'Vi phạm' : 'Khen thưởng'}
                          </td>
                          <td className="p-2 border-r">{r.content}</td>
                          <td className={`p-2 text-center font-bold ${r.type === 'violation' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {r.type === 'violation' ? `-${r.points}` : `+${r.points}`}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {studentRecords.length === 0 && <p className="text-slate-400 italic p-3">Chưa có ghi nhận nào từ Lớp trưởng.</p>}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Bảng Thi Đua Các Tổ Theo Từng Tuần (Lớp trưởng báo cáo)</h2>
            {weeksWithScores.length === 0 ? (
              <p className="text-slate-400 italic">Chưa có báo cáo thi đua Tổ nào từ Lớp trưởng.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 font-bold border-b text-slate-700">
                    <tr>
                      <th className="p-2 border-r text-center">Tuần</th>
                      <th className="p-2 border-r text-center">Tổ 1</th>
                      <th className="p-2 border-r text-center">Tổ 2</th>
                      <th className="p-2 border-r text-center">Tổ 3</th>
                      <th className="p-2 text-center">Tổ 4</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {weeksWithScores.map(week => (
                      <tr key={week} className="hover:bg-slate-50">
                        <td className="p-2 border-r text-center font-bold">{week}</td>
                        {[1, 2, 3, 4].map(g => {
                          const row = groupWeeklyScores.find(s => s.week_number === week && s.group_number === g);
                          return <td key={g} className="p-2 border-r last:border-r-0 text-center font-bold text-indigo-700">{row ? row.score : '—'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
            <h2 className="font-bold text-slate-800 text-sm">Bảng Điểm Rèn Luyện Tổng Hợp (Bảng Kiểm Điểm)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 font-bold border-b text-slate-700">
                  <tr>
                    <th className="p-2 border-r">MSHS</th>
                    <th className="p-2 border-r">Họ Tên</th>
                    <th className="p-2 border-r text-center">Tổ</th>
                    <th className="p-2 border-r text-center">Tổng Trừ</th>
                    <th className="p-2 border-r text-center">Tổng Cộng</th>
                    <th className="p-2 text-center">Điểm Hiện Tại</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map(s => {
                    const recs = studentRecords.filter(r => r.student_id === s.id);
                    const ded = recs.filter(r => r.type === 'violation').reduce((sum, r) => sum + Number(r.points), 0);
                    const bonus = recs.filter(r => r.type === 'commendation').reduce((sum, r) => sum + Number(r.points), 0);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r font-mono">{s.code}</td>
                        <td className="p-2 border-r font-semibold">{s.full_name}</td>
                        <td className="p-2 border-r text-center">{s.group_number || 1}</td>
                        <td className="p-2 border-r text-center text-rose-600 font-bold">-{ded}</td>
                        <td className="p-2 border-r text-center text-emerald-600 font-bold">+{bonus}</td>
                        <td className="p-2 text-center font-black text-indigo-700">{100 - ded + bonus}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="font-bold text-slate-800 text-sm">Danh Sách Chưa Nộp Khoản Thu</h2>
              <div className="flex gap-2 items-center">
                <select value={selectedFeeForUnpaid} onChange={e => setSelectedFeeForUnpaid(e.target.value)} className="p-2 border rounded-xl">
                  <option value="">-- Chọn khoản thu --</option>
                  {feeItems.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
                <button onClick={handleExportFees} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl font-bold">📥 Xuất Excel Toàn Bộ</button>
              </div>
            </div>
            {selectedFeeForUnpaid ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-rose-50 font-bold border-b text-rose-800">
                    <tr>
                      <th className="p-2 border-r">MSHS</th>
                      <th className="p-2 border-r">Họ Tên</th>
                      <th className="p-2 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map(s => {
                      const pay = feePayments.find(p => p.student_id === s.id && p.fee_item_id === selectedFeeForUnpaid);
                      const isPaid = pay?.is_paid || false;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-2 border-r font-mono">{s.code}</td>
                          <td className="p-2 border-r font-semibold">{s.full_name}</td>
                          <td className="p-2 text-center">
                            <button onClick={() => handleToggleFeePayment(s.id, selectedFeeForUnpaid, isPaid)}
                              className={`px-3 py-1 rounded-full font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {isPaid ? '✓ Đã nộp (bấm để huỷ)' : '✗ Chưa nộp (bấm để đánh dấu)'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 italic">Chọn 1 khoản thu ở trên để xem và cập nhật trạng thái từng học sinh.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <div className="flex justify-between items-center flex-wrap gap-3 mb-3">
              <h2 className="font-bold text-slate-800 text-sm">Tạo Thông Báo Mới Gửi Lớp</h2>
              <button
                type="button"
                onClick={handleDeleteAllWeeklyReports}
                className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl font-bold hover:bg-rose-100 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa Tất Cả Báo Cáo Thi Đua Tuần Cũ
              </button>
            </div>
            <form onSubmit={handleAddAnnouncement} className="space-y-3">
              <input type="text" required placeholder="Tiêu đề thông báo..." value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="w-full p-2 border rounded-xl" />
              <textarea rows={3} required placeholder="Nội dung chi tiết..." value={annContent} onChange={e => setAnnContent(e.target.value)} className="w-full p-2 border rounded-xl" />
              <div className="flex items-center gap-2">
                <input type="checkbox" id="imp" checked={annImportant} onChange={e => setAnnImportant(e.target.checked)} />
                <label htmlFor="imp" className="font-bold text-amber-700">Đánh dấu thông báo quan trọng</label>
              </div>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl shadow">Đăng Thông Báo</button>
            </form>
          </div>

          <div className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-slate-400 italic p-3 bg-white rounded-2xl border">Chưa có thông báo nào.</p>
            ) : (
              announcements.map((a: Announcement) => (
                <div key={a.id} className="bg-white p-4 rounded-2xl border shadow-sm space-y-1">
                  <div className="flex justify-between items-center gap-3">
                    <span className="font-bold text-sm text-slate-800">{a.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400">{a.created_date}</span>
                      <button
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        title="Xóa thông báo này"
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-600 whitespace-pre-line">{a.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedStudentForModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-indigo-900">
                📄 PHIẾU THÔNG TIN ĐIỀU TRA HỌC SINH - {selectedStudentForModal.full_name} ({selectedStudentForModal.code})
              </h2>
              <button onClick={() => setSelectedStudentForModal(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            {selectedStudentForModal.survey_info ? (
              <div className="space-y-4 leading-relaxed text-slate-700">
                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <h3 className="font-bold text-indigo-800 uppercase">1. Thông tin học sinh & Gia đình</h3>
                  <p>• <strong>Nơi sinh:</strong> {selectedStudentForModal.survey_info.p_pob || 'Không rõ'}</p>
                  <p>• <strong>Địa chỉ hiện tại:</strong> {selectedStudentForModal.survey_info.p_address || 'Không rõ'}</p>
                  <p>• <strong>Thông tin Cha:</strong> {selectedStudentForModal.survey_info.father_name || 'Không rõ'}</p>
                  <p>• <strong>Thông tin Mẹ:</strong> {selectedStudentForModal.survey_info.mother_name || 'Không rõ'}</p>
                  <p>• <strong>Người liên lạc chính:</strong> {selectedStudentForModal.survey_info.primary_contact || 'Cha'}</p>
                  <p>• <strong>Đang sống cùng:</strong> {selectedStudentForModal.survey_info.living_with || 'Không rõ'}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <h3 className="font-bold text-indigo-800 uppercase">2. Định hướng & Mục tiêu</h3>
                  <p>• <strong>Khối thi dự định:</strong> {selectedStudentForModal.survey_info.target_block || 'A00'}</p>
                  <p>• <strong>Mục tiêu lớp 10:</strong> {selectedStudentForModal.survey_info.target_title || 'Học sinh Giỏi'}</p>
                  <p>• <strong>Mục tiêu môn yếu nhất:</strong> {selectedStudentForModal.survey_info.target_weak_subject || 'Đạt trên 6.5'}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <h3 className="font-bold text-indigo-800 uppercase">3. Sức khỏe, Kỹ năng & Cán sự</h3>
                  <p>• <strong>Sức khỏe / Ưu tiên chỗ ngồi:</strong> {selectedStudentForModal.survey_info.health_notes || 'Bình thường'}</p>
                  <p>• <strong>Năng khiếu / Chứng chỉ:</strong> {selectedStudentForModal.survey_info.talents || 'Không có'}</p>
                  <p>• <strong>Kinh nghiệm cán sự cấp 2:</strong> {selectedStudentForModal.survey_info.past_roles || 'Không có'}</p>
                  <p>• <strong>Nguyện vọng Ban cán sự:</strong> {selectedStudentForModal.survey_info.desired_role || 'Không'}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <h3 className="font-bold text-indigo-800 uppercase">4. Tâm tư, Nguyện vọng & Thông điệp bí mật</h3>
                  <p>• <strong>Mong muốn ở GVCN:</strong> {selectedStudentForModal.survey_info.teacher_expectations || 'Không có'}</p>
                  <p className="text-rose-700 bg-rose-50 p-2 rounded-lg font-medium">
                    🔒 <strong>Thông điệp bí mật:</strong> {selectedStudentForModal.survey_info.secret_message || 'Không có'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic">Học sinh chưa hoàn thành phiếu khảo sát.</p>
            )}
          </div>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-indigo-900">✏️ Sửa Thông Tin Học Sinh</h2>
              <button onClick={handleCloseEditStudent} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">MSHS (*):</label>
                  <input
                    type="text" required value={editForm.code}
                    onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                    className="w-full p-2 border rounded-xl uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Ngày sinh:</label>
                  <input
                    type="date" value={editForm.dob}
                    onChange={e => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Họ và tên (*):</label>
                <input
                  type="text" required value={editForm.full_name}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Chức vụ:</label>
                  <select
                    value={editForm.class_role}
                    onChange={e => setEditForm({ ...editForm, class_role: e.target.value })}
                    className="w-full p-2 border rounded-xl"
                  >
                    {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Tổ (1-4):</label>
                  <input
                    type="number" min="1" max="4" value={editForm.group_number}
                    onChange={e => setEditForm({ ...editForm, group_number: Number(e.target.value) })}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                <label className="font-bold text-amber-800 block">🔒 Cấp lại / Đổi Mật khẩu đăng nhập:</label>
                <input
                  type="text" placeholder="Để trống nếu không muốn đổi mật khẩu hiện tại"
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full p-2 border rounded-xl font-mono bg-white"
                />
                <p className="text-[11px] text-amber-700 italic">* Chỉ nhập khi cần cấp mật khẩu mới cho học sinh (VD: học sinh quên mật khẩu). Để trống sẽ giữ nguyên mật khẩu cũ.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={handleCloseEditStudent} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">
                  Hủy
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition">
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 6. BẢNG QUẢN TRỊ ADMIN ====================
function AdminDashboard({ teachers, onRefresh }: { teachers: Teacher[]; onRefresh: () => void }) {
  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('teachers').update({ is_approved: true }).eq('id', id);
    if (!error) { await onRefresh(); alert('Đã duyệt kích hoạt tài khoản!'); }
    else alert('Lỗi: ' + error.message);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Xóa hẳn hồ sơ giáo viên này khỏi hệ thống?')) {
      await supabase.from('teachers').delete().eq('id', id);
      await onRefresh();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-xs font-sans">
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quản Trị Hệ Thống SaaS (Admin)</h1>
          <p className="text-slate-500 mt-0.5">Duyệt giáo viên và quản lý đơn mua web.</p>
        </div>
        <button onClick={onRefresh} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1 shadow">
          <RefreshCw className="w-3.5 h-3.5" /> Làm Mới Danh Sách
        </button>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 font-bold border-b text-slate-700 uppercase">
            <tr>
              <th className="p-3 border-r">Giáo Viên & Trường</th>
              <th className="p-3 border-r">Email Gmail</th>
              <th className="p-3 border-r">SĐT</th>
              <th className="p-3 border-r text-center">Trạng Thái</th>
              <th className="p-3 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {teachers.map((t: Teacher) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="p-3 border-r font-bold">{t.full_name} ({t.school || 'THPT'})</td>
                <td className="p-3 border-r text-indigo-700 font-semibold">{t.email}</td>
                <td className="p-3 border-r font-bold text-rose-600">{t.phone}</td>
                <td className="p-3 border-r text-center">
                  {t.is_approved ? (
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">✓ Đã Kích Hoạt</span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold">⏳ Chờ Duyệt</span>
                  )}
                </td>
                <td className="p-3 text-center space-x-2">
                  {!t.is_approved && (
                    <button onClick={() => handleApprove(t.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold">Duyệt Đã Nộp Tiền</button>
                  )}
                  <button onClick={() => handleDelete(t.id)} className="p-1 text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 7. QUÊN MẬT KHẨU ====================
function ForgotPasswordScreen({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) {
      alert('Lỗi: ' + error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-xs">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 text-center">Khôi Phục Mật Khẩu</h2>

        {!sent ? (
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Nhập Email Gmail giáo viên đã đăng ký:</label>
              <input type="email" required placeholder="teacher@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow">
              {loading ? 'Đang gửi...' : 'Gửi Link Đặt Lại Mật Khẩu'}
            </button>
          </form>
        ) : (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium text-center">
            Đã gửi email chứa link đặt lại mật khẩu! Vui lòng kiểm tra hộp thư và bấm vào link để đặt mật khẩu mới.
          </div>
        )}

        <button onClick={onBackToLogin} className="w-full text-center text-slate-400 hover:underline block">Quay lại Đăng nhập</button>
      </div>
    </div>
  );
}

// ==================== 8. ĐẶT LẠI MẬT KHẨU MỚI ====================
function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    if (password !== confirm) { setError('Mật khẩu nhập lại không khớp.'); return; }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateErr) { setError('Lỗi: ' + updateErr.message); return; }

    alert('Đã đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
    await supabase.auth.signOut();
    onDone();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-xs">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 text-center">Đặt Mật Khẩu Mới</h2>
        {error && <p className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 font-medium">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="font-semibold block mb-1">Mật khẩu mới:</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2.5 border rounded-xl" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Nhập lại mật khẩu mới:</label>
            <input type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full p-2.5 border rounded-xl" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow">
            {loading ? 'Đang lưu...' : 'Xác Nhận Đổi Mật Khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}
