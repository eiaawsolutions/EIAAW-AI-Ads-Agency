import type { StepHandler } from "./types";

/**
 * Step handler registry.
 *
 * Handlers register themselves by kind. Lookup is case-sensitive.
 * The "agent.*" family delegates into the existing agent dispatcher;
 * "platform.*" family will front the platform adapter execute() methods
 * when we migrate campaign launches to jobs.
 */

const handlers = new Map<string, StepHandler>();

export function registerHandler(kind: string, handler: StepHandler): void {
  if (handlers.has(kind)) {
    throw new Error(`job handler already registered: ${kind}`);
  }
  handlers.set(kind, handler);
}

export function getHandler(kind: string): StepHandler | null {
  return handlers.get(kind) ?? null;
}

export function listHandlers(): string[] {
  return [...handlers.keys()].sort();
}
