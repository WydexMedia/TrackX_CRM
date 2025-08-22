"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export function AddLeadModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<{ phone: string; name?: string; email?: string; source?: string; stage?: string; score?: number }>({ phone: "" });
  const [submitting, setSubmitting] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-5">
        <div className="text-lg font-semibold mb-4">Add Lead</div>
        <div className="space-y-3">
          <input className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="Phone (required)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="Source" value={form.source || ""} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button
            className="rounded-xl bg-cyan-600 text-white px-4 py-2 text-sm hover:bg-cyan-700 disabled:opacity-50"
            disabled={submitting || !form.phone.trim()}
            onClick={async () => {
              setSubmitting(true);
              const res = await fetch("/api/tl/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
              if (res.ok) toast.success("Lead added"); else toast.error("Failed to add lead");
              setSubmitting(false);
              onCreated();
              onClose();
            }}
          >
            {submitting ? "Adding..." : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImportLeadsModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  
  if (!open) return null;
  
  const validateRows = (data: any[]) => {
    const errors: string[] = [];
    
    console.log("Validating rows:", data.length, "rows");
    
    if (data.length === 0) {
      errors.push("File is empty or contains no valid data");
      console.log("Validation error: File is empty");
      return errors;
    }
    
    // Check if any row has phone-like columns
    const hasPhoneColumn = data.some(row => 
      row.hasOwnProperty('phone') || 
      row.hasOwnProperty('Phone') || 
      row.hasOwnProperty('PHONE')
    );
    
    console.log("Has phone column:", hasPhoneColumn);
    
    if (!hasPhoneColumn) {
      errors.push("Required column 'phone' not found in the file. Please ensure your CSV has a column named 'phone', 'Phone', or 'PHONE'.");
    }
    
    // Get all phone numbers (including empty ones for validation)
    const phoneData = data.map(row => ({
      phone: String(row.phone || row.Phone || row.PHONE || "").trim(),
      originalRow: row
    }));
    
    // Check for rows with phone numbers
    const rowsWithPhone = phoneData.filter(item => item.phone);
    const rowsWithoutPhone = phoneData.filter(item => !item.phone);
    
    console.log("Rows with phone:", rowsWithPhone.length, "Rows without phone:", rowsWithoutPhone.length);
    
    if (rowsWithPhone.length === 0) {
      errors.push("No valid phone numbers found in the file");
    }
    
    if (rowsWithoutPhone.length > 0) {
      errors.push(`${rowsWithoutPhone.length} rows are missing phone numbers`);
    }
    
    // Check for duplicate phone numbers (only among valid phones)
    if (rowsWithPhone.length > 0) {
      const phones = rowsWithPhone.map(item => item.phone);
      const uniquePhones = new Set(phones);
      if (phones.length !== uniquePhones.size) {
        const duplicateCount = phones.length - uniquePhones.size;
        errors.push(`${duplicateCount} duplicate phone numbers found in the file`);
      }
      
      // Check for invalid phone numbers (too short)
      const invalidPhones = phones.filter(phone => phone.length < 10);
      if (invalidPhones.length > 0) {
        errors.push(`${invalidPhones.length} phone numbers are too short (minimum 10 digits required)`);
      }
    }
    
    // Check for invalid email formats
    const invalidEmails = data.filter(row => {
      const email = String(row.email || row.Email || row.EMAIL || "").trim();
      if (!email) return false; // Empty email is fine
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(email);
    });
    if (invalidEmails.length > 0) {
      errors.push(`${invalidEmails.length} email addresses have invalid format`);
    }
    
    console.log("Final validation errors:", errors);
    return errors;
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log("File upload started:", file.name);
    
    try {
      setError("");
      setValidationErrors([]);
      setRows([]);
      
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      
      console.log("Parsed JSON data:", json);
      
      if (!Array.isArray(json) || json.length === 0) {
        console.log("Setting error: Invalid file format or empty file");
        setError("Invalid file format or empty file");
        return;
      }
      
      // Normalize to { phone, name, email, source, stage, score }
      const normalized = (json as any[]).map((r) => ({
        phone: String(r.phone || r.Phone || r.PHONE || "").trim(),
        name: r.name || r.Name || r.NAME || "",
        email: r.email || r.Email || r.EMAIL || "",
        source: r.source || r.Source || r.SOURCE || "",
        stage: r.stage || r.Stage || r.STAGE || "",
        score: Number(r.score || r.Score || r.SCORE || 0) || 0,
      }));
      
      console.log("Normalized data:", normalized);
      
      // Validate the data BEFORE filtering
      const errors = validateRows(normalized);
      console.log("Validation errors:", errors);
      
      if (errors.length > 0) {
        console.log("Setting validation errors:", errors);
        setValidationErrors(errors);
        setError("File validation failed");
        setRows([]); // Clear rows on validation failure
        return;
      }
      
      // Only keep rows with valid phone numbers after validation passes
      const validRows = normalized.filter((r) => r.phone);
      
      console.log("Valid rows after filtering:", validRows);
      
      if (validRows.length === 0) {
        console.log("No valid rows found");
        setError("No valid rows found in the file");
        setValidationErrors(["All rows are missing phone numbers or have invalid data"]);
        return;
      }
      
      setRows(validRows);
      setError("");
      setValidationErrors([]);
      
    } catch (error) {
      console.error("File upload error:", error);
      setError("Failed to read file. Please ensure it's a valid CSV or Excel file.");
      setValidationErrors([]);
      setRows([]);
    }
  };
  
  const resetForm = () => {
    setRows([]);
    setError("");
    setValidationErrors([]);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5">
        <div className="text-lg font-semibold mb-4">Import Leads (CSV/Excel)</div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div className="text-red-800 font-semibold text-sm">{error}</div>
            </div>
            {validationErrors.length > 0 && (
              <ul className="mt-3 space-y-2">
                {validationErrors.map((err, index) => (
                  <li key={index} className="text-red-700 text-sm flex items-start gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {/* Debug Info - Remove this after testing */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
            <div>Error: "{error}"</div>
            <div>Validation Errors: {validationErrors.length}</div>
            <div>Rows: {rows.length}</div>
          </div>
        )}
        
        <input 
          ref={fileRef} 
          type="file" 
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
          onChange={handleFileUpload}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
        />
        
        <div className="mt-3 text-xs text-slate-500">Required column: phone. Optional: name, email, source, stage, score.</div>
        
        {/* Preview of valid rows */}
        {rows.length > 0 && !error && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-800 font-medium text-sm">✓ {rows.length} rows ready for import</div>
            <div className="text-green-700 text-xs mt-1">File validation passed successfully</div>
          </div>
        )}
        
        <div className="mt-4 flex justify-between text-sm">
          <div className={`${error ? 'text-red-600' : 'text-slate-600'}`}>
            {error ? 'Validation failed' : `${rows.length} rows ready`}
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-slate-600 hover:text-slate-800" onClick={handleClose}>Cancel</button>
            <button
              className="rounded-xl bg-slate-800 text-white px-4 py-2 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading || rows.length === 0 || !!error}
              onClick={async () => {
                setUploading(true);
                try {
                  const res = await fetch("/api/tl/leads/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rows }),
                  });
                  if (res.ok) {
                    toast.success("Leads imported successfully");
                    onImported();
                    handleClose();
                  } else {
                    const errorData = await res.json();
                    toast.error(errorData.error || "Import failed");
                  }
                } catch (error) {
                  toast.error("Import failed due to network error");
                } finally {
                  setUploading(false);
                }
              }}
            >
              {uploading ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


