import zipfile
import os

zip_path = 'logs.zip'
extract_path = 'temp_logs'

if not os.path.exists(extract_path):
    os.makedirs(extract_path)

try:
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_path)
    print("Extraction complete.")
except Exception as e:
    print(f"Extraction failed: {e}")
