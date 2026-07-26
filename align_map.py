import cv2
import numpy as np
import fitz
from PIL import Image

def main():
    orig_path = 'public/plano_hospital.webp'
    pdf_path = r'c:\Users\LENOVO\.gemini\antigravity\brain\b8fd8e98-8d8b-43ee-9ee3-9d030bfa5d89\.user_uploaded\media__1784911186335.pdf'
    out_path = 'public/plano_hospital_highres.webp'
    
    print("Loading original image...")
    orig_img = cv2.imread(orig_path)
    if orig_img is None:
        print("Failed to load original image!")
        return
    
    h_orig, w_orig = orig_img.shape[:2]
    print(f"Original size: {w_orig}x{h_orig}")
    
    print("Rendering PDF...")
    doc = fitz.open(pdf_path)
    page = doc[0]
    # Render at a very high resolution (e.g. zoom factor 4)
    zoom_x = 4.0
    zoom_y = 4.0
    mat = fitz.Matrix(zoom_x, zoom_y)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    
    pdf_img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    # Convert RGB to BGR for OpenCV
    if pix.n == 3:
        pdf_img = cv2.cvtColor(pdf_img, cv2.COLOR_RGB2BGR)
    
    print(f"PDF rendered size: {pdf_img.shape[1]}x{pdf_img.shape[0]}")
    
    print("Finding features...")
    # Convert to grayscale
    gray_orig = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
    gray_pdf = cv2.cvtColor(pdf_img, cv2.COLOR_BGR2GRAY)
    
    # Use SIFT
    sift = cv2.SIFT_create()
    kp1, des1 = sift.detectAndCompute(gray_orig, None)
    kp2, des2 = sift.detectAndCompute(gray_pdf, None)
    
    print(f"Features: orig={len(kp1)}, pdf={len(kp2)}")
    
    # Match features
    index_params = dict(algorithm=1, trees=5) # KDTree
    search_params = dict(checks=50)
    flann = cv2.FlannBasedMatcher(index_params, search_params)
    matches = flann.knnMatch(des1, des2, k=2)
    
    # Lowe's ratio test
    good_matches = []
    for m, n in matches:
        if m.distance < 0.7 * n.distance:
            good_matches.append(m)
            
    print(f"Good matches: {len(good_matches)}")
    
    if len(good_matches) > 10:
        src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        
        # We want to warp the PDF image to match the original image's shape and perspective.
        # But wait, we want a high-res output, so we warp the PDF image to match a SCALED UP original image.
        # Let's say we want the output to be 2x the original size.
        scale_factor = 2.0
        scaled_src_pts = src_pts * scale_factor
        
        # M maps from scaled_orig -> pdf
        # But we want to warp pdf -> scaled_orig. So we need the matrix from PDF to scaled_orig
        M, mask = cv2.findHomography(dst_pts, scaled_src_pts, cv2.RANSAC, 5.0)
        
        out_w = int(w_orig * scale_factor)
        out_h = int(h_orig * scale_factor)
        
        print(f"Warping PDF to match {out_w}x{out_h}...")
        aligned_pdf = cv2.warpPerspective(pdf_img, M, (out_w, out_h), borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
        
        print("Saving...")
        cv2.imwrite(out_path, aligned_pdf, [cv2.IMWRITE_WEBP_QUALITY, 90])
        print("Done!")
    else:
        print("Not enough matches found.")

if __name__ == '__main__':
    main()
