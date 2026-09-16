export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      study_sessions: {
        Row: {
          id: string
          created_at: string
          schema: string
          note: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          schema: string
          note?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          schema?: string
          note?: string | null
        }
      }
      study_records: {
        Row: {
          id: string
          session_id: string
          mode: string
          task_id: string
          benchmark_ordinal: number | null
          sample_id: string | null
          method: string
          method_key: string
          method_code: string
          completion_state: string
          source_svg_sha256: string | null
          input_sha256: string | null
          source_path: string | null
          attempt: number | null
          submitted_at: string | null
          elapsed_seconds: number | null
          stop_reason: string | null
          success: boolean | null
          original_anchor_count: number | null
          final_anchor_count: number | null
          initial_path: string | null
          edited_path: string | null
          target_path: string | null
          operations: Json | null
        }
        Insert: {
          id?: string
          session_id: string
          mode: string
          task_id: string
          benchmark_ordinal?: number | null
          sample_id?: string | null
          method: string
          method_key: string
          method_code: string
          completion_state: string
          source_svg_sha256?: string | null
          input_sha256?: string | null
          source_path?: string | null
          attempt?: number | null
          submitted_at?: string | null
          elapsed_seconds?: number | null
          stop_reason?: string | null
          success?: boolean | null
          original_anchor_count?: number | null
          final_anchor_count?: number | null
          initial_path?: string | null
          edited_path?: string | null
          target_path?: string | null
          operations?: Json | null
        }
        Update: {
          id?: string
        }
      }
    }
  }
}
