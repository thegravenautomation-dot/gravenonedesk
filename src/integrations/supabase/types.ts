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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_interactions: {
        Row: {
          ai_response: string
          branch_id: string
          context: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          user_message: string
        }
        Insert: {
          ai_response: string
          branch_id: string
          context?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          user_message: string
        }
        Update: {
          ai_response?: string
          branch_id?: string
          context?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_interactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          branch_id: string | null
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string | null
          id: string
          status: Database["public"]["Enums"]["attendance_status"] | null
          working_hours: number | null
        }
        Insert: {
          branch_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          employee_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["attendance_status"] | null
          working_hours?: number | null
        }
        Update: {
          branch_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["attendance_status"] | null
          working_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          branch_id: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          branch_id: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          branch_id?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          address: string | null
          bank_name: string | null
          city: string | null
          code: string
          created_at: string | null
          email: string | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          manager_id: string | null
          name: string
          phone: string | null
          pincode: string | null
          state: string | null
          terms_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          city?: string | null
          code: string
          created_at?: string | null
          email?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          terms_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          city?: string | null
          code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          terms_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      communication_templates: {
        Row: {
          branch_id: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string | null
          template_body: string
          type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          branch_id: string
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject?: string | null
          template_body: string
          type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          branch_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string | null
          template_body?: string
          type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      communications: {
        Row: {
          branch_id: string
          contact_type: string
          created_at: string
          direction: string
          from_contact: string
          id: string
          message: string
          metadata: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
          sent_by: string | null
          status: string
          subject: string | null
          to_contact: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          contact_type: string
          created_at?: string
          direction: string
          from_contact: string
          id?: string
          message: string
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          to_contact: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          contact_type?: string
          created_at?: string
          direction?: string
          from_contact?: string
          id?: string
          message?: string
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          to_contact?: string
          updated_at?: string
        }
        Relationships: []
      }
      courier_configs: {
        Row: {
          api_credentials: Json | null
          api_endpoint: string | null
          branch_id: string
          courier_provider: Database["public"]["Enums"]["courier_provider"]
          created_at: string
          id: string
          is_active: boolean | null
          rate_config: Json | null
          updated_at: string
        }
        Insert: {
          api_credentials?: Json | null
          api_endpoint?: string | null
          branch_id: string
          courier_provider: Database["public"]["Enums"]["courier_provider"]
          created_at?: string
          id?: string
          is_active?: boolean | null
          rate_config?: Json | null
          updated_at?: string
        }
        Update: {
          api_credentials?: Json | null
          api_endpoint?: string | null
          branch_id?: string
          courier_provider?: Database["public"]["Enums"]["courier_provider"]
          created_at?: string
          id?: string
          is_active?: boolean | null
          rate_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_ledger: {
        Row: {
          balance: number | null
          branch_id: string
          created_at: string
          created_by: string | null
          credit_amount: number | null
          customer_id: string
          debit_amount: number | null
          description: string
          id: string
          is_editable: boolean | null
          payment_id: string | null
          payment_mode: string | null
          reference_id: string | null
          reference_type: string | null
          running_balance: number | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          balance?: number | null
          branch_id: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number | null
          customer_id: string
          debit_amount?: number | null
          description: string
          id?: string
          is_editable?: boolean | null
          payment_id?: string | null
          payment_mode?: string | null
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          balance?: number | null
          branch_id?: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number | null
          customer_id?: string
          debit_amount?: number | null
          description?: string
          id?: string
          is_editable?: boolean | null
          payment_id?: string | null
          payment_mode?: string | null
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          assigned_executive: string | null
          billing_address: string | null
          branch_id: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          designation: string | null
          email: string | null
          gstin: string | null
          id: string
          industry: string | null
          name: string
          pan: string | null
          phone: string | null
          pincode: string | null
          region: string | null
          shipping_address: string | null
          state: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          assigned_executive?: string | null
          billing_address?: string | null
          branch_id?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          designation?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          industry?: string | null
          name: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          region?: string | null
          shipping_address?: string | null
          state?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          assigned_executive?: string | null
          billing_address?: string | null
          branch_id?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          designation?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          industry?: string | null
          name?: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          region?: string | null
          shipping_address?: string | null
          state?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_data_audit: {
        Row: {
          access_reason: string | null
          accessed_by: string
          accessed_fields: string[]
          created_at: string
          employee_id: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
        }
        Insert: {
          access_reason?: string | null
          accessed_by: string
          accessed_fields: string[]
          created_at?: string
          employee_id: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Update: {
          access_reason?: string | null
          accessed_by?: string
          accessed_fields?: string[]
          created_at?: string
          employee_id?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Relationships: []
      }
      employee_queries: {
        Row: {
          assigned_to: string | null
          branch_id: string
          category: string
          created_at: string
          description: string
          employee_id: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          branch_id: string
          category?: string
          created_at?: string
          description: string
          employee_id: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string
          category?: string
          created_at?: string
          description?: string
          employee_id?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          aadhaar: string | null
          address: string | null
          allowances: number | null
          bank_account: string | null
          basic_salary: number | null
          branch_id: string | null
          created_at: string | null
          date_of_birth: string | null
          department: string | null
          designation: string | null
          email: string | null
          employee_id: string
          full_name: string
          hra: number | null
          id: string
          ifsc_code: string | null
          joining_date: string | null
          pan: string | null
          phone: string | null
          profile_id: string | null
          reporting_manager: string | null
          status: Database["public"]["Enums"]["employee_status"] | null
          updated_at: string | null
        }
        Insert: {
          aadhaar?: string | null
          address?: string | null
          allowances?: number | null
          bank_account?: string | null
          basic_salary?: number | null
          branch_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_id: string
          full_name: string
          hra?: number | null
          id?: string
          ifsc_code?: string | null
          joining_date?: string | null
          pan?: string | null
          phone?: string | null
          profile_id?: string | null
          reporting_manager?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          updated_at?: string | null
        }
        Update: {
          aadhaar?: string | null
          address?: string | null
          allowances?: number | null
          bank_account?: string | null
          basic_salary?: number | null
          branch_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_id?: string
          full_name?: string
          hra?: number | null
          id?: string
          ifsc_code?: string | null
          joining_date?: string | null
          pan?: string | null
          phone?: string | null
          profile_id?: string | null
          reporting_manager?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_manager_fkey"
            columns: ["reporting_manager"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          assigned_to: string
          branch_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          follow_up_date: string
          follow_up_time: string | null
          id: string
          lead_id: string | null
          next_follow_up_date: string | null
          notes: string | null
          priority: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          branch_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          follow_up_date: string
          follow_up_time?: string | null
          id?: string
          lead_id?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          priority?: string
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          branch_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          follow_up_date?: string
          follow_up_time?: string | null
          id?: string
          lead_id?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          priority?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string | null
          gst_amount: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          invoice_id: string
          item_name: string
          quantity: number | null
          sr_no: number
          total_amount: number
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          invoice_id: string
          item_name: string
          quantity?: number | null
          sr_no: number
          total_amount?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          invoice_id?: string
          item_name?: string
          quantity?: number | null
          sr_no?: number
          total_amount?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          branch_id: string | null
          created_at: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_no: string
          invoice_type: Database["public"]["Enums"]["invoice_type"] | null
          order_id: string | null
          paid_amount: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"] | null
          order_id?: string | null
          paid_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"] | null
          order_id?: string | null
          paid_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          added_by: string
          branch_id: string
          category: string | null
          created_at: string
          current_stock: number | null
          description: string | null
          hsn_code: string | null
          id: string
          last_updated: string | null
          minimum_stock: number | null
          name: string
          price: number | null
          source: string
          status: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          added_by: string
          branch_id: string
          category?: string | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          last_updated?: string | null
          minimum_stock?: number | null
          name: string
          price?: number | null
          source?: string
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          added_by?: string
          branch_id?: string
          category?: string | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          last_updated?: string | null
          minimum_stock?: number | null
          name?: string
          price?: number | null
          source?: string
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_assignment_log: {
        Row: {
          assigned_by: string | null
          assigned_to: string
          branch_id: string
          created_at: string
          id: string
          lead_id: string
          manual_override: boolean
          rule_used: string | null
          timestamp: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to: string
          branch_id: string
          created_at?: string
          id?: string
          lead_id: string
          manual_override?: boolean
          rule_used?: string | null
          timestamp?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string
          branch_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          manual_override?: boolean
          rule_used?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      lead_assignment_rules: {
        Row: {
          assigned_to: string
          branch_id: string
          conditions: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          rule_type: string | null
          updated_at: string
        }
        Insert: {
          assigned_to: string
          branch_id: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          rule_type?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          branch_id?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          rule_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_sources: {
        Row: {
          api_config: Json | null
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          source_type: string
          updated_at: string
        }
        Insert: {
          api_config?: Json | null
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          source_type: string
          updated_at?: string
        }
        Update: {
          api_config?: Json | null
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          branch_id: string | null
          city: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          expected_close_date: string | null
          external_id: string | null
          id: string
          lead_no: string
          lead_source_id: string | null
          probability: number | null
          raw_data: Json | null
          region: string | null
          source: string | null
          state: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          external_id?: string | null
          id?: string
          lead_no: string
          lead_source_id?: string | null
          probability?: number | null
          raw_data?: Json | null
          region?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          external_id?: string | null
          id?: string
          lead_no?: string
          lead_source_id?: string | null
          probability?: number | null
          raw_data?: Json | null
          region?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id: string
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          branch_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          assigned_to: string | null
          branch_id: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          lost_reason: string | null
          priority: string | null
          probability: number | null
          source: string | null
          stage_id: string
          status: string | null
          title: string
          updated_at: string
          value: number | null
          won_reason: string | null
        }
        Insert: {
          assigned_to?: string | null
          branch_id: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          priority?: string | null
          probability?: number | null
          source?: string | null
          stage_id: string
          status?: string | null
          title: string
          updated_at?: string
          value?: number | null
          won_reason?: string | null
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          priority?: string | null
          probability?: number | null
          source?: string | null
          stage_id?: string
          status?: string | null
          title?: string
          updated_at?: string
          value?: number | null
          won_reason?: string | null
        }
        Relationships: []
      }
      opportunity_activities: {
        Row: {
          activity_type: string
          branch_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          opportunity_id: string
          title: string
        }
        Insert: {
          activity_type: string
          branch_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          opportunity_id: string
          title: string
        }
        Update: {
          activity_type?: string
          branch_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          opportunity_id?: string
          title?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          description: string | null
          gst_amount: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          item_name: string
          order_id: string
          quantity: number | null
          sr_no: number
          total_amount: number
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          item_name: string
          order_id: string
          quantity?: number | null
          sr_no: number
          total_amount?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          item_name?: string
          order_id?: string
          quantity?: number | null
          sr_no?: number
          total_amount?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_po_no: string | null
          delivery_date: string | null
          id: string
          order_date: string | null
          order_no: string
          payment_receipt_attachment: string | null
          po_pdf_path: string | null
          purchase_order_attachment: string | null
          quotation_id: string | null
          shipment_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_po_no?: string | null
          delivery_date?: string | null
          id?: string
          order_date?: string | null
          order_no: string
          payment_receipt_attachment?: string | null
          po_pdf_path?: string | null
          purchase_order_attachment?: string | null
          quotation_id?: string | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_po_no?: string | null
          delivery_date?: string | null
          id?: string
          order_date?: string | null
          order_no?: string
          payment_receipt_attachment?: string | null
          po_pdf_path?: string | null
          purchase_order_attachment?: string | null
          quotation_id?: string | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_name: string | null
          branch_id: string
          cheque_number: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          method: string | null
          note: string | null
          order_id: string
          payment_date: string
          payment_mode: string | null
          payment_mode_extended: string | null
          receipt_path: string | null
          reference: string | null
          remarks: string | null
          transaction_id: string | null
          updated_at: string
          verification_date: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          bank_name?: string | null
          branch_id: string
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          method?: string | null
          note?: string | null
          order_id: string
          payment_date?: string
          payment_mode?: string | null
          payment_mode_extended?: string | null
          receipt_path?: string | null
          reference?: string | null
          remarks?: string | null
          transaction_id?: string | null
          updated_at?: string
          verification_date?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          bank_name?: string | null
          branch_id?: string
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          method?: string | null
          note?: string | null
          order_id?: string
          payment_date?: string
          payment_mode?: string | null
          payment_mode_extended?: string | null
          receipt_path?: string | null
          reference?: string | null
          remarks?: string | null
          transaction_id?: string | null
          updated_at?: string
          verification_date?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          branch_id: string
          color: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          order_index: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch_id: string
          created_at: string | null
          department: string | null
          designation: string | null
          email: string
          employee_id: string | null
          full_name: string
          id: string
          is_active: boolean | null
          joining_date: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          joining_date?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          joining_date?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          description: string | null
          gst_amount: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          item_name: string
          purchase_order_id: string | null
          quantity: number | null
          source_order_item_id: string | null
          sr_no: number
          total_amount: number
          unit: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          item_name: string
          purchase_order_id?: string | null
          quantity?: number | null
          source_order_item_id?: string | null
          sr_no: number
          total_amount?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          item_name?: string
          purchase_order_id?: string | null
          quantity?: number | null
          source_order_item_id?: string | null
          sr_no?: number
          total_amount?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          delivery_date: string | null
          exchange_rate: number | null
          id: string
          order_source: string | null
          po_date: string | null
          po_no: string
          source_order_ids: Json | null
          status: string | null
          subtotal: number | null
          supplier_contact: string | null
          supplier_email: string | null
          tax_amount: number | null
          terms_conditions: string | null
          total_amount: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          exchange_rate?: number | null
          id?: string
          order_source?: string | null
          po_date?: string | null
          po_no: string
          source_order_ids?: Json | null
          status?: string | null
          subtotal?: number | null
          supplier_contact?: string | null
          supplier_email?: string | null
          tax_amount?: number | null
          terms_conditions?: string | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          exchange_rate?: number | null
          id?: string
          order_source?: string | null
          po_date?: string | null
          po_no?: string
          source_order_ids?: Json | null
          status?: string | null
          subtotal?: number | null
          supplier_contact?: string | null
          supplier_email?: string | null
          tax_amount?: number | null
          terms_conditions?: string | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string | null
          gst_amount: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          item_name: string
          quantity: number | null
          quotation_id: string
          sr_no: number
          total_amount: number
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          item_name: string
          quantity?: number | null
          quotation_id: string
          sr_no: number
          total_amount?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          item_name?: string
          quantity?: number | null
          quotation_id?: string
          sr_no?: number
          total_amount?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_revisions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          quotation_id: string
          revision_no: number
          snapshot: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          quotation_id: string
          revision_no: number
          snapshot: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          quotation_id?: string
          revision_no?: number
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quotation_revisions_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          id: string
          lead_id: string | null
          quotation_no: string
          status: Database["public"]["Enums"]["quotation_status"] | null
          subtotal: number | null
          tax_amount: number | null
          terms: string | null
          total_amount: number | null
          updated_at: string | null
          valid_till: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          quotation_no: string
          status?: Database["public"]["Enums"]["quotation_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_till?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          quotation_no?: string
          status?: Database["public"]["Enums"]["quotation_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_till?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_items: {
        Row: {
          created_at: string
          description: string | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          item_name: string
          quantity: number
          required_delivery_date: string | null
          rfq_id: string
          specification: string | null
          sr_no: number
          unit: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          item_name: string
          quantity?: number
          required_delivery_date?: string | null
          rfq_id: string
          specification?: string | null
          sr_no: number
          unit?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          item_name?: string
          quantity?: number
          required_delivery_date?: string | null
          rfq_id?: string
          specification?: string | null
          sr_no?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_vendors: {
        Row: {
          id: string
          invited_at: string
          notified_at: string | null
          rfq_id: string
          status: string
          vendor_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          notified_at?: string | null
          rfq_id: string
          status?: string
          vendor_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          notified_at?: string | null
          rfq_id?: string
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_vendors_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          rfq_no: string
          status: string
          terms_conditions: string | null
          title: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          rfq_no: string
          status?: string
          terms_conditions?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          rfq_no?: string
          status?: string
          terms_conditions?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          actual_delivery_date: string | null
          awb_file_path: string | null
          awb_number: string | null
          booking_date: string | null
          branch_id: string
          cod_amount: number | null
          courier_provider:
            | Database["public"]["Enums"]["courier_provider"]
            | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_type: string | null
          dimensions: Json | null
          expected_delivery_date: string | null
          id: string
          last_tracked_at: string | null
          order_id: string
          shipment_status: Database["public"]["Enums"]["shipment_status"] | null
          shipping_address: Json
          special_instructions: string | null
          tracking_data: Json | null
          tracking_url: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          actual_delivery_date?: string | null
          awb_file_path?: string | null
          awb_number?: string | null
          booking_date?: string | null
          branch_id: string
          cod_amount?: number | null
          courier_provider?:
            | Database["public"]["Enums"]["courier_provider"]
            | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_type?: string | null
          dimensions?: Json | null
          expected_delivery_date?: string | null
          id?: string
          last_tracked_at?: string | null
          order_id: string
          shipment_status?:
            | Database["public"]["Enums"]["shipment_status"]
            | null
          shipping_address: Json
          special_instructions?: string | null
          tracking_data?: Json | null
          tracking_url?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          actual_delivery_date?: string | null
          awb_file_path?: string | null
          awb_number?: string | null
          booking_date?: string | null
          branch_id?: string
          cod_amount?: number | null
          courier_provider?:
            | Database["public"]["Enums"]["courier_provider"]
            | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_type?: string | null
          dimensions?: Json | null
          expected_delivery_date?: string | null
          id?: string
          last_tracked_at?: string | null
          order_id?: string
          shipment_status?:
            | Database["public"]["Enums"]["shipment_status"]
            | null
          shipping_address?: Json
          special_instructions?: string | null
          tracking_data?: Json | null
          tracking_url?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      shipping_labels: {
        Row: {
          barcode_data: string | null
          created_at: string
          generated_at: string | null
          generated_by: string | null
          id: string
          label_pdf_path: string | null
          label_size: string | null
          shipment_id: string
        }
        Insert: {
          barcode_data?: string | null
          created_at?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          label_pdf_path?: string | null
          label_size?: string | null
          shipment_id: string
        }
        Update: {
          barcode_data?: string | null
          created_at?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          label_pdf_path?: string | null
          label_size?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_labels_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_status: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_sync_at: string | null
          next_sync_at: string | null
          rate_limit_until: string | null
          source_name: string
          sync_interval_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          rate_limit_until?: string | null
          source_name: string
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          rate_limit_until?: string | null
          source_name?: string
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendor_applications: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          address: string | null
          annual_turnover: number | null
          application_date: string
          bank_name: string | null
          branch_id: string
          business_type: string | null
          city: string | null
          company_name: string
          contact_person: string
          created_at: string
          email: string
          gstin: string | null
          id: string
          ifsc_code: string | null
          pan: string | null
          phone: string
          pincode: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string
          updated_at: string
          years_in_business: number | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          annual_turnover?: number | null
          application_date?: string
          bank_name?: string | null
          branch_id: string
          business_type?: string | null
          city?: string | null
          company_name: string
          contact_person: string
          created_at?: string
          email: string
          gstin?: string | null
          id?: string
          ifsc_code?: string | null
          pan?: string | null
          phone: string
          pincode?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          years_in_business?: number | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          annual_turnover?: number | null
          application_date?: string
          bank_name?: string | null
          branch_id?: string
          business_type?: string | null
          city?: string | null
          company_name?: string
          contact_person?: string
          created_at?: string
          email?: string
          gstin?: string | null
          id?: string
          ifsc_code?: string | null
          pan?: string | null
          phone?: string
          pincode?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          years_in_business?: number | null
        }
        Relationships: []
      }
      vendor_quotation_items: {
        Row: {
          created_at: string
          delivery_days: number | null
          id: string
          quotation_id: string
          remarks: string | null
          rfq_item_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          delivery_days?: number | null
          id?: string
          quotation_id: string
          remarks?: string | null
          rfq_item_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          delivery_days?: number | null
          id?: string
          quotation_id?: string
          remarks?: string | null
          rfq_item_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "vendor_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quotation_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "rfq_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_quotations: {
        Row: {
          created_at: string
          currency: string | null
          delivery_terms: string | null
          id: string
          payment_terms: string | null
          quotation_no: string
          remarks: string | null
          rfq_id: string
          status: string
          submission_date: string
          submitted_by: string
          total_amount: number
          updated_at: string
          valid_till: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          delivery_terms?: string | null
          id?: string
          payment_terms?: string | null
          quotation_no: string
          remarks?: string | null
          rfq_id: string
          status?: string
          submission_date?: string
          submitted_by: string
          total_amount?: number
          updated_at?: string
          valid_till?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          delivery_terms?: string | null
          id?: string
          payment_terms?: string | null
          quotation_no?: string
          remarks?: string | null
          rfq_id?: string
          status?: string
          submission_date?: string
          submitted_by?: string
          total_amount?: number
          updated_at?: string
          valid_till?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_quotations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quotations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_users: {
        Row: {
          created_at: string
          id: string
          is_primary_contact: boolean | null
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean | null
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean | null
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_users_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          branch_id: string | null
          business_type: string | null
          city: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean | null
          name: string
          pan: string | null
          payment_terms: string | null
          phone: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          business_type?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pan?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          business_type?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pan?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_lead_smart: {
        Args: { p_branch_id: string; p_lead_id: string }
        Returns: string
      }
      assign_lead_smart_with_log: {
        Args: { p_branch_id: string; p_lead_id: string }
        Returns: string
      }
      can_access_employee_data: {
        Args: { _employee_branch_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_sales_data: {
        Args: { _target_branch_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_sales_team: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_vendor_access_rfq: {
        Args: { p_rfq_id: string; p_user_id: string }
        Returns: boolean
      }
      generate_tracking_barcode: {
        Args: { p_shipment_id: string }
        Returns: string
      }
      get_customer_account_summary: {
        Args: { p_customer_id: string }
        Returns: {
          current_balance: number
          total_due: number
          total_orders: number
          total_payments: number
        }[]
      }
      get_employee_data_secure: {
        Args: { p_employee_id?: string; p_include_sensitive?: boolean }
        Returns: {
          aadhaar: string
          address: string
          allowances: number
          bank_account: string
          basic_salary: number
          branch_id: string
          created_at: string
          date_of_birth: string
          department: string
          designation: string
          email: string
          employee_id: string
          full_name: string
          hra: number
          id: string
          ifsc_code: string
          joining_date: string
          pan: string
          phone: string
          profile_id: string
          reporting_manager: string
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
        }[]
      }
      get_previous_salesperson_for_customer: {
        Args: { p_branch_id: string; p_customer_id: string }
        Returns: string
      }
      get_security_recommendations: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_required: string
          recommendation: string
        }[]
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_hr_or_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_order_fully_paid: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      log_employee_data_access: {
        Args: {
          p_access_reason?: string
          p_accessed_fields: string[]
          p_employee_id: string
        }
        Returns: undefined
      }
      mask_sensitive_employee_data: {
        Args: {
          p_data_type: string
          p_is_hr_admin?: boolean
          p_is_owner?: boolean
          p_value: string
        }
        Returns: string
      }
      recalculate_customer_balance: {
        Args: { customer_uuid: string }
        Returns: undefined
      }
      update_sync_status: {
        Args: {
          p_branch_id: string
          p_error_message?: string
          p_interval_minutes?: number
          p_source_name: string
          p_success?: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      attendance_status: "present" | "absent" | "half_day" | "late"
      courier_provider:
        | "dtdc"
        | "shree_maruti"
        | "bluedart"
        | "delhivery"
        | "fedex"
        | "dhl"
        | "aramex"
        | "other"
      employee_status: "active" | "inactive" | "terminated"
      invoice_type: "regular" | "proforma"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      leave_status: "pending" | "approved" | "rejected"
      leave_type:
        | "sick"
        | "casual"
        | "annual"
        | "maternity"
        | "paternity"
        | "emergency"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_status: "pending" | "partial" | "paid" | "overdue"
      quotation_status: "draft" | "sent" | "approved" | "rejected" | "converted"
      shipment_status:
        | "pending"
        | "booked"
        | "picked_up"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "returned"
        | "cancelled"
      user_role:
        | "admin"
        | "manager"
        | "executive"
        | "accountant"
        | "hr"
        | "procurement"
        | "dispatch"
        | "sales_manager"
        | "bdo"
        | "fbdo"
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
      attendance_status: ["present", "absent", "half_day", "late"],
      courier_provider: [
        "dtdc",
        "shree_maruti",
        "bluedart",
        "delhivery",
        "fedex",
        "dhl",
        "aramex",
        "other",
      ],
      employee_status: ["active", "inactive", "terminated"],
      invoice_type: ["regular", "proforma"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: [
        "sick",
        "casual",
        "annual",
        "maternity",
        "paternity",
        "emergency",
      ],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_status: ["pending", "partial", "paid", "overdue"],
      quotation_status: ["draft", "sent", "approved", "rejected", "converted"],
      shipment_status: [
        "pending",
        "booked",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "returned",
        "cancelled",
      ],
      user_role: [
        "admin",
        "manager",
        "executive",
        "accountant",
        "hr",
        "procurement",
        "dispatch",
        "sales_manager",
        "bdo",
        "fbdo",
      ],
    },
  },
} as const
