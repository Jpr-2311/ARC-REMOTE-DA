from datetime import datetime
from core.voice_response import speak

def tell_time():
    now = datetime.now()
    formatted = now.strftime("%I:%M %p").lstrip("0")
    msg = f"It's {formatted}"
    speak(msg)
    print(f"🕐 {msg}")
    return msg

def tell_date():
    now = datetime.now()
    formatted = now.strftime("%A, %B %d").replace(" 0", " ")
    msg = f"Today is {formatted}"
    speak(msg)
    print(f"📅 {msg}")
    return msg