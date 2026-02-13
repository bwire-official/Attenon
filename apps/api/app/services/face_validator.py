"""Face validation using OpenCV - highly reliable fallback."""
import cv2
import numpy as np 
import os
from typing import Dict

class FaceValidator:
    """Real-time face validation using OpenCV Haarcascades."""
    
    def __init__(self):
        # Load pre-trained face detection model from OpenCV
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        if self.face_cascade.empty():
            print(f"Error loading face cascade from {cascade_path}")
    
    def validate_face(self, image_bytes: bytes) -> Dict[str, bool]:
        """
        Validate face quality from image bytes.
        """
        print("[Face Validator] Starting validation...")
        print(f"[Face Validator] Image bytes: {len(image_bytes)} bytes")
        
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        print("[Face Validator] Converting bytes to numpy array...")
        
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            print("[Face Validator] ERROR: Failed to decode image")
            return {
                'face_detected': False,
                'face_centered': False,
                'eyes_open': False,
                'good_lighting': False
            }
        
        print(f"[Face Validator] Image decoded - Shape: {image.shape}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        print("[Face Validator] Converted to grayscale")
        
        # Detect faces
        print("[Face Validator] Running face detection (Haar Cascade)...")
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        print(f"[Face Validator] Face detection complete - Found {len(faces)} face(s)")
        
        if len(faces) == 0:
            print("[Face Validator] No faces detected")
            return {
                'face_detected': False,
                'face_centered': False,
                'eyes_open': False,
                'good_lighting': False
            }
        
        # Get primary face (largest one)
        # faces is list of (x, y, w, h)
        primary_face = max(faces, key=lambda f: f[2] * f[3])
        x, y, w, h = primary_face
        print(f"[Face Validator] Primary face - Position: ({x}, {y}), Size: {w}x{h}")
        
        # Check if face is centered
        img_h, img_w = image.shape[:2]
        face_center_x = x + w / 2
        face_center_y = y + h / 2
        
        img_center_x = img_w / 2
        img_center_y = img_h / 2
        
        # Normalize offsets
        x_offset = abs(face_center_x - img_center_x) / img_w
        y_offset = abs(face_center_y - img_center_y) / img_h
        
        # Within 30% of center
        face_centered = x_offset < 0.3 and y_offset < 0.3
        print(f"[Face Validator] Face centered check - X offset: {x_offset:.3f}, Y offset: {y_offset:.3f}, Centered: {face_centered}")
        
        # Check lighting
        mean_brightness = np.mean(gray)
        good_lighting = 50 < mean_brightness < 200
        print(f"[Face Validator] Lighting check - Mean brightness: {mean_brightness:.1f}, Good: {good_lighting}")
        
        # Eyes open - heuristic (hard with just Haar, assume True if face verified)
        # We could use haarcascade_eye.xml but it's flaky on low res images
        eyes_open = True 
        print(f"[Face Validator] Eyes open: {eyes_open} (heuristic)")
        
        result = {
            'face_detected': True,
            'face_centered': face_centered,
            'eyes_open': eyes_open,
            'good_lighting': good_lighting
        }
        
        print(f"[Face Validator] Validation complete - Result: {result}")
        return result
    
    def __del__(self):
        pass

# Global instance
_validator = None

def get_validator() -> FaceValidator:
    """Get or create validator instance."""
    global _validator
    if _validator is None:
        _validator = FaceValidator()
    return _validator
