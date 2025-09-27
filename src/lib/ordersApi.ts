import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = `https://xiqumuqtzejtiinezryu.supabase.co/functions/v1`;

export interface PaymentData {
  amount: number;
  payment_date: string;
  payment_mode: 'Cash' | 'UPI' | 'Net Banking' | 'Cheque';
  reference?: string;
  remarks?: string;
  created_by?: string;
}

export interface OrderPaymentResponse {
  order_id: string;
  customer_name: string;
  total_amount: number;
  total_paid: number;
  balance_due: number;
  payment_status: 'paid' | 'partial' | 'pending';
  payments: any[];
}

export interface CustomerLedgerResponse {
  customer: {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    gstin?: string;
  };
  account_summary: {
    total_orders: number;
    total_payments: number;
    current_balance: number;
    total_due: number;
    account_status: 'credit' | 'debit';
  };
  ledger_entries: any[];
  order_wise_summary: Record<string, any>;
  pagination: {
    limit: number;
    offset: number;
    total_entries: number;
    has_more: boolean;
  };
  filters: {
    from_date?: string;
    to_date?: string;
  };
  generated_at: string;
}

class OrdersApi {
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }

  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Upload purchase order file
  async uploadPurchaseOrder(orderId: string, file: File): Promise<{ success: boolean; message: string; filePath: string }> {
    const token = await this.getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);

    const response = await fetch(`${API_BASE_URL}/orders-api/orders/${orderId}/upload-purchase-order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  // Upload payment receipt file
  async uploadPaymentReceipt(orderId: string, file: File): Promise<{ success: boolean; message: string; filePath: string }> {
    const token = await this.getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);

    const response = await fetch(`${API_BASE_URL}/orders-api/orders/${orderId}/upload-payment-receipt`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  // Record payment for an order
  async recordPayment(orderId: string, paymentData: PaymentData): Promise<{ success: boolean; message: string; payment: any; remaining_balance: number }> {
    return this.apiCall(`orders-api/orders/${orderId}/record-payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Get all payments for an order
  async getOrderPayments(orderId: string): Promise<OrderPaymentResponse> {
    return this.apiCall(`orders-api/orders/${orderId}/payments`);
  }

  // Get customer ledger with optional filters
  async getCustomerLedger(
    customerId: string,
    options: {
      fromDate?: string;
      toDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<CustomerLedgerResponse> {
    const params = new URLSearchParams();
    if (options.fromDate) params.append('from_date', options.fromDate);
    if (options.toDate) params.append('to_date', options.toDate);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `customers-api/customers/${customerId}/ledger${queryString ? `?${queryString}` : ''}`;
    
    return this.apiCall(endpoint);
  }
}

export const ordersApi = new OrdersApi();