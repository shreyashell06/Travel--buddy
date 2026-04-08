import traceback
try:
    import backend
except Exception:
    with open('fatal.log', 'w', encoding='utf-8') as f:
        f.write(traceback.format_exc())
