import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ statusCode: 401, error: "Unauthorized", message: "Invalid or expired token" });
    return;
  }

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, request.user.userId));

  if (!user) {
    reply.code(401).send({ statusCode: 401, error: "Unauthorized", message: "User not found" });
    return;
  }

  if (user.role !== "admin") {
    reply.code(403).send({ statusCode: 403, error: "Forbidden", message: "Admin access required" });
  }
}
