#!/bin/bash

# work4u - Quick Setup Script
# This script helps you get started with work4u development

set -e

echo "🚀 work4u Setup Script"
echo "======================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "⚙️  Setting up environment..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local and add your database URL"
    echo "   Format: DATABASE_URL=\"postgresql://user:password@localhost:5432/work4u\""
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "📚 Prisma Setup..."
echo "To push the database schema, run:"
echo "  npm run db:push"
echo ""
echo "To view your database visually, run:"
echo "  npm run db:studio"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your database URL"
echo "2. Run: npm run db:push"
echo "3. Run: npm run dev"
echo "4. Open http://localhost:3000"
echo ""
