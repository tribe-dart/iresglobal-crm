import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { docClient, s3Client, TABLES, BUCKETS } from "./aws";
import { Contact, Quote, DiscoveryQuestionnaire, StageType } from "./types";
import { notifyNewLead, notifyQuote } from "./mail";
import { registerAuth, requireAccount } from "./auth";

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

const allowedOrigins = new Set([
  "https://iresglobal.com",
  "https://www.iresglobal.com",
  "https://crm.iresglobal.com",
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());
registerAuth(app);
app.use(requireAccount);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "ires-crm-api",
    timestamp: new Date().toISOString(),
    tables: TABLES,
    buckets: BUCKETS,
  });
});

// ==========================================
// CONTACTS ENDPOINTS
// ==========================================

// List contacts with optional brand and stage filters
app.get("/api/contacts", async (req: Request, res: Response) => {
  try {
    const { brand, stage } = req.query;

    const command = new ScanCommand({
      TableName: TABLES.CONTACTS,
    });

    const response = await docClient.send(command);
    let items = (response.Items || []) as Contact[];

    if (brand && brand !== "all") {
      items = items.filter((c) => c.brand === brand);
    }

    if (stage && stage !== "all") {
      items = items.filter((c) => c.stage === stage);
    }

    // Sort descending by updatedAt
    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({ success: true, count: items.length, contacts: items });
  } catch (error: any) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single contact
app.get("/api/contacts/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const command = new GetCommand({
      TableName: TABLES.CONTACTS,
      Key: { id },
    });
    const result = await docClient.send(command);
    if (!result.Item) {
      return res.status(404).json({ success: false, error: "Contact not found" });
    }
    res.json({ success: true, contact: result.Item });
  } catch (error: any) {
    console.error("Error getting contact:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new contact
app.post("/api/contacts", async (req: Request, res: Response) => {
  try {
    const {
      brand = "ires",
      name,
      email,
      phone,
      company = "",
      source = "manual",
      stage = "15%",
      notes = "",
      comments = [],
      nextSteps = "",
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: "Name and email are required" });
    }

    const now = new Date().toISOString();
    const newContact: Contact = {
      id: uuidv4(),
      brand: "ires",
      name,
      email,
      phone: phone || "",
      company,
      source,
      stage: (["15%", "50%", "75%", "100%"].includes(stage) ? stage : "15%") as StageType,
      notes,
      comments: Array.isArray(comments) ? comments : comments ? [comments] : [],
      nextSteps,
      createdAt: now,
      updatedAt: now,
    };

    const command = new PutCommand({
      TableName: TABLES.CONTACTS,
      Item: newContact,
    });

    await docClient.send(command);
    await notifyNewLead(newContact);
    res.status(201).json({ success: true, contact: newContact });
  } catch (error: any) {
    console.error("Error creating contact:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update contact
app.put("/api/contacts/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    const allowedFields = [
      "brand",
      "name",
      "email",
      "phone",
      "company",
      "source",
      "stage",
      "notes",
      "comments",
      "nextSteps",
    ];

    let updateExp = "SET updatedAt = :updatedAt";
    const expAttributeValues: any = { ":updatedAt": now };
    const expAttributeNames: any = {};

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        updateExp += `, #${field} = :${field}`;
        expAttributeValues[`:${field}`] = updates[field];
        expAttributeNames[`#${field}`] = field;
      }
    });

    const command = new UpdateCommand({
      TableName: TABLES.CONTACTS,
      Key: { id },
      UpdateExpression: updateExp,
      ExpressionAttributeNames: expAttributeNames,
      ExpressionAttributeValues: expAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    const result = await docClient.send(command);
    res.json({ success: true, contact: result.Attributes });
  } catch (error: any) {
    console.error("Error updating contact:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete contact
app.delete("/api/contacts/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const command = new DeleteCommand({
      TableName: TABLES.CONTACTS,
      Key: { id },
    });
    await docClient.send(command);
    res.json({ success: true, message: "Contact deleted" });
  } catch (error: any) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add comment to contact
app.post("/api/contacts/:id/comments", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ success: false, error: "Comment text is required" });
    }

    const contactRes = await docClient.send(
      new GetCommand({ TableName: TABLES.CONTACTS, Key: { id } })
    );

    if (!contactRes.Item) {
      return res.status(404).json({ success: false, error: "Contact not found" });
    }

    const now = new Date().toISOString();
    const formattedComment = `[${now.slice(0, 16).replace("T", " ")}] ${comment}`;
    const comments = contactRes.Item.comments || [];
    comments.push(formattedComment);

    const updateRes = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.CONTACTS,
        Key: { id },
        UpdateExpression: "SET comments = :comments, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":comments": comments,
          ":updatedAt": now,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    res.json({ success: true, contact: updateRes.Attributes });
  } catch (error: any) {
    console.error("Error adding comment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update probability stage directly (15%, 50%, 75%, 100%)
app.patch("/api/contacts/:id/stage", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    if (!["15%", "50%", "75%", "100%"].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: "Stage must be one of: 15%, 50%, 75%, 100%",
      });
    }

    const now = new Date().toISOString();
    const command = new UpdateCommand({
      TableName: TABLES.CONTACTS,
      Key: { id },
      UpdateExpression: "SET #st = :stage, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#st": "stage" },
      ExpressionAttributeValues: {
        ":stage": stage,
        ":updatedAt": now,
      },
      ReturnValues: "ALL_NEW",
    });

    const result = await docClient.send(command);
    res.json({ success: true, contact: result.Attributes });
  } catch (error: any) {
    console.error("Error updating stage:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// LEAD INGESTION (Meta, Google Forms, Webhooks)
// ==========================================

// Webhook for Meta Lead Ads integration
app.post("/api/integrations/meta-lead", async (req: Request, res: Response) => {
  try {
    const leadData = req.body;
    console.log("Received Meta Lead payload:", JSON.stringify(leadData));

    // Handle Meta verification challenge if passed
    if (req.query["hub.challenge"]) {
      return res.send(req.query["hub.challenge"]);
    }

    const name =
      leadData.name ||
      leadData.full_name ||
      `${leadData.first_name || ""} ${leadData.last_name || ""}`.trim() ||
      "Meta Lead";
    const email = leadData.email || leadData.email_address || `meta_${Date.now()}@placeholder.com`;
    const phone = leadData.phone_number || leadData.phone || "";
    const brand = "ires";
    const notes = leadData.notes || `Meta Lead captured: Campaign=${leadData.campaign || "Ires Global"}`;

    const now = new Date().toISOString();
    const contact: Contact = {
      id: uuidv4(),
      brand,
      name,
      email,
      phone,
      company: leadData.company || "",
      source: "meta",
      stage: "15%",
      notes,
      comments: [`[${now.slice(0, 16).replace("T", " ")}] Automated ingestion from Meta Lead Ads`],
      nextSteps: "Follow-up call within 24 hours",
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLES.CONTACTS, Item: contact }));
    await notifyNewLead(contact);
    res.status(201).json({ success: true, message: "Meta lead ingested", contact });
  } catch (error: any) {
    console.error("Meta integration error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook for Google Forms integration (Apps Script / Zapier / Direct webhook)
app.post("/api/integrations/google-form", async (req: Request, res: Response) => {
  try {
    const formData = req.body;
    console.log("Received Google Forms payload:", JSON.stringify(formData));

    const name = formData.name || formData["Full Name"] || "Google Form Lead";
    const email = formData.email || formData["Email Address"] || `gform_${Date.now()}@lead.com`;
    const phone = formData.phone || formData["Phone Number"] || "";
    const brand = "ires";
    const responses = Object.entries(formData)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const now = new Date().toISOString();
    const contact: Contact = {
      id: uuidv4(),
      brand,
      name,
      email,
      phone,
      source: "google_forms",
      stage: "15%",
      notes: `Form Submission Data:\n${responses}`,
      comments: [`[${now.slice(0, 16).replace("T", " ")}] Ingested from Google Forms`],
      nextSteps: "Review questionnaire details and schedule discovery call",
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLES.CONTACTS, Item: contact }));
    await notifyNewLead(contact);
    res.status(201).json({ success: true, message: "Google Form lead ingested", contact });
  } catch (error: any) {
    console.error("Google Forms integration error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// DISCOVERY QUESTIONNAIRE (Benjamin's Migration)
// ==========================================

// Submit interactive Discovery Questionnaire (Ires Global)
app.post("/api/discovery/submit", async (req: Request, res: Response) => {
  try {
    const {
      brand = "ires",
      clientName,
      email,
      phone,
      projectVision,
      location = "Building with Earth",
      budgetRange,
      targetTimeline,
    } = req.body;

    if (!clientName || !email) {
      return res.status(400).json({ success: false, error: "Name and email are required" });
    }

    const now = new Date().toISOString();
    const contactId = uuidv4();
    const questionnaireId = uuidv4();

    // 1. Create questionnaire entry
    const qRecord: DiscoveryQuestionnaire = {
      id: questionnaireId,
      brand: "ires",
      clientName,
      email,
      phone: phone || "",
      projectVision: projectVision || "",
      location,
      budgetRange: budgetRange || "Flexible",
      targetTimeline: targetTimeline || "Immediate",
      submittedAt: now,
      contactId,
    };

    await docClient.send(new PutCommand({ TableName: TABLES.QUESTIONNAIRES, Item: qRecord }));

    // 2. Automatically create Contact in CRM
    const contactRecord: Contact = {
      id: contactId,
      brand: qRecord.brand,
      name: clientName,
      email,
      phone: phone || "",
      source: "discovery_questionnaire",
      stage: "50%", // Discovery submitted advances them to 50%
      notes: `Interactive Discovery Questionnaire Submitted:\n• Project Vision: ${projectVision}\n• Location: ${location}\n• Budget: ${budgetRange}\n• Timeline: ${targetTimeline}`,
      comments: [`[${now.slice(0, 16).replace("T", " ")}] Completed branded Ires Discovery Questionnaire`],
      nextSteps: "Review rammed earth architectural desires & schedule discovery session",
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLES.CONTACTS, Item: contactRecord }));
    await notifyNewLead(contactRecord);

    res.status(201).json({
      success: true,
      message: "Discovery questionnaire submitted and contact created",
      questionnaire: qRecord,
      contact: contactRecord,
    });
  } catch (error: any) {
    console.error("Discovery submission error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List submitted questionnaires
app.get("/api/discovery/submissions", async (req: Request, res: Response) => {
  try {
    const command = new ScanCommand({ TableName: TABLES.QUESTIONNAIRES });
    const result = await docClient.send(command);
    res.json({ success: true, questionnaires: result.Items || [] });
  } catch (error: any) {
    console.error("Discovery submissions error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// QUOTE CALCULATOR & ATTACHMENTS (Ires Global)
// ==========================================

// Calculate and generate Quote with optional floor plan attachment
app.post("/api/quotes", async (req: Request, res: Response) => {
  try {
    const {
      contactId,
      brand = "ires",
      projectType = "Rammed Earth Sustainable Villa",
      floorAreaSqM = 150,
      qualityTier = "premium", // standard: $650/sqm, premium: $950/sqm, luxury: $1400/sqm
      currency = "USD",
      floorPlanUrl,
      specificationDetails,
      clientName,
      email,
      phone,
    } = req.body;

    // Rate calculations
    let ratePerSqM = 850;
    if (qualityTier === "standard") ratePerSqM = 650;
    if (qualityTier === "premium") ratePerSqM = 950;
    if (qualityTier === "luxury") ratePerSqM = 1400;

    const estimatedCost = Number(floorAreaSqM) * ratePerSqM;
    const now = new Date().toISOString();
    const quoteId = uuidv4();

    let targetContactId = contactId;

    // If no existing contact provided, automatically create or link one
    if (!targetContactId && clientName && email) {
      targetContactId = uuidv4();
      const newContact: Contact = {
        id: targetContactId,
        brand: "ires",
        name: clientName,
        email,
        phone: phone || "",
        source: "quote_calculator",
        stage: "50%",
        notes: `Quote generated for ${floorAreaSqM} sq.m (${projectType}) - Est: ${currency} ${estimatedCost.toLocaleString()}`,
        comments: [`[${now.slice(0, 16).replace("T", " ")}] Automated Quote generated via Ires Calculator`],
        nextSteps: "Send finalized quotation package and schedule review call",
        createdAt: now,
        updatedAt: now,
      };
      await docClient.send(new PutCommand({ TableName: TABLES.CONTACTS, Item: newContact }));
    }

    const quote: Quote = {
      id: quoteId,
      contactId: targetContactId || "unassigned",
      brand: "ires",
      projectType,
      floorAreaSqM: Number(floorAreaSqM),
      estimatedCost,
      currency,
      floorPlanUrl: floorPlanUrl || "",
      specificationDetails: specificationDetails || `Rate: $${ratePerSqM}/sq.m | Tier: ${qualityTier}`,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLES.QUOTES, Item: quote }));

    let recipientName = clientName || "";
    let recipientEmail = email || "";
    let recipientPhone = phone || "";
    if (targetContactId && targetContactId !== "unassigned" && !recipientEmail) {
      const current = await docClient.send(
        new GetCommand({ TableName: TABLES.CONTACTS, Key: { id: targetContactId } })
      );
      const linked = current.Item as Contact | undefined;
      if (linked) {
        recipientName = recipientName || linked.name;
        recipientEmail = linked.email;
        recipientPhone = recipientPhone || linked.phone || "";
      }
    }

    await notifyQuote({
      name: recipientName,
      email: recipientEmail,
      phone: recipientPhone,
      projectType,
      floorAreaSqM: Number(floorAreaSqM),
      estimatedCost,
      currency,
      specificationDetails: quote.specificationDetails,
    });

    res.status(201).json({ success: true, quote });
  } catch (error: any) {
    console.error("Quote creation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List quotes (optionally filtered by contactId)
app.get("/api/quotes", async (req: Request, res: Response) => {
  try {
    const { contactId } = req.query;
    const command = new ScanCommand({ TableName: TABLES.QUOTES });
    const result = await docClient.send(command);
    let items = (result.Items || []) as Quote[];

    if (contactId) {
      items = items.filter((q) => q.contactId === contactId);
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, quotes: items });
  } catch (error: any) {
    console.error("Error fetching quotes:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload floor plan or quote attachment directly to S3
app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file provided" });
    }

    const fileExt = req.file.originalname.split(".").pop() || "bin";
    const key = `uploads/${Date.now()}_${uuidv4().slice(0, 8)}.${fileExt}`;

    const putCommand = new PutObjectCommand({
      Bucket: BUCKETS.ATTACHMENTS,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3Client.send(putCommand);

    const publicUrl = `https://${BUCKETS.ATTACHMENTS}.s3.${process.env.AWS_REGION || "eu-west-1"}.amazonaws.com/${key}`;

    res.json({
      success: true,
      fileKey: key,
      fileName: req.file.originalname,
      fileUrl: publicUrl,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// EXPORT ENDPOINT (CSV / JSON Quote & Contact Export)
// ==========================================
app.get("/api/export/csv", async (req: Request, res: Response) => {
  try {
    const contactsRes = await docClient.send(new ScanCommand({ TableName: TABLES.CONTACTS }));
    const contacts = (contactsRes.Items || []) as Contact[];

    const headers = [
      "ID",
      "Brand",
      "Name",
      "Email",
      "Phone",
      "Company",
      "Source",
      "Probability Stage",
      "Next Steps",
      "Created At",
    ];

    const rows = contacts.map((c) =>
      [
        `"${c.id}"`,
        `"${c.brand}"`,
        `"${(c.name || "").replace(/"/g, '""')}"`,
        `"${c.email || ""}"`,
        `"${c.phone || ""}"`,
        `"${c.company || ""}"`,
        `"${c.source || ""}"`,
        `"${c.stage || "15%"}"`,
        `"${(c.nextSteps || "").replace(/"/g, '""')}"`,
        `"${c.createdAt || ""}"`,
      ].join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="ires_crm_contacts.csv"');
    res.send(csvContent);
  } catch (error: any) {
    console.error("Export error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Ires Global CRM Backend API running on port ${port}`);
});
