import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'manager' | 'executive' | 'accountant' | 'hr' | 'procurement' | 'dispatch'
          branch_id: string
          phone: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      branches: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          state: string
          pincode: string
          phone: string
          email: string
          gst_number: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['branches']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['branches']['Insert']>
      }
      leads: {
        Row: {
          id: string
          company_name: string
          contact_person: string
          email: string
          phone: string
          source: 'website' | 'indiamart' | 'tradeindia' | 'whatsapp' | 'call' | 'email' | 'referral'
          status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          assigned_to: string
          branch_id: string
          requirements: string
          budget: number
          expected_closure: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
      quotations: {
        Row: {
          id: string
          quotation_number: string
          lead_id: string
          customer_name: string
          customer_email: string
          customer_phone: string
          items: any[]
          subtotal: number
          tax_amount: number
          total_amount: number
          valid_until: string
          status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
          created_by: string
          branch_id: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['quotations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['quotations']['Insert']>
      }
      employees: {
        Row: {
          id: string
          employee_id: string
          full_name: string
          email: string
          phone: string
          date_of_birth: string
          joining_date: string
          department: string
          designation: string
          branch_id: string
          address: string
          emergency_contact: string
          pan_number: string
          aadhaar_number: string
          bank_account: string
          bank_ifsc: string
          basic_salary: number
          hra: number
          allowances: number
          status: 'active' | 'inactive' | 'terminated'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['employees']['Insert']>
      }
      vendors: {
        Row: {
          id: string
          vendor_name: string
          contact_person: string
          email: string
          phone: string
          address: string
          gst_number: string
          pan_number: string
          payment_terms: string
          category: string
          status: 'active' | 'inactive'
          branch_id: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['vendors']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['vendors']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          customer_name: string
          customer_gst: string
          items: any[]
          subtotal: number
          cgst: number
          sgst: number
          igst: number
          total_amount: number
          payment_status: 'pending' | 'partial' | 'paid' | 'overdue'
          due_date: string
          branch_id: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
    }
  }
}