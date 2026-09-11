import volos

v = volos.connect()
if v.button.pressed():
    print("click")