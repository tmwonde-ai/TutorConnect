#!/bin/bash

echo "=== TutorConnect Setup ==="
echo ""

# Frontend setup
echo "Setting up frontend..."
cp .env.local.example .env.local
pnpm install

echo ""
echo "Frontend setup complete!"
echo "Run 'pnpm dev' to start frontend on http://localhost:3000"
echo ""

# Backend setup
echo "Setting up backend..."
cd backend

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    source venv/Scripts/activate
else
    # Unix-like systems
    source venv/bin/activate
fi

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

echo ""
echo "Backend setup complete!"
echo "1. Edit backend/.env with your configuration"
echo "2. Activate venv: source venv/bin/activate (or venv\Scripts\activate on Windows)"
echo "3. Run 'python app.py' to start backend on http://localhost:5000"
echo ""

cd ..

echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Copy .env.local.example to .env.local and configure frontend"
echo "2. Copy backend/.env.example to backend/.env and configure backend"
echo "3. Start frontend: pnpm dev"
echo "4. Start backend: cd backend && source venv/bin/activate && python app.py"
echo ""
