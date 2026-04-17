import { AgentKind } from "@prisma/client";
import { handleAgentPost } from "../_handler";

export async function POST(req: Request) { return handleAgentPost(AgentKind.ADS_MATH, req); }
