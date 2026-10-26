import { PrismaClient } from "@prisma/client";
import net from "net";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

let dbReachable: boolean | null = null;
let forceInMemory = false;

export function setForceInMemory(value: boolean): void {
  forceInMemory = value;
}

function probePort(host: string, port: number, timeoutMs = 250): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

export async function checkDatabaseConnection(): Promise<boolean> {
  if (forceInMemory) return false;
  if (dbReachable !== null) return dbReachable;

  const url = process.env.DATABASE_URL || "";
  const match = url.match(/@([^:]+):(\d+)/);
  const host = match ? match[1] : "localhost";
  const port = match ? parseInt(match[2], 10) : 5432;

  const portOpen = await probePort(host, port, 300);
  if (!portOpen) {
    dbReachable = false;
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbReachable = true;
  } catch {
    dbReachable = false;
  }
  return dbReachable;
}
