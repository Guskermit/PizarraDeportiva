// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` once the project is linked, if preferred.

export type ClubAdminRole = "owner" | "admin";

export type PlayType =
  | "corner"
  | "falta"
  | "fuera_de_banda"
  | "libre_indirecto"
  | "portero_jugador"
  | "defensa"
  | "ataque_posicional";

export type TeamFormation = "portero_4_jugadores" | "5_jugadores" | "portero_3_jugadores";

export type PlayStatus = "draft" | "ready";

export interface BoardPoint {
  x: number;
  y: number;
}

export interface BoardPlayer {
  id: string;
  x: number;
  y: number;
  label: string;
  isGoalkeeper?: boolean;
}

export interface BoardPositions {
  home: BoardPlayer[];
  away: BoardPlayer[];
  ball: BoardPoint;
}

export interface BoardMove {
  type: "player" | "ball";
  team?: "home" | "away";
  playerId?: string;
  from: BoardPoint;
  to: BoardPoint;
  curve: BoardPoint | null;
  hasBall: boolean;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          full_name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      clubs: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          created_by: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["clubs"]["Row"]> & {
          name: string;
          slug: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["clubs"]["Row"]>;
        Relationships: [];
      };
      club_admins: {
        Row: {
          club_id: string;
          profile_id: string;
          role: ClubAdminRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["club_admins"]["Row"]> & {
          club_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["club_admins"]["Row"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          category: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["teams"]["Row"]> & {
          club_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Row"]>;
        Relationships: [];
      };
      team_coaches: {
        Row: { team_id: string; profile_id: string; created_at: string };
        Insert: { team_id: string; profile_id: string };
        Update: Partial<Database["public"]["Tables"]["team_coaches"]["Row"]>;
        Relationships: [];
      };
      team_players: {
        Row: {
          team_id: string;
          profile_id: string;
          jersey_number: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["team_players"]["Row"]> & {
          team_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_players"]["Row"]>;
        Relationships: [];
      };
      plays: {
        Row: {
          id: string;
          club_id: string;
          owner_coach_id: string;
          assigned_team_id: string | null;
          original_play_id: string | null;
          title: string;
          play_type: PlayType;
          home_formation: TeamFormation;
          away_formation: TeamFormation;
          home_color: string;
          away_color: string;
          initial_positions: BoardPositions;
          status: PlayStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["plays"]["Row"]> & {
          club_id: string;
          owner_coach_id: string;
          title: string;
          play_type: PlayType;
          home_formation: TeamFormation;
          away_formation: TeamFormation;
        };
        Update: Partial<Database["public"]["Tables"]["plays"]["Row"]>;
        Relationships: [];
      };
      play_sequences: {
        Row: {
          id: string;
          play_id: string;
          order_index: number;
          positions: BoardPositions;
          moves: BoardMove[];
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["play_sequences"]["Row"]> & {
          play_id: string;
          order_index: number;
        };
        Update: Partial<Database["public"]["Tables"]["play_sequences"]["Row"]>;
        Relationships: [];
      };
      play_sequence_notes: {
        Row: {
          id: string;
          sequence_id: string;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["play_sequence_notes"]["Row"]> & {
          sequence_id: string;
          author_id: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["play_sequence_notes"]["Row"]>;
        Relationships: [];
      };
      play_shares: {
        Row: {
          id: string;
          play_id: string;
          shared_by: string;
          shared_with_profile_id: string | null;
          shared_with_team_id: string | null;
          can_copy: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["play_shares"]["Row"]> & {
          play_id: string;
          shared_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["play_shares"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
