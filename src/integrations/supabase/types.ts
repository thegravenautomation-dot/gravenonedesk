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
          reference_id: string | null
          reference_type: string | null
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
          reference_id?: string | null
          reference_type?: string | null
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
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          billing_address: string | null
          branch_id: string | null
          city: string | null
          company: string | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          designation: string | null
          email: string | null
          gstin: string | null
          id: string
          name: string
          pan: string | null
          phone: string | null
          pincode: string | null
          shipping_address: string | null
          state: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          billing_address?: string | null
          branch_id?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          designation?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          shipping_address?: string | null
          state?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          billing_address?: string | null
          branch_id?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          designation?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
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
        Relationships: []
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
      lead_assignment_rules: {
        Row: {
          assigned_to: string
          branch_id: string
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          assigned_to: string
          branch_id: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          branch_id?: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
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
          source: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          branch_id?: string | null
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
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string | null
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
          source?: string | null
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
          customer_id: string | null
          customer_po_no: string | null
          delivery_date: string | null
          id: string
          order_date: string | null
          order_no: string
          po_pdf_path: string | null
          quotation_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_po_no?: string | null
          delivery_date?: string | null
          id?: string
          order_date?: string | null
          order_no: string
          po_pdf_path?: string | null
          quotation_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_po_no?: string | null
          delivery_date?: string | null
          id?: string
          order_date?: string | null
          order_no?: string
          po_pdf_path?: string | null
          quotation_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
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
          receipt_path: string | null
          reference: string | null
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
          receipt_path?: string | null
          reference?: string | null
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
          receipt_path?: string | null
          reference?: string | null
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
      purchase_orders: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          delivery_date: string | null
          id: string
          po_date: string | null
          po_no: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          po_date?: string | null
          po_no: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          po_date?: string | null
          po_no?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
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
      vendors: {
        Row: {
          address: string | null
          branch_id: string | null
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
      can_access_employee_data: {
        Args: { _employee_branch_id: string; _user_id: string }
        Returns: boolean
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
      user_role:
        | "admin"
        | "manager"
        | "executive"
        | "accountant"
        | "hr"
        | "procurement"
        | "dispatch"
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
      user_role: [
        "admin",
        "manager",
        "executive",
        "accountant",
        "hr",
        "procurement",
        "dispatch",
      ],
    },
  },
} as const
