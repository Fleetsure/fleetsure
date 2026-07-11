import { useEffect, useState } from "react";
import { X, Check, Ban } from "lucide-react";
import { driverService } from "@/lib/services/driverService";
import { fmtDate, todayISO } from "@/lib/date";

const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const PAYMENT_COLORS: Record<string, { color: string; bg: string; sign: string }> = {
  advance:    { color: "#e65100", bg: "#fff3e0", sign: "−" },
  salary:     { color: "#1565c0", bg: "#e3f2fd", sign: "−" },
  bonus:      { color: "#2e7d32", bg: "#e8f5e9", sign: "−" },
  deduction:  { color: "#b71c1c", bg: "#fce4ec", sign: "+" },
  settlement: { color: "#6a1b9a", bg: "#f3e5f5", sign: "−" },
};

function monthBounds(monthStr: string) {
  // monthStr = "YYYY-MM"
  const [y, m] = monthStr.split("-").map(Number);
  const start = `${monthStr}-01`;
  const endDate = new Date(y, m, 1); // first day of next month
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

export default function DriverAccountModal({
  driver, isMobile, onClose, onEdit,
}: {
  driver: any;
  isMobile: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any>(null);
  const [expenseTotals, setExpenseTotals] = useState<Record<string, number>>({});
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [busyTrip, setBusyTrip] = useState<string | null>(null);

  // "Generate this month" salary flow
  const [showGenerate, setShowGenerate] = useState(false);
  const [genMonth, setGenMonth] = useState(todayISO().slice(0, 7));
  const [genForm, setGenForm] = useState({ base_salary: "", advance_given: "", expenses_claimed: "", amount_returned: "", net_payable: "" });
  const [generating, setGenerating] = useState(false);
  const [savingSalary, setSavingSalary] = useState(false);

  const load = async () => {
    setLoading(true);
    const tRes = await driverService.getDriverTrips(driver.id);
    const trips = tRes.data ?? [];
    const tripIds = trips.map(t => t.id);
    const [eRes, sRes, lRes, totalsRes] = await Promise.all([
      driverService.getDriverExpenses(driver.id),
      driverService.getSalaryRecords(driver.id),
      driverService.getLedger(driver.id),
      driverService.getTripsExpenseTotals(tripIds),
    ]);
    setTrips(trips);
    setClaims(eRes.data ?? []);
    setSalaryRecords(sRes.data ?? []);
    setLedger(lRes.data ?? null);
    setExpenseTotals(totalsRes.data ?? {});
    setLoading(false);
  };
  useEffect(() => { load(); }, [driver.id]);

  useEffect(() => {
    // Driver docs are stored as plain public URLs (fleet-documents bucket) —
    // no signed-URL resolution needed, just read them straight off the row.
    setDocUrls({
      license: driver.license_image_url || "",
      aadhaar_front: driver.aadhaar_front_url || "",
      aadhaar_back: driver.aadhaar_back_url || "",
      pan: driver.pan_image_url || "",
      photo: driver.profile_photo_url || "",
    });
  }, [driver.id]);

  const totalSalaryEarned = salaryRecords.reduce((s, r) => s + Number(r.net_payable), 0);
  const totalPaidSalary = salaryRecords.filter(r => r.paid).reduce((s, r) => s + Number(r.net_payable), 0);
  const balanceDue = totalSalaryEarned - totalPaidSalary;

  const advanceTrips = trips.filter(t => Number(t.driver_advance) > 0);

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    await driverService.reviewDriverExpense(id, status);
    load();
  };

  const handleRecordSettlement = async (tripId: string, amount: number) => {
    setBusyTrip(tripId);
    await driverService.recordSettlement(driver.id, tripId, amount);
    await load();
    setBusyTrip(null);
  };

  const openGenerate = async () => {
    setShowGenerate(true);
    setGenerating(true);
    const { start, end } = monthBounds(genMonth);
    const res = await driverService.computeMonthSuggestion(driver.id, start, end);
    if (res.success && res.data) {
      const { advance_given, expenses_claimed, amount_returned } = res.data;
      setGenForm({
        base_salary: "", advance_given: String(advance_given), expenses_claimed: String(expenses_claimed),
        amount_returned: String(amount_returned), net_payable: String(amount_returned),
      });
    }
    setGenerating(false);
  };

  const handleSaveSalary = async () => {
    setSavingSalary(true);
    await driverService.upsertSalaryRecord({
      driver_id: driver.id,
      month: monthBounds(genMonth).start,
      base_salary: parseFloat(genForm.base_salary) || 0,
      advance_given: parseFloat(genForm.advance_given) || 0,
      expenses_claimed: parseFloat(genForm.expenses_claimed) || 0,
      amount_returned: parseFloat(genForm.amount_returned) || 0,
      net_payable: parseFloat(genForm.net_payable) || 0,
    });
    setShowGenerate(false);
    setSavingSalary(false);
    load();
  };

  const handleMarkPaid = async (id: string) => {
    await driverService.markSalaryPaid(id);
    load();
  };

  const pc = (type: string) => PAYMENT_COLORS[type] || PAYMENT_COLORS.advance;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? "10px" : "20px" }}>
      <div className="card" style={{ width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          {docUrls.photo ? (
            <img src={docUrls.photo} alt={driver.name} onClick={() => setLightboxUrl(docUrls.photo)}
              style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", cursor: "pointer", border: "2px solid #e8eaf6" }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#eef0fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#1E2D8E" }}>
              {driver.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{driver.name}</div>
            <div style={{ fontSize: 12.5, color: "#888" }}>{driver.phone}</div>
          </div>
          <span className={`badge badge-${driver.status}`}>{driver.status?.replace("_", " ")}</span>
          <button onClick={onEdit} className="btn-outline" style={{ fontSize: 12.5, padding: "6px 12px" }}>Edit Profile</button>
        </div>

        {loading ? (
          <p style={{ color: "#aaa", textAlign: "center", padding: "32px 0" }}>Loading…</p>
        ) : (
          <>
            {/* Profile detail grid */}
            <div style={{ background: "#f9f9fb", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "8px 20px", fontSize: 12.5, marginBottom: 12 }}>
                {[
                  { label: "License No.",   value: driver.license_number },
                  { label: "License Expiry", value: driver.license_expiry ? fmtDate(driver.license_expiry) : null },
                  { label: "DOB",           value: driver.dob ? fmtDate(driver.dob) : null },
                  { label: "Blood Group",   value: driver.blood_group },
                  { label: "Father's Name", value: driver.father_name },
                  { label: "Mother's Name", value: driver.mother_name },
                  { label: "Emergency Contact", value: driver.emergency_contact_name ? `${driver.emergency_contact_name} (${driver.emergency_contact_phone || "—"})` : null },
                  { label: "Aadhaar No.",   value: driver.aadhaar_number },
                  { label: "PAN No.",       value: driver.pan_number },
                  { label: "Bank Account",  value: driver.bank_account_number },
                  { label: "IFSC",          value: driver.bank_ifsc_code },
                  { label: "Current Address", value: driver.address },
                  { label: "Permanent Address", value: driver.permanent_address },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ color: "#bbb", fontSize: 10.5, marginBottom: 1 }}>{f.label}</div>
                    <div style={{ fontWeight: 600, color: f.value ? "#333" : "#ddd" }}>{f.value || "—"}</div>
                  </div>
                ))}
              </div>
              {/* Document thumbnails */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", borderTop: "1px solid #eee", paddingTop: 12 }}>
                {[
                  { label: "Licence", url: docUrls.license },
                  { label: "Aadhaar Front", url: docUrls.aadhaar_front },
                  { label: "Aadhaar Back", url: docUrls.aadhaar_back },
                  { label: "PAN", url: docUrls.pan },
                ].filter(d => d.url).map(d => (
                  <div key={d.label} style={{ textAlign: "center" }}>
                    <img src={d.url} alt={d.label} onClick={() => setLightboxUrl(d.url!)}
                      style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #e0e0f0", cursor: "pointer" }} />
                    <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>{d.label}</div>
                  </div>
                ))}
                {!docUrls.license && !docUrls.aadhaar_front && !docUrls.aadhaar_back && !docUrls.pan && (
                  <div style={{ fontSize: 12, color: "#ccc" }}>No documents uploaded.</div>
                )}
              </div>
            </div>

            {/* Salary account summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
              {[
                { label: "Total Salary Earned", value: fmt(totalSalaryEarned), color: "#1565c0" },
                { label: "Total Paid", value: fmt(totalPaidSalary), color: "#2e7d32" },
                { label: "Balance Due", value: fmt(balanceDue), color: balanceDue > 0 ? "#e65100" : "#2e7d32" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: "12px 8px", borderRadius: 10, background: "#f8f9ff", border: "1px solid #e8eaf6" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Advance & Expense tracker */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Advance & Expense Tracker</div>
              {advanceTrips.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "#ccc", padding: "10px 0" }}>No trips with a driver advance yet.</div>
              ) : advanceTrips.map(trip => {
                const tripClaims = claims.filter(c => c.trip_id === trip.id);
                const hasPending = tripClaims.some(c => c.status === "pending");
                const advance = Number(trip.driver_advance);
                // Total trip expenses (fuel + toll + misc + other), the same
                // figure the Trip Sheet's own "Total Expenses" shows —
                // approved claims are included in this since approving one
                // creates a matching misc_expenses row. Keeps this tracker
                // and the Trip Sheet from ever disagreeing.
                const tripExpenses = expenseTotals[trip.id] ?? 0;
                const returned = advance - tripExpenses;
                const status = hasPending ? "Pending" : "Settled";
                const alreadyRecorded = (ledger?.payments ?? []).some((p: any) => p.type === "settlement" && p.trip_id === trip.id);
                const expanded = expandedTrip === trip.id;
                return (
                  <div key={trip.id} style={{ border: "1px solid #eee", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                    <div onClick={() => setExpandedTrip(expanded ? null : trip.id)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", cursor: "pointer", background: "#fafafe" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{trip.origin} → {trip.destination}</div>
                        <div style={{ fontSize: 11, color: "#999" }}>{fmtDate(trip.start_date)}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: status === "Pending" ? "#fff3e0" : "#e8f5e9", color: status === "Pending" ? "#e65100" : "#2e7d32" }}>
                        {status}
                      </span>
                    </div>
                    {expanded && (
                      <div style={{ padding: "12px 14px", borderTop: "1px solid #eee" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 16px", fontSize: 12.5, marginBottom: 10 }}>
                          <div><div style={{ color: "#bbb", fontSize: 10.5 }}>Advance Given</div><div style={{ fontWeight: 700 }}>{fmt(advance)}</div></div>
                          <div><div style={{ color: "#bbb", fontSize: 10.5 }}>Trip Expenses</div><div style={{ fontWeight: 700 }}>{fmt(tripExpenses)}</div></div>
                          <div>
                            <div style={{ color: "#bbb", fontSize: 10.5 }}>{returned < 0 ? "Owed to Driver" : "Returned to Salary"}</div>
                            <div style={{ fontWeight: 700, color: returned < 0 ? "#c62828" : "#2e7d32" }}>{fmt(returned)}</div>
                          </div>
                        </div>

                        {tripClaims.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                            {tripClaims.map(c => (
                              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, background: c.status === "pending" ? "#fff8f0" : c.status === "approved" ? "#f0fdf4" : "#fef2f2" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize", color: "#555" }}>{c.category}</span>
                                <span style={{ flex: 1, fontSize: 12, color: "#666" }}>{c.note || "—"}</span>
                                <span style={{ fontWeight: 700, fontSize: 13 }}>{fmt(Number(c.amount))}</span>
                                {c.status === "pending" ? (
                                  <div style={{ display: "flex", gap: 4 }}>
                                    <button onClick={() => handleReview(c.id, "approved")} title="Approve"
                                      style={{ background: "#e8f5e9", border: "none", borderRadius: 6, padding: 4, cursor: "pointer", color: "#2e7d32" }}><Check size={13} /></button>
                                    <button onClick={() => handleReview(c.id, "rejected")} title="Reject"
                                      style={{ background: "#fce4ec", border: "none", borderRadius: 6, padding: 4, cursor: "pointer", color: "#c62828" }}><Ban size={13} /></button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "capitalize", color: c.status === "approved" ? "#2e7d32" : "#c62828" }}>{c.status}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {status === "Settled" && !alreadyRecorded && (
                          <button onClick={() => handleRecordSettlement(trip.id, returned)} disabled={busyTrip === trip.id}
                            className="btn-primary" style={{ fontSize: 12.5, padding: "7px 14px" }}>
                            {busyTrip === trip.id ? "Recording…" : "Record to Salary Ledger"}
                          </button>
                        )}
                        {alreadyRecorded && (
                          <div style={{ fontSize: 11.5, color: "#2e7d32", fontWeight: 600 }}>✓ Recorded to salary ledger</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Trip history */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Trip History</div>
              {trips.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "#ccc" }}>No trips yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {trips.map(trip => (
                    <div key={trip.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "#f9f9fb", fontSize: 12.5 }}>
                      <div style={{ minWidth: 70, color: "#999" }}>{fmtDate(trip.start_date)}</div>
                      <div style={{ flex: 1, fontWeight: 600, color: "#333" }}>{trip.origin} → {trip.destination}</div>
                      <span className={`badge badge-${trip.status}`} style={{ fontSize: 10.5, marginRight: 10 }}>{trip.status?.replace("_", " ")}</span>
                      <div style={{ fontWeight: 700, color: "#1E2D8E" }}>{fmt(Number(trip.freight_amount))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly salary records */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Monthly Salary Records</div>
                {!showGenerate && (
                  <button onClick={openGenerate} className="btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}>Generate This Month</button>
                )}
              </div>

              {showGenerate && (
                <div style={{ background: "#f8f9ff", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 3 }}>Month</label>
                      <input type="month" value={genMonth} onChange={e => { setGenMonth(e.target.value); }}
                        style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 13, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 3 }}>Base Salary (₹)</label>
                      <input type="number" value={genForm.base_salary} placeholder="20000"
                        onChange={e => {
                          const base = e.target.value;
                          setGenForm(p => ({ ...p, base_salary: base, net_payable: String((parseFloat(base) || 0) + (parseFloat(p.amount_returned) || 0)) }));
                        }}
                        style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e8e8f0", borderRadius: 7, fontSize: 13, boxSizing: "border-box" }} />
                    </div>
                  </div>
                  {generating ? (
                    <div style={{ fontSize: 12, color: "#888" }}>Calculating advance/expense totals for this month…</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 16px", fontSize: 12, marginBottom: 12 }}>
                      <div><div style={{ color: "#bbb", fontSize: 10.5 }}>Advance Given</div><div style={{ fontWeight: 700 }}>{fmt(parseFloat(genForm.advance_given) || 0)}</div></div>
                      <div><div style={{ color: "#bbb", fontSize: 10.5 }}>Expenses Claimed</div><div style={{ fontWeight: 700 }}>{fmt(parseFloat(genForm.expenses_claimed) || 0)}</div></div>
                      <div><div style={{ color: "#bbb", fontSize: 10.5 }}>Net Payable</div><div style={{ fontWeight: 700, color: "#1E2D8E" }}>{fmt(parseFloat(genForm.net_payable) || 0)}</div></div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-outline" style={{ flex: 1 }} onClick={() => setShowGenerate(false)}>Cancel</button>
                    <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleSaveSalary} disabled={savingSalary || generating}>
                      {savingSalary ? "Saving…" : "Save Salary Record"}
                    </button>
                  </div>
                </div>
              )}

              {salaryRecords.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "#ccc" }}>No salary records yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {salaryRecords.map(r => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 8, background: r.paid ? "#f0fdf4" : "#f9f9fb", fontSize: 12.5 }}>
                      <div style={{ minWidth: 80, fontWeight: 700 }}>{fmtDate(r.month)}</div>
                      <div style={{ flex: 1, color: "#666" }}>Base {fmt(Number(r.base_salary))} + Returned {fmt(Number(r.amount_returned))}</div>
                      <div style={{ fontWeight: 800, color: "#1E2D8E" }}>{fmt(Number(r.net_payable))}</div>
                      {r.paid ? (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: "#2e7d32" }}>✓ Paid</span>
                      ) : (
                        <button onClick={() => handleMarkPaid(r.id)} className="btn-outline" style={{ fontSize: 11, padding: "4px 10px" }}>Mark Paid</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment ledger */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Payment Ledger</div>
              {ledger && ledger.payments.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "#ccc" }}>No payment entries yet.</div>
              ) : ledger?.payments.map((p: any) => {
                const c = pc(p.type);
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, background: c.bg, border: `1px solid ${c.color}22`, marginBottom: 5, fontSize: 12.5 }}>
                    <div style={{ minWidth: 70, fontSize: 11, color: "#888" }}>{fmtDate(p.date)}</div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: c.color, color: "white" }}>{p.type}</span>
                    <div style={{ flex: 1, color: "#333" }}>{p.notes || "—"}</div>
                    <div style={{ fontWeight: 800, color: c.color }}>{c.sign}{fmt(Number(p.amount))}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, cursor: "zoom-out", padding: 20 }}>
          <img src={lightboxUrl} alt="Document" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
