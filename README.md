# Ires Global CRM - Fullstack AWS Deployment

Enterprise CRM and internal client pipeline for **Ires Global** ("Earth becomes home"), dedicated to sustainable rammed earth architecture, monolithic earth villas, and biophilic estate developments.

---

## 🌐 Live Deployments

- **Production Custom Domains (Cloudflare SSL)**:
  - **Frontend Dashboard**: [https://crm.iresglobal.com](https://crm.iresglobal.com)
  - **Backend API**: [https://api-crm.iresglobal.com](https://api-crm.iresglobal.com)
  - Health check: `https://api-crm.iresglobal.com/health`

- **AWS Direct Endpoints**:
  - S3 Website: [http://crm.iresglobal.com.s3-website-eu-west-1.amazonaws.com](http://crm.iresglobal.com.s3-website-eu-west-1.amazonaws.com)
  - EC2 Direct API: `http://52.18.201.50:5002`
  - Health check: `http://52.18.201.50:5002/health`
  - Contacts API: `http://52.18.201.50:5002/api/contacts`
  - Quotes API: `http://52.18.201.50:5002/api/quotes`
  - Discovery Intake API: `http://52.18.201.50:5002/api/discovery/submit`
  - Meta Lead Webhook: `http://52.18.201.50:5002/api/integrations/meta-lead`
  - Google Forms Webhook: `http://52.18.201.50:5002/api/integrations/google-form`
  - CSV Export: `http://52.18.201.50:5002/api/export/csv`

---

## 🏗️ Architecture & AWS Resources

- **AWS Profile**: `william_tribedart`
- **AWS Region**: `eu-west-1`
- **Terraform State**: Managed in `./terraform`
- **DynamoDB Tables**:
  - `ires_crm_contacts` (Hash Key: `id`, GSI: `BrandStageIndex`)
  - `ires_crm_quotes` (Hash Key: `id`, GSI: `ContactIdIndex`)
  - `ires_crm_questionnaires` (Hash Key: `id`)
- **S3 Buckets**:
  - `crm.iresglobal.com` (Static website hosting)
  - `ires-crm-attachments-65ppow` (Floor plans, CAD blueprints, quote PDFs, CORS enabled)
- **Backend Compute**:
  - EC2 Instance: `i-0d25e95b57da9c5ca` (`tribedart-news` @ `52.18.201.50`)
  - Runtime: Node.js 22 + TypeScript + Express + AWS SDK v3
  - Web Server: Nginx reverse proxy (`api-crm.iresglobal.com`)
  - Process Manager: PM2 (`ires-crm-backend`, port 5002)

---

## 🔑 Features Implemented

1. **Brand Identity & Earth Aesthetics**:
   - Styled with official Ires Global color palette (`#9c5b34` Clay, `#c2703c` Hot Clay, `#6b4e2e` Deep Earth, `#3d5a47` Sage, Basalt & Cream dark/light themes) and official SVG/PNG branding assets.
2. **Probability Stages**:
   - Visual Kanban pipeline with `15%` (Inquiry), `50%` (Discovery/Proposal), `75%` (Quote Issued), and `100%` (Contract Signed & Groundbreaking).
3. **Contact Client Repository**:
   - Full lead records (Name, Phone, Email, Company, Source, Notes, Activity Comments, Stage Transitions).
4. **Rammed Earth Quotation Engine**:
   - Computes sustainable construction estimates across three tiers:
     - Compressed Stabilized Earth (CSEB) Villa ($650/m²)
     - Monolithic Rammed Earth Estate ($950/m²)
     - Luxury Biophilic Rammed Earth Sanctuary ($1,400/m²)
   - Live square footage slider and floor plan / blueprint attachment upload to AWS S3.
5. **Discovery Intake Questionnaire ("Earth becomes home")**:
   - Branded interactive intake form that captures site location, architectural desires, soil conditions, and timeline, injecting leads directly into DynamoDB at 50% probability stage.
6. **Automated Integrations**:
   - Webhook endpoints ready for Meta Ads and Google Forms without manual data entry.
7. **Export**:
   - Instant 1-click CSV export of all contacts and probability stages.
