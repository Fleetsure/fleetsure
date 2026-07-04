export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content_b64: string | null
          created_at: string
          doc_type: string | null
          file_name: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          notes: string | null
          owner_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          content_b64?: string | null
          created_at?: string
          doc_type?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          content_b64?: string | null
          created_at?: string
          doc_type?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      driver_payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          driver_id: string
          id: string
          notes: string | null
          owner_id: string | null
          trip_id: string | null
          type: Database["public"]["Enums"]["paymenttype"]
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          driver_id: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          trip_id?: string | null
          type: Database["public"]["Enums"]["paymenttype"]
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          driver_id?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          trip_id?: string | null
          type?: Database["public"]["Enums"]["paymenttype"]
        }
        Relationships: [
          {
            foreignKeyName: "driver_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          address: string | null
          alternate_phone: string | null
          badge_issue_date: string | null
          blood_group: string | null
          created_at: string
          dob: string | null
          father_name: string | null
          firebase_uid: string | null
          id: string
          issuing_rto: string | null
          license_class: Database["public"]["Enums"]["licenseclass"] | null
          license_expiry: string | null
          license_number: string | null
          name: string
          owner_id: string | null
          phone: string
          status: Database["public"]["Enums"]["driverstatus"]
          transport_validity: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          alternate_phone?: string | null
          badge_issue_date?: string | null
          blood_group?: string | null
          created_at?: string
          dob?: string | null
          father_name?: string | null
          firebase_uid?: string | null
          id?: string
          issuing_rto?: string | null
          license_class?: Database["public"]["Enums"]["licenseclass"] | null
          license_expiry?: string | null
          license_number?: string | null
          name: string
          owner_id?: string | null
          phone: string
          status?: Database["public"]["Enums"]["driverstatus"]
          transport_validity?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          alternate_phone?: string | null
          badge_issue_date?: string | null
          blood_group?: string | null
          created_at?: string
          dob?: string | null
          father_name?: string | null
          firebase_uid?: string | null
          id?: string
          issuing_rto?: string | null
          license_class?: Database["public"]["Enums"]["licenseclass"] | null
          license_expiry?: string | null
          license_number?: string | null
          name?: string
          owner_id?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["driverstatus"]
          transport_validity?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          expense_type: string
          id: string
          owner_id: string | null
          receipt_url: string | null
          trip_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          description?: string | null
          expense_type: string
          id?: string
          owner_id?: string | null
          receipt_url?: string | null
          trip_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          expense_type?: string
          id?: string
          owner_id?: string | null
          receipt_url?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          amount: number
          created_at: string
          date: string
          fuel_station: string | null
          id: string
          litres: number
          notes: string | null
          odometer_km: number | null
          owner_id: string | null
          trip_id: string | null
          vehicle_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          fuel_station?: string | null
          id?: string
          litres: number
          notes?: string | null
          odometer_km?: number | null
          owner_id?: string | null
          trip_id?: string | null
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          fuel_station?: string | null
          id?: string
          litres?: number
          notes?: string | null
          odometer_km?: number | null
          owner_id?: string | null
          trip_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          created_at: string
          expiry_date: string
          id: string
          insurer: string | null
          notes: string | null
          owner_id: string | null
          policy_number: string | null
          policy_type: Database["public"]["Enums"]["policytype"]
          premium: number | null
          start_date: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          expiry_date: string
          id?: string
          insurer?: string | null
          notes?: string | null
          owner_id?: string | null
          policy_number?: string | null
          policy_type?: Database["public"]["Enums"]["policytype"]
          premium?: number | null
          start_date?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string
          id?: string
          insurer?: string | null
          notes?: string | null
          owner_id?: string | null
          policy_number?: string | null
          policy_type?: Database["public"]["Enums"]["policytype"]
          premium?: number | null
          start_date?: string | null
          vehicle_id?: string
        }
        Relationships: []
      }
      marketplace_load_interests: {
        Row: {
          created_at: string
          id: string
          interested_user_id: string
          message: string | null
          rating: number | null
          return_load_id: string
          status: Database["public"]["Enums"]["intereststatus"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interested_user_id: string
          message?: string | null
          rating?: number | null
          return_load_id: string
          status?: Database["public"]["Enums"]["intereststatus"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interested_user_id?: string
          message?: string | null
          rating?: number | null
          return_load_id?: string
          status?: Database["public"]["Enums"]["intereststatus"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_load_interests_return_load_id_fkey"
            columns: ["return_load_id"]
            isOneToOne: false
            referencedRelation: "marketplace_return_loads"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_return_loads: {
        Row: {
          asking_price: number | null
          available_date: string
          capacity_tonnes: number | null
          cargo_accepted: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          from_city: string
          id: string
          notes: string | null
          owner_id: string
          rating: number | null
          status: Database["public"]["Enums"]["loadstatus"]
          to_city: string
          updated_at: string
          vehicle_id: string | null
          vehicle_reg: string | null
        }
        Insert: {
          asking_price?: number | null
          available_date: string
          capacity_tonnes?: number | null
          cargo_accepted?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          from_city: string
          id?: string
          notes?: string | null
          owner_id: string
          rating?: number | null
          status?: Database["public"]["Enums"]["loadstatus"]
          to_city: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_reg?: string | null
        }
        Update: {
          asking_price?: number | null
          available_date?: string
          capacity_tonnes?: number | null
          cargo_accepted?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          from_city?: string
          id?: string
          notes?: string | null
          owner_id?: string
          rating?: number | null
          status?: Database["public"]["Enums"]["loadstatus"]
          to_city?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_reg?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_return_loads_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      misc_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          notes: string | null
          owner_id: string | null
          trip_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "misc_expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "misc_expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          alert_days_before: string
          created_at: string
          email_compliance_alerts: boolean
          email_monthly_summary: boolean
          id: string
          owner_id: string
          phone: string | null
          updated_at: string
          whatsapp_compliance_alerts: boolean
          whatsapp_monthly_summary: boolean
        }
        Insert: {
          alert_days_before?: string
          created_at?: string
          email_compliance_alerts?: boolean
          email_monthly_summary?: boolean
          id?: string
          owner_id: string
          phone?: string | null
          updated_at?: string
          whatsapp_compliance_alerts?: boolean
          whatsapp_monthly_summary?: boolean
        }
        Update: {
          alert_days_before?: string
          created_at?: string
          email_compliance_alerts?: boolean
          email_monthly_summary?: boolean
          id?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
          whatsapp_compliance_alerts?: boolean
          whatsapp_monthly_summary?: boolean
        }
        Relationships: []
      }
      operational_insights: {
        Row: {
          body: string | null
          created_at: string
          driver_id: string | null
          expires_at: string | null
          id: string
          insight_type: Database["public"]["Enums"]["insighttype"]
          is_dismissed: boolean
          is_read: boolean
          meta: Json | null
          owner_id: string
          severity: Database["public"]["Enums"]["insightseverity"]
          title: string
          trip_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          driver_id?: string | null
          expires_at?: string | null
          id?: string
          insight_type: Database["public"]["Enums"]["insighttype"]
          is_dismissed?: boolean
          is_read?: boolean
          meta?: Json | null
          owner_id: string
          severity?: Database["public"]["Enums"]["insightseverity"]
          title: string
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          driver_id?: string | null
          expires_at?: string | null
          id?: string
          insight_type?: Database["public"]["Enums"]["insighttype"]
          is_dismissed?: boolean
          is_read?: boolean
          meta?: Json | null
          owner_id?: string
          severity?: Database["public"]["Enums"]["insightseverity"]
          title?: string
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      parties: {
        Row: {
          address: string | null
          created_at: string
          gstin: string | null
          id: string
          name: string
          notes: string | null
          opening_balance: number | null
          owner_id: string | null
          party_type: Database["public"]["Enums"]["partytype"]
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number | null
          owner_id?: string | null
          party_type?: Database["public"]["Enums"]["partytype"]
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number | null
          owner_id?: string | null
          party_type?: Database["public"]["Enums"]["partytype"]
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          razorpay_subscription_id: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          razorpay_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          razorpay_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          email: string
          firebase_uid: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          name: string
          owner_id: string
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          firebase_uid?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          name: string
          owner_id: string
          phone?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          firebase_uid?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      toll_logs: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          notes: string | null
          owner_id: string | null
          payment_mode: string
          route: string | null
          toll_plaza: string | null
          trip_id: string | null
          vehicle_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          payment_mode?: string
          route?: string | null
          toll_plaza?: string | null
          trip_id?: string | null
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          payment_mode?: string
          route?: string | null
          toll_plaza?: string | null
          trip_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toll_logs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toll_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          destination: string
          distance_km: number | null
          doc_number: string | null
          driver_advance: number | null
          driver_id: string | null
          driver_name: string
          driver_phone: string | null
          end_date: string | null
          freight_amount: number
          id: string
          material: string | null
          notes: string | null
          origin: string
          owner_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["tripstatus"]
          updated_at: string
          vehicle_id: string
          weight_tonnes: number | null
        }
        Insert: {
          created_at?: string
          destination: string
          distance_km?: number | null
          doc_number?: string | null
          driver_advance?: number | null
          driver_id?: string | null
          driver_name: string
          driver_phone?: string | null
          end_date?: string | null
          freight_amount?: number
          id?: string
          material?: string | null
          notes?: string | null
          origin: string
          owner_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["tripstatus"]
          updated_at?: string
          vehicle_id: string
          weight_tonnes?: number | null
        }
        Update: {
          created_at?: string
          destination?: string
          distance_km?: number | null
          doc_number?: string | null
          driver_advance?: number | null
          driver_id?: string | null
          driver_name?: string
          driver_phone?: string | null
          end_date?: string | null
          freight_amount?: number
          id?: string
          material?: string | null
          notes?: string | null
          origin?: string
          owner_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["tripstatus"]
          updated_at?: string
          vehicle_id?: string
          weight_tonnes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tyre_logs: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          notes: string | null
          odometer_km: number | null
          owner_id: string | null
          tyre_brand: string | null
          tyre_count: number
          tyre_position: string | null
          tyre_type: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          odometer_km?: number | null
          owner_id?: string | null
          tyre_brand?: string | null
          tyre_count?: number
          tyre_position?: string | null
          tyre_type?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          odometer_km?: number | null
          owner_id?: string | null
          tyre_brand?: string | null
          tyre_count?: number
          tyre_position?: string | null
          tyre_type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tyre_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tyre_setups: {
        Row: {
          has_spare: boolean
          id: string
          owner_id: string
          synced_trip_ids: Json
          tyre_count: number
          tyres: Json
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          has_spare?: boolean
          id?: string
          owner_id: string
          synced_trip_ids?: Json
          tyre_count: number
          tyres?: Json
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          has_spare?: boolean
          id?: string
          owner_id?: string
          synced_trip_ids?: Json
          tyre_count?: number
          tyres?: Json
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tyre_setups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tyre_setups_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          google_id: string | null
          google_picture: string | null
          gst_number: string | null
          hashed_password: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string
          org_logo: string | null
          org_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          google_id?: string | null
          google_picture?: string | null
          gst_number?: string | null
          hashed_password?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name: string
          org_logo?: string | null
          org_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          google_id?: string | null
          google_picture?: string | null
          gst_number?: string | null
          hashed_password?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          org_logo?: string | null
          org_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_issues: {
        Row: {
          created_at: string | null
          description: string
          driver_id: string
          id: string
          image_url: string | null
          issue_type: string
          owner_id: string
          severity: string
          status: string
          trip_id: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          driver_id: string
          id?: string
          image_url?: string | null
          issue_type: string
          owner_id: string
          severity?: string
          status?: string
          trip_id?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          driver_id?: string
          id?: string
          image_url?: string | null
          issue_type?: string
          owner_id?: string
          severity?: string
          status?: string
          trip_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_issues_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_issues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_issues_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_issues_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          avg_mileage_kmpl: number | null
          chassis_number: string | null
          color: string | null
          created_at: string
          engine_number: string | null
          fitness_expiry: string | null
          fuel_type: string | null
          id: string
          insurance_expiry: string | null
          make: string
          model: string
          owner_id: string | null
          owner_name: string | null
          permit_expiry: string | null
          puc_expiry: string | null
          registration_number: string
          rto_code: string | null
          status: Database["public"]["Enums"]["vehiclestatus"]
          updated_at: string
          vehicle_class: string | null
          vehicle_type: Database["public"]["Enums"]["vehicletype"]
          year: number | null
        }
        Insert: {
          avg_mileage_kmpl?: number | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string
          engine_number?: string | null
          fitness_expiry?: string | null
          fuel_type?: string | null
          id?: string
          insurance_expiry?: string | null
          make: string
          model: string
          owner_id?: string | null
          owner_name?: string | null
          permit_expiry?: string | null
          puc_expiry?: string | null
          registration_number: string
          rto_code?: string | null
          status?: Database["public"]["Enums"]["vehiclestatus"]
          updated_at?: string
          vehicle_class?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicletype"]
          year?: number | null
        }
        Update: {
          avg_mileage_kmpl?: number | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string
          engine_number?: string | null
          fitness_expiry?: string | null
          fuel_type?: string | null
          id?: string
          insurance_expiry?: string | null
          make?: string
          model?: string
          owner_id?: string | null
          owner_name?: string | null
          permit_expiry?: string | null
          puc_expiry?: string | null
          registration_number?: string
          rto_code?: string | null
          status?: Database["public"]["Enums"]["vehiclestatus"]
          updated_at?: string
          vehicle_class?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicletype"]
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_active_driver_trips: {
        Args: { p_driver_id: string }
        Returns: {
          created_at: string
          destination: string
          distance_km: number
          doc_number: string
          driver_advance: number
          driver_id: string
          driver_name: string
          driver_phone: string
          end_date: string
          freight_amount: number
          id: string
          material: string
          notes: string
          origin: string
          owner_id: string
          start_date: string
          status: string
          updated_at: string
          vehicle_id: string
          vehicles: Json
          weight_tonnes: number
        }[]
      }
      get_completed_driver_trips: {
        Args: { p_driver_id: string }
        Returns: {
          created_at: string
          destination: string
          distance_km: number
          doc_number: string
          driver_advance: number
          driver_id: string
          driver_name: string
          driver_phone: string
          end_date: string
          freight_amount: number
          id: string
          material: string
          notes: string
          origin: string
          owner_id: string
          start_date: string
          status: string
          updated_at: string
          vehicle_id: string
          vehicles: Json
          weight_tonnes: number
        }[]
      }
      get_driver_by_phone: {
        Args: { p_phone: string }
        Returns: {
          address: string | null
          alternate_phone: string | null
          badge_issue_date: string | null
          blood_group: string | null
          created_at: string
          dob: string | null
          father_name: string | null
          firebase_uid: string | null
          id: string
          issuing_rto: string | null
          license_class: Database["public"]["Enums"]["licenseclass"] | null
          license_expiry: string | null
          license_number: string | null
          name: string
          owner_id: string | null
          phone: string
          status: Database["public"]["Enums"]["driverstatus"]
          transport_validity: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "drivers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_driver_id_for_uid: { Args: never; Returns: string }
      get_team_member_owner_id: { Args: never; Returns: string }
      get_team_member_role: { Args: never; Returns: string }
      get_team_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      link_driver_firebase_uid: {
        Args: { p_driver_id: string; p_firebase_uid: string }
        Returns: undefined
      }
    }
    Enums: {
      driverstatus: "available" | "on_trip" | "inactive"
      insightseverity: "info" | "warning" | "critical"
      insighttype:
        | "idle_vehicle"
        | "unrecorded_expense"
        | "cost_per_km"
        | "fuel_anomaly"
        | "driver_fatigue"
        | "maintenance_due"
        | "empty_run"
        | "compliance_expiry"
      intereststatus: "pending" | "accepted" | "rejected" | "withdrawn"
      licenseclass: "LMV" | "HMV" | "HGMV" | "HPMV" | "other"
      loadstatus: "open" | "matched" | "expired" | "cancelled"
      partytype: "customer" | "transporter" | "vendor"
      paymenttype: "advance" | "salary" | "deduction" | "bonus" | "settlement"
      policytype:
        | "insurance"
        | "fitness"
        | "permit"
        | "puc"
        | "road_tax"
        | "other"
      tripstatus: "planned" | "in_progress" | "completed" | "cancelled"
      vehiclestatus: "active" | "inactive" | "in_trip" | "maintenance"
      vehicletype:
        | "truck"
        | "mini_truck"
        | "trailer"
        | "tanker"
        | "container"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      driverstatus: ["available", "on_trip", "inactive"],
      insightseverity: ["info", "warning", "critical"],
      insighttype: [
        "idle_vehicle",
        "unrecorded_expense",
        "cost_per_km",
        "fuel_anomaly",
        "driver_fatigue",
        "maintenance_due",
        "empty_run",
        "compliance_expiry",
      ],
      intereststatus: ["pending", "accepted", "rejected", "withdrawn"],
      licenseclass: ["LMV", "HMV", "HGMV", "HPMV", "other"],
      loadstatus: ["open", "matched", "expired", "cancelled"],
      partytype: ["customer", "transporter", "vendor"],
      paymenttype: ["advance", "salary", "deduction", "bonus", "settlement"],
      policytype: [
        "insurance",
        "fitness",
        "permit",
        "puc",
        "road_tax",
        "other",
      ],
      tripstatus: ["planned", "in_progress", "completed", "cancelled"],
      vehiclestatus: ["active", "inactive", "in_trip", "maintenance"],
      vehicletype: [
        "truck",
        "mini_truck",
        "trailer",
        "tanker",
        "container",
        "other",
      ],
    },
  },
} as const
