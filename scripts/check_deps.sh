#!/bin/bash
# Check all required dependencies for Hanguel Skeletype Web

echo "Checking dependencies..."
echo ""

# Check Python
echo -n "Python 3: "
if command -v python3 &> /dev/null; then
    python3 --version | cut -d' ' -f2
else
    echo "❌ Not found"
fi

# Check Node.js
echo -n "Node.js: "
if command -v node &> /dev/null; then
    node --version
else
    echo "❌ Not found"
fi

# Check ImageMagick
echo -n "ImageMagick: "
if command -v magick &> /dev/null; then
    magick --version | head -1 | cut -d' ' -f3
elif command -v convert &> /dev/null; then
    convert --version | head -1 | cut -d' ' -f3
else
    echo "❌ Not found (brew install imagemagick)"
fi

# Check Autotrace
echo -n "Autotrace: "
if command -v autotrace &> /dev/null; then
    echo "✅ Found"
else
    echo "❌ Not found (brew install autotrace)"
fi

# Check FontForge
echo -n "FontForge: "
if command -v fontforge &> /dev/null; then
    fontforge --version 2>&1 | head -1 | grep -o '[0-9]\+' | head -1
else
    echo "❌ Not found (brew install fontforge)"
fi

echo ""
echo "Done."
