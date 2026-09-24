import React, { useState } from 'react';
import { AuthService } from '../../services/authService';
import { useApp } from '../../context/AppContext';
import { GraduationCap, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { currentUser, setCurrentUser, showToast } = useApp();
  const [loading, setLoading] = useState(false);

  if (currentUser) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const profile = await AuthService.signInWithGoogle();
      setCurrentUser(profile);
      showToast('Đăng nhập với Google thành công!', 'success');
    } catch (err: any) {
      console.warn('Google sign-in popup closed or restricted:', err);
      showToast('Không thể mở cửa sổ Google. Thầy/Cô có thể dùng thử chế độ xem trước ngay bên dưới.', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    const demoUser = {
      uid: 'guest_teacher_preview',
      displayName: 'Cô Nguyễn Thị Mai',
      email: 'giaovien.tieuhoc@demo.vn',
      role: 'teacher' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('demo_teacher_user', JSON.stringify(demoUser));
    setCurrentUser(demoUser);
    showToast('Chào mừng Thầy/Cô trải nghiệm hệ thống Trợ Lý Chủ Nhiệm Tiểu Học!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-7 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs mx-auto flex items-center justify-center mb-3 shadow-inner">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">Trợ Lý Chủ Nhiệm Tiểu Học AI</h2>
          <p className="text-xs text-emerald-100 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Hệ sinh thái số hóa hồ sơ lớp học, điểm danh, nề nếp thi đua và nhận xét học sinh chuẩn Thông tư 27
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="p-6 space-y-4">
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Đồng bộ dữ liệu lớp học qua tài khoản Google giáo viên</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Sổ chủ nhiệm điện tử, sơ đồ lớp và phân tích học sinh cần chú ý</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tích hợp Trợ lý AI gợi ý nhận xét học tập và soạn tin nhắn phụ huynh</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-all hover:border-slate-400 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Đang kết nối Google...' : 'Đăng nhập với Google'}</span>
            </button>
          </div>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">hoặc trải nghiệm nhanh</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinueAsGuest}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Vào dùng thử ngay (Lớp 3A1 mẫu)</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hệ thống bảo mật dữ liệu theo từng tài khoản giáo viên</span>
          </div>
        </div>
      </div>
    </div>
  );
};
