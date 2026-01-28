import mediapipe as mp
print(f"MediaPipe path: {mp.__path__}")
try:
    print(f"Solutions: {mp.solutions}")
except AttributeError:
    print("mp.solutions does not exist")

import importlib
try:
    import mediapipe.python.solutions
    print("mediapipe.python.solutions imported")
except ImportError:
    print("mediapipe.python.solutions failed")
