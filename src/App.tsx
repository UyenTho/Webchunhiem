import React, { useState, useEffect } from 'react';
import { 
  Users, Wallet, CheckCircle, XCircle, Plus, Trash2, Award, LogOut, LogIn, Key, ShieldAlert, Eye, Trophy, Send, Bell, Clock, AlertCircle, Mail, UserCheck, RefreshCw, QrCode, CreditCard
} from 'lucide-react';
import * as XLSX from 'xlsx';
import emailjs from '@emailjs/browser';
import { supabase } from './supabaseClient'; // Import kết nối Supabase từ file thầy vừa tạo

// ==================== CẤU HÌNH EMAILJS ====================
// Thay bằng thông tin thật thầy lấy từ trang EmailJS
const EMAILJS_SERVICE_ID = "service_abc123"; 
const EMAILJS_TEMPLATE_ID = "template_xyz890"; 
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY"; 

// ==================== THÔNG TIN NGÂN HÀNG ĐỂ GIÁO VIÊN CHUYỂN KHOẢN MUA WEB ====================
const BANK_INFO = {
  BANK_ID: "MB", // Tên ngân hàng: MB, VCB, ACB, VPB, ICB...
  ACCOUNT_NO: "0912345678", // Số tài khoản ngân hàng của thầy
  ACCOUNT_NAME: "NGUYEN VAN A", // Tên chủ tài khoản
  PRICE_PER_YEAR: 500000 // Giá bán bản quyền: 500.000đ / năm
};

export default function App() {
  const [currentView, setCurrentView] = useState<'login' | 'forgot_password' | 'register_payment' | 'admin' | 'teacher' | 'student_portal'>('login');
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<any | null>(null);
  const [loggedInStudent, setLoggedInStudent] = useState<any | null>(null);

  // Tải danh sách Giáo viên từ Supabase Database thực tế
  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: false });
    if (data) setTeachers(data);
  };

  const handleLogout = () => {
    setCurrentTeacher(null);
    setLoggedInStudent(null);
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      {/* HEADER THANH CÔNG CỤ TRÊN CÙNG */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white text-xs py-2 px-4 font-bold flex justify-between items-center shadow-md">
        <span className="flex items-center gap-1.5">
          ✨ Phần Mềm Quản Lý Lớp Chủ Nhiệm SaaS
        </span>
        <div className="flex items-center gap-2">
          {currentTeacher && <span className="bg-indigo-800 px-2.5 py-1 rounded-full text-[11px]">👤 {currentTeacher.full_name}</span>}
          {(currentTeacher || loggedInStudent || currentView === 'admin') && (
            <button onClick={handleLogout} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 transition shadow">
              <LogOut className="w-3.5 h-3.5" /> Đăng Xuất
            </button>
          )}
        </div>
      </div>

      {/* RENDER MÀN HÌNH THEO VAI TRÒ */}
      {currentView === 'login' && (
        <LoginScreen 
          teachers={teachers}
          onTeacherLogin={(teacher: any) => { setCurrentTeacher(teacher); setCurrentView('teacher'); }}
          onStudentLogin={(student: any) => { setLoggedInStudent(student); setCurrentView('student_portal'); }}
          onAdminLogin={() => setCurrentView('admin')}
          onForgotPassword={() => setCurrentView('forgot_password')}
          onRegister={() => setCurrentView('register_payment')}
        />
      )}

      {currentView === 'register_payment' && (
        <RegisterWithPaymentScreen 
          onSuccess={() => {
            fetchTeachers();
            setCurrentView('login');
          }}
          onCancel={() => setCurrentView('login')}
        />
      )}

      {currentView === 'forgot_password' && (
        <ForgotPasswordScreen 
          teachers={teachers}
          onBackToLogin={() => setCurrentView('login')}
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard 
          teachers={teachers}
          onRefresh={fetchTeachers}
        />
      )}

      {currentView === 'teacher' && currentTeacher && (
        <TeacherDashboard teacher={currentTeacher} />
      )}
    </div>
  );
}

// ==================== 1. MÀN HÌNH ĐĂNG NHẬP ====================
function LoginScreen({ teachers, onTeacherLogin, onStudentLogin, onAdminLogin, onForgotPassword, onRegister }: any) {
  const [role, setRole] = useState<'teacher' | 'student' | 'admin'>('teacher');
  const [email, setEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Đăng nhập Admin
    if (role === 'admin') {
      if (adminPassword === 'admin123') onAdminLogin();
      else setError('Mật khẩu Admin không đúng! (Mặc định: admin123)');
      return;
    }

    // Đăng nhập Giáo viên
    if (role === 'teacher') {
      const t = teachers.find((item: any) => item.email.toLowerCase() === email.trim().toLowerCase());
      if (!t) {
        setError('Email Gmail này chưa đăng ký mua bản quyền!');
        return;
      }
      if (!t.is_approved) {
        setError('Tài khoản của thầy/cô đang CHỜ ADMIN DUYỆT hoặc chưa thanh toán!');
        return;
      }
      onTeacherLogin(t);
      return;
    }

    // Đăng nhập Học sinh (Tra cứu trực tiếp Supabase DB)
    if (role === 'student') {
      const { data } = await supabase.from('students').select('*').eq('code', studentCode.trim().toUpperCase()).single();
      if (data) onStudentLogin(data);
      else setError('Mã số MSHS không tồn tại trên hệ thống!');
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
          <button type="button" onClick={() => setRole('teacher')} className={`py-2 rounded-lg ${role === 'teacher' ? 'bg-indigo-600 text-white shadow' : ''}`}>Giáo Viên</button>
          <button type="button" onClick={() => setRole('student')} className={`py-2 rounded-lg ${role === 'student' ? 'bg-indigo-600 text-white shadow' : ''}`}>Học Sinh</button>
          <button type="button" onClick={() => setRole('admin')} className={`py-2 rounded-lg ${role === 'admin' ? 'bg-purple-700 text-white shadow' : ''}`}>🛡️ Admin</button>
        </div>

        {error && <p className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          {role === 'teacher' && (
            <div>
              <label className="font-semibold block mb-1">Email Gmail giáo viên:</label>
              <input type="email" required placeholder="teacher@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
            </div>
          )}

          {role === 'student' && (
            <div>
              <label className="font-semibold block mb-1">Mã Số Học Sinh (MSHS):</label>
              <input type="text" required placeholder="VD: HS001" value={studentCode} onChange={e => setStudentCode(e.target.value)} className="w-full p-3 border rounded-xl text-sm uppercase" />
            </div>
          )}

          {role === 'admin' && (
            <div>
              <label className="font-semibold block mb-1">Mật khẩu Admin:</label>
              <input type="password" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
            </div>
          )}

          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow transition">
            Đăng Nhập
          </button>

          {role === 'teacher' && (
            <div className="flex justify-between text-xs pt-2">
              <button type="button" onClick={onForgotPassword} className="text-indigo-600 hover:underline">Quên mật khẩu?</button>
              <button type="button" onClick={onRegister} className="text-purple-700 font-bold hover:underline">Đăng ký mua bản quyền</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ==================== 2. MÀN HÌNH ĐĂNG KÝ VÀ TẠO MÃ QR THANH TOÁN ====================
function RegisterWithPaymentScreen({ onSuccess, onCancel }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tự động tạo link ảnh VietQR chuyển khoản chính xác nội dung
  const qrUrl = `https://img.vietqr.io/image/${BANK_INFO.BANK_ID}-${BANK_INFO.ACCOUNT_NO}-compact2.png?amount=${BANK_INFO.PRICE_PER_YEAR}&addInfo=MUA%20WEB%20${phone}&accountName=${encodeURIComponent(BANK_INFO.ACCOUNT_NAME)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Lưu vào bảng Teachers trên Supabase
    const { error } = await supabase.from('teachers').insert([
      {
        full_name: fullName,
        email: email.trim().toLowerCase(),
        phone: phone,
        school: school,
        is_approved: false // Mặc định chờ duyệt tiền
      }
    ]);

    setLoading(false);
    if (error) {
      alert('Email này đã từng đăng ký! Vui lòng liên hệ Admin để được kiểm tra.');
    } else {
      setIsSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 space-y-5 text-xs">
        <h2 className="text-xl font-bold text-slate-800 text-center">Đăng Ký & Thanh Toán Bản Quyền</h2>

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
              <label className="font-semibold block mb-1">Số điện thoại (*):</label>
              <input type="tel" required placeholder="0912345678" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Trường đang công tác:</label>
              <input type="text" placeholder="THPT Chuyên..." value={school} onChange={e => setSchool(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-sm shadow">
              {loading ? 'Đang tạo đơn...' : 'Tiếp Tục Thanh Toán QR'}
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
              Đơn đăng ký đã tạo! Vui lòng mở ứng dụng Ngân hàng quét mã QR dưới đây để hoàn tất thanh toán.
            </div>

            <div className="bg-slate-50 p-4 border rounded-2xl inline-block shadow-inner">
              <img src={qrUrl} alt="Mã QR Thanh Toán Ngân Hàng" className="w-64 h-64 mx-auto rounded-xl shadow" />
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

// ==================== 3. QUÊN MẬT KHẨU QUA EMAILJS ====================
function ForgotPasswordScreen({ teachers, onBackToLogin }: any) {
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtp, setUserOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t: any) => t.email.toLowerCase() === email.trim().toLowerCase());
    if (!teacher) {
      alert('Email Gmail này chưa đăng ký hệ thống!');
      return;
    }

    setLoading(true);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    // Gửi OTP bằng EmailJS
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_name: teacher.full_name,
      to_email: email,
      otp_code: otp
    }, EMAILJS_PUBLIC_KEY)
    .then(() => {
      setLoading(false);
      setOtpSent(true);
      alert('Mã OTP đã được gửi thành công về Gmail của thầy/cô!');
    })
    .catch(() => {
      setLoading(false);
      setOtpSent(true);
      alert(`⚠️ Mã OTP khôi phục của bạn là: ${otp}`);
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (userOtp.trim() === generatedOtp) {
      alert('Xác thực chính chủ thành công! Thầy/cô có thể đăng nhập ngay.');
      onBackToLogin();
    } else {
      alert('Mã OTP không đúng!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-4 text-xs">
        <h2 className="text-xl font-bold text-slate-800 text-center">Cấp Lại Quyền Đăng Nhập</h2>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Nhập Email Gmail đã đăng ký:</label>
              <input type="email" required placeholder="teacher@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow">
              {loading ? 'Đang gửi mã...' : 'Gửi Mã OTP Khôi Phục Qua Gmail'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Nhập Mã OTP (6 số) gửi về Gmail:</label>
              <input type="text" required placeholder="123456" value={userOtp} onChange={e => setUserOtp(e.target.value)} className="w-full p-2.5 border rounded-xl text-center text-lg font-bold tracking-widest" />
            </div>
            <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow">
              Xác Nhận OTP
            </button>
          </form>
        )}

        <button onClick={onBackToLogin} className="w-full text-center text-slate-400 hover:underline block">Quay lại Đăng nhập</button>
      </div>
    </div>
  );
}

// ==================== 4. BẢNG QUẢN TRỊ ADMIN (DUYỆT TIỀN THẦY CÔ) ====================
function AdminDashboard({ teachers, onRefresh }: any) {
  const handleApprove = async (id: string) => {
    await supabase.from('teachers').update({ is_approved: true }).eq('id', id);
    onRefresh();
    alert('Đã kích hoạt bản quyền thành công cho Giáo viên!');
  };

  const handleLock = async (id: string) => {
    await supabase.from('teachers').update({ is_approved: false }).eq('id', id);
    onRefresh();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-xs">
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bảng Quản Lý Đơn Đăng Ký Mua Web (Admin)</h1>
          <p className="text-slate-500 mt-0.5">Kiểm tra tài khoản ngân hàng và bấm "Duyệt" mở quyền cho giáo viên</p>
        </div>
        <span className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full font-bold">Tổng: {teachers.length} Giáo viên</span>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 font-bold border-b text-slate-700 uppercase">
            <tr>
              <th className="p-3 border-r">Giáo Viên</th>
              <th className="p-3 border-r">Email Gmail</th>
              <th className="p-3 border-r">SĐT / Nội Dung CK</th>
              <th className="p-3 border-r text-center">Trạng Thái Thống Kê</th>
              <th className="p-3 text-center">Thao Tác Duyệt</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {teachers.map((t: any) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="p-3 border-r font-bold">{t.full_name} ({t.school})</td>
                <td className="p-3 border-r text-indigo-700 font-semibold">{t.email}</td>
                <td className="p-3 border-r font-bold text-rose-600">{t.phone}</td>
                <td className="p-3 border-r text-center">
                  {t.is_approved ? (
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">✓ Đã Kích Hoạt</span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold">⏳ Chờ Chuyển Tiền</span>
                  )}
                </td>
                <td className="p-3 text-center space-x-2">
                  {!t.is_approved ? (
                    <button onClick={() => handleApprove(t.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg font-bold">Duyệt Đã Nộp Tiền</button>
                  ) : (
                    <button onClick={() => handleLock(t.id)} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg font-bold">Khóa Quyền</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 5. BẢNG ĐIỀU KHIỂN DÀNH CHO GIÁO VIÊN ====================
function TeacherDashboard({ teacher }: any) {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Xin chào {teacher.full_name} ({teacher.school})</h2>
        <p className="text-xs text-slate-500 mt-1">Bản quyền phần mềm quản lý lớp của thầy/cô đã được kích hoạt chính thức.</p>
      </div>
    </div>
  );
}
