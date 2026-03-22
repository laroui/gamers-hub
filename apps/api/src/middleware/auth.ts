import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ statusCode: 401, error: "Unauthorized", message: "Invalid or expired token" });
  }
}

// Augment FastifyRequest with typed user payload
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; email: string };
    user: { userId: string; email: string };
  }
}
