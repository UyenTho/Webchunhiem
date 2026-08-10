import React, { useState, useEffect } from 'react';
import { 
  Users, Wallet, CheckCircle, XCircle, Plus, Trash2, Award, LogOut, LogIn, Key, ShieldAlert, Eye, Trophy, Send, Bell, Clock, AlertCircle, Mail, UserCheck, RefreshCw, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import emailjs from '@emailjs/browser';
import { supabase } from './supabaseClient';

// ==================== CẤU HÌNH EMAILJS ====================
const EMAILJS_SERVICE_ID = "service_abc123"; 
const EMAILJS_TEMPLATE_ID = "template_xyz890"; 
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY"; 

// ==================== THÔNG TIN NGÂN HÀNG CHUYỂN KHOẢN MUA WEB ====================
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

  // Tải danh sách Giáo viên từ Supabase
  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error("Lỗi lấy danh sách teachers:", error.message);
      } else if (data) {
        setTeachers(data);
      }
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
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white text-xs py-2 px-4 font-bold flex justify-between items-center shadow-md">
        <span className="flex items-center gap-1.5">
          ✨ Phần Mềm Quản Lý Lớp Chủ Nhiệm SaaS
        </span>
        <div className="flex items-center gap-2">
          {currentTeacher && <span className="bg-indigo-800 px-2.5 py-1 rounded-full text-[11px]">👤 GV: {currentTeacher.full_name}</span>}
          {loggedInStudent && <span className="bg-purple-800 px-2.5 py-1 rounded-full text-[11px]">🎓 {loggedInStudent.full_name} ({loggedInStudent.class_role})</span>}
          {(currentTeacher || loggedInStudent || currentView === 'admin') && (
            <button onClick={handleLogout} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 transition shadow">
              <LogOut className="w-3.5 h-3.5" /> Đăng Xuất
            </button>
          )}
        </div>
      </div>

      {/* ĐIỀU HƯỚNG MÀN HÌNH */}
      {currentView === 'login' && (
        <LoginScreen 
          teachers={teachers}
          onRefreshTeachers={fetchTeachers}
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
          onSuccess={async () => { 
            await fetchTeachers(); 
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
        <AdminDashboard teachers={teachers} onRefresh={fetchTeachers} />
      )}

      {currentView === 'teacher' && currentTeacher && (
        <TeacherDashboard teacher={currentTeacher} />
      )}

      {currentView === 'class_leader_portal' && loggedInStudent && (
        <ClassLeaderPortal student={loggedInStudent} onSwitchToStudentView={() => setCurrentView('student_portal')} />
      )}

      {currentView === 'student_portal' && loggedInStudent && (
        <StudentPortal student={loggedInStudent} />
      )}
    </div>
  );
}

// ==================== 1. MÀN HÌNH ĐĂNG NHẬP ====================
function LoginScreen({ teachers, onRefreshTeachers, onTeacherLogin, onStudentLogin, onAdminLogin, onForgotPassword, onRegister }: any) {
  const [role, setRole] = useState<'teacher' | 'student' | 'admin'>('teacher');
  const [email, setEmail] = useState('');
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
      // Truy vấn trực tiếp Supabase để đảm bảo dữ liệu mới nhất
      const inputEmail = email.trim().toLowerCase();
      const { data, error: fetchErr } = await supabase.from('teachers').select('*').eq('email', inputEmail);
      setLoading(false);

      if (fetchErr || !data || data.length === 0) {
        setError('Email Gmail này CHƯA ĐĂNG KÝ mua bản quyền! Vui lòng bấm Đăng ký bên dưới.');
        return;
      }

      const t = data[0];
      if (!t.is_approved) {
        setError('Tài khoản của thầy/cô đã đăng ký nhưng ĐANG CHỜ ADMIN DUYỆT / CHƯA CHUYỂN TIỀN.');
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
          <button type="button" onClick={() => { setRole('teacher'); setError(''); }} className={`py-2 rounded-lg ${role === 'teacher' ? 'bg-indigo-600 text-white shadow' : ''}`}>Giáo Viên</button>
          <button type="button" onClick={() => { setRole('student'); setError(''); }} className={`py-2 rounded-lg ${role === 'student' ? 'bg-indigo-600 text-white shadow' : ''}`}>Học Sinh / Lớp Trưởng</button>
          <button type="button" onClick={() => { setRole('admin'); setError(''); }} className={`py-2 rounded-lg ${role === 'admin' ? 'bg-purple-700 text-white shadow' : ''}`}>🛡️ Admin</button>
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
              <label className="font-semibold block mb-1">Nhập Mã Số Học Sinh (MSHS):</label>
              <input type="text" required placeholder="VD: HS001" value={studentCode} onChange={e => setStudentCode(e.target.value)} className="w-full p-3 border rounded-xl text-sm uppercase" />
              <p className="text-[11px] text-indigo-600 mt-1 italic">* Lớp trưởng đăng nhập bằng MSHS sẽ tự động vào Cổng Báo Cáo.</p>
            </div>
          )}

          {role === 'admin' && (
            <div>
              <label className="font-semibold block mb-1">Mật khẩu Admin:</label>
              <input type="password" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow">
            {loading ? 'Đang kiểm tra...' : 'Đăng Nhập'}
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

// ==================== 2. MÀN HÌNH ĐĂNG KÝ VÀ MÃ QR CHUYỂN KHOẢN ====================
function RegisterWithPaymentScreen({ onSuccess, onCancel }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const qrUrl = `https://img.vietqr.io/image/${BANK_INFO.BANK_ID}-${BANK_INFO.ACCOUNT_NO}-compact2.png?amount=${BANK_INFO.PRICE_PER_YEAR}&addInfo=MUA%20WEB%20${phone}&accountName=${encodeURIComponent(BANK_INFO.ACCOUNT_NAME)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const inputEmail = email.trim().toLowerCase();

    // 1. Kiểm tra xem Email đã tồn tại chưa
    const { data: existing } = await supabase.from('teachers').select('id').eq('email', inputEmail);
    
    if (existing && existing.length > 0) {
      setLoading(false);
      alert('Email Gmail này ĐÃ ĐƯỢC ĐĂNG KÝ từ trước! Nếu đã chuyển khoản, vui lòng chờ Admin duyệt hoặc báo Admin qua Zalo/SĐT.');
      setIsSubmitted(true); // Vẫn cho hiện mã QR để họ xem lại
      return;
    }

    // 2. Chèn đơn đăng ký mới
    const { error } = await supabase.from('teachers').insert([
      {
        full_name: fullName,
        email: inputEmail,
        phone: phone,
        school: school,
        is_approved: false
      }
    ]);

    setLoading(false);
    if (error) {
      alert('Lỗi đăng ký: ' + error.message);
    } else {
      setIsSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-xs">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 space-y-5">
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
              Đơn đăng ký đã lưu trên hệ thống! Vui lòng quét mã QR chuyển khoản để Admin duyệt mở tài khoản.
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

// ==================== 3. CỔNG THÔNG TIN DÀNH CHO HỌC SINH (ĐẦY ĐỦ CÁC MỤC) ====================
function StudentPortal({ student }: any) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [feeItems, setFeeItems] = useState<any[]>([]);
  const [feePayments, setFeePayments] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [commendations, setCommendations] = useState<any[]>([]);

  useEffect(() => {
    fetchStudentData();
  }, [student]);

  const fetchStudentData = async () => {
    if (!student.teacher_id) return;

    // 1. Tải thông báo từ GVCN
    const { data: annData } = await supabase.from('announcements').select('*').eq('teacher_id', student.teacher_id).order('created_date', { ascending: false });
    if (annData) setAnnouncements(annData);

    // 2. Tải khoản thu
    const { data: feeData } = await supabase.from('fee_items').select('*').eq('teacher_id', student.teacher_id);
    if (feeData) setFeeItems(feeData);

    // 3. Tải trạng thái nộp tiền của bản thân
    const { data: payData } = await supabase.from('fee_payments').select('*').eq('student_id', student.id);
    if (payData) setFeePayments(payData);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 text-xs font-sans">
      {/* THÔNG TIN HỌC SINH */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center">
        <div>
          <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-md font-bold">{student.code}</span>
          <h1 className="text-xl font-bold mt-2 text-slate-800">{student.full_name} <span className="text-sm text-slate-500 font-normal">(Tổ {student.group_number})</span></h1>
          <p className="text-slate-500 mt-1">Chức vụ trong lớp: <strong className="text-indigo-700">{student.class_role}</strong></p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-indigo-600">100</span>
          <span className="text-[10px] block text-slate-400">ĐIỂM THI ĐỦA GỐC</span>
        </div>
      </div>

      {/* MỤC 1: THÔNG BÁO TỪ GIÁO VIÊN CHỦ NHIỆM */}
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

      {/* MỤC 2: TÌNH HÌNH CÁC KHOẢN THU / HỌC PHÍ */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
          <Wallet className="w-4.5 h-4.5 text-indigo-600" /> Tình Hình Đóng Các Khoản Thu - Quỹ Lớp
        </h2>
        {feeItems.length === 0 ? (
          <p className="text-slate-400 italic">Chưa có thông báo khoản thu nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 font-bold border-b text-slate-700">
                <tr>
                  <th className="p-3 border-r">Tên Khoản Thu</th>
                  <th className="p-3 border-r text-right">Số Tiền</th>
                  <th className="p-3 border-r text-center">Hạn Nộp</th>
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
                      <td className="p-3 border-r text-center text-slate-500">{item.deadline || 'Không có'}</td>
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
    </div>
  );
}

// ==================== 4. BẢNG QUẢN TRỊ ADMIN (DUYỆT TÀI KHOẢN) ====================
function AdminDashboard({ teachers, onRefresh }: any) {
  const [loading, setLoading] = useState(false);

  const handleManualRefresh = async () => {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('teachers').update({ is_approved: true }).eq('id', id);
    if (error) alert('Lỗi: ' + error.message);
    else {
      await onRefresh();
      alert('Đã kích hoạt bản quyền cho Giáo viên!');
    }
  };

  const handleLock = async (id: string) => {
    await supabase.from('teachers').update({ is_approved: false }).eq('id', id);
    await onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Xóa hẳn đơn này?')) {
      await supabase.from('teachers').delete().eq('id', id);
      await onRefresh();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-xs font-sans">
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bảng Quản Lý Đơn Mua Web (Admin)</h1>
          <p className="text-slate-500 mt-0.5">Kiểm tra tài khoản ngân hàng và bấm Duyệt Kích Hoạt</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleManualRefresh} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm Mới
          </button>
          <span className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-xl font-bold">Tổng: {teachers.length} Giáo viên</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 font-bold border-b text-slate-700 uppercase">
            <tr>
              <th className="p-3 border-r">Giáo Viên</th>
              <th className="p-3 border-r">Email Gmail</th>
              <th className="p-3 border-r">SĐT</th>
              <th className="p-3 border-r text-center">Trạng Thái</th>
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
                    <button onClick={() => handleLock(t.id)} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg font-bold">Khóa</button>
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

// ==================== 5. BẢNG ĐIỀU KHIỂN GIÁO VIÊN CHỦ NHIỆM ====================
function TeacherDashboard({ teacher }: any) {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    fetchLeaderReports();
  }, [teacher]);

  const fetchLeaderReports = async () => {
    const { data } = await supabase.from('announcements').select('*').eq('teacher_id', teacher.id).order('created_date', { ascending: false });
    if (data) setReports(data);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-xs font-sans">
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Xin chào {teacher.full_name} ({teacher.school})</h2>
          <p className="text-slate-500 mt-0.5">Bảng quản lý lớp chủ nhiệm chính thức</p>
        </div>
        <button onClick={fetchLeaderReports} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 border border-indigo-200">
          <RefreshCw className="w-3.5 h-3.5" /> Tải Lại Báo Cáo
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
          <Bell className="w-4 h-4 text-indigo-600" /> Báo Cáo Tình Hình Lớp Tương Tác Từ Lớp Trưởng
        </h3>

        {reports.length === 0 ? (
          <p className="text-slate-400 italic">Chưa có báo cáo nào từ Lớp trưởng.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r: any) => (
              <div key={r.id} className="p-3.5 rounded-xl border bg-indigo-50/40 border-indigo-100 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-indigo-900 text-sm">{r.title}</span>
                  <span className="text-[10px] text-slate-400">{r.created_date}</span>
                </div>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 6. CỔNG BÁO CÁO LỚP TRƯỞNG ====================
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

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !content) return;

    const targetStudent = classStudents.find(s => s.id === selectedStudentId);

    const { error } = await supabase.from('announcements').insert([
      {
        teacher_id: student.teacher_id,
        title: recordType === 'violation' ? `[BÁO VI PHẠM - TUẦN ${weekNumber}]` : `[KHEN THƯỞNG - TUẦN ${weekNumber}]`,
        content: `Học sinh: ${targetStudent?.full_name} (${targetStudent?.code}) | Nội dung: ${content} (${recordType === 'violation' ? '-' : '+'}${points}đ)`,
        important: recordType === 'violation'
      }
    ]);

    if (!error) {
      alert('Đã gửi báo cáo thành công tới GVCN!');
      setContent('');
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
      alert('Đã nộp báo cáo thi đua tuần thành công!');
      setLeaderNote('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-xs font-sans">
      <div className="bg-indigo-800 text-white p-5 rounded-2xl shadow-lg flex justify-between items-center flex-wrap gap-3">
        <div>
          <span className="bg-indigo-600 border border-indigo-400 px-2.5 py-1 rounded text-[11px] font-bold">LỚP TRƯỞNG</span>
          <h1 className="text-xl font-bold mt-1">Cổng Báo Cáo Tình Hình Lớp - {student.full_name}</h1>
        </div>
        <button onClick={onSwitchToStudentView} className="bg-white text-indigo-900 px-3.5 py-2 rounded-xl font-bold hover:bg-indigo-50 shadow">
          👁️ Xem Trang Cá Nhân
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" /> Báo Cáo Vi Phạm / Khen Thưởng
          </h2>
          <form onSubmit={handleAddRecord} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Chọn Tuần Học:</label>
              <input type="number" min="1" max="52" value={weekNumber} onChange={e => setWeekNumber(Number(e.target.value))} className="w-full p-2 border rounded-xl" required />
            </div>
            <div>
              <label className="font-semibold block mb-1">Chọn Học Sinh:</label>
              <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full p-2 border rounded-xl" required>
                <option value="">-- Chọn Học Sinh Trong Lớp --</option>
                {classStudents.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.full_name} (Tổ {s.group_number})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Loại Báo Cáo:</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setRecordType('violation')} className={`py-2 rounded-xl font-bold ${recordType === 'violation' ? 'bg-rose-600 text-white' : 'bg-slate-100'}`}>⚠️ Vi Phạm</button>
                <button type="button" onClick={() => setRecordType('commendation')} className={`py-2 rounded-xl font-bold ${recordType === 'commendation' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>🌟 Khen Thưởng</button>
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Nội dung chi tiết:</label>
              <input type="text" placeholder="Nội dung..." value={content} onChange={e => setContent(e.target.value)} className="w-full p-2 border rounded-xl" required />
            </div>
            <div>
              <label className="font-semibold block mb-1">Số điểm biến động:</label>
              <input type="number" min="1" value={points} onChange={e => setPoints(Number(e.target.value))} className="w-full p-2 border rounded-xl" required />
            </div>
            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow">
              Gửi Báo Cáo
            </button>
          </form>
        </div>

        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Báo Cáo Thi Đua Tổng Kết Tuần
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
              <label className="font-semibold block mb-1">Ghi chú của Lớp trưởng:</label>
              <textarea rows={3} placeholder="Nhận xét tuần..." value={leaderNote} onChange={e => setLeaderNote(e.target.value)} className="w-full p-2 border rounded-xl" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow">
              Nộp Báo Cáo Thi Đua
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==================== 7. QUÊN MẬT KHẨU QUA EMAILJS ====================
function ForgotPasswordScreen({ teachers, onBackToLogin }: any) {
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtp, setUserOtp] = useState('');

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t: any) => t.email.toLowerCase() === email.trim().toLowerCase());
    if (!teacher) {
      alert('Email Gmail này chưa đăng ký hệ thống!');
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_name: teacher.full_name,
      to_email: email,
      otp_code: otp
    }, EMAILJS_PUBLIC_KEY)
    .then(() => {
      setOtpSent(true);
      alert('Mã OTP đã gửi về Gmail!');
    })
    .catch(() => {
      setOtpSent(true);
      alert(`⚠️ Mã OTP khôi phục của bạn là: ${otp}`);
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (userOtp.trim() === generatedOtp) {
      alert('Xác thực thành công!');
      onBackToLogin();
    } else {
      alert('Mã OTP không đúng!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-xs">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 text-center">Cấp Lại Quyền Đăng Nhập</h2>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Nhập Email Gmail đã đăng ký:</label>
              <input type="email" required placeholder="teacher@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow">
              Gửi Mã OTP Qua Gmail
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div>
              <label className="font-semibold block mb-1">Nhập Mã OTP (6 số):</label>
              <input type="text" required placeholder="123456" value={userOtp} onChange={e => setUserOtp(e.target.value)} className="w-full p-2.5 border rounded-xl text-center text-lg font-bold" />
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
