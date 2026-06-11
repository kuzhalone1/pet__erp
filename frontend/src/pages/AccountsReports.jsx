import React, { useState, useEffect } from 'react';
import api from '../api.js';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { saveAs } from 'file-saver';

// Utility to convert JSON array to CSV string
const jsonToCsv = (data, columns) => {
  const header = columns.map(col => col.label).join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col.accessor];
      // Escape double quotes
      const escaped = typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      return escaped;
    }).join(',')
  );
  return [header, ...rows].join('\n');
};

const downloadCsv = (data, columns, filename) => {
  const csv = jsonToCsv(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};

// Common filter component
const CommonFilterBar = ({ fyCode, setFyCode, fromDate, setFromDate, toDate, setToDate, onApply }) => (
  <div className="filter-bar" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
    <select value={fyCode} onChange={e => setFyCode(e.target.value)}>
      <option value="">Select FY</option>
      {/* Populate FY options as needed */}
      <option value="2023-24">2023-24</option>
      <option value="2024-25">2024-25</option>
    </select>
    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
    <button className="btn-primary" onClick={onApply}>Apply</button>
  </div>
);

const AccountsReports = () => {
  // Common filters
  const [fyCode, setFyCode] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Tab 1 – General Ledger state
  const [glId, setGlId] = useState('');
  const [glOptions, setGlOptions] = useState([]);
  const [glData, setGlData] = useState([]);

  // Tab 2 – Trial Balance
  const [tbAsOfDate, setTbAsOfDate] = useState('');
  const [tbData, setTbData] = useState([]);

  // Tab 3 – Cash Book
  const [cashData, setCashData] = useState([]);

  // Tab 4 – Bank Book
  const [bankGlId, setBankGlId] = useState('');
  const [bankOptions, setBankOptions] = useState([]);
  const [bankData, setBankData] = useState([]);

  // Tab 5 – Debtor Outstanding
  const [debtorOwnerId, setDebtorOwnerId] = useState('');
  const [debtorData, setDebtorData] = useState([]);

  // Tab 6 – Creditor Outstanding
  const [creditorSupplierId, setCreditorSupplierId] = useState('');
  const [creditorData, setCreditorData] = useState([]);

  // Load GL options for dropdowns
  useEffect(() => {
    api.get('/gl-master').then(res => {
      setGlOptions(res.data);
      setBankOptions(res.data.filter(opt => opt.sub_group && opt.sub_group.toLowerCase().includes('bank')));
    });
  }, []);

  // Handlers for each tab fetch
  const fetchGeneralLedger = () => {
    if (!glId) return;
    api.get('/reports/general-ledger', { params: { gl_id: glId, fy_code: fyCode, from_date: fromDate, to_date: toDate } })
      .then(res => setGlData(res.data));
  };

  const fetchTrialBalance = () => {
    if (!tbAsOfDate) return;
    api.get('/reports/trial-balance', { params: { fy_code: fyCode, as_of_date: tbAsOfDate } })
      .then(res => setTbData(res.data));
  };

  const fetchCashBook = () => {
    api.get('/reports/cash-book', { params: { fy_code: fyCode, from_date: fromDate, to_date: toDate } })
      .then(res => setCashData(res.data));
  };

  const fetchBankBook = () => {
    if (!bankGlId) return;
    api.get('/reports/bank-book', { params: { gl_id: bankGlId, fy_code: fyCode, from_date: fromDate, to_date: toDate } })
      .then(res => setBankData(res.data));
  };

  const fetchDebtorOutstanding = () => {
    api.get('/reports/debtor-outstanding', { params: { fy_code: fyCode, owner_id: debtorOwnerId } })
      .then(res => setDebtorData(res.data));
  };

  const fetchCreditorOutstanding = () => {
    api.get('/reports/creditor-outstanding', { params: { fy_code: fyCode, supplier_id: creditorSupplierId } })
      .then(res => setCreditorData(res.data));
  };

  // Common column definitions – used for CSV export
  const glColumns = [
    { label: 'Date', accessor: 'date' },
    { label: 'Voucher Type', accessor: 'voucher_type' },
    { label: 'Voucher No', accessor: 'voucher_no' },
    { label: 'Narration', accessor: 'narration' },
    { label: 'DR', accessor: 'dr' },
    { label: 'CR', accessor: 'cr' },
    { label: 'Running Balance', accessor: 'running_balance' },
  ];

  const tbColumns = [
    { label: 'GL Code', accessor: 'gl_code' },
    { label: 'GL Name', accessor: 'gl_name' },
    { label: 'DR Balance', accessor: 'dr_balance' },
    { label: 'CR Balance', accessor: 'cr_balance' },
  ];

  const cashColumns = [
    { label: 'Date', accessor: 'date' },
    { label: 'Voucher No', accessor: 'voucher_no' },
    { label: 'Voucher Type', accessor: 'voucher_type' },
    { label: 'Narration', accessor: 'narration' },
    { label: 'Cash In (DR)', accessor: 'cash_in' },
    { label: 'Cash Out (CR)', accessor: 'cash_out' },
    { label: 'Balance', accessor: 'balance' },
  ];

  const bankColumns = [
    ...cashColumns.slice(0, 4),
    { label: 'Ref No', accessor: 'ref_no' },
    ...cashColumns.slice(4),
  ];

  const outstandingColumns = [
    { label: 'Party Name', accessor: 'party_name' },
    { label: 'Total Billed', accessor: 'total_billed' },
    { label: 'Total Received', accessor: 'total_received' },
    { label: 'Outstanding', accessor: 'outstanding' },
  ];

  // Render tables – simple implementation using HTML table for brevity
  const renderTable = (columns, data) => (
    <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {columns.map(col => (<th key={col.accessor} style={{ border: '1px solid #ddd', padding: '8px' }}>{col.label}</th>))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            {columns.map(col => (<td key={col.accessor} style={{ border: '1px solid #ddd', padding: '8px' }}>{row[col.accessor]}</td>))}
          </tr>
        ))}
      </tbody>
      {/* Footer totals if applicable */}
    </table>
  );

  return (
    <div className="accounts-reports" style={{ padding: '1rem' }}>
      <h1>Accounts Reports</h1>
      <Tabs>
        <TabList>
          <Tab>General Ledger</Tab>
          <Tab>Trial Balance</Tab>
          <Tab>Cash Book</Tab>
          <Tab>Bank Book</Tab>
          <Tab>Debtor Outstanding</Tab>
          <Tab>Creditor Outstanding</Tab>
        </TabList>

        {/* ---------- General Ledger Tab ---------- */}
        <TabPanel>
          <div style={{ marginBottom: '1rem' }}>
            <select value={glId} onChange={e => setGlId(e.target.value)}>
              <option value="">Select GL</option>
              {glOptions.map(opt => (
                <option key={opt.gl_id} value={opt.gl_id}>{opt.gl_code} – {opt.gl_name}</option>
              ))}
            </select>
            <CommonFilterBar fyCode={fyCode} setFyCode={setFyCode} fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} onApply={fetchGeneralLedger} />
            <button className="btn-secondary" onClick={() => downloadCsv(glData, glColumns, 'general_ledger.csv')}>Export CSV</button>
          </div>
          {renderTable(glColumns, glData)}
        </TabPanel>

        {/* ---------- Trial Balance Tab ---------- */}
        <TabPanel>
          <div style={{ marginBottom: '1rem' }}>
            <input type="date" value={tbAsOfDate} onChange={e => setTbAsOfDate(e.target.value)} />
            <button className="btn-primary" onClick={fetchTrialBalance}>Apply</button>
            <button className="btn-secondary" onClick={() => downloadCsv(tbData, tbColumns, 'trial_balance.csv')}>Export CSV</button>
          </div>
          {renderTable(tbColumns, tbData)}
        </TabPanel>

        {/* ---------- Cash Book Tab ---------- */}
        <TabPanel>
          <div style={{ marginBottom: '1rem' }}>
            <CommonFilterBar fyCode={fyCode} setFyCode={setFyCode} fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} onApply={fetchCashBook} />
            <button className="btn-secondary" onClick={() => downloadCsv(cashData, cashColumns, 'cash_book.csv')}>Export CSV</button>
          </div>
          {renderTable(cashColumns, cashData)}
        </TabPanel>

        {/* ---------- Bank Book Tab ---------- */}
        <TabPanel>
          <div style={{ marginBottom: '1rem' }}>
            <select value={bankGlId} onChange={e => setBankGlId(e.target.value)}>
              <option value="">Select Bank GL</option>
              {bankOptions.map(opt => (
                <option key={opt.gl_id} value={opt.gl_id}>{opt.gl_code} – {opt.gl_name}</option>
              ))}
            </select>
            <CommonFilterBar fyCode={fyCode} setFyCode={setFyCode} fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} onApply={fetchBankBook} />
            <button className="btn-secondary" onClick={() => downloadCsv(bankData, bankColumns, 'bank_book.csv')}>Export CSV</button>
          </div>
          {renderTable(bankColumns, bankData)}
        </TabPanel>

        {/* ---------- Debtor Outstanding Tab ---------- */}
        <TabPanel>
          <div style={{ marginBottom: '1rem' }}>
            <input type="text" placeholder="Owner ID (optional)" value={debtorOwnerId} onChange={e => setDebtorOwnerId(e.target.value)} />
            <button className="btn-primary" onClick={fetchDebtorOutstanding}>Apply</button>
            <button className="btn-secondary" onClick={() => downloadCsv(debtorData, outstandingColumns, 'debtor_outstanding.csv')}>Export CSV</button>
          </div>
          {renderTable(outstandingColumns, debtorData)}
        </TabPanel>

        {/* ---------- Creditor Outstanding Tab ---------- */}
        <TabPanel>
          <div style={{ marginBottom: '1rem' }}>
            <input type="text" placeholder="Supplier ID (optional)" value={creditorSupplierId} onChange={e => setCreditorSupplierId(e.target.value)} />
            <button className="btn-primary" onClick={fetchCreditorOutstanding}>Apply</button>
            <button className="btn-secondary" onClick={() => downloadCsv(creditorData, outstandingColumns, 'creditor_outstanding.csv')}>Export CSV</button>
          </div>
          {renderTable(outstandingColumns, creditorData)}
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default AccountsReports;
