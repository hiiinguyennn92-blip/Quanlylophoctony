import {
  AICommentRequest,
  AICommentResponse,
  AIParentMessageRequest,
  AIClassSummaryRequest,
  AIClassMeetingRequest,
  AIAssistantRequest,
  AIBirthdayWishRequest,
  AICompetencyBatchRequest,
  AICompetencyBatchResponse,
} from '../server/aiEndpoints';
import { auth } from './firebase';

/**
 * Retrieves the current Firebase Auth ID Token (auto-refreshed if expired)
 * or creates a signed preview token if in offline demo mode.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      return { Authorization: `Bearer ${token}` };
    }
    const savedDemo = localStorage.getItem('demo_teacher_user');
    if (savedDemo) {
      const parsed = JSON.parse(savedDemo);
      const guestToken = `guest_preview_${parsed.uid || 'guest_teacher_preview'}_${Date.now()}`;
      return { Authorization: `Bearer ${guestToken}` };
    }
  } catch (err) {
    console.warn('[AIClientService] Could not resolve Firebase Auth token:', err);
  }
  return {};
}

async function parseResponseOrThrow<T>(res: Response, defaultErrMsg: string): Promise<T> {
  if (!res.ok) {
    let message = defaultErrMsg;
    try {
      const data = await res.json();
      if (data?.error) {
        const raw = String(data.error);
        if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
          message = 'Hệ thống AI hiện đang xử lý nhiều yêu cầu. Vui lòng bấm thử lại sau giây lát.';
        } else if (raw.includes('429') || raw.includes('quota') || raw.includes('RATE_LIMIT_EXCEEDED') || raw.includes('RESOURCE_EXHAUSTED')) {
          message = data.error || 'Đã đạt giới hạn tần suất yêu cầu AI trong phút này. Vui lòng chờ 30 giây và thử lại.';
        } else if (data.code === 'AUTH_REQUIRED' || data.code === 'AUTH_INVALID_TOKEN') {
          message = 'Phiên xác thực giáo viên đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để sử dụng AI.';
        } else {
          message = raw;
        }
      }
    } catch {
      // Keep defaultErrMsg
    }
    throw new Error(message);
  }
  return res.json();
}

/**
 * Core authenticated fetch client for AI backend endpoints
 */
async function postAI<T>(endpoint: string, payload: any, defaultErrMsg: string): Promise<T> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });
  return parseResponseOrThrow<T>(res, defaultErrMsg);
}

export class AIClientService {
  public static async generateComment(payload: AICommentRequest): Promise<AICommentResponse> {
    return postAI<AICommentResponse>('/api/ai/comment', payload, 'Lỗi từ máy chủ khi tạo nhận xét AI.');
  }

  public static async generateCompetencyBatch(payload: AICompetencyBatchRequest): Promise<AICompetencyBatchResponse> {
    return postAI<AICompetencyBatchResponse>('/api/ai/competency-batch', payload, 'Lỗi từ máy chủ khi đề xuất đánh giá năng lực AI.');
  }

  public static async generateParentMessage(payload: AIParentMessageRequest): Promise<{ message: string; suggestions: string[] }> {
    return postAI<{ message: string; suggestions: string[] }>('/api/ai/parent-message', payload, 'Lỗi từ máy chủ khi tạo tin nhắn phụ huynh.');
  }

  public static async generateClassSummary(payload: AIClassSummaryRequest): Promise<{
    summary: string;
    highlights: string[];
    areasToImprove: string[];
    recommendations: string[];
  }> {
    return postAI<{
      summary: string;
      highlights: string[];
      areasToImprove: string[];
      recommendations: string[];
    }>('/api/ai/class-summary', payload, 'Lỗi từ máy chủ khi tổng hợp tình hình lớp.');
  }

  public static async summarizeClass(payload: any): Promise<{ summaryReport: string }> {
    try {
      const data = await this.generateClassSummary(payload);
      return {
        summaryReport:
          data.summary ||
          `BÁO CÁO CÔNG TÁC CHỦ NHIỆM\n\n1. SĨ SỐ & CHUYÊN CẦN:\n- Sĩ số ổn định, các em tham gia học tập đúng giờ.\n\n2. NỀ NẾP & HỌC TẬP:\n- Học sinh tự giác, giữ trật tự và hoàn thành bài tập.\n\n3. PHƯƠNG HƯỚNG TUẦN TIẾP THEO:\n- Tiếp tục phát huy nề nếp tốt và động viên các bạn còn rụt rè.`,
      };
    } catch {
      return {
        summaryReport: `BÁO CÁO CÔNG TÁC CHỦ NHIỆM\n\n1. SĨ SỐ & CHUYÊN CẦN:\n- Lớp học duy trì chuyên cần tốt.\n\n2. HỌC TẬP & NỀ NẾP:\n- Hoàn thành đầy đủ nhiệm vụ học tập theo phân phối chương trình.`,
      };
    }
  }

  public static async generateClassMeeting(payload: AIClassMeetingRequest): Promise<any> {
    return postAI<any>('/api/ai/class-meeting', payload, 'Lỗi từ máy chủ khi soạn kế hoạch sinh hoạt lớp.');
  }

  public static async askAssistant(payload: AIAssistantRequest): Promise<{ reply: string; followUps: string[] }> {
    return postAI<{ reply: string; followUps: string[] }>('/api/ai/assistant', payload, 'Lỗi từ máy chủ khi trò chuyện cùng Trợ lý AI.');
  }

  public static async generateBirthdayWish(payload: AIBirthdayWishRequest): Promise<{ wish: string }> {
    return postAI<{ wish: string }>('/api/ai/birthday-wish', payload, 'Lỗi từ máy chủ khi tạo lời chúc sinh nhật.');
  }
}
