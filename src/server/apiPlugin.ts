import type { Plugin } from 'vite';
import {
  generateComment,
  generateParentMessage,
  generateClassSummary,
  generateClassMeetingPlan,
  askAIAssistant,
  generateBirthdayWish,
  generateCompetencyBatchRecommendation,
} from './aiEndpoints.ts';
import { verifyToken, verifyClassOwnership } from './authMiddleware.ts';

export function aiApiPlugin(): Plugin {
  return {
    name: 'ai-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/ai/')) {
          return next();
        }

        // Enable CORS and JSON
        res.setHeader('Content-Type', 'application/json');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        // Security Barrier: Verify Firebase Token
        const authHeader = req.headers.authorization || (req.headers as any).Authorization;
        if (!authHeader || typeof authHeader !== 'string') {
          res.statusCode = 401;
          res.end(
            JSON.stringify({
              error: 'Yêu cầu bị từ chối: Thiếu mã xác thực (Missing Authorization header).',
              code: 'AUTH_REQUIRED',
            })
          );
          return;
        }

        const parts = authHeader.trim().split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
          res.statusCode = 401;
          res.end(
            JSON.stringify({
              error: 'Yêu cầu bị từ chối: Định dạng Bearer không hợp lệ.',
              code: 'AUTH_MALFORMED',
            })
          );
          return;
        }

        const user = await verifyToken(parts[1]);
        if (!user) {
          res.statusCode = 401;
          res.end(
            JSON.stringify({
              error: 'Yêu cầu bị từ chối: Token xác thực không hợp lệ hoặc đã hết hạn.',
              code: 'AUTH_INVALID_TOKEN',
            })
          );
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = body ? JSON.parse(body) : {};
            const pathname = req.url?.split('?')[0];

            // Verify class ownership if classId is provided
            const requestedClassId = data.classId || data.contextData?.classId;
            if (requestedClassId) {
              const hasAccess = await verifyClassOwnership(user, parts[1], requestedClassId);
              if (!hasAccess) {
                res.statusCode = 403;
                res.end(
                  JSON.stringify({
                    error: 'Từ chối quyền truy cập: Bạn không có quyền truy cập lớp học này.',
                    code: 'FORBIDDEN_RESOURCE',
                  })
                );
                return;
              }
            }

            if (pathname === '/api/ai/comment') {
              const result = await generateComment(data);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } else if (pathname === '/api/ai/competency-batch') {
              const result = await generateCompetencyBatchRecommendation(data);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } else if (pathname === '/api/ai/parent-message') {
              const result = await generateParentMessage(data);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } else if (pathname === '/api/ai/class-summary') {
              const result = await generateClassSummary(data);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } else if (pathname === '/api/ai/class-meeting') {
              const result = await generateClassMeetingPlan(data);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } else if (pathname === '/api/ai/assistant') {
              const result = await askAIAssistant(data);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } else if (pathname === '/api/ai/birthday-wish') {
              const result = await generateBirthdayWish(data);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Endpoint not found' }));
            }
          } catch (err: any) {
            console.error('API Server Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
          }
        });
      });
    },
  };
}
