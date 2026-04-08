import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFont

img_path = r"C:\Users\Lenovo\.gemini\antigravity\brain\28f7a101-6b70-4966-8c80-64d38cb5fe9e\.system_generated\click_feedback\click_feedback_1775394245250.png"
out_path = r"C:\Users\Lenovo\.gemini\antigravity\brain\28f7a101-6b70-4966-8c80-64d38cb5fe9e\annotated_demo.png"

try:
    img = Image.open(img_path).convert("RGB")
    draw = ImageDraw.Draw(img)
    w, h = img.size

    try:
        font = ImageFont.truetype("arial.ttf", size=32)
    except IOError:
        font = ImageFont.load_default()

    # Function to draw a bordered box with label
    def draw_annotation(bbox, text, color="red"):
        draw.rectangle(bbox, outline=color, width=5)
        # Background for text
        text_bbox = draw.textbbox((bbox[0], bbox[1] - 40), text, font=font)
        draw.rectangle([text_bbox[0]-5, text_bbox[1]-5, text_bbox[2]+5, text_bbox[3]+5], fill=color)
        draw.text((bbox[0], bbox[1] - 40), text, fill="white", font=font)

    # 1. Sidebar (Session Store)
    draw_annotation([20, 100, int(w*0.17), int(h*0.9)], "Feature Store (Session Memory)", color="#FF5733")

    # 2. Suggested Prompts (RAG Engine)
    draw_annotation([int(w*0.3), int(h*0.5), int(w*0.85), int(h*0.65)], "RAG Knowledge Extractor (Llama 3.1)", color="#3357FF")

    # 3. Insights Button (Spark Parquet)
    draw_annotation([int(w*0.8), 20, w-20, 100], "Apache Spark Real-Time Insights", color="#28B463")

    img.save(out_path)
    print("Annotation complete:", out_path)
    
except Exception as e:
    print("Error:", e)
