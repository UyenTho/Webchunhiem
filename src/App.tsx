import React, { useState, useEffect } from 'react';
import { 
  Users, Wallet, CheckCircle, XCircle, Plus, Trash2, Award, LogOut, LogIn, Key, 
  ShieldAlert, Eye, Trophy, Send, Bell, Clock, AlertCircle, Mail, UserCheck, 
  RefreshCw, Check, BookOpen, HeartPulse, Sparkles, User, FileText, ChevronRight, HelpCircle
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { supabase } from './supabaseClient';

// ==================== CẤU HÌNH EMAILJS & BANK ====================
const EMAILJS_SERVICE_ID = "service_abc123"; 
const EMAILJS_TEMPLATE_ID = "template_xyz890"; 
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY"; 

const BANK_INFO = {
  BANK_ID: "MB",
  ACCOUNT_NO: "0912345678",
  ACCOUNT_NAME: "NGUYEN VAN A",
  PRICE_PER_YEAR: 500000
};

export default function App() {
  const [currentView, setCurrentView] = useState<'login' | 'forgot_password' | 'register_payment' | 'admin' | 'teacher' | 'student_portal' | 'class_leader_portal'>('login');
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<any | null>(null);
  const [loggedInStudent, setLoggedInStudent] = useState<any | null>(null);

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: false });
      if (!error && data) setTeachers(data);
    } catch (err) {
      console.error("Lỗi kết nối Supabase:", err);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleLogout = () => {
    setCurrentTeacher(null);
    setLoggedInStudent(null);
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      {/* HEADER TỔNG */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white text-xs py-2.5 px-4 font-bold flex justify-between items-center shadow-md">
        <span className="flex items-center gap-1.5">
          ✨ Phần Mềm Quản Lý Lớp Chủ Nhiệm SaaS - THPT
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
          onTeacherLogin={(teacher: any) => { setCurrentTeacher(teacher); setCurrentView('teacher'); }}
          onStudentLogin={(student: any) => { 
            setLoggedInStudent(student); 
            if (student.class_role === 'Lớp trưởng') {
              setCurrentView('class_leader_portal');
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
          onSuccess={async () => { await fetchTeachers(); setCurrentView('login'); }}
          onCancel={() => setCurrentView('login')}
        />
      )}

      {currentView === 'forgot_password' && (
        <ForgotPasswordScreen onBackToLogin={() => setCurrentView('login')} />
      )}

      {currentView === 'admin' && (
        <AdminDashboard teachers={teachers} onRefresh={fetchTeachers} />
      )}

      {currentView === 'teacher' && currentTeacher && (
        <TeacherDashboard teacher={currentTeacher} />
      )}

      {currentView === 'class_leader_portal' && loggedInStudent && (
        <ClassLeaderPortal student={loggedInStudent} onSwitchToStudentView={() => setCurrentView('student_portal')} />
      )}

      {currentView === 'student_portal' && loggedInStudent && (
        <StudentPortal student={loggedInStudent} onRefreshStudent={async () => {
          const { data } = await supabase.from('students').select('*').eq('id', loggedInStudent.id).single();
          if (data) setLoggedInStudent(data);
        }} />
      )}
    </div>
  );
}

// ==================== 1. MÀN HÌNH ĐĂNG NHẬP ====================
function LoginScreen({ onTeacherLogin, onStudentLogin, onAdminLogin, onForgotPassword, onRegister }: any) {
  const [role, setRole] = useState<'teacher' | 'student' | 'admin'>('teacher');
  const [email, setEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (role === 'admin') {
      setLoading(false);
      if (adminPassword === 'admin123') onAdminLogin();
      else setError('Mật khẩu Admin không đúng! (Mặc định: admin123)');
      return;
    }

    if (role === 'teacher') {
      const inputEmail = email.trim().toLowerCase();
      const { data, error: fetchErr } = await supabase.from('teachers').select('*').eq('email', inputEmail);
      setLoading(false);

      if (fetchErr || !data || data.length === 0) {
        setError('Email Gmail này CHƯA ĐĂNG KÝ mua bản quyền! Vui lòng nhấn Đăng ký.');
        return;
      }

      const t = data[0];
      if (!t.is_approved) {
        setError('Tài khoản của thầy/cô ĐANG CHỜ ADMIN DUYỆT / CHƯA CHUYỂN TIỀN.');
        return;
      }

      if (t.password && t.password !== teacherPassword) {
        setError('Mật khẩu giáo viên không chính xác!');
        return;
      }

      onTeacherLogin(t);
      return;
    }

    if (role === 'student') {
      const { data, error: stErr } = await supabase.from('students').select('*').eq('code', studentCode.trim().toUpperCase());
      setLoading(false);

      if (stErr || !data || data.length === 0) {
        setError('Mã số MSHS không tồn tại trên hệ thống!');
      } else {
        onStudentLogin(data[0]);
      }
    }
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
          <button type="button" onClick={() => { setRole('teacher'); setError(''); }} className={`py-2 rounded-lg transition ${role === 'teacher' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600'}`}>Giáo Viên</button>
          <button type="button" onClick={() => { setRole('student'); setError(''); }} className={`py-2 rounded-lg transition ${role === 'student' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600'}`}>Học Sinh</button>
          <button type="button" onClick={() => { setRole('admin'); setError(''); }} className={`py-2 rounded-lg transition ${role === 'admin' ? 'bg-purple-700 text-white shadow' : 'text-slate-600'}`}>🛡️ Admin</button>
        </div>

        {error && <p className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          {role === 'teacher' && (
            <>
              <div>
                <label className="font-semibold block mb-1">Email Gmail giáo viên:</label>
                <input type="email" required placeholder="teacher@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Mật khẩu:</label>
                <input type="password" required placeholder="••••••••" value={teacherPassword} onChange={e => setTeacherPassword(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
              </div>
            </>
          )}

          {role === 'student' && (
            <div>
              <label className="font-semibold block mb-1">Nhập Mã Số Học Sinh (MSHS):</label>
              <input type="text" required placeholder="VD: HS001" value={studentCode} onChange={e => setStudentCode(e.target.value)} className="w-full p-3 border rounded-xl text-sm uppercase font-mono" />
              <p className="text-[11px] text-indigo-600 mt-1.5 italic">* Lớp trưởng đăng nhập bằng MSHS sẽ được chuyển trực tiếp vào Cổng Báo Cáo.</p>
            </div>
          )}

          {role === 'admin' && (
            <div>
              <label className="font-semibold block mb-1">Mật khẩu Quản trị viên:</label>
              <input type="password" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
            </div>
          )}

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
      </div>
    </div>
  );
}

// ==================== 2. MÀN HÌNH ĐĂNG KÝ VÀ THANH TOÁN ====================
function RegisterWithPaymentScreen({ onSuccess, onCancel }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const qrUrl = `https://img.vietqr.io/image/${BANK_INFO.BANK_ID}-${BANK_INFO.ACCOUNT_NO}-compact2.png?amount=${BANK_INFO.PRICE_PER_YEAR}&addInfo=MUA%20WEB%20${phone}&accountName=${encodeURIComponent(BANK_INFO.ACCOUNT_NAME)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const inputEmail = email.trim().toLowerCase();

    const { data: existing } = await supabase.from('teachers').select('id').eq('email', inputEmail);
    if (existing && existing.length > 0) {
      setLoading(false);
      alert('Email Gmail này ĐÃ ĐƯỢC ĐĂNG KÝ! Vui lòng chờ Admin duyệt hoặc quét QR xem lại.');
      setIsSubmitted(true);
      return;
    }

    const { error } = await supabase.from('teachers').insert([
      { full_name: fullName, email: inputEmail, password: password, phone: phone, school: school, is_approved: false }
    ]);

    setLoading(false);
    if (error) alert('Lỗi đăng ký: ' + error.message);
    else setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-xs">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 space-y-5">
        <h2 className="text-xl font-bold text-slate-800 text-center">Đăng Ký & Thanh Toán Bản Quyền SaaS</h2>

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
              <label className="font-semibold block mb-1">Tạo mật khẩu (*):</label>
              <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Số điện thoại (*):</label>
              <input type="tel" required placeholder="0912345678" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Trường đang công tác:</label>
              <input type="text" placeholder="THPT Chuyên..." value={school} onChange={e => setSchool(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-sm shadow transition">
              {loading ? 'Đang khởi tạo...' : 'Tiếp Tục Thanh Toán QR'}
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
              Đơn đăng ký đã ghi nhận! Vui lòng chuyển khoản để Admin duyệt kích hoạt tài khoản.
            </div>
            <div className="bg-slate-50 p-4 border rounded-2xl inline-block shadow-inner">
              <img src={qrUrl} alt="Mã QR Thanh Toán" className="w-60 h-60 mx-auto rounded-xl shadow" />
              <div className="mt-3 text-[11px] text-slate-600 space-y-1">
                <p>Số tiền: <strong className="text-purple-700">{BANK_INFO.PRICE_PER_YEAR.toLocaleString()} VNĐ / năm</strong></p>
                <p>Nội dung chuyển khoản: <strong className="text-rose-600">MUA WEB {phone}</strong></p>
              </div>
            </div>
            <button onClick={onSuccess} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow">
              Tôi Đã Chuyển Khoản (Quay Lại Màn Hình Đăng Nhập)
            </button>
          </div>
        )}
        <button onClick={onCancel} className="w-full text-center text-slate-400 hover:underline block">Hủy bỏ</button>
      </div>
    </div>
  );
}

// ==================== 3. CỔNG THÔNG TIN DÀNH CHO HỌC SINH ====================
function StudentPortal({ student, onRefreshStudent }: any) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [feeItems, setFeeItems] = useState<any[]>([]);
  const [feePayments, setFeePayments] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [showRules, setShowRules] = useState(false);

  // Trạng thái Form Khảo sát đầu năm
  const [surveyData, setSurveyData] = useState({
    p_fullname: student.full_name || '',
    p_dob: student.dob || '',
    p_pob: '',
    p_address: '',
    p_phone: student.phone || '',
    father_name: '',
    father_job: '',
    father_phone: '',
    mother_name: '',
    mother_job: '',
    mother_phone: '',
    primary_contact: 'Bố',
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
  }, [student]);

  const fetchStudentData = async () => {
    if (!student.teacher_id) return;

    // Tải thông báo từ GVCN
    const { data: annData } = await supabase.from('announcements').select('*').eq('teacher_id', student.teacher_id).order('created_date', { ascending: false });
    if (annData) setAnnouncements(annData);

    // Tải khoản thu
    const { data: feeData } = await supabase.from('fee_items').select('*').eq('teacher_id', student.teacher_id);
    if (feeData) setFeeItems(feeData);

    // Tải trạng thái đóng tiền
    const { data: payData } = await supabase.from('fee_payments').select('*').eq('student_id', student.id);
    if (payData) setFeePayments(payData);

    // Tải vi phạm & khen thưởng cá nhân
    const { data: recData } = await supabase.from('student_records').select('*').eq('student_id', student.id).order('created_at', { ascending: false });
    if (recData) setRecords(recData);
  };

  const handleSaveSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('students').update({
      survey_completed: true,
      survey_info: surveyData
    }).eq('id', student.id);

    if (error) {
      alert('Lỗi lưu khảo sát: ' + error.message);
    } else {
      alert('Đã hoàn thành phiếu khảo sát đầu năm thành công!');
      onRefreshStudent();
    }
  };

  // Tính điểm thi đua
  const totalDeduction = records.filter(r => r.type === 'violation').reduce((sum, r) => sum + Number(r.points), 0);
  const totalBonus = records.filter(r => r.type === 'commendation').reduce((sum, r) => sum + Number(r.points), 0);
  const currentTotalScore = 100 - totalDeduction + totalBonus;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 text-xs font-sans">
      {/* THÔNG TIN TỔNG QUAN HỌC SINH */}
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
          <button onClick={() => setShowRules(!showRules)} className="bg-amber-50 text-amber-800 border border-amber-300 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-amber-100">
            <BookOpen className="w-4 h-4 text-amber-600" /> {showRules ? 'Ẩn Nội Quy' : 'Xem Nội Quy Thi Đua'}
          </button>
        </div>
      </div>

      {/* HIỂN THỊ MỤC NỘI QUY ĐIỂM THI ĐỦA (NẾU BẬT) */}
      {showRules && (
        <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-5 animate-fadeIn">
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
              $$\text{Điểm Tổng Kết HK} = 100 - (\text{Tổng Điểm Trừ Các Tuần}) + (\text{Tổng Điểm Cộng})$$
            </div>
          </div>
        </div>
      )}

      {/* MỤC 5: KHẢO SÁT ĐẦU NĂM HỌC (ẨN KHI ĐÃ NỘP) */}
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
              Nộp Phường Thông Tin Khảo Sát
            </button>
          </form>
        </div>
      )}

      {/* MỤC 1: ĐIỂM THI ĐỦA THEO TUẦN & TỔNG HỢP LỖI VI PHẠM / KHEN THƯỞNG */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
          <Award className="w-4.5 h-4.5 text-indigo-600" /> Nhật Ký Rèn Luyện / Điểm Thi Đua Cá Nhân
        </h2>
        {records.length === 0 ? (
          <p className="text-slate-400 italic">Chưa có ghi nhận vi phạm hoặc khen thưởng nào trong học kỳ.</p>
        ) : (
          <div className="space-y-2">
            {records.map((r: any) => (
              <div key={r.id} className={`p-3 rounded-xl border flex justify-between items-center ${r.type === 'violation' ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
                <div>
                  <span className={`font-bold text-xs ${r.type === 'violation' ? 'text-rose-800' : 'text-emerald-800'}`}>
                    {r.type === 'violation' ? '⚠️ Vi Phạm' : '🌟 Khen Thưởng'} - Tuần {r.week_number}
                  </span>
                  <p className="text-slate-700 mt-0.5">{r.content}</p>
                  <span className="text-[10px] text-slate-400">{r.created_at?.slice(0, 10)}</span>
                </div>
                <span className={`font-black text-sm ${r.type === 'violation' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {r.type === 'violation' ? `-${r.points}` : `+${r.points}`}đ
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MỤC 2: CÁC KHOẢN TIỀN CHƯA NỘP, ĐÃ NỘP, HẠN HOÀN THÀNH */}
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
                {feeItems.map((item: any) => {
                  const pay = feePayments.find((p: any) => p.fee_item_id === item.id);
                  const isPaid = pay?.is_paid || false;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 border-r font-semibold text-slate-800">{item.title}</td>
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
      </div>

      {/* MỤC 3: CÁC THÔNG BÁO TỪ GVCN */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
          <Bell className="w-4.5 h-4.5 text-indigo-600" /> Thông Báo & Dặn Dò Từ Giáo Viên Chủ Nhiệm
        </h2>
        {announcements.length === 0 ? (
          <p className="text-slate-400 italic">Chưa có thông báo nào từ Giáo viên.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: any) => (
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
        )}
      </div>
    </div>
  );
}

// ==================== 4. CỔNG BÁO CÁO DÀNH CHO LỚP TRƯỞNG ====================
function ClassLeaderPortal({ student, onSwitchToStudentView }: any) {
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [recordType, setRecordType] = useState<'violation' | 'commendation'>('violation');
  const [content, setContent] = useState('');
  const [points, setPoints] = useState(1);

  const [groupScores, setGroupScores] = useState({ group1: 100, group2: 100, group3: 100, group4: 100 });
  const [leaderNote, setLeaderNote] = useState('');

  useEffect(() => {
    fetchClassData();
  }, [student]);

  const fetchClassData = async () => {
    if (!student.teacher_id) return;
    const { data } = await supabase.from('students').select('*').eq('teacher_id', student.teacher_id);
    if (data) setClassStudents(data);
  };

  const handleAddIndividualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !content) return;

    const { error } = await supabase.from('student_records').insert([
      {
        student_id: selectedStudentId,
        teacher_id: student.teacher_id,
        week_number: weekNumber,
        type: recordType,
        content: content,
        points: points
      }
    ]);

    if (!error) {
      alert('Đã lưu điểm vi phạm/khen thưởng cho học sinh!');
      setContent('');
    } else {
      alert('Lỗi: ' + error.message);
    }
  };

  const handleSubmitWeeklySummary = async (e: React.FormEvent) => {
    e.preventDefault();
    const summaryText = `📊 BÁO CÁO THI ĐỦA TỔ TUẦN ${weekNumber}:\n- Tổ 1: ${groupScores.group1}đ | Tổ 2: ${groupScores.group2}đ\n- Tổ 3: ${groupScores.group3}đ | Tổ 4: ${groupScores.group4}đ\n\n📝 Ghi chú Lớp trưởng: ${leaderNote || 'Không có'}`;

    const { error } = await supabase.from('announcements').insert([
      {
        teacher_id: student.teacher_id,
        title: `[THI ĐỦA LỚP TUẦN ${weekNumber}]`,
        content: summaryText,
        important: true
      }
    ]);

    if (!error) {
      alert('Đã nộp báo cáo tổng hợp thi đua tuần cho Giáo viên chủ nhiệm!');
      setLeaderNote('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-xs font-sans">
      <div className="bg-indigo-800 text-white p-5 rounded-2xl shadow-lg flex justify-between items-center flex-wrap gap-3">
        <div>
          <span className="bg-indigo-600 border border-indigo-400 px-2.5 py-1 rounded text-[11px] font-bold uppercase">LỚP TRƯỞNG PORTAL</span>
          <h1 className="text-xl font-bold mt-1">Nộp Báo Cáo Thi Đua - {student.full_name}</h1>
        </div>
        <button onClick={onSwitchToStudentView} className="bg-white text-indigo-900 px-3.5 py-2 rounded-xl font-bold hover:bg-indigo-50 shadow transition">
          👁️ Xem Trang Cá Nhân Học Sinh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PHẦN NHẬP VI PHẠM / KHEN THƯỞNG CÁ NHÂN */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" /> 4. Báo Cáo Vi Phạm / Khen Thưởng Cá Nhân
          </h2>
          <form onSubmit={handleAddIndividualRecord} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Chọn Tuần Học:</label>
              <input type="number" min="1" max="52" value={weekNumber} onChange={e => setWeekNumber(Number(e.target.value))} className="w-full p-2 border rounded-xl" required />
            </div>
            <div>
              <label className="font-semibold block mb-1">Chọn Học Sinh Trong Lớp:</label>
              <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full p-2 border rounded-xl" required>
                <option value="">-- Chọn Học Sinh --</option>
                {classStudents.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.full_name} (Tổ {s.group_number || 1}) - {s.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Loại Ghi Nhận:</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setRecordType('violation')} className={`py-2 rounded-xl font-bold transition ${recordType === 'violation' ? 'bg-rose-600 text-white' : 'bg-slate-100'}`}>⚠️ Vi Phạm</button>
                <button type="button" onClick={() => setRecordType('commendation')} className={`py-2 rounded-xl font-bold transition ${recordType === 'commendation' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>🌟 Khen Thưởng</button>
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Nội dung vi phạm / thành tích:</label>
              <input type="text" placeholder="VD: Đi học muộn, Đạt điểm 10 kiểm tra..." value={content} onChange={e => setContent(e.target.value)} className="w-full p-2 border rounded-xl" required />
            </div>
            <div>
              <label className="font-semibold block mb-1">Số điểm biến động:</label>
              <input type="number" min="1" value={points} onChange={e => setPoints(Number(e.target.value))} className="w-full p-2 border rounded-xl" required />
            </div>
            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow">
              Lưu Điểm Cho Học Sinh
            </button>
          </form>
        </div>

        {/* PHẦN NHẬP ĐIỂM THI ĐỦA CÁC TỔ TRONG TUẦN */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Báo Cáo Điểm Thi Đua Các Tổ Trong Tuần
          </h2>
          <form onSubmit={handleSubmitWeeklySummary} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Điểm Tổ 1:</label>
                <input type="number" value={groupScores.group1} onChange={e => setGroupScores({ ...groupScores, group1: Number(e.target.value) })} className="w-full p-2 border rounded-xl font-bold text-center" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Điểm Tổ 2:</label>
                <input type="number" value={groupScores.group2} onChange={e => setGroupScores({ ...groupScores, group2: Number(e.target.value) })} className="w-full p-2 border rounded-xl font-bold text-center" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Điểm Tổ 3:</label>
                <input type="number" value={groupScores.group3} onChange={e => setGroupScores({ ...groupScores, group3: Number(e.target.value) })} className="w-full p-2 border rounded-xl font-bold text-center" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Điểm Tổ 4:</label>
                <input type="number" value={groupScores.group4} onChange={e => setGroupScores({ ...groupScores, group4: Number(e.target.value) })} className="w-full p-2 border rounded-xl font-bold text-center" />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Ghi chú nhận xét của Lớp trưởng:</label>
              <textarea rows={3} placeholder="Nhận xét tổng quan tình hình lớp tuần qua..." value={leaderNote} onChange={e => setLeaderNote(e.target.value)} className="w-full p-2 border rounded-xl" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow">
              Gửi Báo Cáo Thi Đua Lớp
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==================== 5. BẢNG ĐIỀU KHIỂN GIÁO VIÊN CHỦ NHIỆM ====================
function TeacherDashboard({ teacher }: any) {
  const [activeTab, setActiveTab] = useState<'students' | 'fees' | 'announcements'>('students');
  const [students, setStudents] = useState<any[]>([]);
  const [feeItems, setFeeItems] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<any | null>(null);

  // Form Thêm học sinh
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentDob, setNewStudentDob] = useState('');
  const [newStudentRole, setNewStudentRole] = useState('Học sinh');
  const [newStudentGroup, setNewStudentGroup] = useState(1);

  // Form Thêm Khoản thu
  const [feeTitle, setFeeTitle] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDeadline, setFeeDeadline] = useState('');

  // Form Thêm Thông báo
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annImportant, setAnnImportant] = useState(false);

  useEffect(() => {
    fetchData();
  }, [teacher]);

  const fetchData = async () => {
    // 1. Tải Học sinh của đúng giáo viên này
    const { data: stData } = await supabase.from('students').select('*').eq('teacher_id', teacher.id).order('code', { ascending: true });
    if (stData) setStudents(stData);

    // 2. Tải Khoản thu
    const { data: fData } = await supabase.from('fee_items').select('*').eq('teacher_id', teacher.id);
    if (fData) setFeeItems(fData);

    // 3. Tải Thông báo
    const { data: aData } = await supabase.from('announcements').select('*').eq('teacher_id', teacher.id).order('created_date', { ascending: false });
    if (aData) setAnnouncements(aData);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('students').insert([
      {
        teacher_id: teacher.id,
        code: newStudentCode.trim().toUpperCase(),
        full_name: newStudentName,
        dob: newStudentDob,
        class_role: newStudentRole,
        group_number: newStudentGroup
      }
    ]);

    if (error) alert('Lỗi thêm học sinh: ' + error.message);
    else {
      setNewStudentCode(''); setNewStudentName(''); setNewStudentDob('');
      fetchData();
    }
  };

  const handleAddFeeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('fee_items').insert([
      { teacher_id: teacher.id, title: feeTitle, amount: Number(feeAmount), deadline: feeDeadline }
    ]);
    if (!error) {
      setFeeTitle(''); setFeeAmount(''); setFeeDeadline('');
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
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm('Xóa học sinh này khỏi danh sách lớp?')) {
      await supabase.from('students').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs font-sans">
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bảng Quản Lý Lớp Chủ Nhiệm - {teacher.full_name}</h1>
          <p className="text-slate-500 mt-0.5">Trường: {teacher.school || 'THPT'} | Quản lý riêng danh sách học sinh</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('students')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>👨‍🎓 Danh Sách Học Sinh</button>
          <button onClick={() => setActiveTab('fees')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'fees' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>💰 Quản Lý Khoản Thu</button>
          <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'announcements' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>📢 Thông Báo & Dặn Dò</button>
        </div>
      </div>

      {/* TAB 1: DANH SÁCH HỌC SINH (HIỂN THỊ ĐẦY ĐỦ THÔNG TIN KHẢO SÁT, MSHS, NGÀY SINH) */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h2 className="font-bold text-slate-800 text-sm mb-3">Thêm Học Sinh Mới Vào Lớp</h2>
            <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <input type="text" required placeholder="MSHS (VD: HS001)" value={newStudentCode} onChange={e => setNewStudentCode(e.target.value)} className="p-2 border rounded-xl uppercase font-mono" />
              <input type="text" required placeholder="Họ và tên" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="p-2 border rounded-xl" />
              <input type="date" required value={newStudentDob} onChange={e => setNewStudentDob(e.target.value)} className="p-2 border rounded-xl" />
              <select value={newStudentRole} onChange={e => setNewStudentRole(e.target.value)} className="p-2 border rounded-xl">
                <option value="Học sinh">Học sinh</option>
                <option value="Lớp trưởng">Lớp trưởng</option>
                <option value="Lớp phó">Lớp phó</option>
                <option value="Tổ trưởng">Tổ trưởng</option>
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
                {students.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 border-r font-mono font-bold text-indigo-700">{s.code}</td>
                    <td className="p-3 border-r font-bold">{s.full_name}</td>
                    <td className="p-3 border-r text-center">{s.dob || 'Chưa nhập'}</td>
                    <td className="p-3 border-r text-center font-semibold text-purple-700">{s.class_role || 'Học sinh'}</td>
                    <td className="p-3 border-r text-center">
                      {s.survey_completed ? (
                        <button onClick={() => setSelectedStudentForModal(s)} className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold hover:bg-emerald-200">
                          ✓ Xem Thông Tin Điều Tra
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Chưa nộp</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleDeleteStudent(s.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
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

      {/* TAB 2: QUẢN LÝ KHOẢN THU */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h2 className="font-bold text-slate-800 text-sm mb-3">Tạo Khoản Thu / Quỹ Lớp Mới</h2>
            <form onSubmit={handleAddFeeItem} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input type="text" required placeholder="Tên khoản thu (VD: Quỹ lớp HK1)" value={feeTitle} onChange={e => setFeeTitle(e.target.value)} className="p-2 border rounded-xl" />
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
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {feeItems.map((f: any) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="p-3 border-r font-bold">{f.title}</td>
                    <td className="p-3 border-r text-right font-bold text-indigo-700">{Number(f.amount).toLocaleString()} VNĐ</td>
                    <td className="p-3 border-r text-center">{f.deadline || 'Không có'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: THÔNG BÁO & DẶN DÒ */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h2 className="font-bold text-slate-800 text-sm mb-3">Tạo Thông Báo Mới Gửi Lớp</h2>
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
            {announcements.map((a: any) => (
              <div key={a.id} className="bg-white p-4 rounded-2xl border shadow-sm space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-800">{a.title}</span>
                  <span className="text-[10px] text-slate-400">{a.created_date}</span>
                </div>
                <p className="text-slate-600 whitespace-pre-line">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL HIỂN THỊ ĐẦY ĐỦ BẢNG THÔNG TIN ĐIỀU TRA HỌC SINH */}
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
                  <p>• <strong>Nơi sinh:</strong> {selectedStudentForModal.survey_info.p_pob}</p>
                  <p>• <strong>Địa chỉ hiện tại:</strong> {selectedStudentForModal.survey_info.p_address}</p>
                  <p>• <strong>Thông tin Cha:</strong> {selectedStudentForModal.survey_info.father_name}</p>
                  <p>• <strong>Thông tin Mẹ:</strong> {selectedStudentForModal.survey_info.mother_name}</p>
                  <p>• <strong>Người liên lạc chính:</strong> {selectedStudentForModal.survey_info.primary_contact}</p>
                  <p>• <strong>Đang sống cùng:</strong> {selectedStudentForModal.survey_info.living_with}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <h3 className="font-bold text-indigo-800 uppercase">2. Định hướng & Mục tiêu</h3>
                  <p>• <strong>Khối thi dự định:</strong> {selectedStudentForModal.survey_info.target_block}</p>
                  <p>• <strong>Mục tiêu lớp 10:</strong> {selectedStudentForModal.survey_info.target_title}</p>
                  <p>• <strong>Mục tiêu môn yếu nhất:</strong> {selectedStudentForModal.survey_info.target_weak_subject}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <h3 className="font-bold text-indigo-800 uppercase">3. Sức khỏe, Kỹ năng & Cán sự</h3>
                  <p>• <strong>Sức khỏe / Ưu tiên chỗ ngồi:</strong> {selectedStudentForModal.survey_info.health_notes}</p>
                  <p>• <strong>Năng khiếu / Chứng chỉ:</strong> {selectedStudentForModal.survey_info.talents}</p>
                  <p>• <strong>Kinh nghiệm cán sự cấp 2:</strong> {selectedStudentForModal.survey_info.past_roles}</p>
                  <p>• <strong>Nguyện vọng Ban cán sự:</strong> {selectedStudentForModal.survey_info.desired_role}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <h3 className="font-bold text-indigo-800 uppercase">4. Tâm tư, Nguyện vọng & Thông điệp bí mật</h3>
                  <p>• <strong>Mong muốn ở GVCN:</strong> {selectedStudentForModal.survey_info.teacher_expectations}</p>
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
    </div>
  );
}

// ==================== 6. BẢNG QUẢN TRỊ ADMIN (DUYỆT & CẤP LẠI PASS) ====================
function AdminDashboard({ teachers, onRefresh }: any) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('teachers').update({ is_approved: true }).eq('id', id);
    if (!error) { await onRefresh(); alert('Đã duyệt kích hoạt tài khoản!'); }
  };

  const handleResetPassword = async (id: string) => {
    const newPass = prompt('Nhập mật khẩu mới cấp cho Giáo viên:');
    if (newPass) {
      const { error } = await supabase.from('teachers').update({ password: newPass }).eq('id', id);
      if (!error) alert('Đã đổi mật khẩu giáo viên thành công!');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Xóa hẳn đơn này khỏi hệ thống?')) {
      await supabase.from('teachers').delete().eq('id', id);
      await onRefresh();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-xs font-sans">
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quản Trị Hệ Thống SaaS (Admin)</h1>
          <p className="text-slate-500 mt-0.5">Duyệt giáo viên, cấp lại mật khẩu và quản lý đơn mua web</p>
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
              <th className="p-3 text-center">Thao Tác Duyệt & Mật Khẩu</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {teachers.map((t: any) => (
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
                  <button onClick={() => handleResetPassword(t.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg font-bold">Cấp Lại Pass</button>
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

// ==================== 7. CẤP LẠI MẬT KHẨU QUA EMAILJS ====================
function ForgotPasswordScreen({ onBackToLogin }: any) {
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtp, setUserOtp] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.from('teachers').select('*').eq('email', email.trim().toLowerCase());
    if (!data || data.length === 0) {
      alert('Email Gmail này chưa đăng ký hệ thống!');
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_name: data[0].full_name,
      to_email: email,
      otp_code: otp
    }, EMAILJS_PUBLIC_KEY)
    .then(() => {
      setOtpSent(true);
      alert('Mã OTP đã được gửi về Gmail!');
    })
    .catch(() => {
      setOtpSent(true);
      alert(`⚠️ Mã OTP khôi phục của bạn là: ${otp}`);
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (userOtp.trim() === generatedOtp) {
      alert('Xác thực OTP thành công! Vui lòng liên hệ Admin hoặc đăng nhập lại.');
      onBackToLogin();
    } else {
      alert('Mã OTP không đúng!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-xs">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 text-center">Cấp Lại Quyền Đăng Nhập Qua EmailJS</h2>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Nhập Email Gmail giáo viên:</label>
              <input type="email" required placeholder="teacher@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow">
              Gửi Mã OTP Khôi Phục Qua Gmail
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Nhập Mã OTP (6 số):</label>
              <input type="text" required placeholder="123456" value={userOtp} onChange={e => setUserOtp(e.target.value)} className="w-full p-2.5 border rounded-xl text-center text-lg font-bold font-mono" />
            </div>
            <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow">
              Xác Nhận Mã OTP
            </button>
          </form>
        )}

        <button onClick={onBackToLogin} className="w-full text-center text-slate-400 hover:underline block">Quay lại Đăng nhập</button>
      </div>
    </div>
  );
}
