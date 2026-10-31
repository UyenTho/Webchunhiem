import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Users, Wallet, CheckCircle, XCircle, Trash2, Award, LogOut,
  ShieldAlert, Trophy, Bell, AlertCircle, RefreshCw, BookOpen, FileText, PlusCircle
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
  class_code?: string;
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
}

interface FeePayment {
  id: string;
  student_id: string;
  fee_item_id: string;
  is_paid: boolean;
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
// LƯU Ý: Giữ nguyên chức vụ 'Lớp phó' (chung) để KHÔNG làm hỏng dữ liệu cũ của các học sinh
// đã được gán 'Lớp phó' trước khi có 'Lớp phó học tập' / 'Lớp phó lao động'.
const ROLES: string[] = [
  'Học sinh', 'Lớp trưởng', 'Lớp phó học tập', 'Lớp phó lao động', 'Lớp phó',
  'Bí thư', 'Thư ký', 'Thủ quỹ', 'Tổ trưởng',
];

// Các chức vụ mà cả lớp CHỈ CÓ 1 NGƯỜI giữ (Tổ trưởng: mỗi Tổ 1 người — xử lý riêng theo Tổ).
// 'Lớp phó' (chung) không nằm trong danh sách này vì lớp có thể có nhiều Lớp phó.
const UNIQUE_CLASS_ROLES: string[] = ['Lớp trưởng', 'Lớp phó học tập', 'Lớp phó lao động', 'Bí thư', 'Thư ký', 'Thủ quỹ'];

// Bỏ dấu tiếng Việt + chữ thường + gộp khoảng trắng → dùng để so khớp chức vụ nhập từ Excel.
const toRoleKey = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();

// Một số cách viết tắt hay gặp khi GV gõ trong file Excel.
const ROLE_ALIASES: Record<string, string> = {
  'lpht': 'Lớp phó học tập', 'lp ht': 'Lớp phó học tập', 'lp hoc tap': 'Lớp phó học tập',
  'lop pho ht': 'Lớp phó học tập', 'pho hoc tap': 'Lớp phó học tập',
  'lpld': 'Lớp phó lao động', 'lp ld': 'Lớp phó lao động', 'lp lao dong': 'Lớp phó lao động',
  'lop pho ld': 'Lớp phó lao động', 'pho lao dong': 'Lớp phó lao động',
  'lt': 'Lớp trưởng', 'hs': 'Học sinh',
};

// Chuẩn hóa chức vụ về đúng chuỗi trong ROLES (xử lý: viết hoa/thường, thừa khoảng trắng,
// gõ không dấu, Unicode tổ hợp (NFD) từ Excel/VNI, viết tắt). Nếu không khớp thì giữ nguyên
// chữ GV đã nhập (VD: 'Cờ đỏ') để không làm mất thông tin.
const normalizeRole = (raw: any): string => {
  const text = String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!text) return 'Học sinh';
  const key = toRoleKey(text);
  const exact = ROLES.find(r => toRoleKey(r) === key);
  if (exact) return exact;
  if (ROLE_ALIASES[key]) return ROLE_ALIASES[key];
  return text;
};

// Danh sách option cho các ô chọn chức vụ: nếu học sinh đang giữ một chức vụ không có trong ROLES
// (dữ liệu cũ / nhập từ Excel), vẫn hiển thị đúng chức vụ đó thay vì hiển thị sai thành 'Học sinh'.
const getRoleOptions = (current?: string): string[] =>
  current && !ROLES.includes(current) ? [...ROLES, current] : ROLES;

// Kiểm tra chức vụ của học sinh (bền với: viết hoa/thường, gõ không dấu, Unicode tổ hợp, viết tắt).
// Dùng để điều hướng học sinh có chức vụ Ban cán sự vào đúng cổng chức năng sau khi đăng nhập.
const hasRole = (role: string | undefined, target: string): boolean => normalizeRole(role) === target;
const isClassLeader = (s: { class_role?: string } | null | undefined) => hasRole(s?.class_role, 'Lớp trưởng');
const isTreasurer = (s: { class_role?: string } | null | undefined) =>
  hasRole(s?.class_role, 'Thủ quỹ') || toRoleKey(String(s?.class_role ?? '')) === 'thu qui';

// ==================== TIỆN ÍCH NGÀY THÁNG ====================
// KHÔNG dùng new Date().toISOString().slice(0, 10) để lấy "hôm nay": toISOString trả về giờ UTC,
// ở Việt Nam (UTC+7) từ 0h–7h sáng sẽ bị lùi về NGÀY HÔM TRƯỚC.
const pad2 = (n: number): string => String(n).padStart(2, '0');
const todayLocalISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const isValidYMD = (y: number, m: number, d: number): boolean => {
  if (y < 1900 || y > 2100) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};
const toYMD = (y: number, m: number, d: number): string | null =>
  isValidYMD(y, m, d) ? `${y}-${pad2(m)}-${pad2(d)}` : null;

// Đọc ngày sinh từ ô Excel → 'YYYY-MM-DD' (hoặc null nếu không đọc được).
// Hỗ trợ: số serial của Excel (kể cả hệ ngày 1904 trên Excel Mac), chuỗi dd/mm/yyyy, d-m-yyyy, yyyy-mm-dd.
// Tự tính từ serial (theo UTC) để không bị lệch 1 ngày do múi giờ như khi dùng cellDates + toISOString.
const excelDateToISO = (v: any, date1904 = false): string | null => {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const t = new Date(v.getTime() + 12 * 3600 * 1000); // bù sai số vài phút/giây quanh nửa đêm
    return toYMD(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }
  const fromSerial = (serial: number): string | null => {
    if (!isFinite(serial) || serial < 1) return null;
    const days = Math.floor(serial + 1e-7) + (date1904 ? 1462 : 0);
    const dt = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
    return toYMD(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  };
  if (typeof v === 'number') return fromSerial(v);
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return toYMD(Number(m[3]), Number(m[2]), Number(m[1]));
  m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m) return toYMD(Number(m[1]), Number(m[2]), Number(m[3]));
  if (/^\d{4,6}(\.\d+)?$/.test(s)) return fromSerial(Number(s));
  return null;
};
const formatDateVN = (iso?: string | null): string => {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

// ==================== SỔ QUỸ LỚP — TIỆN ÍCH ====================
interface FundTransaction {
  id: string;
  tx_type: 'income' | 'expense';
  amount: number;
  tx_date: string;
  description: string;
  fee_item_id?: string | null;
  created_by?: string;
  created_at?: string;
}
const formatMoney = (n: number): string => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}đ`;
// "1.100.000", "1,100,000", "1100000đ" → 1100000; không hợp lệ → null.
const parseMoney = (s: string): number | null => {
  const digits = String(s || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const v = Number(digits);
  return Number.isSafeInteger(v) && v > 0 && v <= 1e10 ? v : null;
};
const normalizeFundTx = (list: any): FundTransaction[] =>
  ((list || []) as any[]).map(t => ({
    ...t,
    id: String(t.id),
    amount: Number(t.amount) || 0,
    tx_date: String(t.tx_date || '').slice(0, 10),
    description: t.description || '',
    fee_item_id: t.fee_item_id ? String(t.fee_item_id) : null,
  }));
const summarizeFund = (list: FundTransaction[]) => {
  const income = list.filter(t => t.tx_type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = list.filter(t => t.tx_type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense };
};
// Tính "Tồn quỹ" sau từng dòng theo thứ tự thời gian, rồi trả về danh sách MỚI NHẤT lên đầu.
const withRunningBalance = (list: FundTransaction[]): (FundTransaction & { balance_after: number })[] => {
  const asc = [...list].sort((a, b) =>
    a.tx_date.localeCompare(b.tx_date) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
  let bal = 0;
  return asc.map(t => {
    bal += t.tx_type === 'income' ? t.amount : -t.amount;
    return { ...t, balance_after: bal };
  }).reverse();
};

// ==================== ĐIỂM KIỂM TRA MIỆNG — QUY TẮC TÍNH ====================
// • Mỗi ngày GV có thể nhập cho 1 học sinh: điểm miệng (0–10, có thể để trống), số điểm cộng, số điểm trừ.
// • Điểm cộng và điểm trừ được tính RIÊNG: mỗi loại đủ 10 thì quy đổi thành 1 điểm chính
//   (VD 13 cộng, 8 trừ → +1; còn dư 3 cộng, 8 trừ để tích lũy tiếp).
// • Điểm quy đổi được áp vào TỪNG LẦN KIỂM TRA:
//     - apply_mode = 'next'    : áp vào lần kiểm tra miệng kế tiếp (tính cả lần kiểm tra cùng ngày).
//     - apply_mode = 'previous': áp ngay vào lần kiểm tra gần nhất trước đó (chưa có lần nào thì chờ lần đầu tiên).
//   Cuối kì, nếu còn đủ 10 mà không còn lần kiểm tra nào phía sau → áp vào lần kiểm tra gần nhất (không bị mất).
// • Điểm mỗi lần sau quy đổi luôn nằm trong [0; 10].
// • Kết quả học kì: Trung bình cộng các lần (đã quy đổi) HOẶC Điểm cao nhất — làm tròn 1 chữ số thập phân.
const ORAL_POINTS_PER_UNIT = 10;
const round1 = (x: number): number => Math.round((x + 1e-9) * 10) / 10;
const clamp010 = (x: number): number => Math.min(10, Math.max(0, x));
const formatScore = (x: number | null | undefined, fixed1 = false): string =>
  x === null || x === undefined ? '—' : (fixed1 ? x.toFixed(1) : String(x)).replace('.', ',');

interface OralTestResult { date: string; raw: number; bonus: number; penalty: number; adjusted: number; }
interface OralSummary {
  tests: OralTestResult[];
  totalPlus: number; totalMinus: number;
  plusLeft: number; minusLeft: number;
  average: number | null; max: number | null; final: number | null;
}

const computeOralSummary = (
  entries: { entry_date: string; score: number | null; plus_points: number; minus_points: number }[],
  calcMethod: 'average' | 'max',
  applyMode: 'next' | 'previous'
): OralSummary => {
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const tests: OralTestResult[] = [];
  let plusC = 0, minusC = 0, totalPlus = 0, totalMinus = 0;

  const applyUnits = (t: OralTestResult) => {
    const b = Math.floor(plusC / ORAL_POINTS_PER_UNIT);
    const p = Math.floor(minusC / ORAL_POINTS_PER_UNIT);
    if (b === 0 && p === 0) return;
    t.bonus += b; t.penalty += p;
    plusC -= b * ORAL_POINTS_PER_UNIT; minusC -= p * ORAL_POINTS_PER_UNIT;
    t.adjusted = clamp010(t.raw + t.bonus - t.penalty);
  };

  for (const e of sorted) {
    const plus = Math.max(0, Math.floor(Number(e.plus_points) || 0));
    const minus = Math.max(0, Math.floor(Number(e.minus_points) || 0));
    plusC += plus; minusC += minus; totalPlus += plus; totalMinus += minus;
    const hasScore = e.score !== null && e.score !== undefined && (e.score as any) !== '' && !isNaN(Number(e.score));
    if (hasScore) {
      const raw = clamp010(Number(e.score));
      tests.push({ date: e.entry_date, raw, bonus: 0, penalty: 0, adjusted: raw });
    }
    if (tests.length > 0 && (applyMode === 'previous' || hasScore)) applyUnits(tests[tests.length - 1]);
  }
  if (tests.length > 0) applyUnits(tests[tests.length - 1]);

  const average = tests.length ? round1(tests.reduce((s, t) => s + t.adjusted, 0) / tests.length) : null;
  const max = tests.length ? round1(Math.max(...tests.map(t => t.adjusted))) : null;
  return {
    tests, totalPlus, totalMinus, plusLeft: plusC, minusLeft: minusC,
    average, max, final: calcMethod === 'max' ? max : average,
  };
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('login');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: false });
      if (!error && data) setTeachers(data as Teacher[]);
    } catch (err) {
      console.error("Lỗi kết nối Supabase:", err);
    }
  };

  useEffect(() => {
    fetchTeachers();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('reset_password');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentTeacher(null);
    setLoggedInStudent(null);
    setCurrentView('login');
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
          onStudentLogin={(student: Student) => {
            setLoggedInStudent(student);
            if (isClassLeader(student)) setCurrentView('class_leader_portal');
            else if (isTreasurer(student)) setCurrentView('treasurer_portal');
            else setCurrentView('student_portal');
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

      {currentView === 'class_leader_portal' && loggedInStudent && (
        <ClassLeaderPortal student={loggedInStudent} onSwitchToStudentView={() => setCurrentView('student_portal')} />
      )}

      {currentView === 'treasurer_portal' && loggedInStudent && (
        <TreasurerPortal student={loggedInStudent} onSwitchToStudentView={() => setCurrentView('student_portal')} />
      )}

      {currentView === 'student_portal' && loggedInStudent && (
        <div className="space-y-2">
          {isClassLeader(loggedInStudent) && (
            <div className="max-w-5xl mx-auto pt-4 px-4 text-right">
              <button
                onClick={() => setCurrentView('class_leader_portal')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow"
              >
                🚀 Mở Cổng Báo Cáo Thi Đua Lớp Trưởng
              </button>
            </div>
          )}
          {isTreasurer(loggedInStudent) && (
            <div className="max-w-5xl mx-auto pt-4 px-4 text-right">
              <button
                onClick={() => setCurrentView('treasurer_portal')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow"
              >
                💰 Mở Cổng Thu Quỹ Lớp (Thủ quỹ)
              </button>
            </div>
          )}
          <StudentPortal
            student={loggedInStudent}
            onRefreshStudent={async (newPassword?: string) => {
              const pw = newPassword ?? loggedInStudent.password ?? '';
              const { data, error } = await supabase.rpc('student_get_self', {
                p_student_id: loggedInStudent.id,
                p_password: pw,
              });
              const row = Array.isArray(data) ? data[0] : data;
              if (!error && row && row.id) setLoggedInStudent({ ...(row as Student), password: pw });
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
      p_class_code: classCode.trim().toUpperCase(),
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
    // MSHS luôn được lưu IN HOA (thêm tay / sửa / nhập Excel đều .toUpperCase()).
    // Ô nhập chỉ HIỂN THỊ in hoa bằng CSS, giá trị thật vẫn là chữ thường nếu em gõ thường
    // → phải chuẩn hóa trước khi gửi, nếu không máy chủ so khớp sẽ báo sai MSHS/mật khẩu.
    const codeInput = studentCode.normalize('NFC').replace(/\s+/g, '').toUpperCase();
    const pwInput = studentPassword.normalize('NFC').trim();
    if (!codeInput || !pwInput || !matchedTeacher) return;
    setLoading(true);

    // RPC "student_login" (file SQL 03) đối chiếu MSHS + Mật khẩu ở phía máy chủ và trả về hồ sơ học sinh
    // KHÔNG kèm cột password. Mật khẩu em vừa nhập được giữ trong bộ nhớ phiên đăng nhập để dùng cho các
    // thao tác cần xác thực lại (lưu khảo sát, đổi mật khẩu, lớp trưởng ghi điểm).
    const { data, error: rpcErr } = await supabase.rpc('student_login', {
      p_teacher_id: matchedTeacher.id,
      p_code: codeInput,
      p_password: pwInput,
    });

    setLoading(false);

    if (rpcErr) {
      setError(rpcErr.message.includes('student_login')
        ? 'Hệ thống chưa cập nhật hàm đăng nhập học sinh. Vui lòng báo Giáo viên chủ nhiệm.'
        : 'Lỗi đăng nhập: ' + rpcErr.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.id) {
      setError('Mã Số Học Sinh hoặc Mật khẩu không đúng trong lớp này!');
      return;
    }

    onStudentLogin({ ...(row as Student), password: pwInput });
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
                autoCapitalize="characters" autoCorrect="off" spellCheck={false}
                value={studentCode} onChange={e => setStudentCode(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm uppercase font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Mật khẩu (*):</label>
              <input
                type="password" required placeholder="Do Giáo viên chủ nhiệm cấp"
                autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="current-password"
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
function StudentPortal({ student, onRefreshStudent }: { student: Student; onRefreshStudent: (newPassword?: string) => void }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  // Sổ quỹ lớp (Thủ quỹ ghi) — null = hệ thống chưa chạy file SQL sổ quỹ → ẩn mục này.
  const [fundTx, setFundTx] = useState<FundTransaction[] | null>(null);
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
  }, [student.id]);

  const fetchStudentData = async () => {
    const [annRes, feeRes, payRes, recRes] = await Promise.all([
      supabase.from('announcements').select('*').eq('teacher_id', student.teacher_id).order('created_date', { ascending: false }).order('id', { ascending: false }),
      supabase.from('fee_items').select('*').eq('teacher_id', student.teacher_id),
      supabase.from('fee_payments').select('*').eq('student_id', student.id),
      supabase.from('student_records').select('*').eq('student_id', student.id).order('week_number', { ascending: false })
    ]);

    if (annRes.data) setAnnouncements(annRes.data as Announcement[]);
    if (feeRes.data) setFeeItems(feeRes.data as FeeItem[]);
    if (payRes.data) setFeePayments(payRes.data as FeePayment[]);
    if (recRes.data) setRecords(recRes.data as StudentRecord[]);

    const { data: fundData, error: fundErr } = await supabase.rpc('student_get_fund_summary', {
      p_student_id: String(student.id),
      p_password: student.password || '',
    });
    setFundTx(fundErr ? null : normalizeFundTx((fundData as any)?.transactions));
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
    // Ghi qua RPC (kiểm tra lại mật khẩu ở máy chủ) — học sinh không còn quyền UPDATE trực tiếp bảng students.
    const { error } = await supabase.rpc('student_save_survey', {
      p_student_id: student.id,
      p_password: student.password || '',
      p_survey: surveyData,
    });

    if (error) {
      alert('Lỗi lưu khảo sát: ' + error.message);
    } else {
      alert('Đã hoàn thành phiếu khảo sát đầu năm thành công!');
      onRefreshStudent();
    }
  };

  // Cho phép học sinh TỰ đổi mật khẩu đăng nhập của chính mình (bảo mật hơn khi không phải
  // nhờ Giáo viên cấp lại). Yêu cầu nhập đúng mật khẩu hiện tại trước khi đổi.
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pwForm.current.trim() || !pwForm.next.trim() || !pwForm.confirm.trim()) {
      alert('Vui lòng nhập đầy đủ Mật khẩu hiện tại, Mật khẩu mới và Nhập lại mật khẩu mới.');
      return;
    }
    if (pwForm.next.trim().length < 4) {
      alert('Mật khẩu mới phải có ít nhất 4 ký tự.');
      return;
    }
    if (pwForm.next.trim() !== pwForm.confirm.trim()) {
      alert('Mật khẩu mới và Nhập lại mật khẩu mới không khớp!');
      return;
    }
    if (pwForm.next.trim() === pwForm.current.trim()) {
      alert('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }

    setPwSaving(true);
    // Máy chủ tự kiểm tra Mật khẩu hiện tại (RPC student_change_password).
    const newPw = pwForm.next.trim();
    const { error } = await supabase.rpc('student_change_password', {
      p_student_id: student.id,
      p_old_password: pwForm.current.trim(),
      p_new_password: newPw,
    });
    setPwSaving(false);

    if (error) {
      alert(error.message.includes('Mật khẩu') ? error.message : 'Lỗi đổi mật khẩu: ' + error.message);
      return;
    }

    alert('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới cho lần đăng nhập sau.');
    setPwForm({ current: '', next: '', confirm: '' });
    setShowChangePassword(false);
    onRefreshStudent(newPw);
  };

  const totalDeduction = (records || []).filter(r => r.type === 'violation').reduce((sum, r) => sum + Number(r.points || 0), 0);
  const totalBonus = (records || []).filter(r => r.type === 'commendation').reduce((sum, r) => sum + Number(r.points || 0), 0);
  const currentTotalScore = 100 - totalDeduction + totalBonus;

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

      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
          <Wallet className="w-4.5 h-4.5 text-indigo-600" /> Các Khoản Thu & Quỹ Lớp
        </h2>
        {feeItems.length === 0 ? (
          <p className="text-slate-400 italic">Chưa có thông báo khoản thu nào.</p>
        ) : (
          <>
          {(() => {
            const unpaidItems = feeItems.filter(f => !feePayments.some(p => p.fee_item_id === f.id && p.is_paid));
            const owed = unpaidItems.reduce((sum, f) => sum + Number(f.amount || 0), 0);
            return unpaidItems.length === 0 ? (
              <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">✅ Em đã nộp đủ {feeItems.length}/{feeItems.length} khoản thu. Cảm ơn em!</p>
            ) : (
              <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                ⚠️ Em đã nộp {feeItems.length - unpaidItems.length}/{feeItems.length} khoản. Còn phải nộp: {formatMoney(owed)} ({unpaidItems.map(f => f.title).join(', ')}).
              </p>
            );
          })()}
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
          </>
        )}
      </div>

      {fundTx !== null && (
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
            <Wallet className="w-4.5 h-4.5 text-emerald-600" /> Sổ Quỹ Lớp (Thủ quỹ cập nhật)
          </h2>
          {(() => {
            const f = summarizeFund(fundTx);
            const latest = announcements.find(a => a.title.startsWith('[THỦ QUỸ]'));
            return (
              <>
                <FundSummaryCards income={f.income} expense={f.expense} balance={f.balance} />
                {latest && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-emerald-900">📢 Thông báo mới nhất từ Thủ quỹ: {latest.title.replace(/^\[THỦ QUỸ\]\s*/, '')}</span>
                      <span className="text-[10px] text-slate-500">{formatDateVN(latest.created_date)}</span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">{latest.content}</p>
                  </div>
                )}
                <details>
                  <summary className="cursor-pointer font-bold text-indigo-700">Xem chi tiết thu – chi ({fundTx.length} dòng)</summary>
                  <div className="mt-2">
                    <FundLedgerTable rows={withRunningBalance(fundTx)} feeItems={feeItems} />
                  </div>
                </details>
              </>
            );
          })()}
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
          <Bell className="w-4.5 h-4.5 text-indigo-600" /> Thông Báo & Dặn Dò (GVCN, Lớp trưởng, Thủ quỹ)
        </h2>
        {(() => {
          const displayAnnouncements = getDisplayAnnouncements(announcements);
          return displayAnnouncements.length === 0 ? (
            <p className="text-slate-400 italic">Chưa có thông báo nào.</p>
          ) : (
            <div className="space-y-3">
              {displayAnnouncements.map((a: Announcement) => (
                <div key={a.id} className={`p-3.5 rounded-xl border ${a.important ? 'bg-amber-50/60 border-amber-200' : a.title.startsWith('[THỦ QUỸ]') ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'} space-y-1`}>
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
function ClassLeaderPortal({ student, onSwitchToStudentView }: { student: Student; onSwitchToStudentView: () => void }) {
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [recordDate, setRecordDate] = useState<string>(todayLocalISO());
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [recordType, setRecordType] = useState<'violation' | 'commendation'>('violation');
  const [content, setContent] = useState('');

  const [pointsStr, setPointsStr] = useState<string>('1');

  // Khi true: lớp trưởng chọn "Khác" và tự nhập nội dung + điểm.
  // Khi false: nội dung + điểm được lấy tự động từ COMPETITION_RULES theo lựa chọn dropdown.
  const [useCustomContent, setUseCustomContent] = useState(false);

  const [groupScores, setGroupScores] = useState({ group1: '100', group2: '100', group3: '100', group4: '100' });
  const [leaderNote, setLeaderNote] = useState('');

  useEffect(() => {
    fetchClassData();
  }, [student.id]);

  const fetchClassData = async () => {
    // Chỉ lấy các cột công khai (học sinh không có quyền đọc cột mật khẩu, ngày sinh, khảo sát của bạn khác).
    const { data, error } = await supabase
      .from('students')
      .select('id, teacher_id, code, full_name, class_role, group_number')
      .eq('teacher_id', student.teacher_id)
      .order('code', { ascending: true });

    if (error) alert('Lỗi tải danh sách lớp: ' + error.message);
    else if (data) setClassStudents(data as Student[]);
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
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 52) {
      alert('Tuần học phải là số từ 1 đến 52.');
      return;
    }
    const parsedPoints = parseInt(pointsStr, 10) || 1;

    const { error } = await supabase.rpc('leader_add_record', {
      p_leader_student_id: student.id,
      p_password: student.password || '',
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
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 52) {
      alert('Tuần học phải là số từ 1 đến 52 (tránh gửi nhầm báo cáo "TUẦN 0").');
      return;
    }
    const g1 = parseInt(groupScores.group1, 10) || 0;
    const g2 = parseInt(groupScores.group2, 10) || 0;
    const g3 = parseInt(groupScores.group3, 10) || 0;
    const g4 = parseInt(groupScores.group4, 10) || 0;

    const title = `[THI ĐUA LỚP TUẦN ${weekNumber}]`;
    const summaryText = `📊 BÁO CÁO THI ĐUA TỔ TUẦN ${weekNumber}:\n- Tổ 1: ${g1}đ | Tổ 2: ${g2}đ\n- Tổ 3: ${g3}đ | Tổ 4: ${g4}đ\n\n📝 Ghi chú Lớp trưởng: ${leaderNote || 'Không có'}`;

    const { error } = await supabase.rpc('leader_submit_weekly_report', {
      p_leader_student_id: student.id,
      p_password: student.password || '',
      p_week_number: weekNumber,
      p_title: title,
      p_content: summaryText,
    });

    if (!error) {
      alert('Đã gửi báo cáo thi đua tuần tới Giáo viên chủ nhiệm!');
      setLeaderNote('');
    } else {
      alert('Lỗi nộp báo cáo: ' + error.message);
    }
  };

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
                <input type="number" min="1" max="52" value={weekNumber || ''} onChange={e => setWeekNumber(Math.floor(Number(e.target.value)) || 0)} className="w-full p-2 border rounded-xl font-bold" required />
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
        </div>
      </div>
    </div>
  );
}

// ==================== 4b. CỔNG THU QUỸ DÀNH CHO THỦ QUỸ ====================
// Học sinh đăng nhập KHÔNG dùng Supabase Auth → không ghi trực tiếp được các bảng (RLS chặn).
// Mọi thao tác đi qua các RPC trong file SQL "05_thu_quy_nhap_khoan_thu.sql"; máy chủ tự kiểm tra lại
// MSHS + mật khẩu và chức vụ "Thủ quỹ", chỉ cho thao tác trên dữ liệu của đúng lớp mình.
// Gồm 3 phần: (1) Đánh dấu Đã nộp / Chưa nộp theo từng khoản thu, (2) Sổ quỹ: ghi THU / CHI theo ngày,
// xóa dòng nhập nhầm, (3) Gửi thông báo quỹ lớp cho cả lớp (có mẫu tổng hợp tự động).
function TreasurerPortal({ student, onSwitchToStudentView }: { student: Student; onSwitchToStudentView: () => void }) {
  const [tab, setTab] = useState<'payments' | 'ledger' | 'notify'>('payments');
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [payments, setPayments] = useState<{ student_id: string; fee_item_id: string; is_paid: boolean }[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [myAnnouncements, setMyAnnouncements] = useState<Announcement[]>([]);
  const [selectedFeeId, setSelectedFeeId] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyKey, setBusyKey] = useState('');

  // Form sổ quỹ
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txDate, setTxDate] = useState<string>(todayLocalISO());
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txFeeId, setTxFeeId] = useState('');
  const [txSaving, setTxSaving] = useState(false);

  // Form thông báo
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annImportant, setAnnImportant] = useState(false);
  const [includeUnpaidNames, setIncludeUnpaidNames] = useState(false);
  const [annSending, setAnnSending] = useState(false);

  useEffect(() => {
    fetchFeeData();
  }, [student.id]);

  const auth = () => ({ p_student_id: String(student.id), p_password: student.password || '' });

  const rpcErrorText = (msg: string, fn: string) =>
    msg.includes(fn) || msg.toLowerCase().includes('could not find the function') || msg.includes('class_fund_transactions')
      ? 'Hệ thống chưa cập nhật đầy đủ chức năng Thủ quỹ. Em báo Giáo viên chủ nhiệm chạy lại file SQL "05_thu_quy_nhap_khoan_thu.sql" (bản mới) nhé.'
      : msg;

  const fetchFeeData = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('treasurer_get_fee_data', auth());
    setLoading(false);
    if (error) {
      setLoadError(rpcErrorText(error.message, 'treasurer_get_fee_data'));
      return;
    }
    setLoadError('');
    const d: any = data || {};
    const items = ((d.fee_items || []) as any[]).map(f => ({ ...f, id: String(f.id) })) as FeeItem[];
    setClassStudents(((d.students || []) as any[]).map(s => ({ ...s, id: String(s.id) })) as Student[]);
    setFeeItems(items);
    setPayments(((d.payments || []) as any[]).map(p => ({
      student_id: String(p.student_id), fee_item_id: String(p.fee_item_id), is_paid: !!p.is_paid,
    })));
    setTransactions(normalizeFundTx(d.transactions));
    setMyAnnouncements(((d.announcements || []) as any[]).map(a => ({ ...a, id: String(a.id) })) as Announcement[]);
    setSelectedFeeId(prev => (prev && items.some(f => f.id === prev) ? prev : items[0]?.id || ''));
  };

  const isPaid = (studentId: string, feeId: string) =>
    payments.some(p => p.student_id === studentId && p.fee_item_id === feeId && p.is_paid);
  const paidCountOf = (feeId: string) => classStudents.filter(s => isPaid(s.id, feeId)).length;

  // ---------- (1) ĐÃ NỘP / CHƯA NỘP ----------
  const handleToggle = async (target: Student, feeId: string) => {
    const current = isPaid(target.id, feeId);
    if (current && !window.confirm(`Chuyển ${target.full_name} về "Chưa nộp"?`)) return;
    const key = `${target.id}|${feeId}`;
    setBusyKey(key);
    const { error } = await supabase.rpc('treasurer_set_payment', {
      ...auth(),
      p_target_student_id: target.id,
      p_fee_item_id: feeId,
      p_is_paid: !current,
    });
    setBusyKey('');
    if (error) {
      alert('Lỗi cập nhật: ' + rpcErrorText(error.message, 'treasurer_set_payment'));
      return;
    }
    setPayments(prev => {
      const rest = prev.filter(p => !(p.student_id === target.id && p.fee_item_id === feeId));
      return [...rest, { student_id: target.id, fee_item_id: feeId, is_paid: !current }];
    });
  };

  // ---------- (2) SỔ QUỸ ----------
  const fund = summarizeFund(transactions);
  const recordedForFee = (feeId: string) =>
    transactions.filter(t => t.tx_type === 'income' && t.fee_item_id === feeId).reduce((s, t) => s + t.amount, 0);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoney(txAmount);
    if (!amount) { alert('Số tiền không hợp lệ. Nhập số dương, VD: 50000 hoặc 50.000'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(txDate)) { alert('Vui lòng chọn ngày thu/chi.'); return; }
    if (txDate > todayLocalISO()) { alert('Ngày thu/chi không được sau ngày hôm nay.'); return; }
    if (!txDesc.trim()) { alert('Vui lòng ghi nội dung thu/chi (VD: Thu quỹ lớp đợt 1, Mua hoa 20/11...).'); return; }
    if (txType === 'expense' && amount > fund.balance &&
      !window.confirm(`Khoản chi ${formatMoney(amount)} lớn hơn số dư quỹ hiện tại (${formatMoney(fund.balance)}). Quỹ sẽ bị âm. Vẫn ghi?`)) return;

    setTxSaving(true);
    const { error } = await supabase.rpc('treasurer_add_transaction', {
      ...auth(),
      p_type: txType,
      p_amount: amount,
      p_date: txDate,
      p_description: txDesc.trim(),
      p_fee_item_id: txType === 'income' ? txFeeId : '',
    });
    setTxSaving(false);
    if (error) { alert('Lỗi ghi sổ quỹ: ' + rpcErrorText(error.message, 'treasurer_add_transaction')); return; }
    setTxAmount(''); setTxDesc(''); setTxFeeId('');
    fetchFeeData();
  };

  const handleDeleteTransaction = async (t: FundTransaction) => {
    if (!window.confirm(
      `Xóa dòng sổ quỹ này?\n\n${t.tx_type === 'income' ? 'THU' : 'CHI'} ${formatMoney(t.amount)} — ngày ${formatDateVN(t.tx_date)}\n"${t.description}"\n\nChỉ xóa khi nhập nhầm. Xóa xong không khôi phục được.`
    )) return;
    const { error } = await supabase.rpc('treasurer_delete_transaction', { ...auth(), p_tx_id: t.id });
    if (error) { alert('Lỗi xóa: ' + rpcErrorText(error.message, 'treasurer_delete_transaction')); return; }
    setTransactions(prev => prev.filter(x => x.id !== t.id));
  };

  // Gợi ý điền nhanh khi chọn khoản thu liên quan: số tiền = (số HS đã nộp × mức thu) − số đã ghi sổ.
  const handlePickFeeForIncome = (feeId: string) => {
    setTxFeeId(feeId);
    const f = feeItems.find(x => x.id === feeId);
    if (!f) return;
    if (!txDesc.trim()) setTxDesc(`Thu ${f.title}`);
    const remain = paidCountOf(f.id) * Number(f.amount || 0) - recordedForFee(f.id);
    if (!txAmount.trim() && remain > 0) setTxAmount(remain.toLocaleString('vi-VN'));
  };

  // ---------- (3) THÔNG BÁO ----------
  const buildAutoReport = () => {
    const lines: string[] = [];
    lines.push(`💰 TÌNH HÌNH QUỸ LỚP (tính đến ngày ${formatDateVN(todayLocalISO())})`);
    lines.push(`- Tổng thu: ${formatMoney(fund.income)}`);
    lines.push(`- Tổng chi: ${formatMoney(fund.expense)}`);
    lines.push(`- Quỹ lớp còn lại: ${formatMoney(fund.balance)}`);
    if (feeItems.length > 0) {
      lines.push('');
      lines.push('📋 CÁC KHOẢN THU:');
      feeItems.forEach(f => {
        const paid = paidCountOf(f.id);
        const unpaid = classStudents.filter(s => !isPaid(s.id, f.id));
        lines.push(`• ${f.title} (${formatMoney(Number(f.amount || 0))}/HS${f.deadline ? `, hạn ${formatDateVN(f.deadline)}` : ''}): đã nộp ${paid}/${classStudents.length} HS, còn ${unpaid.length} HS chưa nộp.`);
        if (includeUnpaidNames && unpaid.length > 0) {
          lines.push(`   Chưa nộp: ${unpaid.map(s => s.full_name).join(', ')}.`);
        }
      });
    }
    const recentExpenses = transactions.filter(t => t.tx_type === 'expense').slice(0, 5);
    if (recentExpenses.length > 0) {
      lines.push('');
      lines.push('🧾 CÁC KHOẢN CHI GẦN ĐÂY:');
      recentExpenses.forEach(t => lines.push(`• ${formatDateVN(t.tx_date)}: ${t.description} — ${formatMoney(t.amount)}`));
    }
    lines.push('');
    lines.push('Các bạn chưa nộp vui lòng nộp cho Thủ quỹ đúng hạn. Mọi thắc mắc liên hệ Thủ quỹ hoặc GVCN.');
    setAnnTitle(`Báo cáo quỹ lớp ngày ${formatDateVN(todayLocalISO())}`);
    setAnnContent(lines.join('\n'));
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annContent.trim()) { alert('Nội dung thông báo đang để trống.'); return; }
    if (!window.confirm('Gửi thông báo này cho CẢ LỚP? (GVCN cũng xem được)')) return;
    setAnnSending(true);
    const { error } = await supabase.rpc('treasurer_post_announcement', {
      ...auth(),
      p_title: annTitle.trim(),
      p_content: annContent.trim(),
      p_important: annImportant,
    });
    setAnnSending(false);
    if (error) { alert('Lỗi gửi thông báo: ' + rpcErrorText(error.message, 'treasurer_post_announcement')); return; }
    alert('Đã gửi thông báo cho cả lớp!');
    setAnnTitle(''); setAnnContent(''); setAnnImportant(false);
    fetchFeeData();
  };

  const handleDeleteAnnouncement = async (a: Announcement) => {
    if (!window.confirm(`Xóa thông báo "${a.title}"? Cả lớp sẽ không còn thấy thông báo này.`)) return;
    const { error } = await supabase.rpc('treasurer_delete_announcement', { ...auth(), p_announcement_id: a.id });
    if (error) { alert('Lỗi xóa thông báo: ' + rpcErrorText(error.message, 'treasurer_delete_announcement')); return; }
    setMyAnnouncements(prev => prev.filter(x => x.id !== a.id));
  };

  // ---------- HIỂN THỊ ----------
  const selectedFee = feeItems.find(f => f.id === selectedFeeId) || null;
  const paidCount = selectedFee ? paidCountOf(selectedFee.id) : 0;
  const amount = Number(selectedFee?.amount || 0);
  const keyword = toRoleKey(search);
  const visibleStudents = selectedFee
    ? classStudents.filter(s => {
        const paid = isPaid(s.id, selectedFee.id);
        if (filter === 'paid' && !paid) return false;
        if (filter === 'unpaid' && paid) return false;
        return !keyword || toRoleKey(`${s.full_name} ${s.code}`).includes(keyword);
      })
    : [];
  const ledgerRows = withRunningBalance(transactions);

  const tabBtn = (key: 'payments' | 'ledger' | 'notify', label: string) => (
    <button
      onClick={() => setTab(key)}
      className={`px-4 py-2 rounded-xl font-bold transition ${tab === key ? 'bg-emerald-600 text-white shadow' : 'bg-white border text-slate-700 hover:bg-slate-50'}`}
    >{label}</button>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 text-xs font-sans">
      <div className="bg-emerald-800 text-white p-5 rounded-2xl shadow-lg flex justify-between items-center flex-wrap gap-3">
        <div>
          <span className="bg-emerald-600 border border-emerald-400 px-2.5 py-1 rounded text-[11px] font-bold uppercase">THỦ QUỸ PORTAL</span>
          <h1 className="text-xl font-bold mt-1">Cổng Thu Quỹ Lớp - Thủ quỹ: {student.full_name}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchFeeData} className="bg-emerald-700 border border-emerald-400 px-3 py-2 rounded-xl font-bold hover:bg-emerald-600 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </button>
          <button onClick={onSwitchToStudentView} className="bg-white text-emerald-900 px-3.5 py-2 rounded-xl font-bold hover:bg-emerald-50 shadow transition">
            👁️ Xem Trang Cá Nhân Học Sinh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 italic">Đang tải dữ liệu quỹ lớp...</p>
      ) : loadError ? (
        <p className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-medium">{loadError}</p>
      ) : (
        <>
          <FundSummaryCards income={fund.income} expense={fund.expense} balance={fund.balance} />

          <div className="flex gap-2 flex-wrap">
            {tabBtn('payments', '✅ Đã nộp / Chưa nộp')}
            {tabBtn('ledger', '📒 Sổ Quỹ Thu – Chi')}
            {tabBtn('notify', '📢 Gửi Thông Báo Cho Lớp')}
          </div>

          {/* ===== (1) ĐÃ NỘP / CHƯA NỘP ===== */}
          {tab === 'payments' && (
            feeItems.length === 0 ? (
              <p className="p-4 bg-white border rounded-2xl text-slate-500 italic">Giáo viên chủ nhiệm chưa tạo khoản thu nào.</p>
            ) : (
              <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <Wallet className="w-4 h-4 text-emerald-600" /> Cập Nhật Tình Hình Nộp Tiền Theo Khoản Thu
                </h2>
                <div className="flex flex-wrap gap-2">
                  {feeItems.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFeeId(f.id)}
                      className={`px-3 py-2 rounded-xl font-bold transition ${f.id === selectedFeeId ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {f.title}
                    </button>
                  ))}
                </div>

                {selectedFee && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase">Mức thu / HS</span>
                        <span className="text-sm font-black text-indigo-700">{formatMoney(amount)}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase">Hạn nộp</span>
                        <span className="text-sm font-black text-slate-700">{selectedFee.deadline ? formatDateVN(selectedFee.deadline) : 'Không có'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <span className="block text-[10px] font-bold text-emerald-700 uppercase">Đã nộp</span>
                        <span className="text-sm font-black text-emerald-700">{paidCount}/{classStudents.length} HS · {formatMoney(paidCount * amount)}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                        <span className="block text-[10px] font-bold text-rose-700 uppercase">Còn thiếu</span>
                        <span className="text-sm font-black text-rose-700">{classStudents.length - paidCount} HS · {formatMoney((classStudents.length - paidCount) * amount)}</span>
                      </div>
                    </div>
                    {recordedForFee(selectedFee.id) !== paidCount * amount && (
                      <p className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                        ⚠️ Theo danh sách đã nộp: <strong>{formatMoney(paidCount * amount)}</strong>, nhưng Sổ quỹ mới ghi thu cho khoản này: <strong>{formatMoney(recordedForFee(selectedFee.id))}</strong>.
                        {' '}Nhớ vào thẻ "📒 Sổ Quỹ Thu – Chi" ghi số tiền đã thu (chọn đúng khoản thu liên quan).
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="text" placeholder="🔍 Tìm theo tên hoặc MSHS..." value={search}
                        onChange={e => setSearch(e.target.value)} className="p-2 border rounded-xl flex-1 min-w-[180px]"
                      />
                      <select value={filter} onChange={e => setFilter(e.target.value as 'all' | 'paid' | 'unpaid')} className="p-2 border rounded-xl">
                        <option value="all">Tất cả</option>
                        <option value="unpaid">Chưa nộp</option>
                        <option value="paid">Đã nộp</option>
                      </select>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 font-bold border-b text-slate-700">
                          <tr>
                            <th className="p-2 border-r">MSHS</th>
                            <th className="p-2 border-r">Họ Tên</th>
                            <th className="p-2 border-r text-center">Tổ</th>
                            <th className="p-2 text-center">Trạng thái (bấm để đổi)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {visibleStudents.map(s => {
                            const paid = isPaid(s.id, selectedFee.id);
                            const busy = busyKey === `${s.id}|${selectedFee.id}`;
                            return (
                              <tr key={s.id} className="hover:bg-slate-50">
                                <td className="p-2 border-r font-mono">{s.code}</td>
                                <td className="p-2 border-r font-semibold">{s.full_name}</td>
                                <td className="p-2 border-r text-center">{s.group_number || 1}</td>
                                <td className="p-2 text-center">
                                  <button
                                    disabled={!!busyKey}
                                    onClick={() => handleToggle(s, selectedFee.id)}
                                    className={`px-3 py-1 rounded-full font-bold inline-flex items-center gap-1 disabled:opacity-60 ${paid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}
                                  >
                                    {busy ? 'Đang lưu...' : paid
                                      ? <><CheckCircle className="w-3.5 h-3.5" /> Đã nộp</>
                                      : <><XCircle className="w-3.5 h-3.5" /> Chưa nộp</>}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {visibleStudents.length === 0 && (
                            <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">Không có học sinh phù hợp.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-slate-500 italic">* Thay đổi được lưu ngay; học sinh thấy trạng thái của mình ở mục "Các Khoản Thu & Quỹ Lớp". Thủ quỹ không tạo/xóa được khoản thu — việc này do GVCN thực hiện.</p>
                  </>
                )}
              </div>
            )
          )}

          {/* ===== (2) SỔ QUỸ THU – CHI ===== */}
          {tab === 'ledger' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border shadow-sm space-y-3 h-fit">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <PlusCircle className="w-4 h-4 text-emerald-600" /> Ghi Khoản Thu / Chi Mới
                </h2>
                <form onSubmit={handleAddTransaction} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setTxType('income')}
                      className={`py-2 rounded-xl font-bold transition ${txType === 'income' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-600'}`}>
                      ➕ Thu tiền
                    </button>
                    <button type="button" onClick={() => { setTxType('expense'); setTxFeeId(''); }}
                      className={`py-2 rounded-xl font-bold transition ${txType === 'expense' ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 text-slate-600'}`}>
                      ➖ Chi tiền
                    </button>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Ngày {txType === 'income' ? 'thu' : 'chi'} (*):</label>
                    <input type="date" value={txDate} max={todayLocalISO()} onChange={e => setTxDate(e.target.value)} className="w-full p-2 border rounded-xl" required />
                  </div>
                  {txType === 'income' && feeItems.length > 0 && (
                    <div>
                      <label className="font-semibold block mb-1">Thuộc khoản thu (không bắt buộc):</label>
                      <select value={txFeeId} onChange={e => handlePickFeeForIncome(e.target.value)} className="w-full p-2 border rounded-xl">
                        <option value="">-- Khoản thu khác / không theo khoản --</option>
                        {feeItems.map(f => <option key={f.id} value={f.id}>{f.title} ({formatMoney(Number(f.amount || 0))}/HS)</option>)}
                      </select>
                      {txFeeId && (() => {
                        const f = feeItems.find(x => x.id === txFeeId);
                        if (!f) return null;
                        return (
                          <p className="text-[11px] text-slate-500 mt-1 italic">
                            Đã nộp {paidCountOf(f.id)} HS × {formatMoney(Number(f.amount || 0))} = {formatMoney(paidCountOf(f.id) * Number(f.amount || 0))}; đã ghi sổ {formatMoney(recordedForFee(f.id))}.
                          </p>
                        );
                      })()}
                    </div>
                  )}
                  <div>
                    <label className="font-semibold block mb-1">Số tiền (VNĐ) (*):</label>
                    <input
                      type="text" inputMode="numeric" placeholder="VD: 500.000"
                      value={txAmount}
                      onChange={e => {
                        const digits = e.target.value.replace(/[^0-9]/g, '');
                        setTxAmount(digits ? Number(digits).toLocaleString('vi-VN') : '');
                      }}
                      className={`w-full p-2 border rounded-xl font-bold ${txType === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Nội dung (*):</label>
                    <input
                      type="text" maxLength={500}
                      placeholder={txType === 'income' ? 'VD: Thu quỹ lớp đợt 1 (15 bạn)' : 'VD: Mua hoa tặng thầy cô 20/11'}
                      value={txDesc} onChange={e => setTxDesc(e.target.value)}
                      className="w-full p-2 border rounded-xl" required
                    />
                  </div>
                  <button type="submit" disabled={txSaving}
                    className={`w-full py-2.5 text-white font-bold rounded-xl shadow transition disabled:opacity-60 ${txType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                    {txSaving ? 'Đang lưu...' : txType === 'income' ? 'Ghi Khoản Thu' : 'Ghi Khoản Chi'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-3 bg-white p-5 rounded-2xl border shadow-sm space-y-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Sổ Quỹ Lớp ({transactions.length} dòng)
                </h2>
                <FundLedgerTable rows={ledgerRows} feeItems={feeItems} onDelete={handleDeleteTransaction} />
                <p className="text-[11px] text-slate-500 italic">* Nhập nhầm thì bấm 🗑️ để xóa rồi ghi lại. Cả lớp và GVCN đều xem được sổ quỹ này.</p>
              </div>
            </div>
          )}

          {/* ===== (3) THÔNG BÁO ===== */}
          {tab === 'notify' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <Bell className="w-4 h-4 text-emerald-600" /> Soạn Thông Báo Gửi Cả Lớp
                </h2>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 font-semibold text-emerald-900">
                    <input type="checkbox" checked={includeUnpaidNames} onChange={e => setIncludeUnpaidNames(e.target.checked)} />
                    Kèm tên các bạn chưa nộp
                  </label>
                  <button type="button" onClick={buildAutoReport} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow">
                    ⚡ Tạo nội dung tổng hợp tự động
                  </button>
                  <p className="text-[11px] text-emerald-800 italic">Tự điền: tổng thu, tổng chi, quỹ còn lại, tình hình nộp từng khoản, các khoản chi gần đây. Em sửa lại nếu cần rồi bấm Gửi.</p>
                </div>
                <form onSubmit={handleSendAnnouncement} className="space-y-3">
                  <input type="text" maxLength={150} placeholder="Tiêu đề (VD: Nhắc nộp quỹ lớp đợt 2)" value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="w-full p-2 border rounded-xl" />
                  <textarea rows={10} placeholder="Nội dung thông báo..." value={annContent} onChange={e => setAnnContent(e.target.value)} className="w-full p-2 border rounded-xl font-mono text-[11px]" required />
                  <label className="flex items-center gap-2 font-bold text-amber-700">
                    <input type="checkbox" checked={annImportant} onChange={e => setAnnImportant(e.target.checked)} /> Đánh dấu quan trọng
                  </label>
                  <button type="submit" disabled={annSending} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow disabled:opacity-60">
                    {annSending ? 'Đang gửi...' : '📢 Gửi Thông Báo Cho Cả Lớp'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
                <h2 className="text-sm font-bold text-slate-800 border-b pb-2">Thông Báo Thủ Quỹ Đã Gửi ({myAnnouncements.length})</h2>
                {myAnnouncements.length === 0 ? (
                  <p className="text-slate-400 italic">Chưa gửi thông báo nào.</p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {myAnnouncements.map(a => (
                      <div key={a.id} className={`p-3 rounded-xl border ${a.important ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50'}`}>
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-slate-800">{a.title}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-slate-400">{formatDateVN(a.created_date)}</span>
                            <button onClick={() => handleDeleteAnnouncement(a)} title="Xóa thông báo gửi nhầm" className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-600 whitespace-pre-line mt-1">{a.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------- THÀNH PHẦN DÙNG CHUNG CHO SỔ QUỸ (Thủ quỹ, Học sinh, GVCN) ----------
function FundSummaryCards({ income, expense, balance }: { income: number; expense: number; balance: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
        <span className="block text-[10px] font-bold text-emerald-700 uppercase">Tổng đã thu</span>
        <span className="text-base font-black text-emerald-700">{formatMoney(income)}</span>
      </div>
      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
        <span className="block text-[10px] font-bold text-rose-700 uppercase">Tổng đã chi</span>
        <span className="text-base font-black text-rose-700">{formatMoney(expense)}</span>
      </div>
      <div className={`p-3.5 rounded-2xl border ${balance < 0 ? 'bg-rose-100 border-rose-300' : 'bg-indigo-50 border-indigo-200'}`}>
        <span className="block text-[10px] font-bold text-indigo-700 uppercase">Quỹ lớp còn lại</span>
        <span className={`text-base font-black ${balance < 0 ? 'text-rose-700' : 'text-indigo-700'}`}>{formatMoney(balance)}</span>
      </div>
    </div>
  );
}

function FundLedgerTable({ rows, feeItems, onDelete }: {
  rows: (FundTransaction & { balance_after: number })[];
  feeItems: FeeItem[];
  onDelete?: (t: FundTransaction) => void;
}) {
  if (rows.length === 0) return <p className="text-slate-400 italic">Chưa có khoản thu/chi nào trong sổ quỹ.</p>;
  return (
    <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 font-bold border-b text-slate-700 sticky top-0">
          <tr>
            <th className="p-2 border-r text-center">Ngày</th>
            <th className="p-2 border-r">Nội dung</th>
            <th className="p-2 border-r text-right">Thu</th>
            <th className="p-2 border-r text-right">Chi</th>
            <th className="p-2 text-right">Tồn quỹ</th>
            {onDelete && <th className="p-2 text-center">Xóa</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(t => {
            const fee = t.fee_item_id ? feeItems.find(f => f.id === t.fee_item_id) : null;
            return (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="p-2 border-r text-center font-mono whitespace-nowrap">{formatDateVN(t.tx_date)}</td>
                <td className="p-2 border-r">
                  {t.description}
                  {fee && <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">{fee.title}</span>}
                </td>
                <td className="p-2 border-r text-right font-bold text-emerald-700 whitespace-nowrap">{t.tx_type === 'income' ? formatMoney(t.amount) : ''}</td>
                <td className="p-2 border-r text-right font-bold text-rose-700 whitespace-nowrap">{t.tx_type === 'expense' ? formatMoney(t.amount) : ''}</td>
                <td className={`p-2 text-right font-bold whitespace-nowrap ${t.balance_after < 0 ? 'text-rose-700' : 'text-indigo-700'}`}>{formatMoney(t.balance_after)}</td>
                {onDelete && (
                  <td className="p-2 text-center">
                    <button onClick={() => onDelete(t)} title="Xóa dòng nhập nhầm" className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ==================== 5. BẢNG ĐIỀU KHIỂN GIÁO VIÊN CHỦ NHIỆM ====================
function TeacherDashboard({ teacher }: { teacher: Teacher }) {
  const [activeTab, setActiveTab] = useState<'students' | 'fees' | 'announcements' | 'reports' | 'groups' | 'oral'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [fundTx, setFundTx] = useState<FundTransaction[] | null>(null);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ code: '', full_name: '', dob: '', class_role: 'Học sinh', group_number: 1, password: '' });
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [oralTabOpened, setOralTabOpened] = useState(false);
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

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annImportant, setAnnImportant] = useState(false);

  useEffect(() => {
    fetchData();
  }, [teacher.id]);

  // Thủ quỹ / Lớp trưởng nhập dữ liệu từ máy khác → mỗi lần GV mở tab Khoản thu hoặc Thi đua thì tải lại
  // để thấy ngay trạng thái nộp tiền, vi phạm mới nhất (không cần đăng xuất / F5).
  useEffect(() => {
    if (activeTab === 'fees' || activeTab === 'reports') fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    const [stRes, fRes, aRes, rRes] = await Promise.all([
      supabase.from('students').select('*').eq('teacher_id', teacher.id).order('code', { ascending: true }),
      supabase.from('fee_items').select('*').eq('teacher_id', teacher.id),
      supabase.from('announcements').select('*').eq('teacher_id', teacher.id).order('created_date', { ascending: false }),
      supabase.from('student_records').select('*').eq('teacher_id', teacher.id).order('week_number', { ascending: false })
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

    // Sổ quỹ lớp do Thủ quỹ ghi (bảng class_fund_transactions — tạo bằng file SQL 05). Lỗi = chưa chạy SQL → ẩn.
    const { data: fData, error: fErr } = await supabase
      .from('class_fund_transactions').select('*').eq('teacher_id', teacher.id)
      .order('tx_date', { ascending: false }).order('created_at', { ascending: false });
    setFundTx(fErr ? null : normalizeFundTx(fData));
  };

  // Tìm các học sinh KHÁC đang giữ chức vụ "chỉ 1 người" (để tránh 2 Lớp phó học tập, 2 Lớp trưởng...).
  // Tổ trưởng: chỉ xét trong cùng Tổ. Các chức vụ khác (Học sinh, Lớp phó chung...) → không xung đột.
  const findRoleConflicts = (role: string, excludeId: string | null, groupNumber?: number): Student[] => {
    if (role === 'Tổ trưởng') {
      const g = groupNumber || 1;
      return students.filter(s => s.class_role === role && (s.group_number || 1) === g && s.id !== excludeId);
    }
    if (!UNIQUE_CLASS_ROLES.includes(role)) return [];
    return students.filter(s => s.class_role === role && s.id !== excludeId);
  };

  // Hỏi GV có muốn chuyển chức vụ từ người đang giữ sang học sinh mới không.
  const confirmReplaceHolders = (role: string, holders: Student[], newName: string): boolean => {
    const names = holders.map(h => `${h.full_name} (${h.code})`).join(', ');
    return window.confirm(
      `Chức vụ "${role}" hiện đang do ${names} đảm nhiệm.\n\n` +
      `Bấm OK để chuyển chức vụ này cho ${newName} (người cũ sẽ trở về "Học sinh").\nBấm Hủy để giữ nguyên.`
    );
  };

  // Hàm thay đổi chức vụ trực tiếp cho học sinh
  const handleUpdateStudentRole = async (studentId: string, newRole: string) => {
    const target = students.find(s => s.id === studentId);
    if (!target) return;
    const conflicts = findRoleConflicts(newRole, studentId, target.group_number);
    if (conflicts.length > 0) {
      // Ô chọn là controlled theo state → khi Hủy, state không đổi nên ô tự trở về chức vụ cũ.
      if (!confirmReplaceHolders(newRole, conflicts, target.full_name)) return;
      await handleAssignSpecialRole(newRole, studentId, newRole === 'Tổ trưởng' ? (target.group_number || 1) : undefined, true);
      return;
    }

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

  // Hàm phân công 1 chức vụ Ban cán sự (Lớp trưởng, Lớp phó học tập, Lớp phó lao động, Bí thư, Thư ký, Thủ quỹ, Tổ trưởng) cho 1 học sinh.
  // Tự động thu hồi chức vụ của người tiền nhiệm đang giữ chức vụ đó (trong phạm vi restrictGroup nếu có,
  // dùng cho Tổ trưởng vì mỗi Tổ chỉ có 1 Tổ trưởng riêng). Truyền studentId = '' để chỉ thu hồi (bỏ trống chức vụ).
  const handleAssignSpecialRole = async (role: string, studentId: string, restrictGroup?: number, skipRoleChangeConfirm = false) => {
    // Mỗi học sinh chỉ giữ 1 chức vụ (cột class_role). Nếu học sinh được chọn đang giữ chức vụ khác
    // (VD đang là Lớp trưởng mà được chọn làm Lớp phó học tập) → hỏi lại để tránh vô tình mất chức vụ cũ.
    if (studentId && !skipRoleChangeConfirm) {
      const picked = students.find(s => s.id === studentId);
      const oldRole = picked?.class_role || 'Học sinh';
      if (picked && oldRole !== 'Học sinh' && oldRole !== role) {
        const ok = window.confirm(
          `${picked.full_name} hiện đang là "${oldRole}".\n` +
          `Mỗi học sinh chỉ giữ 1 chức vụ — nếu tiếp tục, ${picked.full_name} sẽ chuyển sang "${role}" và thôi giữ "${oldRole}".\n\nTiếp tục?`
        );
        if (!ok) return;
      }
    }
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
    // Nếu chọn chức vụ "chỉ 1 người" mà đã có người giữ → hỏi GV trước.
    // Thêm học sinh mới TRƯỚC, thành công rồi mới thu hồi chức vụ người cũ
    // (tránh trường hợp thêm lỗi — VD trùng MSHS — mà người cũ đã bị mất chức vụ).
    const conflicts = findRoleConflicts(newStudentRole, null, newStudentGroup);
    if (conflicts.length > 0 && !confirmReplaceHolders(newStudentRole, conflicts, newStudentName.trim() || 'học sinh mới')) return;

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

    if (error) {
      alert('Lỗi thêm học sinh: ' + error.message);
      return;
    }
    if (conflicts.length > 0) {
      const { error: resetErr } = await supabase
        .from('students')
        .update({ class_role: 'Học sinh' })
        .in('id', conflicts.map(c => c.id));
      if (resetErr) alert('Đã thêm học sinh nhưng chưa thu hồi được chức vụ của người cũ: ' + resetErr.message);
    }
    setNewStudentCode(''); setNewStudentName(''); setNewStudentDob(''); setNewStudentPassword('');
    setNewStudentRole('Học sinh');
    fetchData();
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

    // Kiểm tra trùng chức vụ "chỉ 1 người" (Tổ trưởng: xét theo Tổ mới trong form).
    const conflicts = findRoleConflicts(editForm.class_role, editingStudent.id, editForm.group_number);
    if (conflicts.length > 0 && !confirmReplaceHolders(editForm.class_role, conflicts, editForm.full_name.trim() || editingStudent.full_name)) return;

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
    if (conflicts.length > 0) {
      const { error: resetErr } = await supabase
        .from('students')
        .update({ class_role: 'Học sinh' })
        .in('id', conflicts.map(c => c.id));
      if (resetErr) alert('Đã lưu thông tin nhưng chưa thu hồi được chức vụ của người cũ: ' + resetErr.message);
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
      // Không dùng cellDates + toISOString (bị lùi 1 ngày sinh do múi giờ UTC+7) → tự đọc ngày bằng excelDateToISO.
      const workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
      const date1904 = !!(workbook as any).Workbook?.WBProps?.date1904;
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      // rawRows: giá trị gốc (dùng cho Ngày sinh dạng số serial, Tổ).
      // textRows: đúng chữ GV nhìn thấy trong ô (giữ số 0 đầu của MSHS/Mật khẩu như 001, 0912...).
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const textRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

      // Tìm cột theo tên KHÔNG phân biệt hoa/thường, dấu tiếng Việt kiểu tổ hợp (Unikey/VNI), khoảng trắng thừa.
      // Trước đây tiêu đề "Mật khẩu" gõ kiểu tổ hợp hoặc thừa dấu cách sẽ KHÔNG khớp → mật khẩu bị
      // ngầm đặt bằng MSHS, khác với mật khẩu GV ghi trong file → học sinh đăng nhập báo sai.
      const pick = (r: any, names: string[]): any => {
        const wanted = names.map(toRoleKey);
        for (const k of Object.keys(r)) {
          if (wanted.includes(toRoleKey(String(k).normalize('NFC')))) {
            const v = r[k];
            if (v !== '' && v !== null && v !== undefined) return v;
          }
        }
        return '';
      };
      const cleanText = (v: any): string => String(v ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
      // Chữ hiển thị của ô; riêng số quá dài bị Excel hiện dạng 1,23E+10 thì lấy lại số gốc.
      const cellText = (r: any, t: any, names: string[]): string => {
        const rawV = pick(r, names);
        const txt = String(pick(t, names) ?? '').normalize('NFC');
        if (typeof rawV === 'number' && /e[+-]?\d/i.test(txt)) return String(rawV);
        return txt.trim();
      };

      const mapped = rawRows.map((r, i) => {
        const t = textRows[i] || r;
        const dob = excelDateToISO(pick(r, ['Ngày sinh', 'DOB']), date1904);
        const code = cellText(r, t, ['MSHS', 'Mã số', 'Mã số học sinh', 'Mã HS']).replace(/\s+/g, '').toUpperCase();
        // Nếu file Excel không có cột Mật khẩu (hoặc để trống), mặc định lấy MSHS làm mật khẩu ban đầu
        // — Giáo viên nên vào "Sửa" từng học sinh để đổi lại mật khẩu riêng cho bảo mật.
        const password = cellText(r, t, ['Mật khẩu', 'Mat khau', 'Password', 'MK']).trim() || code;
        return {
          teacher_id: teacher.id,
          code,
          full_name: cleanText(pick(t, ['Họ và tên', 'Họ tên'])),
          password,
          dob: dob || null,
          class_role: normalizeRole(pick(t, ['Chức vụ'])),
          group_number: Number(pick(r, ['Tổ', 'Nhóm']) || 1) || 1,
        };
      }).filter(r => r.code && r.full_name);

      if (mapped.length === 0) {
        alert('Không đọc được dữ liệu. Kiểm tra file có đúng cột: MSHS, Họ và tên, Ngày sinh, Chức vụ, Tổ không.');
        setImporting(false);
        return;
      }

      const { error } = await supabase.from('students').upsert(mapped, { onConflict: 'teacher_id,code' });
      if (error) alert('Lỗi khi nhập danh sách: ' + error.message);
      else {
        // Cảnh báo (không chặn) nếu sau khi nhập có chức vụ "chỉ 1 người" bị trùng
        // (trùng ngay trong file, hoặc trùng với học sinh đang có trong lớp mà file không ghi đè).
        const importedCodes = new Set(mapped.map(m => m.code));
        const finalList = [
          ...students.filter(s => !importedCodes.has((s.code || '').toUpperCase())),
          ...mapped,
        ];
        const dupWarnings: string[] = [];
        UNIQUE_CLASS_ROLES.forEach(role => {
          const holders = finalList.filter(s => s.class_role === role);
          if (holders.length > 1) dupWarnings.push(`• ${role}: ${holders.map(h => h.full_name).join(', ')}`);
        });
        [1, 2, 3, 4].forEach(g => {
          const holders = finalList.filter(s => s.class_role === 'Tổ trưởng' && (s.group_number || 1) === g);
          if (holders.length > 1) dupWarnings.push(`• Tổ trưởng Tổ ${g}: ${holders.map(h => h.full_name).join(', ')}`);
        });
        alert(
          `Đã nhập thành công ${mapped.length} học sinh!` +
          (dupWarnings.length > 0
            ? `\n\n⚠️ Có chức vụ đang bị trùng người giữ:\n${dupWarnings.join('\n')}\n\nVui lòng vào tab Phân Chia Tổ & Ban Cán Sự để chọn lại.`
            : '')
        );
        fetchData();
      }
    } catch (err: any) {
      alert('Lỗi đọc file Excel: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportStudents = () => {
    const data = students.map(s => ({
      'MSHS': s.code,
      'Họ và tên': s.full_name,
      'Ngày sinh': s.dob || '',
      'Mật khẩu': s.password || '',
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

  const handleDeleteFundTx = async (t: FundTransaction) => {
    if (!confirm(`Xóa dòng sổ quỹ: ${t.tx_type === 'income' ? 'THU' : 'CHI'} ${formatMoney(t.amount)} ngày ${formatDateVN(t.tx_date)} — "${t.description}"?`)) return;
    const { error } = await supabase.from('class_fund_transactions').delete().eq('id', t.id);
    if (error) { alert('Lỗi xóa: ' + error.message); return; }
    setFundTx(prev => (prev || []).filter(x => x.id !== t.id));
  };

  const handleExportFund = () => {
    const rows = withRunningBalance(fundTx || []).reverse().map(t => ({
      'Ngày': formatDateVN(t.tx_date),
      'Nội dung': t.description,
      'Khoản thu liên quan': feeItems.find(f => f.id === t.fee_item_id)?.title || '',
      'Thu (đ)': t.tx_type === 'income' ? t.amount : '',
      'Chi (đ)': t.tx_type === 'expense' ? t.amount : '',
      'Tồn quỹ (đ)': t.balance_after,
      'Người ghi': t.created_by || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SoQuyLop');
    XLSX.writeFile(wb, `SoQuyLop_${todayLocalISO()}.xlsx`);
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
      { teacher_id: teacher.id, title: feeTitle.trim(), amount: Number(feeAmount), deadline: feeDeadline || null }
    ]);
    if (!error) {
      setFeeTitle(''); setFeeAmount(''); setFeeDeadline('');
      fetchData();
    } else {
      alert('Lỗi: ' + error.message);
    }
  };

  // Xóa khoản thu tạo nhầm (kèm toàn bộ trạng thái nộp tiền của khoản đó).
  const handleDeleteFeeItem = async (f: FeeItem) => {
    const paidCount = feePayments.filter(p => p.fee_item_id === f.id && p.is_paid).length;
    if (!confirm(`Xóa khoản thu "${f.title}"?` + (paidCount ? `\n${paidCount} học sinh đã được đánh dấu "Đã nộp" — dữ liệu này cũng sẽ bị xóa.` : ''))) return;
    await supabase.from('fee_payments').delete().eq('fee_item_id', f.id);
    const { error } = await supabase.from('fee_items').delete().eq('id', f.id);
    if (error) alert('Không xóa được khoản thu: ' + error.message);
    if (selectedFeeForUnpaid === f.id) setSelectedFeeForUnpaid('');
    fetchData();
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('announcements').insert([
      { teacher_id: teacher.id, title: annTitle, content: annContent, important: annImportant, created_date: todayLocalISO() }
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
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) {
        alert('Không xóa được học sinh: ' + error.message);
        return;
      }
      fetchData();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs font-sans">
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bảng Quản Lý Lớp Chủ Nhiệm - {teacher.full_name}</h1>
          <p className="text-slate-500 mt-0.5">Trường: {teacher.school || 'THPT'} | Quản lý riêng danh sách học sinh</p>
          {teacher.class_code && (
            <p className="mt-1 text-slate-600">Mã Lớp cho học sinh đăng nhập: <strong className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{teacher.class_code}</strong></p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveTab('students')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>👨‍🎓 Danh Sách Học Sinh</button>
          <button onClick={() => setActiveTab('groups')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'groups' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>🗂️ Phân Chia Tổ & Ban Cán Sự</button>
          <button onClick={() => setActiveTab('fees')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'fees' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>💰 Quản Lý Khoản Thu</button>
          <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>📊 Thi Đua & Báo Cáo</button>
          <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'announcements' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>📢 Thông Báo & Dặn Dò</button>
          <button onClick={() => { setActiveTab('oral'); setOralTabOpened(true); }} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'oral' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100'}`}>📝 Điểm Kiểm Tra Miệng</button>
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
                        {getRoleOptions(s.class_role).map(role => <option key={role} value={role}>{role}</option>)}
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
              <p className="text-slate-500 text-[11px] mt-1">Tick chọn học sinh vào Tổ tương ứng. Mỗi học sinh chỉ thuộc 1 Tổ — tick vào Tổ khác sẽ tự động chuyển học sinh sang Tổ đó.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(groupNum => (
                <div key={groupNum} className="border rounded-2xl overflow-hidden">
                  <div className="bg-indigo-600 text-white font-bold px-3 py-2 flex justify-between items-center">
                    <span>Tổ {groupNum}</span>
                    <span className="bg-indigo-800/60 px-2 py-0.5 rounded-full text-[10px]">
                      {students.filter(s => (s.group_number || 1) === groupNum).length} HS
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y">
                    {students.map(s => {
                      const checked = (s.group_number || 1) === groupNum;
                      return (
                        <label key={s.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 ${checked ? 'bg-indigo-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleAssignGroup(s.id, groupNum)}
                            className="w-4 h-4 accent-indigo-600"
                          />
                          <span className="flex-1">
                            <span className="font-mono text-indigo-700 font-bold mr-1">{s.code}</span>
                            {s.full_name}
                          </span>
                          {checked && s.class_role === 'Tổ trưởng' && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Tổ trưởng</span>
                          )}
                        </label>
                      );
                    })}
                    {students.length === 0 && <p className="p-3 text-slate-400 italic">Chưa có học sinh trong lớp.</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">👥 Phân Công Ban Cán Sự Lớp</h2>
              <p className="text-slate-500 text-[11px] mt-1">Chọn học sinh đảm nhiệm từng chức vụ. Hệ thống tự động thu hồi chức vụ cũ của người tiền nhiệm (nếu có).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {UNIQUE_CLASS_ROLES.map(role => {
                const holders = students.filter(s => s.class_role === role);
                // Khi đang bị trùng (>1 người), để ô chọn trống để GV chọn lại được cả người đầu danh sách.
                const currentHolderId = holders.length === 1 ? holders[0].id : '';
                return (
                  <div key={role} className="p-3 border rounded-xl bg-slate-50 space-y-1.5">
                    <label className="font-bold text-slate-700 block">{role}:</label>
                    {holders.length > 1 && (
                      <p className="text-[10px] text-red-600 font-semibold">
                        ⚠️ Đang có {holders.length} học sinh cùng giữ chức vụ này ({holders.map(h => h.full_name).join(', ')}). Chọn lại 1 người để hệ thống tự thu hồi chức vụ của những người còn lại.
                      </p>
                    )}
                    <select
                      value={currentHolderId}
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
          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h2 className="font-bold text-slate-800 text-sm mb-3">Tạo Khoản Thu / Quỹ Lớp Mới</h2>
            <form onSubmit={handleAddFeeItem} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input type="text" required placeholder="Tên khoản thu" value={feeTitle} onChange={e => setFeeTitle(e.target.value)} className="p-2 border rounded-xl" />
              <input type="number" required min="0" placeholder="Số tiền (VNĐ)" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} className="p-2 border rounded-xl" />
              <input type="date" value={feeDeadline} onChange={e => setFeeDeadline(e.target.value)} className="p-2 border rounded-xl" />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow">Tạo Khoản Thu</button>
            </form>
          </div>

          {(() => {
            const treasurers = students.filter(s => isTreasurer(s));
            return (
              <div className={`p-3 rounded-xl border ${treasurers.length ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                {treasurers.length
                  ? <>💰 Thủ quỹ: <strong>{treasurers.map(t => `${t.full_name} (${t.code})`).join(', ')}</strong> — em đăng nhập bằng tài khoản học sinh sẽ vào <strong>Cổng Thu Quỹ Lớp</strong> để đánh dấu Đã nộp / Chưa nộp, ghi Sổ quỹ thu – chi và gửi thông báo quỹ cho lớp. Thầy/cô chỉnh trạng thái nộp ở tab "📊 Thi Đua & Báo Cáo" → "Danh Sách Chưa Nộp Khoản Thu".</>
                  : <>⚠️ Lớp chưa có Thủ quỹ. Vào tab "🗂️ Phân Chia Tổ & Ban Cán Sự" để phân công, Thủ quỹ sẽ cập nhật tình hình nộp tiền và sổ quỹ.</>}
              </div>
            );
          })()}

          <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 font-bold border-b text-slate-700">
                <tr>
                  <th className="p-3 border-r">Tên Khoản Thu</th>
                  <th className="p-3 border-r text-right">Số Tiền</th>
                  <th className="p-3 border-r text-center">Hạn Hoàn Thành</th>
                  <th className="p-3 border-r text-center">Đã Nộp</th>
                  <th className="p-3 border-r text-right">Đã Thu</th>
                  <th className="p-3 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {feeItems.map((f: FeeItem) => {
                  const paid = students.filter(s => feePayments.some(p => p.student_id === s.id && p.fee_item_id === f.id && p.is_paid)).length;
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="p-3 border-r font-bold">{f.title}</td>
                      <td className="p-3 border-r text-right font-bold text-indigo-700">{Number(f.amount).toLocaleString()} VNĐ</td>
                      <td className="p-3 border-r text-center">{f.deadline || 'Không có'}</td>
                      <td className="p-3 border-r text-center font-bold">{paid}/{students.length}</td>
                      <td className="p-3 border-r text-right font-bold text-emerald-700">{(paid * Number(f.amount || 0)).toLocaleString()} VNĐ</td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleDeleteFeeItem(f)} title="Xóa khoản thu" className="p-1.5 text-rose-600 hover:bg-rose-50 rounded">
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {feeItems.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center text-slate-400 italic">Chưa có khoản thu nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {fundTx === null ? (
            <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">⚠️ Chưa bật Sổ quỹ lớp: thầy/cô cần chạy file SQL "05_thu_quy_nhap_khoan_thu.sql" (bản mới) trong Supabase.</p>
          ) : (
            <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <h2 className="font-bold text-slate-800 text-sm">📒 Sổ Quỹ Lớp (Thủ quỹ ghi thu – chi)</h2>
                <button onClick={handleExportFund} disabled={fundTx.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl font-bold disabled:opacity-50">📥 Xuất Excel Sổ Quỹ</button>
              </div>
              {(() => { const f = summarizeFund(fundTx); return <FundSummaryCards income={f.income} expense={f.expense} balance={f.balance} />; })()}
              <FundLedgerTable rows={withRunningBalance(fundTx)} feeItems={feeItems} onDelete={handleDeleteFundTx} />
            </div>
          )}
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

      {/* Tab Điểm miệng: chỉ tải lần đầu khi mở, sau đó GIỮ NGUYÊN (ẩn đi) khi chuyển tab khác
          để không mất điểm đang nhập dở chưa lưu. */}
      {oralTabOpened && (
        <div className={activeTab === 'oral' ? '' : 'hidden'}>
          <OralScoresTab teacher={teacher} />
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
                    {getRoleOptions(editForm.class_role).map(role => <option key={role} value={role}>{role}</option>)}
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

// ==================== 5b. ĐIỂM KIỂM TRA MIỆNG (CÁC LỚP GIẢNG DẠY) ====================
// Dữ liệu lưu ở 3 bảng Supabase: oral_classes, oral_students, oral_entries
// (tạo bằng file SQL "03_cap_nhat_diem_mieng_va_bao_mat.sql"). Danh sách học sinh ở đây ĐỘC LẬP với
// danh sách lớp chủ nhiệm, vì GV bộ môn dạy nhiều lớp khác nhau.
interface OralClass {
  id: string;
  teacher_id: string;
  name: string;
  school_year: string;
  semester: number;
  calc_method: 'average' | 'max';
  apply_mode: 'next' | 'previous';
  created_at?: string;
}

interface OralStudent {
  id: string;
  class_id: string;
  teacher_id: string;
  order_no: number;
  student_key: string;
  code: string;
  full_name: string;
  dob?: string | null;
}

interface OralEntry {
  id: string;
  class_id: string;
  student_id: string;
  teacher_id: string;
  entry_date: string;
  score: number | null;
  plus_points: number;
  minus_points: number;
  note: string;
}

interface OralDraftRow { score: string; plus: string; minus: string; note: string; }
interface ParsedOralStudent { order_no: number; code: string; full_name: string; dob: string | null; student_key: string; }

const EMPTY_ORAL_DRAFT: OralDraftRow = { score: '', plus: '', minus: '', note: '' };

const defaultSchoolYear = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() + 1 >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};
const defaultSemester = (): number => {
  const m = new Date().getMonth() + 1;
  return m >= 8 || m === 1 ? 1 : 2;
};

// Điểm miệng: để trống = không kiểm tra; cho phép dấu phẩy (7,5); tối đa 2 chữ số thập phân; 0 ≤ điểm ≤ 10.
const parseOralScore = (s: string): { ok: boolean; value: number | null } => {
  const t = s.trim().replace(',', '.');
  if (t === '') return { ok: true, value: null };
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(t)) return { ok: false, value: null };
  const v = Number(t);
  return v >= 0 && v <= 10 ? { ok: true, value: v } : { ok: false, value: null };
};
// Số điểm cộng / trừ trong 1 ngày: số nguyên 0–100, để trống = 0.
const parseOralCount = (s: string): { ok: boolean; value: number } => {
  const t = s.trim();
  if (t === '') return { ok: true, value: 0 };
  if (!/^\d{1,3}$/.test(t)) return { ok: false, value: 0 };
  const v = Number(t);
  return v <= 100 ? { ok: true, value: v } : { ok: false, value: 0 };
};

const makeOralStudentKey = (code: string, fullName: string, dob: string | null): string =>
  code ? `C:${code}` : `N:${toRoleKey(fullName)}|${dob || ''}`;

// Đọc 1 sheet danh sách lớp. Tự dò dòng tiêu đề trong 20 dòng đầu (file xuất từ phần mềm của trường
// thường có vài dòng tên trường/lớp phía trên). Nhận cả kiểu cột "Họ và tên" gộp hoặc "Họ đệm" + "Tên" tách rời.
const parseOralStudentSheet = (ws: any, date1904: boolean): ParsedOralStudent[] => {
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  const NAME_KEYS = ['ho va ten', 'ho ten', 'ho va ten hoc sinh', 'ho ten hoc sinh', 'ten hoc sinh', 'hoten', 'hovaten'];
  const LAST_KEYS = ['ho', 'ho dem', 'ho lot', 'ho va dem', 'ho va ten dem', 'ho va chu lot'];
  const CODE_KEYS = ['mshs', 'ma hs', 'ma hoc sinh', 'ma so hoc sinh', 'ma so', 'ma dinh danh', 'ma'];
  const STT_KEYS = ['stt', 'tt', 'so tt', 'so thu tu'];

  for (let h = 0; h < Math.min(rows.length, 20); h++) {
    const keys = (rows[h] || []).map((c: any) => toRoleKey(String(c ?? '')));
    const nameIdx = keys.findIndex((k: string) => NAME_KEYS.includes(k));
    const lastIdx = keys.findIndex((k: string) => LAST_KEYS.includes(k));
    const firstIdx = keys.findIndex((k: string) => k === 'ten');
    if (nameIdx < 0 && !(lastIdx >= 0 && firstIdx >= 0)) continue;

    const codeIdx = keys.findIndex((k: string) => CODE_KEYS.includes(k));
    const dobIdx = keys.findIndex((k: string) => k.startsWith('ngay sinh') || k === 'ns' || k === 'dob');
    const sttIdx = keys.findIndex((k: string) => STT_KEYS.includes(k));

    const result: ParsedOralStudent[] = [];
    const usedKeys = new Map<string, number>();
    for (let r = h + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const rawName = nameIdx >= 0
        ? String(row[nameIdx] ?? '')
        : `${String(row[lastIdx] ?? '')} ${String(row[firstIdx] ?? '')}`;
      const fullName = rawName.normalize('NFC').replace(/\s+/g, ' ').trim();
      const nameKey = toRoleKey(fullName);
      // Bỏ dòng trống, dòng số thuần, dòng tiêu đề lặp lại, dòng tổng kết cuối bảng.
      if (!fullName || /^[\d\s.,]+$/.test(fullName) || NAME_KEYS.includes(nameKey) || nameKey.startsWith('tong')) continue;

      const code = codeIdx >= 0 ? String(row[codeIdx] ?? '').normalize('NFC').trim().toUpperCase() : '';
      const dob = dobIdx >= 0 ? excelDateToISO(row[dobIdx], date1904) : null;
      const sttNum = sttIdx >= 0 ? Number(row[sttIdx]) : NaN;
      const orderNo = Number.isFinite(sttNum) && sttNum > 0 ? Math.floor(sttNum) : result.length + 1;

      // Trùng khóa trong cùng file (VD 2 bạn trùng họ tên, không có MSHS/ngày sinh) → thêm hậu tố
      // để không bị lỗi "ON CONFLICT ... cannot affect row a second time" khi lưu.
      let key = makeOralStudentKey(code, fullName, dob);
      const seen = usedKeys.get(key) || 0;
      usedKeys.set(key, seen + 1);
      if (seen > 0) key = `${key}#${seen + 1}`;

      result.push({ order_no: orderNo, code, full_name: fullName, dob, student_key: key });
    }
    return result;
  }
  return [];
};

function OralScoresTab({ teacher }: { teacher: Teacher }) {
  const [classes, setClasses] = useState<OralClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [oralStudents, setOralStudents] = useState<OralStudent[]>([]);
  const [entries, setEntries] = useState<OralEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newClass, setNewClass] = useState({
    name: '', school_year: defaultSchoolYear(), semester: defaultSemester(),
    calc_method: 'average' as 'average' | 'max', apply_mode: 'next' as 'next' | 'previous',
  });

  const [view, setView] = useState<'entry' | 'summary'>('entry');
  const [entryDate, setEntryDate] = useState<string>(todayLocalISO());
  const [draft, setDraft] = useState<Record<string, OralDraftRow>>({});
  const [dirty, setDirty] = useState(false);

  const [newStu, setNewStu] = useState({ full_name: '', code: '', dob: '' });

  const singleFileRef = useRef<HTMLInputElement>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);

  const selectedClass = classes.find(c => c.id === selectedClassId) || null;

  useEffect(() => {
    fetchClasses();
  }, [teacher.id]);

  useEffect(() => {
    if (selectedClassId) fetchClassData(selectedClassId);
    else { setOralStudents([]); setEntries([]); setDraft({}); setDirty(false); }
  }, [selectedClassId]);

  // Cảnh báo khi đóng/tải lại trang mà còn điểm chưa lưu.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const buildDraft = (date: string, list: OralEntry[]): Record<string, OralDraftRow> => {
    const d: Record<string, OralDraftRow> = {};
    list.filter(e => e.entry_date === date).forEach(e => {
      d[e.student_id] = {
        score: e.score === null || e.score === undefined ? '' : String(e.score).replace('.', ','),
        plus: e.plus_points ? String(e.plus_points) : '',
        minus: e.minus_points ? String(e.minus_points) : '',
        note: e.note || '',
      };
    });
    return d;
  };

  const confirmDiscard = (): boolean =>
    !dirty || window.confirm('Có điểm đã nhập nhưng CHƯA LƯU. Bỏ qua các thay đổi này?');

  const fetchClasses = async (selectId?: string) => {
    const { data, error } = await supabase
      .from('oral_classes')
      .select('*')
      .eq('teacher_id', teacher.id)
      .order('school_year', { ascending: false })
      .order('semester', { ascending: false })
      .order('name', { ascending: true });
    if (error) {
      alert('Lỗi tải danh sách lớp (đã chạy file SQL tạo bảng điểm miệng chưa?): ' + error.message);
      return;
    }
    const list = (data || []) as OralClass[];
    setClasses(list);
    if (selectId) setSelectedClassId(selectId);
    else if (selectedClassId && !list.some(c => c.id === selectedClassId)) setSelectedClassId('');
  };

  const fetchClassData = async (classId: string, keepDate = entryDate) => {
    setLoading(true);
    const [stRes, enRes] = await Promise.all([
      supabase.from('oral_students').select('*').eq('class_id', classId)
        .order('order_no', { ascending: true }).order('full_name', { ascending: true }),
      supabase.from('oral_entries').select('*').eq('class_id', classId),
    ]);
    setLoading(false);
    if (stRes.error || enRes.error) {
      alert('Lỗi tải dữ liệu lớp: ' + (stRes.error?.message || enRes.error?.message));
      return;
    }
    const st = (stRes.data || []) as OralStudent[];
    const en = ((enRes.data || []) as any[]).map(e => ({
      ...e,
      score: e.score === null || e.score === undefined ? null : Number(e.score), // numeric → có thể về dạng chuỗi
      plus_points: Number(e.plus_points) || 0,
      minus_points: Number(e.minus_points) || 0,
      note: e.note || '',
    })) as OralEntry[];
    setOralStudents(st);
    setEntries(en);
    setDraft(buildDraft(keepDate, en));
    setDirty(false);
  };

  const handleSelectClass = (id: string) => {
    if (id === selectedClassId) return;
    if (!confirmDiscard()) return;
    setDirty(false);
    setSelectedClassId(id);
  };

  const handleChangeDate = (date: string) => {
    if (!date || date === entryDate) return;
    if (!confirmDiscard()) return;
    setEntryDate(date);
    setDraft(buildDraft(date, entries));
    setDirty(false);
  };

  // ---------- LỚP ----------
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newClass.name.normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();
    const year = newClass.school_year.trim();
    if (!name) { alert('Vui lòng nhập tên lớp.'); return; }
    if (!/^\d{4}-\d{4}$/.test(year) || Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1) {
      alert('Năm học phải có dạng 2026-2027.');
      return;
    }
    if (classes.some(c => c.name === name && c.school_year === year && c.semester === newClass.semester)) {
      alert(`Lớp ${name} (HK${newClass.semester}, ${year}) đã có rồi.`);
      return;
    }
    if (!confirmDiscard()) return;
    const { data, error } = await supabase.from('oral_classes').insert([{
      teacher_id: teacher.id, name, school_year: year, semester: newClass.semester,
      calc_method: newClass.calc_method, apply_mode: newClass.apply_mode,
    }]).select().single();
    if (error) { alert('Lỗi tạo lớp: ' + error.message); return; }
    setNewClass({ ...newClass, name: '' });
    setShowCreate(false);
    setDirty(false);
    fetchClasses((data as OralClass).id);
  };

  const handleUpdateClassSetting = async (patch: Partial<Pick<OralClass, 'calc_method' | 'apply_mode'>>) => {
    if (!selectedClass) return;
    const { error } = await supabase.from('oral_classes').update(patch).eq('id', selectedClass.id);
    if (error) { alert('Lỗi lưu cài đặt: ' + error.message); return; }
    setClasses(prev => prev.map(c => (c.id === selectedClass.id ? { ...c, ...patch } : c)));
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;
    const typed = window.prompt(
      `XÓA lớp ${selectedClass.name} (HK${selectedClass.semester}, ${selectedClass.school_year}) sẽ xóa luôn toàn bộ học sinh và điểm miệng của lớp, KHÔNG khôi phục được.\n\nGõ đúng tên lớp "${selectedClass.name}" để xác nhận:`
    );
    if (typed === null) return;
    if (typed.trim().toUpperCase() !== selectedClass.name) { alert('Tên lớp không khớp, đã hủy xóa.'); return; }
    const { error } = await supabase.from('oral_classes').delete().eq('id', selectedClass.id);
    if (error) { alert('Lỗi xóa lớp: ' + error.message); return; }
    setDirty(false);
    setSelectedClassId('');
    fetchClasses();
  };

  // ---------- HỌC SINH ----------
  // Đồng bộ danh sách đọc từ Excel vào 1 lớp: khớp theo MSHS (hoặc Họ tên + Ngày sinh nếu không có MSHS).
  // Học sinh đã có → cập nhật (GIỮ NGUYÊN điểm đã nhập); học sinh mới → thêm; học sinh không có trong file → giữ nguyên.
  const syncStudentsToClass = async (classId: string, rows: ParsedOralStudent[]) => {
    const { data: exData, error: exErr } = await supabase.from('oral_students').select('*').eq('class_id', classId);
    if (exErr) throw exErr;
    const existing = (exData || []) as OralStudent[];
    const usedIds = new Set<string>();
    const updates: any[] = [];
    const inserts: any[] = [];

    for (const r of rows) {
      let match = existing.find(s => !usedIds.has(s.id) && s.student_key === r.student_key);
      if (!match) {
        match = existing.find(s =>
          !usedIds.has(s.id) &&
          toRoleKey(s.full_name) === toRoleKey(r.full_name) &&
          (r.code ? (!s.code || s.code === r.code) : true) &&
          (s.dob || '') === (r.dob || '')
        );
      }
      const payload = {
        class_id: classId, teacher_id: teacher.id, order_no: r.order_no,
        code: r.code, full_name: r.full_name, dob: r.dob, student_key: r.student_key,
      };
      if (match) {
        usedIds.add(match.id);
        updates.push({ id: match.id, ...payload });
      } else {
        inserts.push(payload);
      }
    }

    if (updates.length) {
      const { error } = await supabase.from('oral_students').upsert(updates, { onConflict: 'id' });
      if (error) throw error;
    }
    if (inserts.length) {
      const { error } = await supabase.from('oral_students').insert(inserts);
      if (error) throw error;
    }
    return { added: inserts.length, updated: updates.length, untouched: existing.length - usedIds.size };
  };

  const readWorkbook = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const date1904 = !!(wb as any).Workbook?.WBProps?.date1904;
    return wb.SheetNames
      .map((name: string) => ({ name: name.trim(), rows: parseOralStudentSheet(wb.Sheets[name], date1904) }))
      .filter((s: { rows: ParsedOralStudent[] }) => s.rows.length > 0);
  };

  const NO_DATA_MSG = 'Không đọc được danh sách học sinh. File cần có dòng tiêu đề chứa cột "Họ và tên" (hoặc 2 cột "Họ đệm" + "Tên"); các cột "MSHS", "Ngày sinh", "STT" là tùy chọn.';

  // Nhập 1 file vào LỚP ĐANG CHỌN (lấy sheet đầu tiên có dữ liệu).
  const handleImportSingle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClass) return;
    if (!confirmDiscard()) { if (singleFileRef.current) singleFileRef.current.value = ''; return; }
    setImporting(true);
    try {
      const sheets = await readWorkbook(file);
      if (sheets.length === 0) { alert(NO_DATA_MSG); return; }
      const sheet = sheets[0];
      if (sheets.length > 1 && !window.confirm(
        `File có ${sheets.length} sheet chứa danh sách. Chỉ nhập sheet đầu tiên "${sheet.name}" (${sheet.rows.length} HS) vào lớp ${selectedClass.name}.\n` +
        `(Muốn mỗi sheet thành 1 lớp riêng, hãy dùng nút "Nhập file nhiều lớp".)\n\nTiếp tục?`
      )) return;
      const res = await syncStudentsToClass(selectedClass.id, sheet.rows);
      alert(
        `Lớp ${selectedClass.name}: thêm mới ${res.added} HS, cập nhật ${res.updated} HS.` +
        (res.untouched > 0 ? `\nCó ${res.untouched} HS đang có trong lớp nhưng không có trong file — vẫn được giữ nguyên (xóa thủ công nếu cần).` : '')
      );
      fetchClassData(selectedClass.id);
    } catch (err: any) {
      alert('Lỗi nhập file Excel: ' + (err?.message || err));
    } finally {
      setImporting(false);
      if (singleFileRef.current) singleFileRef.current.value = '';
    }
  };

  // Nhập 1 file có NHIỀU SHEET: mỗi sheet = 1 lớp (tên sheet = tên lớp), dùng Năm học/HK/Cách tính ở form "Tạo lớp".
  const handleImportMulti = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirmDiscard()) { if (multiFileRef.current) multiFileRef.current.value = ''; return; }
    const year = newClass.school_year.trim();
    if (!/^\d{4}-\d{4}$/.test(year)) {
      alert('Vui lòng nhập Năm học hợp lệ (VD 2026-2027) ở khung "Tạo lớp mới" trước khi nhập file nhiều lớp.');
      if (multiFileRef.current) multiFileRef.current.value = '';
      return;
    }
    setImporting(true);
    try {
      const sheets = await readWorkbook(file);
      if (sheets.length === 0) { alert(NO_DATA_MSG); return; }
      const names = sheets.map((s: { name: string }) => s.name.normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase());
      const dupName = names.find((n: string, i: number) => names.indexOf(n) !== i);
      if (dupName) { alert(`Có 2 sheet cùng tên lớp "${dupName}". Vui lòng đổi tên sheet cho khác nhau.`); return; }
      if (!window.confirm(
        `Sẽ nhập ${sheets.length} lớp (HK${newClass.semester}, năm học ${year}):\n` +
        sheets.map((s: { rows: ParsedOralStudent[] }, i: number) => `• ${names[i]}: ${s.rows.length} HS`).join('\n') +
        `\n\nLớp đã có (trùng tên, năm học, học kì) sẽ được cập nhật danh sách, điểm cũ giữ nguyên. Tiếp tục?`
      )) return;

      const report: string[] = [];
      let lastClassId = '';
      for (let i = 0; i < sheets.length; i++) {
        const name = names[i];
        let cls = classes.find(c => c.name === name && c.school_year === year && c.semester === newClass.semester);
        if (!cls) {
          const { data, error } = await supabase.from('oral_classes').insert([{
            teacher_id: teacher.id, name, school_year: year, semester: newClass.semester,
            calc_method: newClass.calc_method, apply_mode: newClass.apply_mode,
          }]).select().single();
          if (error) { report.push(`• ${name}: LỖI tạo lớp — ${error.message}`); continue; }
          cls = data as OralClass;
        }
        try {
          const res = await syncStudentsToClass(cls.id, sheets[i].rows);
          report.push(`• ${name}: +${res.added} mới, ${res.updated} cập nhật`);
          lastClassId = cls.id;
        } catch (err: any) {
          report.push(`• ${name}: LỖI — ${err?.message || err}`);
        }
      }
      alert('Kết quả nhập file nhiều lớp:\n' + report.join('\n'));
      setDirty(false);
      await fetchClasses(lastClassId || undefined);
      if (lastClassId && lastClassId === selectedClassId) fetchClassData(lastClassId);
    } catch (err: any) {
      alert('Lỗi nhập file Excel: ' + (err?.message || err));
    } finally {
      setImporting(false);
      if (multiFileRef.current) multiFileRef.current.value = '';
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    const fullName = newStu.full_name.normalize('NFC').replace(/\s+/g, ' ').trim();
    const code = newStu.code.trim().toUpperCase();
    const dob = newStu.dob || null;
    if (!fullName) { alert('Vui lòng nhập họ tên học sinh.'); return; }
    const key = makeOralStudentKey(code, fullName, dob);
    if (oralStudents.some(s => s.student_key === key)) {
      alert('Học sinh này đã có trong lớp (trùng MSHS, hoặc trùng Họ tên + Ngày sinh).');
      return;
    }
    const maxOrder = oralStudents.reduce((m, s) => Math.max(m, s.order_no || 0), 0);
    const { error } = await supabase.from('oral_students').insert([{
      class_id: selectedClass.id, teacher_id: teacher.id, order_no: maxOrder + 1,
      code, full_name: fullName, dob, student_key: key,
    }]);
    if (error) { alert('Lỗi thêm học sinh: ' + error.message); return; }
    setNewStu({ full_name: '', code: '', dob: '' });
    // Giữ nguyên điểm đang nhập dở trên màn hình: chỉ tải lại danh sách học sinh.
    const { data } = await supabase.from('oral_students').select('*').eq('class_id', selectedClass.id)
      .order('order_no', { ascending: true }).order('full_name', { ascending: true });
    if (data) setOralStudents(data as OralStudent[]);
  };

  const handleDeleteStudent = async (s: OralStudent) => {
    const count = entries.filter(e => e.student_id === s.id).length;
    if (!window.confirm(`Xóa ${s.full_name} khỏi lớp?` + (count ? `\nToàn bộ ${count} lần nhập điểm của em này cũng sẽ bị xóa.` : ''))) return;
    const { error } = await supabase.from('oral_students').delete().eq('id', s.id);
    if (error) { alert('Lỗi xóa học sinh: ' + error.message); return; }
    setOralStudents(prev => prev.filter(x => x.id !== s.id));
    setEntries(prev => prev.filter(x => x.student_id !== s.id));
    setDraft(prev => { const n = { ...prev }; delete n[s.id]; return n; });
  };

  // ---------- NHẬP ĐIỂM THEO NGÀY ----------
  const updateDraft = (studentId: string, field: keyof OralDraftRow, value: string) => {
    setDraft(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || EMPTY_ORAL_DRAFT), [field]: value } }));
    setDirty(true);
  };

  const stepCount = (studentId: string, field: 'plus' | 'minus', delta: number) => {
    const cur = parseOralCount((draft[studentId] || EMPTY_ORAL_DRAFT)[field]);
    const next = Math.min(100, Math.max(0, (cur.ok ? cur.value : 0) + delta));
    updateDraft(studentId, field, next === 0 ? '' : String(next));
  };

  const handleSaveDay = async () => {
    if (!selectedClass) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) { alert('Vui lòng chọn ngày nhập điểm.'); return; }
    const errors: string[] = [];
    const upserts: any[] = [];
    const deleteIds: string[] = [];

    for (const s of oralStudents) {
      const d = draft[s.id] || EMPTY_ORAL_DRAFT;
      const existing = entries.find(e => e.student_id === s.id && e.entry_date === entryDate);
      const sc = parseOralScore(d.score);
      const pl = parseOralCount(d.plus);
      const mi = parseOralCount(d.minus);
      if (!sc.ok) errors.push(`${s.full_name}: điểm miệng "${d.score}" không hợp lệ (0 – 10)`);
      if (!pl.ok) errors.push(`${s.full_name}: điểm cộng "${d.plus}" phải là số nguyên 0 – 100`);
      if (!mi.ok) errors.push(`${s.full_name}: điểm trừ "${d.minus}" phải là số nguyên 0 – 100`);
      if (!sc.ok || !pl.ok || !mi.ok) continue;
      const note = d.note.trim();
      if (sc.value === null && pl.value === 0 && mi.value === 0 && !note) {
        if (existing) deleteIds.push(existing.id); // GV xóa trắng ô → xóa bản ghi ngày đó
        continue;
      }
      upserts.push({
        class_id: selectedClass.id, student_id: s.id, teacher_id: teacher.id, entry_date: entryDate,
        score: sc.value, plus_points: pl.value, minus_points: mi.value, note,
        updated_at: new Date().toISOString(),
      });
    }

    if (errors.length) {
      alert('Chưa lưu được, vui lòng sửa các ô sau:\n' + errors.slice(0, 12).join('\n') + (errors.length > 12 ? `\n... và ${errors.length - 12} lỗi khác` : ''));
      return;
    }
    if (!upserts.length && !deleteIds.length) { alert('Ngày này chưa có điểm nào để lưu.'); return; }

    setSaving(true);
    try {
      if (upserts.length) {
        const { error } = await supabase.from('oral_entries').upsert(upserts, { onConflict: 'student_id,entry_date' });
        if (error) throw error;
      }
      if (deleteIds.length) {
        const { error } = await supabase.from('oral_entries').delete().in('id', deleteIds);
        if (error) throw error;
      }
      setDirty(false);
      await fetchClassData(selectedClass.id, entryDate);
      alert(`Đã lưu điểm ngày ${formatDateVN(entryDate)}: ${upserts.length} học sinh` + (deleteIds.length ? `, xóa ${deleteIds.length} ô để trống.` : '.'));
    } catch (err: any) {
      alert('Lỗi lưu điểm: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  // ---------- TỔNG KẾT ----------
  const summaries: Record<string, OralSummary> = {};
  if (selectedClass) {
    oralStudents.forEach(s => {
      summaries[s.id] = computeOralSummary(
        entries.filter(e => e.student_id === s.id),
        selectedClass.calc_method,
        selectedClass.apply_mode || 'next'
      );
    });
  }
  const datesWithData = Array.from(new Set(entries.map(e => e.entry_date))).sort((a, b) => b.localeCompare(a));
  const isFutureDate = entryDate > todayLocalISO();

  const handleExport = () => {
    if (!selectedClass) return;
    const methodLabel = selectedClass.calc_method === 'max' ? 'Điểm cao nhất' : 'Trung bình cộng';
    const sheet1 = oralStudents.map((s, i) => {
      const sm = summaries[s.id];
      return {
        'STT': s.order_no || i + 1,
        'MSHS': s.code || '',
        'Họ và tên': s.full_name,
        'Ngày sinh': formatDateVN(s.dob),
        'Số lần KT': sm.tests.length,
        'Các lần KT (gốc → sau quy đổi)': sm.tests.map(t =>
          `${formatDateVN(t.date)}: ${formatScore(t.raw)}${t.adjusted !== t.raw || t.bonus || t.penalty ? ` → ${formatScore(t.adjusted)}` : ''}`
        ).join('; '),
        'Tổng điểm cộng': sm.totalPlus,
        'Tổng điểm trừ': sm.totalMinus,
        'Cộng còn dư': sm.plusLeft,
        'Trừ còn dư': sm.minusLeft,
        'Trung bình cộng': sm.average ?? '',
        'Điểm cao nhất': sm.max ?? '',
        [`Kết quả HK (${methodLabel})`]: sm.final ?? '',
      };
    });
    const nameById = new Map(oralStudents.map(s => [s.id, s.full_name]));
    const sheet2 = [...entries]
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date) || (nameById.get(a.student_id) || '').localeCompare(nameById.get(b.student_id) || ''))
      .map(e => ({
        'Ngày': formatDateVN(e.entry_date),
        'Họ và tên': nameById.get(e.student_id) || '',
        'Điểm miệng': e.score ?? '',
        'Điểm cộng': e.plus_points || 0,
        'Điểm trừ': e.minus_points || 0,
        'Ghi chú': e.note || '',
      }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1), 'TongKet');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2.length ? sheet2 : [{ 'Ngày': '', 'Họ và tên': '', 'Điểm miệng': '', 'Điểm cộng': '', 'Điểm trừ': '', 'Ghi chú': '' }]), 'NhatKyTheoNgay');
    const safe = `DiemMieng_${selectedClass.name}_HK${selectedClass.semester}_${selectedClass.school_year}`.replace(/[\\/:*?"<>|\s]+/g, '_');
    XLSX.writeFile(wb, `${safe}.xlsx`);
  };

  // ---------- GIAO DIỆN ----------
  return (
    <div className="space-y-6">
      {/* CHỌN / TẠO LỚP */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div className="flex-1 min-w-[240px]">
            <label className="font-bold text-slate-700 block mb-1">📝 Lớp giảng dạy:</label>
            <select value={selectedClassId} onChange={e => handleSelectClass(e.target.value)} className="w-full p-2 border rounded-xl bg-white">
              <option value="">-- Chọn lớp --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} — HK{c.semester} ({c.school_year})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowCreate(!showCreate)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-xl shadow flex items-center gap-1">
              <PlusCircle className="w-4 h-4" /> {showCreate ? 'Đóng' : 'Tạo lớp mới'}
            </button>
            <button type="button" disabled={importing} onClick={() => multiFileRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold px-3 py-2 rounded-xl shadow flex items-center gap-1">
              <FileText className="w-4 h-4" /> {importing ? 'Đang nhập...' : 'Nhập file nhiều lớp'}
            </button>
            <input ref={multiFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportMulti} />
          </div>
        </div>

        {showCreate && (
          <form onSubmit={handleCreateClass} className="p-4 border rounded-xl bg-slate-50 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <label className="font-semibold block mb-1">Tên lớp (*):</label>
              <input type="text" value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })} placeholder="VD: 12A1" className="w-full p-2 border rounded-xl uppercase" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Năm học:</label>
              <input type="text" value={newClass.school_year} onChange={e => setNewClass({ ...newClass, school_year: e.target.value })} placeholder="2026-2027" className="w-full p-2 border rounded-xl font-mono" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Học kì:</label>
              <select value={newClass.semester} onChange={e => setNewClass({ ...newClass, semester: Number(e.target.value) })} className="w-full p-2 border rounded-xl bg-white">
                <option value={1}>Học kì 1</option>
                <option value={2}>Học kì 2</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Cách tính cuối kì:</label>
              <select value={newClass.calc_method} onChange={e => setNewClass({ ...newClass, calc_method: e.target.value as 'average' | 'max' })} className="w-full p-2 border rounded-xl bg-white">
                <option value="average">Trung bình cộng</option>
                <option value="max">Lấy điểm cao nhất</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Áp điểm quy đổi vào:</label>
              <select value={newClass.apply_mode} onChange={e => setNewClass({ ...newClass, apply_mode: e.target.value as 'next' | 'previous' })} className="w-full p-2 border rounded-xl bg-white">
                <option value="next">Lần KT kế tiếp</option>
                <option value="previous">Lần KT gần nhất trước đó</option>
              </select>
            </div>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow py-2">Tạo Lớp</button>
            <p className="md:col-span-6 text-[11px] text-slate-500 italic">
              * Nút "Nhập file nhiều lớp" dùng Năm học, Học kì và 2 cách tính ở khung này cho các lớp mới; mỗi sheet trong file Excel là 1 lớp, tên sheet là tên lớp.
            </p>
          </form>
        )}

        {classes.length === 0 && !showCreate && (
          <p className="text-slate-400 italic">Chưa có lớp nào. Bấm "Tạo lớp mới" hoặc "Nhập file nhiều lớp" để bắt đầu.</p>
        )}
      </div>

      {selectedClass && (
        <>
          {/* CÀI ĐẶT LỚP */}
          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
            <div className="flex flex-wrap gap-3 items-end justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Lớp {selectedClass.name} — Học kì {selectedClass.semester}, năm học {selectedClass.school_year}</h2>
                <p className="text-slate-500 text-[11px] mt-0.5">{oralStudents.length} học sinh · {datesWithData.length} ngày đã nhập điểm</p>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="font-semibold block mb-1">Kết quả cuối kì:</label>
                  <select value={selectedClass.calc_method} onChange={e => handleUpdateClassSetting({ calc_method: e.target.value as 'average' | 'max' })} className="p-2 border rounded-xl bg-white">
                    <option value="average">Trung bình cộng</option>
                    <option value="max">Lấy điểm cao nhất</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Áp điểm quy đổi vào:</label>
                  <select value={selectedClass.apply_mode || 'next'} onChange={e => handleUpdateClassSetting({ apply_mode: e.target.value as 'next' | 'previous' })} className="p-2 border rounded-xl bg-white">
                    <option value="next">Lần KT kế tiếp</option>
                    <option value="previous">Lần KT gần nhất trước đó</option>
                  </select>
                </div>
                <button type="button" disabled={importing} onClick={() => singleFileRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold px-3 py-2 rounded-xl shadow">
                  {importing ? 'Đang nhập...' : '📥 Nhập DS từ Excel'}
                </button>
                <input ref={singleFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportSingle} />
                <button type="button" onClick={handleExport} className="bg-slate-700 hover:bg-slate-800 text-white font-bold px-3 py-2 rounded-xl shadow">📤 Xuất Excel</button>
                <button type="button" onClick={handleDeleteClass} className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold px-3 py-2 rounded-xl">
                  <Trash2 className="w-4 h-4 inline" /> Xóa lớp
                </button>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <strong>Quy tắc:</strong> Điểm cộng và điểm trừ tính riêng — mỗi loại đủ <strong>10</strong> thì quy đổi thành <strong>±1 điểm chính</strong>, áp vào{' '}
              {(selectedClass.apply_mode || 'next') === 'next' ? 'lần kiểm tra miệng kế tiếp (tính cả lần cùng ngày)' : 'lần kiểm tra miệng gần nhất trước đó'}; phần dư (dưới 10) được giữ lại để tích lũy tiếp.
              Cuối kì còn đủ 10 thì áp vào lần kiểm tra gần nhất. Điểm mỗi lần luôn trong khoảng 0 – 10. Kết quả học kì làm tròn 1 chữ số thập phân.
            </div>
          </div>

          {/* CHUYỂN CHẾ ĐỘ */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setView('entry')} className={`px-4 py-2 rounded-xl font-bold ${view === 'entry' ? 'bg-indigo-600 text-white shadow' : 'bg-white border'}`}>✍️ Nhập điểm theo ngày</button>
            <button type="button" onClick={() => setView('summary')} className={`px-4 py-2 rounded-xl font-bold ${view === 'summary' ? 'bg-indigo-600 text-white shadow' : 'bg-white border'}`}>📊 Tổng kết học kì</button>
          </div>

          {loading && <p className="text-slate-400 italic flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tải dữ liệu...</p>}

          {view === 'entry' && !loading && (
            <div className="bg-white rounded-2xl border shadow-sm">
              <div className="p-4 border-b flex flex-wrap gap-3 items-end justify-between">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="font-semibold block mb-1">Ngày nhập điểm:</label>
                    <input type="date" value={entryDate} onChange={e => handleChangeDate(e.target.value)} className="p-2 border rounded-xl" />
                  </div>
                  {isFutureDate && <span className="text-[11px] text-amber-700 font-semibold">⚠️ Đang chọn ngày trong tương lai</span>}
                  {dirty && <span className="text-[11px] text-rose-600 font-bold">● Có thay đổi chưa lưu</span>}
                </div>
                <button type="button" disabled={saving || oralStudents.length === 0} onClick={handleSaveDay} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-5 py-2 rounded-xl shadow">
                  {saving ? 'Đang lưu...' : `💾 Lưu điểm ngày ${formatDateVN(entryDate)}`}
                </button>
              </div>

              {datesWithData.length > 0 && (
                <div className="px-4 pt-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-slate-500 font-semibold mr-1">Các ngày đã nhập:</span>
                  {datesWithData.map(d => (
                    <button key={d} type="button" onClick={() => handleChangeDate(d)} className={`px-2 py-0.5 rounded-full border text-[11px] font-mono ${d === entryDate ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 hover:bg-indigo-50'}`}>
                      {formatDateVN(d)}
                    </button>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto p-4">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 font-bold border-b text-slate-700">
                    <tr>
                      <th className="p-2 border-r w-10 text-center">STT</th>
                      <th className="p-2 border-r">Họ và tên</th>
                      <th className="p-2 border-r text-center w-24">Điểm miệng</th>
                      <th className="p-2 border-r text-center">Điểm cộng</th>
                      <th className="p-2 border-r text-center">Điểm trừ</th>
                      <th className="p-2 border-r">Ghi chú</th>
                      <th className="p-2 border-r text-center">Tích lũy (+/−)</th>
                      <th className="p-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {oralStudents.map((s, i) => {
                      const d = draft[s.id] || EMPTY_ORAL_DRAFT;
                      const scoreBad = !parseOralScore(d.score).ok;
                      const plusBad = !parseOralCount(d.plus).ok;
                      const minusBad = !parseOralCount(d.minus).ok;
                      const sm = summaries[s.id];
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-2 border-r text-center text-slate-500">{s.order_no || i + 1}</td>
                          <td className="p-2 border-r font-semibold">
                            {s.full_name}
                            {s.code && <span className="ml-1 text-[10px] font-mono text-indigo-600">({s.code})</span>}
                          </td>
                          <td className="p-2 border-r">
                            <input type="text" inputMode="decimal" value={d.score} onChange={e => updateDraft(s.id, 'score', e.target.value)} placeholder="—"
                              className={`w-full p-1.5 border rounded-lg text-center font-bold ${scoreBad ? 'border-rose-500 bg-rose-50' : ''}`} />
                          </td>
                          <td className="p-2 border-r">
                            <div className="flex items-center gap-1 justify-center">
                              <button type="button" onClick={() => stepCount(s.id, 'plus', -1)} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold">−</button>
                              <input type="text" inputMode="numeric" value={d.plus} onChange={e => updateDraft(s.id, 'plus', e.target.value)} placeholder="0"
                                className={`w-12 p-1.5 border rounded-lg text-center text-emerald-700 font-bold ${plusBad ? 'border-rose-500 bg-rose-50' : ''}`} />
                              <button type="button" onClick={() => stepCount(s.id, 'plus', 1)} className="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold">+</button>
                            </div>
                          </td>
                          <td className="p-2 border-r">
                            <div className="flex items-center gap-1 justify-center">
                              <button type="button" onClick={() => stepCount(s.id, 'minus', -1)} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold">−</button>
                              <input type="text" inputMode="numeric" value={d.minus} onChange={e => updateDraft(s.id, 'minus', e.target.value)} placeholder="0"
                                className={`w-12 p-1.5 border rounded-lg text-center text-rose-700 font-bold ${minusBad ? 'border-rose-500 bg-rose-50' : ''}`} />
                              <button type="button" onClick={() => stepCount(s.id, 'minus', 1)} className="w-6 h-6 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold">+</button>
                            </div>
                          </td>
                          <td className="p-2 border-r">
                            <input type="text" value={d.note} onChange={e => updateDraft(s.id, 'note', e.target.value)} className="w-full p-1.5 border rounded-lg" />
                          </td>
                          <td className="p-2 border-r text-center text-[11px] whitespace-nowrap" title="Tính theo dữ liệu ĐÃ LƯU">
                            <span className="text-emerald-700 font-bold">+{sm?.totalPlus ?? 0}</span> / <span className="text-rose-700 font-bold">−{sm?.totalMinus ?? 0}</span>
                          </td>
                          <td className="p-2 text-center">
                            <button type="button" onClick={() => handleDeleteStudent(s)} className="text-slate-400 hover:text-rose-600" title="Xóa học sinh khỏi lớp">
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {oralStudents.length === 0 && (
                      <tr><td colSpan={8} className="p-4 text-center text-slate-400 italic">Lớp chưa có học sinh. Bấm "📥 Nhập DS từ Excel" hoặc thêm thủ công bên dưới.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form onSubmit={handleAddStudent} className="p-4 border-t grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-slate-50 rounded-b-2xl">
                <div>
                  <label className="font-semibold block mb-1">Thêm HS — Họ và tên (*):</label>
                  <input type="text" value={newStu.full_name} onChange={e => setNewStu({ ...newStu, full_name: e.target.value })} className="w-full p-2 border rounded-xl" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">MSHS (nếu có):</label>
                  <input type="text" value={newStu.code} onChange={e => setNewStu({ ...newStu, code: e.target.value })} className="w-full p-2 border rounded-xl uppercase font-mono" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Ngày sinh:</label>
                  <input type="date" value={newStu.dob} onChange={e => setNewStu({ ...newStu, dob: e.target.value })} className="w-full p-2 border rounded-xl" />
                </div>
                <button type="submit" className="bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl shadow py-2">+ Thêm học sinh</button>
              </form>
            </div>
          )}

          {view === 'summary' && !loading && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 font-bold border-b text-slate-700">
                  <tr>
                    <th className="p-2 border-r text-center w-10">STT</th>
                    <th className="p-2 border-r">Họ và tên</th>
                    <th className="p-2 border-r">Các lần kiểm tra (gốc → sau quy đổi)</th>
                    <th className="p-2 border-r text-center">Σ cộng / Σ trừ</th>
                    <th className="p-2 border-r text-center">Còn dư</th>
                    <th className={`p-2 border-r text-center ${selectedClass.calc_method === 'average' ? 'bg-indigo-100 text-indigo-900' : ''}`}>TB cộng</th>
                    <th className={`p-2 border-r text-center ${selectedClass.calc_method === 'max' ? 'bg-indigo-100 text-indigo-900' : ''}`}>Cao nhất</th>
                    <th className="p-2 text-center bg-indigo-600 text-white">Kết quả HK</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {oralStudents.map((s, i) => {
                    const sm = summaries[s.id];
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r text-center text-slate-500">{s.order_no || i + 1}</td>
                        <td className="p-2 border-r font-semibold">{s.full_name}</td>
                        <td className="p-2 border-r">
                          <div className="flex flex-wrap gap-1">
                            {sm.tests.map((t, k) => {
                              const changed = t.bonus > 0 || t.penalty > 0;
                              return (
                                <span key={k} title={`${formatDateVN(t.date)}: gốc ${formatScore(t.raw)}${t.bonus ? `, +${t.bonus}` : ''}${t.penalty ? `, −${t.penalty}` : ''} → ${formatScore(t.adjusted)}`}
                                  className={`px-1.5 py-0.5 rounded font-mono text-[11px] border ${changed ? 'bg-amber-50 border-amber-300' : 'bg-slate-50'}`}>
                                  {formatScore(t.raw)}{changed && <> → <strong>{formatScore(t.adjusted)}</strong></>}
                                </span>
                              );
                            })}
                            {sm.tests.length === 0 && <span className="text-slate-400 italic">Chưa có điểm</span>}
                          </div>
                        </td>
                        <td className="p-2 border-r text-center whitespace-nowrap">
                          <span className="text-emerald-700 font-bold">+{sm.totalPlus}</span> / <span className="text-rose-700 font-bold">−{sm.totalMinus}</span>
                        </td>
                        <td className="p-2 border-r text-center text-[11px] whitespace-nowrap">
                          +{sm.plusLeft} / −{sm.minusLeft}
                          {(sm.plusLeft >= ORAL_POINTS_PER_UNIT || sm.minusLeft >= ORAL_POINTS_PER_UNIT) && <span className="block text-amber-700">chờ lần KT đầu tiên</span>}
                        </td>
                        <td className={`p-2 border-r text-center font-bold ${selectedClass.calc_method === 'average' ? 'bg-indigo-50' : ''}`}>{formatScore(sm.average, true)}</td>
                        <td className={`p-2 border-r text-center font-bold ${selectedClass.calc_method === 'max' ? 'bg-indigo-50' : ''}`}>{formatScore(sm.max, true)}</td>
                        <td className="p-2 text-center font-black text-indigo-700 text-sm">{formatScore(sm.final, true)}</td>
                      </tr>
                    );
                  })}
                  {oralStudents.length === 0 && (
                    <tr><td colSpan={8} className="p-4 text-center text-slate-400 italic">Lớp chưa có học sinh.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
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
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (error) alert('Không xóa được: ' + error.message);
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
