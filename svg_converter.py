#!/usr/bin/env python3
"""
SVG Converter for QuickBallot
Converts SVG data URLs to PNG/JPEG data URLs using CairoSVG
"""

import sys
import json
import base64
import tempfile
import os
from io import BytesIO
from cairosvg import svg2png
from PIL import Image

def svg_data_url_to_png_data_url(svg_data_url, size=256):
    """
    Convert SVG data URL to PNG data URL
    """
    try:
        # Extract SVG content from data URL
        if not svg_data_url.startswith('data:image/svg+xml'):
            return None
            
        # Get the base64 encoded SVG content
        svg_content = svg_data_url.split(',')[1]
        svg_decoded = base64.b64decode(svg_content)
        
        # Convert SVG to PNG using CairoSVG
        png_data = svg2png(bytestring=svg_decoded, output_width=size, output_height=size)
        
        # Convert to base64 data URL
        png_base64 = base64.b64encode(png_data).decode('utf-8')
        png_data_url = f'data:image/png;base64,{png_base64}'
        
        return png_data_url
        
    except Exception as e:
        print(f"Error converting SVG to PNG: {str(e)}", file=sys.stderr)
        return None

def svg_data_url_to_jpeg_data_url(svg_data_url, size=256, quality=0.95):
    """
    Convert SVG data URL to JPEG data URL
    """
    try:
        print(f"Starting SVG to JPEG conversion, size: {size}, quality: {quality}", file=sys.stderr)
        
        # Extract SVG content from data URL
        if not svg_data_url.startswith('data:image/svg+xml'):
            print("Not an SVG data URL", file=sys.stderr)
            return None
            
        # Get the base64 encoded SVG content
        svg_content = svg_data_url.split(',')[1]
        svg_decoded = base64.b64decode(svg_content)
        print(f"Decoded SVG content length: {len(svg_decoded)}", file=sys.stderr)
        
        # Convert SVG to PNG using CairoSVG
        print("Converting SVG to PNG with CairoSVG...", file=sys.stderr)
        png_data = svg2png(bytestring=svg_decoded, output_width=size, output_height=size)
        print(f"PNG data length: {len(png_data)}", file=sys.stderr)
        
        # Convert PNG to JPEG using Pillow
        print("Converting PNG to JPEG with Pillow...", file=sys.stderr)
        png_image = Image.open(BytesIO(png_data))
        print(f"Image mode: {png_image.mode}, size: {png_image.size}", file=sys.stderr)
        
        # Convert RGBA to RGB if necessary (JPEG doesn't support alpha)
        if png_image.mode in ('RGBA', 'LA'):
            print("Converting RGBA to RGB with white background...", file=sys.stderr)
            # Create a white background
            background = Image.new('RGB', png_image.size, (255, 255, 255))
            if png_image.mode == 'RGBA':
                background.paste(png_image, mask=png_image.split()[-1])  # Use alpha channel as mask
            else:
                background.paste(png_image)
            png_image = background
        elif png_image.mode != 'RGB':
            print(f"Converting {png_image.mode} to RGB...", file=sys.stderr)
            png_image = png_image.convert('RGB')
        
        # Convert to JPEG
        print("Saving as JPEG...", file=sys.stderr)
        jpeg_buffer = BytesIO()
        png_image.save(jpeg_buffer, format='JPEG', quality=int(quality * 100), optimize=True)
        jpeg_data = jpeg_buffer.getvalue()
        print(f"JPEG data length: {len(jpeg_data)}", file=sys.stderr)
        
        # Convert to base64 data URL
        jpeg_base64 = base64.b64encode(jpeg_data).decode('utf-8')
        jpeg_data_url = f'data:image/jpeg;base64,{jpeg_base64}'
        print(f"Generated JPEG data URL length: {len(jpeg_data_url)}", file=sys.stderr)
        
        return jpeg_data_url
        
    except Exception as e:
        print(f"Error converting SVG to JPEG: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return None

def main():
    """
    Main function to handle command line arguments
    Usage: python svg_converter.py <svg_data_url> <output_format> <size> [quality]
    """
    if len(sys.argv) < 4:
        print("Usage: python svg_converter.py <svg_data_url> <output_format> <size> [quality]")
        sys.exit(1)
    
    svg_data_url = sys.argv[1]
    output_format = sys.argv[2].lower()
    size = int(sys.argv[3])
    quality = float(sys.argv[4]) if len(sys.argv) > 4 else 0.95
    
    result = None
    
    if output_format == 'png':
        result = svg_data_url_to_png_data_url(svg_data_url, size)
    elif output_format == 'jpeg' or output_format == 'jpg':
        result = svg_data_url_to_jpeg_data_url(svg_data_url, size, quality)
    else:
        print(f"Unsupported output format: {output_format}", file=sys.stderr)
        sys.exit(1)
    
    if result:
        print(json.dumps({"success": True, "data_url": result}))
    else:
        print(json.dumps({"success": False, "error": "Conversion failed"}))

def test_conversion():
    """
    Test function to verify SVG conversion works
    """
    # Simple test SVG
    test_svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red"/>
    </svg>'''
    
    # Convert to data URL
    svg_data_url = f'data:image/svg+xml;base64,{base64.b64encode(test_svg.encode()).decode()}'
    
    print("Testing SVG conversion...", file=sys.stderr)
    result = svg_data_url_to_jpeg_data_url(svg_data_url, 128, 0.9)
    
    if result:
        print("✅ Test conversion successful!", file=sys.stderr)
        print(f"Result length: {len(result)}", file=sys.stderr)
    else:
        print("❌ Test conversion failed!", file=sys.stderr)

if __name__ == "__main__":
    if len(sys.argv) == 1:
        # No arguments provided, run test
        test_conversion()
    else:
        main() 