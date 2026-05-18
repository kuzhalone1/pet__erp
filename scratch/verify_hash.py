import bcrypt

hashed = '$2b$12$.OTMdc4ivJApNDSoFAOgnevbFmic/bRFAFJi80iY5jI70n0FpcUw.'
password = 'admin123'

if bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8')):
    print("Match!")
else:
    print("No match!")
