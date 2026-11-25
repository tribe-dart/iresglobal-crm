# Ires Global CRM - Fullstack AWS Deployment

Enterprise CRM and internal client pipeline for **Ires Global** ("Earth becomes home"), dedicated to sustainable rammed earth architecture, monolithic earth villas, and biophilic estate developments.

---

## Executive workspace

The standalone master view has its own static release at `https://master.innovativeelectivegroup.com/`. It authenticates against the existing Ires Global account and uses a session scoped to the master hostname. The Ires Global backend returns approved users a read-only snapshot with Matryvo opportunities and Ires Global contacts and quotes. Existing links to `https://crm.iresglobal.com/executive/` permanently redirect to the standalone workspace.

Build the standalone release with `npm run build:executive --prefix frontend`. Its public files are in `frontend/out-executive/`. The dedicated GitHub workflow publishes each release to `/var/www/crm-executive` on the existing AWS host. The loopback Nginx site in `deploy/executive/nginx.conf` serves the dashboard and proxies the executive data, sign-in, and sign-out routes. Cloudflare Tunnel connects the public hostname to that site.

Configure these values in the backend service environments:

| Setting | Backend | Value |
| --- | --- | --- |
| `EXECUTIVE_ACCOUNT_EMAILS` | Ires Global | Comma-separated sign-in emails approved to see both CRMs. Empty disables access. |
| `EXECUTIVE_MATRYVO_API_KEY` | Both | The same dedicated random secret in each service environment. It authorizes only the Matryvo executive opportunity feed. |
| `MATRYVO_EXECUTIVE_API_ORIGIN` | Ires Global | Optional. Defaults to `https://api-crm.matryvo.com`. |
| `EXECUTIVE_BOOKINGS_TARGETS_USD` | Ires Global | Optional JSON object keyed by calendar quarter, such as `{"2026-Q4":3100000}`. Set actual approved targets. |

Deploy the Matryvo backend before the Ires Global backend and frontend. The existing deploy jobs preserve these settings in the services’ EC2 `.env` files. The executive secret belongs only in the backend environments.

Financial figures use USD. Matryvo bookings use recorded close transitions. Ires Global quote estimates are shown alongside opportunity values and are excluded from bookings and forecast totals. Finance actuals, rep quotas, executive sponsorship, and historical snapshot metrics appear as unavailable pending the corresponding data sources.

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
