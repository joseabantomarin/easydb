import { listTemplates } from "@/lib/templates";

export async function GET() {
  return Response.json(listTemplates());
}
