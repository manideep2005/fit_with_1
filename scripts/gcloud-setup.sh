#!/bin/bash

# Phase 2: Google Cloud Setup Script
echo "🚀 Setting up Google Cloud for RAG System..."

# Set your project ID
PROJECT_ID="fit-with-ai-b005e"
REGION="us-central1"
PASSWORD="FitWithAI2024!"

echo "📋 Using Project: $PROJECT_ID"

# Set project
gcloud config set project $PROJECT_ID

# Enable APIs
echo "🔧 Enabling APIs..."
gcloud services enable alloydb.googleapis.com
gcloud services enable aiplatform.googleapis.com

# Create service account
echo "👤 Creating service account..."
gcloud iam service-accounts create rag-service \
    --display-name="RAG Service Account" \
    --quiet

# Grant permissions
echo "🔐 Granting permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:rag-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/alloydb.client" \
    --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:rag-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user" \
    --quiet

# Create key
echo "🔑 Creating service account key..."
gcloud iam service-accounts keys create ./rag-service-key.json \
    --iam-account=rag-service@$PROJECT_ID.iam.gserviceaccount.com

# Create AlloyDB cluster
echo "🗄️  Creating AlloyDB cluster (this takes 10-15 minutes)..."
gcloud alloydb clusters create fitness-rag \
    --region=$REGION \
    --password=$PASSWORD \
    --quiet

# Create instance
echo "💾 Creating AlloyDB instance..."
gcloud alloydb instances create fitness-primary \
    --cluster=fitness-rag \
    --region=$REGION \
    --instance-type=PRIMARY \
    --cpu-count=2 \
    --quiet

# Get IP
echo "🌐 Getting AlloyDB IP address..."
IP=$(gcloud alloydb instances describe fitness-primary \
    --cluster=fitness-rag \
    --region=$REGION \
    --format="value(ipAddress)")

echo "✅ Setup complete!"
echo ""
echo "📝 Update your .env file with:"
echo "ALLOYDB_CONNECTION_STRING=postgresql://postgres:$PASSWORD@$IP:5432/postgres"
echo ""
echo "🧪 Test with: npm run test-connections"