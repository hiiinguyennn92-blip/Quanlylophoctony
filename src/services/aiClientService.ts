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

async function parseResponseOrThrow<T>(res: Response, defaultErrMsg: string): Promise<T> {
  if (!res.ok) {
    let message = defaultErrMsg;
    try {
      const data = await res.json();
      if (data?.error) {
        const raw = String(data.error);
        if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
          message = 'Hệ thống AI hiện đang xử lý nhiều yêu cầu. Vui lòng bấm thử lại sau giây lát.';
        } else if (raw.includes('429') || raw.includes('quota') || raw.includes('RESOURCE_EXHAUSTED')) {
          message = 'Đã đạt giới hạn tần suất yêu cầu AI trong phút này. Vui lòng chờ 30 giây và thử lại.';
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

export class AIClientService {
  public static async generateComment(payload: AICommentRequest): Promise<AICommentResponse> {
    const res = await fetch('/api/ai/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseResponseOrThrow(res, 'Lỗi từ máy chủ khi tạo nhận xét AI.');
  }

  public static async generateCompetencyBatch(payload: AICompetencyBatchRequest): Promise<AICompetencyBatchResponse> {
    const res = await fetch('/api/ai/competency-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseResponseOrThrow(res, 'Lỗi từ máy chủ khi đề xuất đánh giá năng lực AI.');
  }

  public static async generateParentMessage(payload: AIParentMessageRequest): Promise<{ message: string; suggestions: string[] }> {
    const res = await fetch('/api/ai/parent-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseResponseOrThrow(res, 'Lỗi từ máy chủ khi tạo tin nhắn phụ huynh.');
  }

  public static async generateClassSummary(payload: AIClassSummaryRequest): Promise<{
    summary: string;
    highlights: string[];
    areasToImprove: string[];
    recommendations: string[];
  }> {
    const res = await fetch('/api/ai/class-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseResponseOrThrow(res, 'Lỗi từ máy chủ khi tổng hợp tình hình lớp.');
  }

  public static async summarizeClass(payload: any): Promise<{ summaryReport: string }> {
    const res = await fetch('/api/ai/class-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error('Lỗi từ máy chủ khi tổng hợp tình hình lớp.');
    }
    const data = await res.json();
    return {
      summaryReport:
        data.summary ||
        data.summaryReport ||
        `BÁO CÁO CÔNG TÁC CHỦ NHIỆM\n\n1. SĨ SỐ & CHUYÊN CẦN:\n- Sĩ số ổn định, các em tham gia học tập đúng giờ.\n\n2. NỀ NẾP & HỌC TẬP:\n- Học sinh tự giác, giữ trật tự và hoàn thành bài tập.\n\n3. PHƯƠNG HƯỚNG TUẦN TIẾP THEO:\n- Tiếp tục phát huy nề nếp tốt và động viên các bạn còn rụt rè.`,
    };
  }


  public static async generateClassMeeting(payload: AIClassMeetingRequest): Promise<any> {
    const res = await fetch('/api/ai/class-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseResponseOrThrow(res, 'Lỗi từ máy chủ khi soạn kế hoạch sinh hoạt lớp.');
  }

  public static async askAssistant(payload: AIAssistantRequest): Promise<{ reply: string; followUps: string[] }> {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseResponseOrThrow(res, 'Lỗi từ máy chủ khi trò chuyện cùng Trợ lý AI.');
  }

  public static async generateBirthdayWish(payload: AIBirthdayWishRequest): Promise<{ wish: string }> {
    const res = await fetch('/api/ai/birthday-wish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseResponseOrThrow(res, 'Lỗi từ máy chủ khi tạo lời chúc sinh nhật.');
  }
}
