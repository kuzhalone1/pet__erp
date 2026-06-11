INSERT INTO gl_master (gl_code, gl_name, group_name, sub_group) VALUES
  ('CASH',      'Petty Cash',           'Assets', 'Cash & Bank'),
  ('BANK-001',  'Main Bank Account',    'Assets', 'Cash & Bank'),
  ('DEB-CTRL',  'Debtors Control',      'Assets', 'Debtors'),
  ('CRED-CTRL', 'Creditors Control',    'Liabilities', 'Creditors'),
  ('GST-CGST-PAY', 'CGST Payable',     'Liabilities', 'GST Payable'),
  ('GST-SGST-PAY', 'SGST Payable',     'Liabilities', 'GST Payable'),
  ('GST-IGST-PAY', 'IGST Payable',     'Liabilities', 'GST Payable'),
  ('GST-CGST-IN',  'CGST Input Credit','Assets', 'GST Input'),
  ('GST-SGST-IN',  'SGST Input Credit','Assets', 'GST Input'),
  ('GST-IGST-IN',  'IGST Input Credit','Assets', 'GST Input'),
  ('SALES-VET',  'Veterinary Services Income', 'Income', 'Sales'),
  ('SALES-MED',  'Medicine Sales Income',      'Income', 'Sales'),
  ('SALES-RET',  'Sales Returns',              'Income', 'Sales'),
  ('PURCH-MED',  'Medicine Purchases',  'Expense', 'Purchases'),
  ('PURCH-RET',  'Purchase Returns',   'Expense', 'Purchases'),
  ('ADV-SUP',   'Advance to Suppliers',    'Liabilities', 'Advance'),
  ('ADV-CUST',  'Advance from Customers',  'Liabilities', 'Advance')
ON CONFLICT (gl_code) DO NOTHING;
