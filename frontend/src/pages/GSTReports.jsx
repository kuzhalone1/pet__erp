// src/pages/GSTReports.jsx
import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
// Table rendered inline via renderTable() helper below — no named Table exports needed
import { Button, Select, DatePicker } from "../components/FormElements";
import { saveAs } from "file-saver";

// Utility: Convert JSON array to CSV string
function jsonToCsv(data) {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","));
  return headers.join(",") + "\n" + rows;
}

// Export helper: download CSV in-browser
function downloadCsv(filename, jsonData) {
  const csv = jsonToCsv(jsonData);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  saveAs(blob, filename);
}

const emptyReport = [];

export default function GSTReports() {
  const [fyCode, setFyCode] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  const [salesRegister, setSalesRegister] = useState(emptyReport);
  const [b2bSummary, setB2bSummary] = useState(emptyReport);
  const [hsnSummary, setHsnSummary] = useState(emptyReport);
  const [gstr3bSummary, setGstr3bSummary] = useState({});
  const [purchaseRegister, setPurchaseRegister] = useState(emptyReport);

  const fetchReport = async (endpoint, setter) => {
    try {
      const res = await axios.get(endpoint, {
        params: { fy_code: fyCode, from_date: fromDate, to_date: toDate },
      });
      setter(res.data);
    } catch (e) {
      console.error(`Failed to fetch ${endpoint}:`, e);
    }
  };

  const applyFilters = () => {
    // reload data for the currently active tab
    switch (activeTab) {
      case 0:
        fetchReport("/reports/gst/sales-register", setSalesRegister);
        break;
      case 1:
        fetchReport("/reports/gst/b2b", setB2bSummary);
        break;
      case 2:
        fetchReport("/reports/gst/hsn-summary", setHsnSummary);
        break;
      case 3:
        fetchReport("/reports/gst/gstr3b-summary", setGstr3bSummary);
        break;
      case 4:
        fetchReport("/reports/gst/purchase-register", setPurchaseRegister);
        break;
      default:
        break;
    }
  };

  // Load when component mounts or when tab changes (optional auto‑load)
  useEffect(() => {
    // Do not auto‑fetch on mount; wait for user to press Apply.
  }, []);

  // Rendering helpers for each tab
  const renderTable = (data, columns) => (
    <div className="table-wrapper" style={{ position: "relative", maxHeight: "60vh", overflow: "auto" }}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(col => (
              <TableCell key={col} isHeader>{col}</TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={idx}>
              {columns.map(col => (
                <TableCell key={col}>{row[col] ?? ""}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {/* Footer totals – compute simple numeric sums for numeric columns */}
        <TableFooter>
          <TableRow>
            {columns.map(col => {
              const numeric = data.reduce((sum, r) => {
                const val = parseFloat(r[col]);
                return isNaN(val) ? sum : sum + val;
              }, 0);
              return (
                <TableCell key={col} isFooter>{
                  isNaN(numeric) || numeric === 0 ? "" : numeric.toFixed(2)
                }</TableCell>
              );
            })}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );

  return (
    <div className="gst-reports-page" style={{ padding: "1rem" }}>
      <h1>GST Reports</h1>
      {/* Filter Bar */}
      <div className="filter-bar" style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <Select
          label="FY Code"
          value={fyCode}
          onChange={e => setFyCode(e.target.value)}
          options={["2023-24", "2024-25", "2025-26"]}
        />
        <DatePicker label="From Date" value={fromDate} onChange={setFromDate} />
        <DatePicker label="To Date" value={toDate} onChange={setToDate} />
        <Button onClick={applyFilters}>Apply</Button>
      </div>

      <Tabs selectedIndex={activeTab} onSelect={index => setActiveTab(index)}>
        <TabList>
          <Tab>Sales Register</Tab>
          <Tab>B2B Summary</Tab>
          <Tab>HSN Summary</Tab>
          <Tab>GSTR‑3B Summary</Tab>
          <Tab>Purchase Register</Tab>
        </TabList>

        {/* Sales Register Tab */}
        <TabPanel>
          <div className="tab-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <h2>Sales Register</h2>
            <Button onClick={() => downloadCsv("sales_register.csv", salesRegister)}>
              Export CSV
            </Button>
          </div>
          {renderTable(salesRegister, [
            "bill_date",
            "bill_no",
            "party_name",
            "gstin",
            "taxable",
            "cgst",
            "sgst",
            "igst",
            "total",
          ])}
        </TabPanel>

        {/* B2B Summary Tab */}
        <TabPanel>
          <div className="tab-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <h2>B2B Summary</h2>
            <Button onClick={() => downloadCsv("b2b_summary.csv", b2bSummary)}>
              Export CSV
            </Button>
          </div>
          {renderTable(b2bSummary, ["gstin", "party_name", "taxable", "cgst", "sgst", "igst", "total"])}
        </TabPanel>

        {/* HSN Summary Tab */}
        <TabPanel>
          <div className="tab-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <h2>HSN Summary</h2>
            <Button onClick={() => downloadCsv("hsn_summary.csv", hsnSummary)}>
              Export CSV
            </Button>
          </div>
          {renderTable(hsnSummary, ["hsn_code", "description", "taxable", "cgst", "sgst", "igst", "total"])}
        </TabPanel>

        {/* GSTR‑3B Summary Tab */}
        <TabPanel>
          <div className="tab-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <h2>GSTR‑3B Summary</h2>
            <Button onClick={() => downloadCsv("gstr3b_summary.csv", [gstr3bSummary])}>
              Export CSV
            </Button>
          </div>
          {/* Simple card layout */}
          <div className="gstr3b-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
            {Object.entries(gstr3bSummary).map(([section, data]) => (
              <div key={section} className="card" style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem" }}>
                <h3>{section}</h3>
                {Array.isArray(data) ? (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {data.map((item, i) => (
                      <li key={i}>{item.label}: {item.value}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{JSON.stringify(data)}</p>
                )}
              </div>
            ))}
          </div>
        </TabPanel>

        {/* Purchase Register Tab */}
        <TabPanel>
          <div className="tab-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <h2>Purchase Register</h2>
            <Button onClick={() => downloadCsv("purchase_register.csv", purchaseRegister)}>
              Export CSV
            </Button>
          </div>
          {renderTable(purchaseRegister, [
            "bill_date",
            "bill_no",
            "party_name",
            "gstin",
            "taxable",
            "cgst",
            "sgst",
            "igst",
            "total",
          ])}
        </TabPanel>
      </Tabs>
    </div>
  );
}
