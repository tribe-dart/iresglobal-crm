"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Users,
  PieChart,
  FileSpreadsheet,
  Calculator,
  Compass,
  Plus,
  RefreshCw,
  Search,
  Phone,
  Mail,
  Send,
  CheckCircle2,
  Paperclip,
  Sun,
  Moon,
  Layers,
  Sparkles,
  Calendar,
} from "lucide-react";
import { Contact, Quote, StageType } from "@/types";
import {
  fetchContacts,
  createContact,
  updateContactStage,
  addContactComment,
  fetchQuotes,
  createQuote,
  submitDiscovery,
  uploadAttachment,
  getExportCsvUrl,
} from "@/lib/api";

const STAGES: StageType[] = ["15%", "50%", "75%", "100%"];

const STAGE_LABELS: Record<StageType, { label: string; desc: string }> = {
  "15%": { label: "15% Inquiry", desc: "Initial contact & site consultation" },
  "50%": { label: "50% Discovery", desc: "Soil test & architectural concept" },
  "75%": { label: "75% Proposal", desc: "Rammed earth quote & blueprints" },
  "100%": { label: "100% Closed", desc: "Contract executed & groundbreaking" },
};

export default function CRMApp() {
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "contacts" | "quotes" | "discovery">("pipeline");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // New Contact Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({
    brand: "ires" as const,
    name: "",
    email: "",
    phone: "",
    company: "",
    source: "manual" as "manual" | "website" | "meta" | "google_forms" | "discovery_questionnaire" | "quote_calculator",
    stage: "15%" as StageType,
    notes: "",
    nextSteps: "",
  });

  // Comment input
  const [commentText, setCommentText] = useState("");

  // Rammed Earth Quote Calculator state
  const [calcData, setCalcData] = useState({
    clientName: "",
    email: "",
    phone: "",
    brand: "ires" as const,
    projectType: "Monolithic Rammed Earth Villa",
    floorAreaSqM: 220,
    qualityTier: "premium" as "standard" | "premium" | "luxury",
    currency: "USD",
  });
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const [uploadedPlanUrl, setUploadedPlanUrl] = useState("");

  // Discovery Questionnaire state
  const [discoveryData, setDiscoveryData] = useState({
    brand: "ires" as const,
    clientName: "",
    email: "",
    phone: "",
    projectVision: "",
    location: "Accra, Ghana",
    budgetRange: "$250,000 - $500,000",
    targetTimeline: "3 to 6 months",
  });
  const [discoverySuccess, setDiscoverySuccess] = useState(false);

  // Toggle Theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Load data
  const loadData = React.useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const [cData, qData] = await Promise.all([fetchContacts("ires"), fetchQuotes()]);
      setContacts(cData);
      setQuotes(qData);
      setSelectedContact((prev) => {
        if (!prev) return null;
        return cData.find((c) => c.id === prev.id) || prev;
      });
    } catch (err) {
      console.error("Failed to load CRM data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchContacts("ires"), fetchQuotes()])
      .then(([cData, qData]) => {
        if (!active) return;
        setContacts(cData);
        setQuotes(qData);
        setSelectedContact((prev) => {
          if (!prev) return null;
          return cData.find((c) => c.id === prev.id) || prev;
        });
      })
      .catch((err) => console.error("Initial load error:", err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleStageChange = async (contactId: string, stage: StageType) => {
    try {
      const updated = await updateContactStage(contactId, stage);
      setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)));
      if (selectedContact?.id === contactId) setSelectedContact(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async () => {
    if (!selectedContact || !commentText.trim()) return;
    try {
      const updated = await addContactComment(selectedContact.id, commentText);
      setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? updated : c)));
      setSelectedContact(updated);
      setCommentText("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createContact(newContact);
      setContacts([created, ...contacts]);
      setShowAddModal(false);
      setNewContact({
        brand: "ires",
        name: "",
        email: "",
        phone: "",
        company: "",
        source: "manual",
        stage: "15%",
        notes: "",
        nextSteps: "",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    try {
      setUploadingPlan(true);
      const res = await uploadAttachment(e.target.files[0]);
      setUploadedPlanUrl(res.fileUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to upload floor plan blueprint");
    } finally {
      setUploadingPlan(false);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rate = calcData.qualityTier === "standard" ? 650 : calcData.qualityTier === "premium" ? 950 : 1400;
      const tierName =
        calcData.qualityTier === "standard"
          ? "Compressed Stabilized Earth (CSEB)"
          : calcData.qualityTier === "premium"
          ? "Monolithic Rammed Earth Estate"
          : "Luxury Biophilic Earth Sanctuary";

      const created = await createQuote({
        ...calcData,
        floorPlanUrl: uploadedPlanUrl,
        specificationDetails: `Tier: ${tierName} | Rate: $${rate}/sq.m | Thermal Mass Wall 400mm`,
      });
      setQuotes([created, ...quotes]);
      alert("Rammed Earth Quotation generated and attached to client pipeline!");
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDiscoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitDiscovery(discoveryData);
      setDiscoverySuccess(true);
      setTimeout(() => setDiscoverySuccess(false), 5000);
      setDiscoveryData({
        brand: "ires",
        clientName: "",
        email: "",
        phone: "",
        projectVision: "",
        location: "Accra, Ghana",
        budgetRange: "$250,000 - $500,000",
        targetTimeline: "3 to 6 months",
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const getRate = (tier: string) => (tier === "standard" ? 650 : tier === "premium" ? 950 : 1400);

  return (
    <div className="flex h-screen overflow-hidden bg-(--color-bg) text-(--color-text) transition-colors duration-200">
      {/* SIDEBAR */}
      <aside className="w-68 border-r border-(--color-line) bg-(--color-surface) flex flex-col justify-between p-4 shadow-sm">
        <div className="space-y-6">
          {/* Header & Logo */}
          <div className="px-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-(--color-bg) border border-(--color-line) flex items-center justify-center p-2 shadow-xs shrink-0">
                <Image src="/Ires-icon.png" alt="Ires Global Icon" width={32} height={32} className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h1 className="font-extrabold tracking-tight text-(--color-text) text-base">Ires Global</h1>
                <p className="text-[11px] font-mono font-semibold text-(--color-accent)">
                  Earth CRM
                </p>
              </div>
            </div>
            <div className="mt-3 px-2.5 py-1.5 rounded bg-(--color-bg) border border-(--color-line) text-[11px] text-(--color-muted) font-mono italic flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-(--color-accent)" />
              &quot;Earth becomes home&quot;
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-semibold tracking-wide transition-all ${
                activeTab === "pipeline"
                  ? "bg-(--color-accent) text-white shadow-sm"
                  : "text-(--color-text) hover:bg-(--color-bg) hover:text-(--color-accent)"
              }`}
            >
              <PieChart className="w-4 h-4" />
              Probability Pipeline
            </button>

            <button
              onClick={() => setActiveTab("contacts")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-semibold tracking-wide transition-all ${
                activeTab === "contacts"
                  ? "bg-(--color-accent) text-white shadow-sm"
                  : "text-(--color-text) hover:bg-(--color-bg) hover:text-(--color-accent)"
              }`}
            >
              <Users className="w-4 h-4" />
              Client Repository
            </button>

            <button
              onClick={() => setActiveTab("quotes")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-semibold tracking-wide transition-all ${
                activeTab === "quotes"
                  ? "bg-(--color-accent) text-white shadow-sm"
                  : "text-(--color-text) hover:bg-(--color-bg) hover:text-(--color-accent)"
              }`}
            >
              <Calculator className="w-4 h-4" />
              Rammed Earth Calculator
            </button>

            <button
              onClick={() => setActiveTab("discovery")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-semibold tracking-wide transition-all ${
                activeTab === "discovery"
                  ? "bg-(--color-accent) text-white shadow-sm"
                  : "text-(--color-text) hover:bg-(--color-bg) hover:text-(--color-accent)"
              }`}
            >
              <Compass className="w-4 h-4" />
              Discovery Intake Form
            </button>
          </nav>

          {/* Core Values Badge */}
          <div className="p-3 rounded-lg bg-(--color-bg) border border-(--color-line) space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-(--color-accent)">
              <Layers className="w-3.5 h-3.5" />
              <span>Sustainable Earth</span>
            </div>
            <p className="text-[11px] text-(--color-muted) leading-relaxed">
              Monolithic rammed earth, compressed earth blocks & biophilic passive thermal architecture.
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-3 pt-4 border-t border-(--color-line)">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-(--color-muted) font-medium">Theme Mode</span>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 rounded bg-(--color-bg) border border-(--color-line) hover:border-(--color-accent) transition-colors text-(--color-text)"
              title="Toggle Light / Dark mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <a
            href={getExportCsvUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-(--color-bg) hover:border-(--color-accent) text-xs font-semibold text-(--color-text) border border-(--color-line) transition-all shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-(--color-success)" />
            Export CRM CSV
          </a>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden bg-(--color-bg)">
        {/* Top Navbar */}
        <header className="h-16 border-b border-(--color-line) px-6 flex items-center justify-between bg-(--color-surface)/95 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-(--color-text) capitalize">
              {activeTab === "pipeline" && "Probability Pipeline (15% → 50% → 75% → 100%)"}
              {activeTab === "contacts" && "Client Contact Repository"}
              {activeTab === "quotes" && "Rammed Earth Quotation Calculator & Blueprints"}
              {activeTab === "discovery" && "Branded Discovery Questionnaire (Earth Becomes Home)"}
            </h2>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-(--color-accent)/10 text-(--color-accent) border border-(--color-accent)/20">
              IRES GLOBAL
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-(--color-muted) absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads, phone, email, notes..."
                className="pl-8 pr-3 py-1.5 bg-(--color-bg) border border-(--color-line) rounded text-xs text-(--color-text) placeholder-(--color-muted) focus:outline-hidden focus:border-(--color-accent) w-64"
              />
            </div>

            <button
              onClick={() => loadData(true)}
              className="p-1.5 rounded bg-(--color-bg) hover:border-(--color-accent) text-(--color-text) border border-(--color-line) transition-all"
              title="Refresh leads"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold tracking-wide bg-(--color-accent) text-white hover:opacity-90 shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Client
            </button>
          </div>
        </header>

        {/* CONTENT PANELS */}
        <div className="flex-1 overflow-auto p-6 bg-blueprint-grid">
          {/* TAB 1: PROBABILITY PIPELINE */}
          {activeTab === "pipeline" && (
            <div className="grid grid-cols-4 gap-4 h-full">
              {STAGES.map((stage) => {
                const stageContacts = filteredContacts.filter((c) => c.stage === stage);
                return (
                  <div
                    key={stage}
                    className="flex flex-col bg-(--color-surface)/80 backdrop-blur-xs border border-(--color-line) rounded-lg p-3 shadow-xs"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-(--color-line)">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-(--color-accent)">{stage}</span>
                          <span className="text-xs font-bold text-(--color-text)">
                            {STAGE_LABELS[stage].label}
                          </span>
                        </div>
                        <p className="text-[10px] text-(--color-muted)">{STAGE_LABELS[stage].desc}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-(--color-bg) text-(--color-muted) border border-(--color-line)">
                        {stageContacts.length}
                      </span>
                    </div>

                    {/* Column Cards */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {stageContacts.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => setSelectedContact(contact)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer ${
                            selectedContact?.id === contact.id
                              ? "border-(--color-accent) bg-(--color-bg) shadow-md"
                              : "border-(--color-line) bg-(--color-surface) hover:border-(--color-accent)/60 hover:shadow-xs"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <h4 className="font-bold text-xs text-(--color-text) line-clamp-1">
                              {contact.name}
                            </h4>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold bg-(--color-accent)/10 text-(--color-accent)">
                              {contact.source.replace("_", " ")}
                            </span>
                          </div>

                          {contact.company && (
                            <p className="text-[11px] text-(--color-muted) font-medium mb-1 line-clamp-1">
                              {contact.company}
                            </p>
                          )}

                          {contact.notes && (
                            <p className="text-[11px] text-(--color-muted) line-clamp-2 mb-2 italic">
                              &quot;{contact.notes}&quot;
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-(--color-line)/60 text-[10px] text-(--color-muted)">
                            <div className="flex items-center gap-1.5 font-mono">
                              <Calendar className="w-3 h-3 text-(--color-accent)" />
                              {new Date(contact.updatedAt).toLocaleDateString()}
                            </div>
                            {contact.comments && contact.comments.length > 0 && (
                              <span className="font-mono text-[9px] px-1 rounded bg-(--color-bg)">
                                {contact.comments.length} notes
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {stageContacts.length === 0 && (
                        <div className="h-32 border border-dashed border-(--color-line) rounded-lg flex items-center justify-center text-[11px] text-(--color-muted)">
                          No leads in {stage}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CLIENT REPOSITORY */}
          {activeTab === "contacts" && (
            <div className="flex gap-6 h-full">
              {/* Table list */}
              <div className="flex-1 bg-(--color-surface) border border-(--color-line) rounded-lg overflow-hidden shadow-xs flex flex-col">
                <div className="p-4 border-b border-(--color-line) flex items-center justify-between">
                  <span className="text-xs font-bold text-(--color-text) font-mono">
                    Total Clients: {filteredContacts.length}
                  </span>
                  <span className="text-xs text-(--color-muted)">Click a row to inspect full notes & activity</span>
                </div>

                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-(--color-bg) border-b border-(--color-line) text-(--color-muted) uppercase text-[10px] font-mono sticky top-0">
                      <tr>
                        <th className="p-3">Client</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3">Stage</th>
                        <th className="p-3">Source</th>
                        <th className="p-3">Notes & Next Steps</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--color-line)">
                      {filteredContacts.map((contact) => (
                        <tr
                          key={contact.id}
                          onClick={() => setSelectedContact(contact)}
                          className={`cursor-pointer transition-colors ${
                            selectedContact?.id === contact.id
                              ? "bg-(--color-accent)/10 font-medium"
                              : "hover:bg-(--color-bg)/60"
                          }`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-(--color-text)">{contact.name}</div>
                            {contact.company && (
                              <div className="text-[11px] text-(--color-muted)">{contact.company}</div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px]">
                            <div>{contact.email}</div>
                            {contact.phone && <div className="text-(--color-muted)">{contact.phone}</div>}
                          </td>
                          <td className="p-3">
                            <select
                              value={contact.stage}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStageChange(contact.id, e.target.value as StageType);
                              }}
                              className="bg-(--color-bg) border border-(--color-line) rounded px-2 py-1 text-xs font-bold font-mono text-(--color-accent) focus:outline-hidden"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 uppercase text-[10px] font-mono font-bold text-(--color-muted)">
                            {contact.source.replace("_", " ")}
                          </td>
                          <td className="p-3 max-w-xs truncate text-(--color-muted)">
                            {contact.notes || "—"}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-(--color-muted)">
                            {new Date(contact.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Drawer for Selected Contact */}
              {selectedContact && (
                <div className="w-96 bg-(--color-surface) border border-(--color-line) rounded-lg p-5 shadow-lg flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between border-b border-(--color-line) pb-3">
                      <div>
                        <h3 className="font-extrabold text-base text-(--color-text)">{selectedContact.name}</h3>
                        <p className="text-xs text-(--color-muted)">{selectedContact.company || "Private Client"}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-(--color-accent) text-white">
                        {selectedContact.stage}
                      </span>
                    </div>

                    {/* Contact Channels */}
                    <div className="space-y-2">
                      <a
                        href={`mailto:${selectedContact.email}`}
                        className="flex items-center gap-2 text-xs font-mono text-(--color-accent) hover:underline"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {selectedContact.email}
                      </a>
                      {selectedContact.phone && (
                        <a
                          href={`tel:${selectedContact.phone}`}
                          className="flex items-center gap-2 text-xs font-mono text-(--color-accent) hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {selectedContact.phone}
                        </a>
                      )}
                    </div>

                    {/* Stage Transition Buttons */}
                    <div>
                      <label className="text-[10px] font-mono uppercase text-(--color-muted) block mb-1.5">
                        Advance Closing Probability
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {STAGES.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStageChange(selectedContact.id, s)}
                            className={`py-1 rounded text-xs font-mono font-bold border transition-all ${
                              selectedContact.stage === s
                                ? "bg-(--color-accent) text-white border-(--color-accent)"
                                : "bg-(--color-bg) text-(--color-muted) border-(--color-line) hover:border-(--color-accent)"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Project Notes */}
                    <div>
                      <label className="text-[10px] font-mono uppercase text-(--color-muted) block mb-1">
                        Architectural & Project Notes
                      </label>
                      <div className="p-3 rounded bg-(--color-bg) border border-(--color-line) text-xs whitespace-pre-wrap leading-relaxed text-(--color-text)">
                        {selectedContact.notes || "No notes entered yet."}
                      </div>
                    </div>

                    {/* Activity Comments */}
                    <div>
                      <label className="text-[10px] font-mono uppercase text-(--color-muted) block mb-1.5">
                        Activity Stream & Follow-ups
                      </label>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto mb-2 pr-1">
                        {selectedContact.comments && selectedContact.comments.length > 0 ? (
                          selectedContact.comments.map((cm, i) => (
                            <div
                              key={i}
                              className="text-[11px] p-2 rounded bg-(--color-bg) border border-(--color-line) text-(--color-text)"
                            >
                              {cm}
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-(--color-muted) italic">No comments recorded.</p>
                        )}
                      </div>

                      {/* Add comment box */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                          placeholder="Add progress note or next action..."
                          className="flex-1 bg-(--color-bg) border border-(--color-line) rounded px-2.5 py-1.5 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                        />
                        <button
                          onClick={handleAddComment}
                          className="px-3 py-1.5 rounded bg-(--color-accent) text-white text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-(--color-line) flex justify-end">
                    <button
                      onClick={() => setSelectedContact(null)}
                      className="text-xs text-(--color-muted) hover:text-(--color-text)"
                    >
                      Close Drawer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RAMMED EARTH QUOTE CALCULATOR */}
          {activeTab === "quotes" && (
            <div className="grid grid-cols-3 gap-6 max-w-6xl mx-auto">
              <div className="col-span-2 bg-(--color-surface) border border-(--color-line) rounded-lg p-6 shadow-xs">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-(--color-line)">
                  <div className="p-2.5 rounded-lg bg-(--color-accent)/10 text-(--color-accent)">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-(--color-text)">
                      Ires Rammed Earth Quotation Engine
                    </h3>
                    <p className="text-xs text-(--color-muted)">
                      Sustainable earth luxury villas, commercial lodges & biophilic estates
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateQuote} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-(--color-muted) block mb-1">
                        Client Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maya Lin"
                        value={calcData.clientName}
                        onChange={(e) => setCalcData({ ...calcData, clientName: e.target.value })}
                        className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-(--color-muted) block mb-1">
                        Client Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. maya@earthretreat.com"
                        value={calcData.email}
                        onChange={(e) => setCalcData({ ...calcData, email: e.target.value })}
                        className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-(--color-muted) block mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        placeholder="+233 / +234 / +44..."
                        value={calcData.phone}
                        onChange={(e) => setCalcData({ ...calcData, phone: e.target.value })}
                        className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-(--color-muted) block mb-1">
                        Project Archetype
                      </label>
                      <input
                        type="text"
                        value={calcData.projectType}
                        onChange={(e) => setCalcData({ ...calcData, projectType: e.target.value })}
                        className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Floor Area Slider */}
                  <div className="p-4 rounded-lg bg-(--color-bg) border border-(--color-line) space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-(--color-text)">Gross Architectural Footprint</span>
                      <span className="font-mono font-bold text-sm text-(--color-accent)">
                        {calcData.floorAreaSqM} m² / {Math.round(calcData.floorAreaSqM * 10.764)} sq.ft
                      </span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={1200}
                      step={10}
                      value={calcData.floorAreaSqM}
                      onChange={(e) => setCalcData({ ...calcData, floorAreaSqM: Number(e.target.value) })}
                      className="w-full accent-(--color-accent) cursor-pointer"
                    />
                  </div>

                  {/* Quality Tiers Selection */}
                  <div>
                    <label className="text-xs font-semibold text-(--color-muted) block mb-2">
                      Rammed Earth Specification Tier
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          id: "standard" as const,
                          name: "CSEB Earth Villa",
                          rate: 650,
                          desc: "Compressed Stabilized Earth Blocks, natural lime render",
                        },
                        {
                          id: "premium" as const,
                          name: "Monolithic Rammed Earth",
                          rate: 950,
                          desc: "Exposed stratified earth walls, natural mineral pigments",
                        },
                        {
                          id: "luxury" as const,
                          name: "Biophilic Earth Sanctuary",
                          rate: 1400,
                          desc: "Ultra-low carbon, 450mm thermal mass, timber canopy",
                        },
                      ].map((tier) => (
                        <div
                          key={tier.id}
                          onClick={() => setCalcData({ ...calcData, qualityTier: tier.id })}
                          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                            calcData.qualityTier === tier.id
                              ? "border-(--color-accent) bg-(--color-accent)/10 shadow-xs"
                              : "border-(--color-line) bg-(--color-bg) hover:border-(--color-accent)/50"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h5 className="font-bold text-xs text-(--color-text)">{tier.name}</h5>
                            <span className="font-mono text-xs font-bold text-(--color-accent)">
                              ${tier.rate}/m²
                            </span>
                          </div>
                          <p className="text-[11px] text-(--color-muted) leading-snug">{tier.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* File Upload to S3 */}
                  <div className="p-4 rounded-lg bg-(--color-bg) border border-dashed border-(--color-line) text-center space-y-2">
                    <Paperclip className="w-5 h-5 mx-auto text-(--color-accent)" />
                    <div className="text-xs font-medium text-(--color-text)">
                      Upload Floor Plan / Architectural CAD / Sketches
                    </div>
                    <p className="text-[11px] text-(--color-muted)">
                      Directly stores in secure S3 bucket ({BUCKETS_DISPLAY})
                    </p>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="text-xs text-(--color-muted) file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-(--color-accent) file:text-white hover:file:opacity-90"
                    />
                    {uploadingPlan && <p className="text-xs text-(--color-accent) animate-pulse font-mono">Uploading to AWS S3...</p>}
                    {uploadedPlanUrl && (
                      <p className="text-xs text-(--color-success) font-mono break-all">
                        ✓ Uploaded: {uploadedPlanUrl}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded bg-(--color-accent) text-white font-bold text-xs hover:opacity-95 transition-opacity shadow-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Generate Quote & Create Client Lead
                  </button>
                </form>
              </div>

              {/* Estimate Breakdown Card */}
              <div className="space-y-4">
                <div className="bg-(--color-surface) border border-(--color-line) rounded-lg p-5 shadow-xs space-y-4">
                  <h4 className="font-extrabold text-sm text-(--color-text) pb-3 border-b border-(--color-line)">
                    Financial Summary
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-(--color-muted)">Rate per Sq. Metre</span>
                      <span className="font-mono font-bold">${getRate(calcData.qualityTier)} / m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-(--color-muted)">Total Enclosed Area</span>
                      <span className="font-mono font-bold">{calcData.floorAreaSqM} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-(--color-muted)">Estimated Wall Volume</span>
                      <span className="font-mono font-bold">~{Math.round(calcData.floorAreaSqM * 0.42)} m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-(--color-muted)">Passive Cooling Factor</span>
                      <span className="font-mono text-(--color-success) font-bold">-65% HVAC Cost</span>
                    </div>
                    <div className="pt-3 border-t border-(--color-line) flex justify-between items-baseline">
                      <span className="font-bold text-sm text-(--color-text)">Estimated Capital</span>
                      <span className="font-mono font-black text-xl text-(--color-accent)">
                        ${(calcData.floorAreaSqM * getRate(calcData.qualityTier)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quotes Vault */}
                <div className="bg-(--color-surface) border border-(--color-line) rounded-lg p-5 shadow-xs space-y-3">
                  <h4 className="font-bold text-xs text-(--color-text) font-mono uppercase">
                    Recent Quotations ({quotes.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {quotes.map((q) => (
                      <div key={q.id} className="p-2.5 rounded bg-(--color-bg) border border-(--color-line) text-xs">
                        <div className="flex justify-between font-bold mb-0.5">
                          <span className="text-(--color-text) line-clamp-1">{q.projectType}</span>
                          <span className="font-mono text-(--color-accent)">
                            ${q.estimatedCost.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-(--color-muted) flex justify-between">
                          <span>{q.floorAreaSqM} m²</span>
                          <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    {quotes.length === 0 && (
                      <p className="text-xs text-(--color-muted) italic">No quotes logged yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DISCOVERY INTAKE QUESTIONNAIRE */}
          {activeTab === "discovery" && (
            <div className="max-w-2xl mx-auto bg-(--color-surface) border border-(--color-line) rounded-lg p-8 shadow-sm">
              <div className="text-center mb-8 pb-4 border-b border-(--color-line)">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-(--color-bg) border border-(--color-line) flex items-center justify-center p-2.5 shadow-xs">
                  <Image src="/Ires-icon.png" alt="Ires Logo" width={36} height={36} className="w-9 h-9 object-contain" />
                </div>
                <h3 className="font-extrabold text-xl text-(--color-text)">
                  Architectural Discovery Intake
                </h3>
                <p className="text-xs text-(--color-muted) mt-1 font-mono">
                  &quot;Earth becomes home&quot; • Custom Rammed Earth Commissions
                </p>
              </div>

              {discoverySuccess && (
                <div className="p-4 mb-6 rounded-lg bg-(--color-success)/15 border border-(--color-success)/30 text-xs font-semibold text-(--color-success) flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Discovery submitted successfully! A 50% probability client record has been placed into the CRM.
                  </span>
                </div>
              )}

              <form onSubmit={handleDiscoverySubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-(--color-muted) block mb-1">Client Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Richard Brand"
                      value={discoveryData.clientName}
                      onChange={(e) => setDiscoveryData({ ...discoveryData, clientName: e.target.value })}
                      className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2.5 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-(--color-muted) block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. richard@iresglobal.com"
                      value={discoveryData.email}
                      onChange={(e) => setDiscoveryData({ ...discoveryData, email: e.target.value })}
                      className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2.5 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-(--color-muted) block mb-1">Phone / WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="+233 20 123 4567"
                      value={discoveryData.phone}
                      onChange={(e) => setDiscoveryData({ ...discoveryData, phone: e.target.value })}
                      className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2.5 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-(--color-muted) block mb-1">Project Site Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Aburi Hills, Eastern Region, Ghana"
                      value={discoveryData.location}
                      onChange={(e) => setDiscoveryData({ ...discoveryData, location: e.target.value })}
                      className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2.5 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-(--color-muted) block mb-1">
                    Architectural Desires & Rammed Earth Vision
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe your vision: site topography, desired natural earth pigment layers, curved monolithic walls, indoor-outdoor biophilic courtyards, solar integration..."
                    value={discoveryData.projectVision}
                    onChange={(e) => setDiscoveryData({ ...discoveryData, projectVision: e.target.value })}
                    className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2.5 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-(--color-muted) block mb-1">
                      Anticipated Budget Range
                    </label>
                    <select
                      value={discoveryData.budgetRange}
                      onChange={(e) => setDiscoveryData({ ...discoveryData, budgetRange: e.target.value })}
                      className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2.5 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                    >
                      <option value="$100,000 - $250,000">$100,000 - $250,000 USD</option>
                      <option value="$250,000 - $500,000">$250,000 - $500,000 USD</option>
                      <option value="$500,000 - $1,000,000">$500,000 - $1,000,000 USD</option>
                      <option value="$1,000,000+">$1,000,000+ USD</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-(--color-muted) block mb-1">
                      Target Construction Timeline
                    </label>
                    <select
                      value={discoveryData.targetTimeline}
                      onChange={(e) => setDiscoveryData({ ...discoveryData, targetTimeline: e.target.value })}
                      className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2.5 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                    >
                      <option value="Immediate (1 to 3 months)">Immediate (1 to 3 months)</option>
                      <option value="3 to 6 months">3 to 6 months</option>
                      <option value="6 to 12 months">6 to 12 months</option>
                      <option value="Planning for next year">Planning for next year</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-lg bg-(--color-accent) text-white font-extrabold text-xs tracking-wide hover:opacity-95 transition-opacity shadow-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit Discovery & Inject Into CRM Pipeline (50% Stage)
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* CREATE LEAD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-line) p-6 rounded-lg w-full max-w-lg shadow-2xl">
            <h3 className="text-base font-extrabold text-(--color-text) mb-4">
              Add New Ires Client Lead
            </h3>
            <form onSubmit={handleCreateContact} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-(--color-muted) block mb-1">Client Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kofi Mensah"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-(--color-muted) block mb-1">Probability Stage</label>
                  <select
                    value={newContact.stage}
                    onChange={(e) => setNewContact({ ...newContact, stage: e.target.value as StageType })}
                    className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s} - {STAGE_LABELS[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-(--color-muted) block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. kofi@estate.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-(--color-muted) block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+233..."
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-(--color-muted) block mb-1">Company / Entity</label>
                <input
                  type="text"
                  placeholder="e.g. Volta Rammed Earth Sanctuary"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-(--color-muted) block mb-1">Notes & Scope</label>
                <textarea
                  rows={2}
                  placeholder="Earth specifications, land coordinates, budget notes..."
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  className="w-full bg-(--color-bg) border border-(--color-line) rounded p-2 text-xs text-(--color-text) focus:border-(--color-accent) focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-(--color-line)">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded text-xs text-(--color-muted) hover:text-(--color-text)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-(--color-accent) text-white text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const BUCKETS_DISPLAY = "ires-crm-attachments-65ppow";
