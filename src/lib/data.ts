import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Question, VersionItem } from "./exam";

export interface ClassRow { id: string; name: string; semester: string }
export interface ExamRow {
  id: string;
  title: string;
  header: string;
  class_id: string | null;
  question_ids: string[];
  question_weights: Record<string, number>;
  order_by_weight: boolean;
  created_at: string;
}
export interface VersionRow { id: string; exam_id: string; label: string; items: VersionItem[]; created_at: string }

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const classesQuery = queryOptions({
  queryKey: ["classes"],
  queryFn: async () => must(await supabase.from("classes").select("*").order("semester", { ascending: false }).order("name")) as ClassRow[],
});
export const questionsQuery = queryOptions({
  queryKey: ["questions"],
  queryFn: async () => (must(await supabase.from("questions").select("*").order("created_at", { ascending: false })) as unknown as Question[]),
});
export const examsQuery = queryOptions({
  queryKey: ["exams"],
  queryFn: async () => must(await supabase.from("exams").select("*").order("created_at", { ascending: false })) as ExamRow[],
});
export const examQuery = (id: string) => queryOptions({
  queryKey: ["exam", id],
  queryFn: async () => must(await supabase.from("exams").select("*").eq("id", id).single()) as ExamRow,
});
export const versionsQuery = (examId: string) => queryOptions({
  queryKey: ["versions", examId],
  queryFn: async () => (must(await supabase.from("exam_versions").select("*").eq("exam_id", examId).order("label")) as unknown as VersionRow[]),
});
export { must };
