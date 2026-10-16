import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const region = process.env.AWS_REGION || "eu-west-1";

// Fallback to explicit env vars if provided, otherwise SDK default credential chain
const awsConfig: any = { region };
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  awsConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const rawDynamoClient = new DynamoDBClient(awsConfig);
export const docClient = DynamoDBDocumentClient.from(rawDynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const s3Client = new S3Client(awsConfig);

export const TABLES = {
  CONTACTS: process.env.CONTACTS_TABLE || "ires_crm_contacts",
  QUOTES: process.env.QUOTES_TABLE || "ires_crm_quotes",
  QUESTIONNAIRES: process.env.QUESTIONNAIRES_TABLE || "ires_crm_questionnaires",
};

export const BUCKETS = {
  ATTACHMENTS: process.env.ATTACHMENTS_BUCKET || "ires-crm-attachments",
};
