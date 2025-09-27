import { z } from 'zod';

// Vendor Registration Validation Schema
export const vendorRegistrationSchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  contact_person: z.string().min(2, 'Contact person name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number must be less than 15 digits'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  ifsc_code: z.string().optional(),
  account_holder_name: z.string().optional(),
  business_type: z.string().optional(),
  annual_turnover: z.string().optional(),
  years_in_business: z.string().optional(),
  branch_id: z.string().min(1, 'Please select a branch')
});

// Leave Request Validation Schema
export const leaveRequestSchema = z.object({
  leave_type: z.string().min(1, 'Please select a leave type'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  reason: z.string().min(5, 'Reason must be at least 5 characters')
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate >= startDate;
}, {
  message: "End date must be after or equal to start date",
  path: ["end_date"]
});

// Loan Request Validation Schema
export const loanRequestSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be a positive number'),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  repayment_months: z.string().min(1, 'Please select repayment period')
});

export type VendorRegistrationData = z.infer<typeof vendorRegistrationSchema>;
export type LeaveRequestData = z.infer<typeof leaveRequestSchema>;
export type LoanRequestData = z.infer<typeof loanRequestSchema>;