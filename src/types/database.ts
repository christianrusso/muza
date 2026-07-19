// Hand-authored to match supabase/migrations/*.sql.
// Once a live Supabase project exists, regenerate with:
//   supabase gen types typescript --project-id <id> > src/types/database.ts
// and re-apply any manual view/RPC typings this file adds.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          gender: "masculino" | "femenino" | "no_especifica" | null;
          notifications_enabled: boolean;
          plan_tier: "free" | "pro";
          plan_started_at: string | null;
          created_at: string;
          last_seen_activity_at: string;
          blocked_at: string | null;
          is_seed: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; full_name: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      occasions: {
        Row: {
          id: string;
          label_es: string;
          icon_name: string;
          sort_order: number;
        };
        Insert: Database["public"]["Tables"]["occasions"]["Row"];
        Update: Partial<Database["public"]["Tables"]["occasions"]["Row"]>;
        Relationships: [];
      };
      scoring_examples: {
        Row: {
          id: string;
          photo_path: string;
          occasion_id: string;
          verdict: "good" | "bad";
          note: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["scoring_examples"]["Row"]> & {
          photo_path: string;
          occasion_id: string;
          verdict: "good" | "bad";
        };
        Update: Partial<Database["public"]["Tables"]["scoring_examples"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "scoring_examples_occasion_id_fkey";
            columns: ["occasion_id"];
            referencedRelation: "occasions";
            referencedColumns: ["id"];
          },
        ];
      };
      analyses: {
        Row: {
          id: string;
          user_id: string;
          occasion_id: string;
          occasion_variant: string | null;
          occasion_context: string | null;
          photo_path: string;
          analysis_type: "completo" | "superior" | "inferior" | "individual" | null;
          validity_status: "pending" | "valid" | "partial" | "invalid";
          overall_score: number | null;
          qualitative_badge: string | null;
          style_descriptors: string[];
          detected_prendas_superiores: string[];
          detected_prendas_inferiores: string[];
          detected_calzado: string[];
          detected_accesorios: string[];
          detected_colores: string[];
          detected_estilo: string | null;
          ai_raw_response: Json | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["analyses"]["Row"]> & {
          user_id: string;
          occasion_id: string;
          photo_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["analyses"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "analyses_occasion_id_fkey";
            columns: ["occasion_id"];
            isOneToOne: false;
            referencedRelation: "occasions";
            referencedColumns: ["id"];
          },
        ];
      };
      analysis_categories: {
        Row: {
          id: string;
          analysis_id: string;
          category_key: string;
          weight: number;
          score: number;
          justification: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["analysis_categories"]["Row"]> & {
          analysis_id: string;
          category_key: string;
          weight: number;
          score: number;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_categories"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "analysis_categories_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
        ];
      };
      analysis_feedback: {
        Row: {
          id: string;
          analysis_id: string;
          kind: "fortaleza" | "aspecto_mejorar" | "recomendacion";
          text: string;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["analysis_feedback"]["Row"]> & {
          analysis_id: string;
          kind: "fortaleza" | "aspecto_mejorar" | "recomendacion";
          text: string;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_feedback"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "analysis_feedback_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_usage: {
        Row: {
          user_id: string;
          period_month: string;
          analyses_count: number;
        };
        Insert: Database["public"]["Tables"]["plan_usage"]["Row"];
        Update: Partial<Database["public"]["Tables"]["plan_usage"]["Row"]>;
        Relationships: [];
      };
      community_posts: {
        Row: {
          id: string;
          user_id: string;
          analysis_id: string;
          caption: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["community_posts"]["Row"]> & {
          user_id: string;
          analysis_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["community_posts"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "community_posts_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: true;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
        ];
      };
      post_reactions: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          reaction: "like" | "dislike";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["post_reactions"]["Row"]> & {
          post_id: string;
          user_id: string;
          reaction: "like" | "dislike";
        };
        Update: Partial<Database["public"]["Tables"]["post_reactions"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["post_comments"]["Row"]> & {
          post_id: string;
          user_id: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_comments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["follows"]["Row"]> & {
          follower_id: string;
          following_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["follows"]["Row"]>;
        Relationships: [];
      };
      post_votes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          bucket: "mejorar" | "bien" | "muy_bueno" | "impecable";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["post_votes"]["Row"]> & {
          post_id: string;
          user_id: string;
          bucket: "mejorar" | "bien" | "muy_bueno" | "impecable";
        };
        Update: Partial<Database["public"]["Tables"]["post_votes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "post_votes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      community_feed_view: {
        Row: {
          post_id: string;
          caption: string | null;
          posted_at: string;
          author_id: string;
          author_name: string;
          author_avatar_url: string | null;
          author_gender: "masculino" | "femenino" | "no_especifica" | null;
          analysis_id: string;
          photo_path: string;
          occasion_id: string;
          analysis_type: "completo" | "superior" | "inferior" | "individual" | null;
          overall_score: number | null;
          style_descriptors: string[];
          like_count: number;
          dislike_count: number;
          comment_count: number;
          votes_mejorar: number;
          votes_bien: number;
          votes_muy_bueno: number;
          votes_impecable: number;
          author_is_seed: boolean;
        };
        Relationships: [];
      };
    };
    Functions: {
      increment_analysis_usage: {
        Args: { p_user_id: string };
        Returns: void;
      };
      unread_activity_count: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
